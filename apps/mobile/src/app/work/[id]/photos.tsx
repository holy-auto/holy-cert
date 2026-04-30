import { useState } from "react";
import { View, StyleSheet, FlatList, Image, Alert } from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  Snackbar,
  ProgressBar,
  Card,
  Icon,
} from "react-native-paper";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface Photo {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

type UploadJobState = "queued" | "uploading" | "succeeded" | "failed";

interface UploadJob {
  id: string; // ローカル ID (uri ベース)
  uri: string;
  fileName: string;
  state: UploadJobState;
  progress: number; // 0..1。Supabase Storage の upload は progress event 非対応なので
  // "uploading" に入った瞬間に 0.3、完了時に 1 を入れる擬似プログレス
  error: string | null;
}

// 同時アップロード上限。モバイル回線でも詰まらない程度
const CONCURRENT_UPLOADS = 2;

export default function WorkPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [snackbar, setSnackbar] = useState("");

  const {
    data: photos = [],
    isLoading,
  } = useQuery<Photo[]>({
    queryKey: ["work-photos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_images")
        .select("id, image_url, caption, created_at")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
    enabled: !!id,
  });

  function updateJob(jobId: string, patch: Partial<UploadJob>) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j))
    );
  }

  async function uploadOne(job: UploadJob) {
    updateJob(job.id, { state: "uploading", progress: 0.3 });
    try {
      const ext = job.uri.split(".").pop()?.split("?")[0] ?? "jpg";
      const fileName = `${user!.tenantId}/${id}/${Date.now()}-${job.id.slice(0, 6)}.${ext}`;

      const response = await fetch(job.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("work-photos")
        .upload(fileName, blob, {
          contentType: blob.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("work-photos").getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("certificate_images")
        .insert({
          reservation_id: id,
          tenant_id: user!.tenantId,
          image_url: publicUrl,
          caption: null,
        });

      if (insertError) throw insertError;

      updateJob(job.id, { state: "succeeded", progress: 1 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "アップロード失敗";
      updateJob(job.id, { state: "failed", error: msg });
    }
  }

  async function runQueue(initialJobs: UploadJob[]) {
    // 同時 N 件まで並列、終わったら次を投入する単純なプール
    const queue = [...initialJobs];
    const inFlight = new Set<Promise<void>>();

    const next = () => {
      const job = queue.shift();
      if (!job) return null;
      const p = uploadOne(job).finally(() => {
        inFlight.delete(p);
      });
      inFlight.add(p);
      return p;
    };

    // 初期投入
    for (let i = 0; i < CONCURRENT_UPLOADS; i++) next();

    // 全部終わるまで, 完了するたびに次を投入
    while (inFlight.size > 0) {
      await Promise.race(inFlight);
      next();
    }

    await queryClient.invalidateQueries({ queryKey: ["work-photos", id] });
  }

  async function pickAndUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "写真ライブラリへのアクセスを許可してください");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 20,
    });
    if (result.canceled || !result.assets?.length) return;

    const newJobs: UploadJob[] = result.assets.map((a, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      uri: a.uri,
      fileName: a.fileName ?? a.uri.split("/").pop() ?? `photo-${i}.jpg`,
      state: "queued",
      progress: 0,
      error: null,
    }));
    setJobs((prev) => [...prev, ...newJobs]);

    try {
      await runQueue(newJobs);
      const failed = newJobs.filter((j) => {
        const cur = jobs.find((x) => x.id === j.id);
        return cur?.state === "failed";
      });
      setSnackbar(
        failed.length === 0
          ? `${newJobs.length}枚のアップロードが完了しました`
          : `${newJobs.length - failed.length}/${newJobs.length}枚成功 (${failed.length}件失敗)`
      );
    } catch (err) {
      setSnackbar("アップロードに失敗しました");
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限エラー", "カメラへのアクセスを許可してください");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const a = result.assets[0];
    const job: UploadJob = {
      id: `${Date.now()}-cam`,
      uri: a.uri,
      fileName: a.fileName ?? "camera.jpg",
      state: "queued",
      progress: 0,
      error: null,
    };
    setJobs((prev) => [...prev, job]);
    await runQueue([job]);
    setSnackbar(
      job.state === "failed" ? "アップロードに失敗しました" : "アップロード完了"
    );
  }

  // アップロード中/失敗のジョブ件数 (進捗UIの開閉判定)
  const activeJobs = jobs.filter((j) => j.state !== "succeeded");

  return (
    <>
      <Stack.Screen options={{ title: "写真" }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <View style={styles.photoContainer}>
                <Image source={{ uri: item.image_url }} style={styles.photo} />
              </View>
            )}
            ListHeaderComponent={
              activeJobs.length > 0 ? (
                <View style={styles.uploadList}>
                  <Text variant="labelMedium" style={styles.uploadHeader}>
                    アップロード中 ({activeJobs.length}件)
                  </Text>
                  {jobs
                    .filter((j) => j.state !== "succeeded")
                    .map((j) => (
                      <UploadRow key={j.id} job={j} />
                    ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  写真がありません
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <Button
            mode="outlined"
            icon="image-multiple"
            onPress={pickAndUpload}
            disabled={activeJobs.length > 0}
            style={styles.actionButton}
            textColor="#1a1a2e"
          >
            ライブラリから選択
          </Button>
          <Button
            mode="contained"
            icon="camera"
            onPress={takePhoto}
            disabled={activeJobs.length > 0}
            style={styles.actionButton}
            buttonColor="#1a1a2e"
            contentStyle={{ paddingVertical: 8 }}
          >
            撮影
          </Button>
        </View>
      </View>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar("")}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </>
  );
}

function UploadRow({ job }: { job: UploadJob }) {
  return (
    <Card style={uploadStyles.row} mode="outlined">
      <Card.Content style={uploadStyles.rowContent}>
        <Image source={{ uri: job.uri }} style={uploadStyles.thumb} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="bodySmall" numberOfLines={1} style={uploadStyles.name}>
            {job.fileName}
          </Text>
          {job.state === "failed" ? (
            <View style={uploadStyles.failedRow}>
              <Icon source="alert-circle" size={14} color="#991b1b" />
              <Text variant="bodySmall" style={uploadStyles.failedText}>
                {job.error ?? "失敗"}
              </Text>
            </View>
          ) : (
            <ProgressBar
              progress={job.progress}
              color={job.state === "succeeded" ? "#10b981" : "#1a1a2e"}
              style={{ marginTop: 6 }}
            />
          )}
        </View>
        {job.state === "succeeded" && (
          <Icon source="check-circle" size={20} color="#10b981" />
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64,
  },
  grid: { padding: 4 },
  photoContainer: { flex: 1 / 3, aspectRatio: 1, padding: 4 },
  photo: { flex: 1, borderRadius: 8, backgroundColor: "#e4e4e7" },
  emptyText: { color: "#71717a" },
  uploadList: { padding: 8, gap: 8 },
  uploadHeader: { color: "#71717a", marginBottom: 4, paddingHorizontal: 4 },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
  },
  actionButton: { flex: 1, borderRadius: 8 },
});

const uploadStyles = StyleSheet.create({
  row: { backgroundColor: "#ffffff" },
  rowContent: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 40, height: 40, borderRadius: 4, backgroundColor: "#e4e4e7" },
  name: { color: "#1a1a2e", fontWeight: "600" },
  failedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  failedText: { color: "#991b1b" },
});

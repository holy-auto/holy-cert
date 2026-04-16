import { Stack } from "expo-router";

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#1a1a2e",
      }}
    >
      <Stack.Screen name="index" options={{ title: "顧客一覧" }} />
      <Stack.Screen name="[id]" options={{ title: "顧客詳細" }} />
      <Stack.Screen name="new" options={{ title: "顧客登録" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "顧客編集" }} />
    </Stack>
  );
}

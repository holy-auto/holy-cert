import { useEffect } from "react";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { theme } from "@/constants/theme";
import { queryClient } from "@/lib/queryClient";
import { useAuthInit } from "@/hooks/useAuthInit";
import { OfflineBanner } from "@/components/OfflineBanner";
import { initSentry, setSentryUser } from "@/lib/sentry";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

// 起動時に1回だけ Sentry を初期化 (DSN/パッケージ未設定なら no-op)
initSentry();

// authStore と Sentry の user タグを連動 (ログイン/ログアウトを反映)
useAuthStore.subscribe((state) => {
  setSentryUser(state.user ? { id: state.user.id, tenantId: state.user.tenantId } : null);
});

export default function RootLayout() {
  const { isReady } = useAuthInit();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="customers"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="vehicles"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="certificates"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="nfc" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reservations"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="work" options={{ headerShown: false }} />
          <Stack.Screen name="pos" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}

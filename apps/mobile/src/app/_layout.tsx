import { useCallback, useEffect } from "react";
import { Stack, router } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";

import { theme } from "@/constants/theme";
import { queryClient } from "@/lib/queryClient";
import { useAuthInit } from "@/hooks/useAuthInit";
import { bindUnauthorizedHandler, mobileApi } from "@/lib/api";
import { OfflineBanner } from "@/components/OfflineBanner";
import { initSentry, setSentryUser } from "@/lib/sentry";
import { useAuthStore } from "@/stores/authStore";
import { ToastProvider } from "@/components/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

// 401 受信時のグローバルハンドラ: store を初期化して /login へリダイレクト
bindUnauthorizedHandler(() => {
  useAuthStore.getState().reset();
  router.replace("/(auth)/login");
});

// 起動時に1回だけ Sentry を初期化 (DSN/パッケージ未設定なら no-op)
initSentry();

// authStore と Sentry の user タグを連動 (ログイン/ログアウトを反映)
useAuthStore.subscribe((state) => {
  setSentryUser(
    state.user ? { id: state.user.id, tenantId: state.user.tenantId } : null
  );
});

export default function RootLayout() {
  const { isReady } = useAuthInit();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Stripe Terminal の connection token 取得
  // SDK 0.0.1-beta.29 では initialize() 経由ではなく Provider 経由で渡す
  const fetchTokenProvider = useCallback(async () => {
    const res = await mobileApi<{ secret: string }>(
      "/pos/terminal/connection-token",
      { method: "GET" }
    );
    return res.secret;
  }, []);

  if (!isReady) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StripeTerminalProvider tokenProvider={fetchTokenProvider}>
          <PaperProvider theme={theme}>
            <ToastProvider>
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
                <Stack.Screen name="dashboard" />
              </Stack>
            </ToastProvider>
          </PaperProvider>
        </StripeTerminalProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

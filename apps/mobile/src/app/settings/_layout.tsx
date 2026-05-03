import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#1a1a2e",
      }}
    >
      <Stack.Screen name="index" options={{ title: "設定" }} />
      <Stack.Screen name="tap-to-pay" options={{ title: "Tap to Pay" }} />
    </Stack>
  );
}

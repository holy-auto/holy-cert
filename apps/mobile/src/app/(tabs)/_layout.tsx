import { Tabs } from "expo-router";
import { Icon } from "react-native-paper";
import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";

export default function TabsLayout() {
  const { isAuthenticated, selectedStore } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!selectedStore) return <Redirect href="/(auth)/select-store" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#1a1a2e",
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#71717a",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e4e4e7",
          borderTopWidth: 1,
          height: 84,
          paddingTop: 10,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "home" : "home-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "予約",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "calendar" : "calendar-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: "作業",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "wrench" : "wrench-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "会計",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Icon source="cash-register" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "その他",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Icon source="dots-horizontal-circle-outline" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

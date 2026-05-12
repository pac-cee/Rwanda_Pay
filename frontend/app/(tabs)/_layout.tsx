import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView 
              intensity={80} 
              tint={isDark ? "dark" : "light"} 
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: { 
          fontFamily: "Inter_500Medium", 
          fontSize: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView 
                name={focused ? "house.fill" : "house"} 
                tintColor={color} 
                size={24}
                animationSpec={{
                  effect: {
                    type: "bounce",
                  },
                }}
              />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: "Pay",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView 
                name={focused ? "wave.3.right" : "wave.3.right"} 
                tintColor={color} 
                size={24}
                animationSpec={{
                  effect: {
                    type: "pulse",
                  },
                }}
              />
            ) : (
              <Feather name="wifi" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: "Transfer",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView 
                name={focused ? "arrow.left.arrow.right" : "arrow.left.arrow.right"} 
                tintColor={color} 
                size={24}
                animationSpec={{
                  effect: {
                    type: "bounce",
                  },
                }}
              />
            ) : (
              <Feather name="send" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView 
                name={focused ? "gearshape.fill" : "gearshape"} 
                tintColor={color} 
                size={24}
                animationSpec={{
                  effect: {
                    type: "bounce",
                  },
                }}
              />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}

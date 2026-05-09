import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashOverlay from "@/components/SplashOverlay";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppNavigator() {
  const { user, isAuthChecked } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Enforce minimum 1.5s splash so the animation plays fully
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const readyToExit = minTimeDone && isAuthChecked;

  const handleSplashFinish = () => {
    if (user) {
      router.replace("/(tabs)");
    } else {
      router.replace("/auth");
    }
    // Small delay ensures route change settles before overlay is removed
    setTimeout(() => setShowSplash(false), 80);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="add-card" options={{ presentation: "modal" }} />
        <Stack.Screen name="send" options={{ presentation: "modal" }} />
        <Stack.Screen name="receive" options={{ presentation: "modal" }} />
        <Stack.Screen name="topup" options={{ presentation: "modal" }} />
        <Stack.Screen name="transactions-full" />
        <Stack.Screen name="analytics-full" />
        <Stack.Screen name="contact-ledger" />
      </Stack>
      {showSplash && (
        <SplashOverlay
          readyToExit={readyToExit}
          onFinish={handleSplashFinish}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WalletProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AppNavigator />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </WalletProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

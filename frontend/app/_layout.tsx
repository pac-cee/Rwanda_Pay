import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppNavigator() {
  const { user, isAuthChecked } = useAuth();

  // Don't render anything until auth is checked
  if (!isAuthChecked) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // User is logged in - show app screens
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-card" options={{ presentation: "modal" }} />
          <Stack.Screen name="topup" options={{ presentation: "modal" }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="transactions-full" />
          <Stack.Screen name="analytics-full" />
          <Stack.Screen name="auth" options={{ href: null }} />
        </>
      ) : (
        // User is not logged in - show only auth screen
        <>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" options={{ href: null }} />
          <Stack.Screen name="add-card" options={{ href: null }} />
          <Stack.Screen name="topup" options={{ href: null }} />
          <Stack.Screen name="notifications" options={{ href: null }} />
          <Stack.Screen name="transactions-full" options={{ href: null }} />
          <Stack.Screen name="analytics-full" options={{ href: null }} />
        </>
      )}
    </Stack>
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
              <View style={{ flex: 1 }}>
                <AppNavigator />
              </View>
            </WalletProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

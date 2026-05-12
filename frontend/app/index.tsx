import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const PRIMARY = "#1B5E20";
const ACCENT = "#FFD600";

function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const logoScale = React.useRef(new Animated.Value(0.3)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const titleY = React.useRef(new Animated.Value(30)).current;
  const titleOpacity = React.useRef(new Animated.Value(0)).current;
  const taglineOpacity = React.useRef(new Animated.Value(0)).current;
  const ring1Scale = React.useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = React.useRef(new Animated.Value(0)).current;
  const ring2Scale = React.useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ring animations
    const ring1Anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, { toValue: 1.8, duration: 1500, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(ring1Opacity, { toValue: 0.4, duration: 200, useNativeDriver: true }),
            Animated.timing(ring1Opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(ring1Scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ])
    );

    const ring2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 1.8, duration: 1500, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(ring2Opacity, { toValue: 0.4, duration: 200, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(ring2Scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ])
    );

    // Main content animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(titleY, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(100),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    ring1Anim.start();
    ring2Anim.start();

    // Complete after 2.5 seconds
    const timer = setTimeout(onComplete, 2500);

    return () => {
      clearTimeout(timer);
      ring1Anim.stop();
      ring2Anim.stop();
    };
  }, []);

  return (
    <View style={styles.splash}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      
      <View style={styles.content}>
        {/* Animated rings */}
        <View style={styles.ringsContainer}>
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
        </View>

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoCircle,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Feather name="wifi" size={56} color="#FFFFFF" />
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              transform: [{ translateY: titleY }],
              opacity: titleOpacity,
            },
          ]}
        >
          <Text style={styles.title}>Rwanda Pay</Text>
          <View style={styles.accentBar} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: taglineOpacity }}>
          <Text style={styles.tagline}>Your Digital Wallet</Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <Text style={styles.footerText}>Secure · Fast · Rwandan</Text>
      </Animated.View>
    </View>
  );
}

export default function Index() {
  const { user, isAuthChecked } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  // Wait for both auth check AND splash animation
  if (!isAuthChecked || !splashComplete) {
    return <AnimatedSplash onComplete={() => setSplashComplete(true)} />;
  }

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  bgCircle1: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -100,
    right: -80,
  },
  bgCircle2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -60,
    left: -70,
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  ringsContainer: {
    position: "absolute",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  titleContainer: {
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  accentBar: {
    width: 50,
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  tagline: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 60,
  },
  footerText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
  },
});

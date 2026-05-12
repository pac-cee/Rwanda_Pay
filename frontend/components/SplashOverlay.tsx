import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const PRIMARY = "#1B5E20";
const ACCENT = "#FFD600";

interface SplashOverlayProps {
  onFinish: () => void;
  readyToExit: boolean;
}

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.5, duration: 1400, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
      { iterations: 3 }
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, { transform: [{ scale }], opacity }]}
    />
  );
}

export default function SplashOverlay({ onFinish, readyToExit }: SplashOverlayProps) {
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const accentOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(titleY, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([Animated.delay(750), Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(900), Animated.timing(accentOpacity, { toValue: 1, duration: 300, useNativeDriver: true })]),
    ]).start();
  }, []);

  useEffect(() => {
    if (readyToExit) {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }
  }, [readyToExit]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <View style={styles.topCircle} />
      <View style={styles.bottomCircle} />
      <View style={styles.centerContent}>
        <View style={styles.ringsContainer}>
          <PulseRing delay={200} size={180} />
          <PulseRing delay={600} size={180} />
          <PulseRing delay={1000} size={180} />
        </View>
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <Feather name="wifi" size={52} color="#FFFFFF" />
        </Animated.View>
        <Animated.View style={[styles.titleWrap, { transform: [{ translateY: titleY }], opacity: titleOpacity }]}>
          <Text style={styles.title}>Rwanda Pay</Text>
        </Animated.View>
        <Animated.View style={[styles.accentLine, { opacity: accentOpacity }]} />
        <Animated.View style={{ opacity: taglineOpacity }}>
          <Text style={styles.tagline}>Your Digital Wallet</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.bottomBadge, { opacity: taglineOpacity }]}>
        <Text style={styles.bottomText}>Secure · Fast · Rwandan</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", zIndex: 999 },
  topCircle: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: "rgba(255,255,255,0.04)", top: -120, right: -80 },
  bottomCircle: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.04)", bottom: -80, left: -60 },
  centerContent: { alignItems: "center", gap: 16 },
  ringsContainer: { position: "absolute", width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.04)" },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  titleWrap: { marginTop: 8 },
  title: { color: "#FFFFFF", fontSize: 38, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  accentLine: { width: 40, height: 3, backgroundColor: ACCENT, borderRadius: 2 },
  tagline: { color: "rgba(255,255,255,0.65)", fontSize: 15, fontFamily: "Inter_400Regular", letterSpacing: 1.2, textTransform: "uppercase" },
  bottomBadge: { position: "absolute", bottom: 60 },
  bottomText: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
});

import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const PRIMARY = "#1B5E20";
const ACCENT = "#FFD600";

interface SplashOverlayProps {
  onFinish: () => void;
}

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0.4, { duration: 0 }), withTiming(1.5, { duration: 1400 })),
        3,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0.5, { duration: 100 }), withTiming(0, { duration: 1300 })),
        3,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

export default function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const logoScale = useSharedValue(0.2);
  const logoOpacity = useSharedValue(0);
  const titleY = useSharedValue(24);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const accentOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    // Logo spring in
    logoScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    logoOpacity.value = withTiming(1, { duration: 350 });

    // Title slides up
    titleY.value = withDelay(450, withTiming(0, { duration: 450 }));
    titleOpacity.value = withDelay(450, withTiming(1, { duration: 450 }));

    // Tagline fades in
    taglineOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));

    // Accent line
    accentOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));

    // Fade out entire overlay after 2.4s
    overlayOpacity.value = withDelay(
      2400,
      withTiming(0, { duration: 600 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: accentOpacity.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* Decorative top circle */}
      <View style={styles.topCircle} />
      <View style={styles.bottomCircle} />

      {/* Logo area */}
      <View style={styles.centerContent}>
        {/* Pulse rings */}
        <View style={styles.ringsContainer}>
          <PulseRing delay={200} size={180} />
          <PulseRing delay={600} size={180} />
          <PulseRing delay={1000} size={180} />
        </View>

        {/* Logo circle */}
        <Animated.View style={[styles.logoCircle, logoStyle]}>
          <Feather name="wifi" size={52} color="#FFFFFF" />
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.title}>Rwanda Pay</Text>
        </Animated.View>

        {/* Accent */}
        <Animated.View style={[styles.accentLine, accentStyle]} />

        {/* Tagline */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>Your Digital Wallet</Text>
        </Animated.View>
      </View>

      {/* Bottom wordmark */}
      <Animated.View style={[styles.bottomBadge, taglineStyle]}>
        <Text style={styles.bottomText}>Secure · Fast · Rwandan</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  topCircle: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -120,
    right: -80,
  },
  bottomCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -80,
    left: -60,
  },
  centerContent: {
    alignItems: "center",
    gap: 16,
  },
  ringsContainer: {
    position: "absolute",
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  titleWrap: { marginTop: 8 },
  title: {
    color: "#FFFFFF",
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  accentLine: {
    width: 40,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  tagline: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bottomBadge: {
    position: "absolute",
    bottom: 60,
  },
  bottomText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
  },
});

import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

export type PaymentStatus = "idle" | "scanning" | "success" | "failed";

interface PaymentAnimationProps {
  status: PaymentStatus;
  color?: string;
}

function PulseRing({
  delay,
  color,
  status,
}: {
  delay: number;
  color: string;
  status: PaymentStatus;
}) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (status === "idle" || status === "scanning") {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: 0 }),
            withTiming(1.8, { duration: 1800 })
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(status === "scanning" ? 0.6 : 0.4, { duration: 200 }),
            withTiming(0, { duration: 1600 })
          ),
          -1,
          false
        )
      );
    } else {
      scale.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [status]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { borderColor: color, backgroundColor: `${color}10` },
        style,
      ]}
    />
  );
}

function SuccessCheck({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.successCheck, style]}>
      <Feather name="check" size={44} color="#FFFFFF" />
    </Animated.View>
  );
}

function FailedX({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.failedX, style]}>
      <Feather name="x" size={44} color="#FFFFFF" />
    </Animated.View>
  );
}

function ScanningDots({ visible }: { visible: boolean }) {
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotate.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotate.value = 0;
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.scanRing, style]}>
      <View style={styles.scanDot} />
    </Animated.View>
  );
}

export default function PaymentAnimation({ status, color }: PaymentAnimationProps) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;
  const scanColor = colors.secondary;

  const nfcOpacity = useSharedValue(1);
  useEffect(() => {
    if (status === "success" || status === "failed") {
      nfcOpacity.value = withTiming(0, { duration: 200 });
    } else {
      nfcOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  const nfcStyle = useAnimatedStyle(() => ({ opacity: nfcOpacity.value }));

  return (
    <View style={styles.container}>
      {/* Pulse rings */}
      <PulseRing delay={0} color={status === "scanning" ? scanColor : activeColor} status={status} />
      <PulseRing delay={600} color={status === "scanning" ? scanColor : activeColor} status={status} />
      <PulseRing delay={1200} color={status === "scanning" ? scanColor : activeColor} status={status} />

      {/* Center circle */}
      <View style={[styles.centerCircle, { backgroundColor: status === "scanning" ? scanColor : activeColor }]}>
        <ScanningDots visible={status === "scanning"} />
        <Animated.View style={nfcStyle}>
          <Feather name="wifi" size={52} color="rgba(255,255,255,0.9)" />
        </Animated.View>
        <SuccessCheck visible={status === "success"} />
        <FailedX visible={status === "failed"} />
      </View>
    </View>
  );
}

const RING_SIZE = 220;
const CENTER_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
  centerCircle: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  scanRing: {
    alignItems: "center",
    justifyContent: "flex-start",
    borderRadius: CENTER_SIZE / 2,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  successCheck: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  failedX: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

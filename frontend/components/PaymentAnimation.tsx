import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export type PaymentStatus = "idle" | "scanning" | "success" | "failed";

interface PaymentAnimationProps {
  status: PaymentStatus;
  color?: string;
}

const RING_SIZE = 220;
const CENTER_SIZE = 110;

function PulseRing({ delay, color, active }: { delay: number; color: string; active: boolean }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    anim.current?.stop();
    if (active) {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      anim.current.start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
    return () => anim.current?.stop();
  }, [active]);

  return (
    <Animated.View
      style={[styles.pulseRing, { borderColor: color, backgroundColor: `${color}10` }, { transform: [{ scale }], opacity }]}
    />
  );
}

export default function PaymentAnimation({ status, color = "#1B5E20" }: PaymentAnimationProps) {
  const isScanning = status === "scanning";
  const isSuccess = status === "success";
  const isFailed = status === "failed";

  const iconOpacity = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const failScale = useRef(new Animated.Value(0)).current;
  const centerColor = isSuccess ? "#10B981" : isFailed ? "#EF4444" : color;

  useEffect(() => {
    if (isSuccess) {
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
      failScale.setValue(0);
    } else if (isFailed) {
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.spring(failScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
      successScale.setValue(0);
    } else {
      Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      successScale.setValue(0);
      failScale.setValue(0);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <PulseRing delay={0} color={color} active={isScanning} />
      <PulseRing delay={600} color={color} active={isScanning} />
      <PulseRing delay={1200} color={color} active={isScanning} />

      <View style={[styles.centerCircle, { backgroundColor: centerColor }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, { opacity: iconOpacity }]}>
          <Feather name="wifi" size={48} color="rgba(255,255,255,0.9)" />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, { transform: [{ scale: successScale }] }]}>
          <Feather name="check" size={48} color="#FFF" />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, { transform: [{ scale: failScale }] }]}>
          <Feather name="x" size={48} color="#FFF" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 1.5 },
  centerCircle: { width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: CENTER_SIZE / 2, alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  center: { alignItems: "center", justifyContent: "center" },
});

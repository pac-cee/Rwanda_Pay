import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface BarData { label: string; value: number; }
interface AnalyticsChartProps { data: BarData[]; maxHeight?: number; activeColor?: string; }

function AnimatedBar({ value, maxValue, maxHeight, color, label, index }: {
  value: number; maxValue: number; maxHeight: number; color: string; label: string; index: number;
}) {
  const colors = useColors();
  const targetHeight = maxValue > 0 ? (value / maxValue) * maxHeight : 0;
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, { toValue: targetHeight, duration: 600, delay: index * 60, useNativeDriver: false }).start();
  }, [targetHeight]);

  return (
    <View style={styles.barCol}>
      <Animated.View style={[styles.bar, { height: heightAnim, backgroundColor: color, borderRadius: 6 }]} />
      <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsChart({ data, maxHeight = 120, activeColor }: AnalyticsChartProps) {
  const colors = useColors();
  const barColor = activeColor ?? colors.primary;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height: maxHeight + 28 }]}>
      <View style={[StyleSheet.absoluteFillObject, styles.grid]} pointerEvents="none">
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <View key={frac} style={[styles.gridLine, { bottom: frac * maxHeight + 28, borderColor: colors.border }]} />
        ))}
      </View>
      <View style={styles.bars}>
        {data.map((item, i) => (
          <AnimatedBar key={item.label} value={item.value} maxValue={maxValue} maxHeight={maxHeight} color={barColor} label={item.label} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", position: "relative" },
  grid: { justifyContent: "flex-end" },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, opacity: 0.6 },
  bars: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  bar: { width: "70%", minHeight: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
});

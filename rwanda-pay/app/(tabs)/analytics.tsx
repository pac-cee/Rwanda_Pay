import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnalyticsChart from "@/components/AnalyticsChart";
import { type TransactionCategory, useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

type Period = "week" | "month";

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B35",
  transport: "#4ECDC4",
  shopping: "#A855F7",
  entertainment: "#EC4899",
  utilities: "#3B82F6",
  transfer: "#10B981",
  health: "#F59E0B",
  other: "#6B7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  utilities: "Utilities",
  transfer: "Transfers",
  health: "Health",
  other: "Other",
};

const CATEGORY_ICONS: Record<string, string> = {
  food: "coffee",
  transport: "map-pin",
  shopping: "shopping-bag",
  entertainment: "tv",
  utilities: "zap",
  transfer: "send",
  health: "heart",
  other: "more-horizontal",
};

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useWallet();
  const [period, setPeriod] = useState<Period>("week");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const cutoff = useMemo(() => {
    const now = Date.now();
    return period === "week" ? now - 7 * 86400000 : now - 30 * 86400000;
  }, [period]);

  const filtered = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          new Date(tx.date).getTime() >= cutoff &&
          (tx.type === "payment" || tx.type === "sent" || tx.type === "send")
      ),
    [transactions, cutoff]
  );

  const totalSpent = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const chartData = useMemo(() => {
    const days =
      period === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["W1", "W2", "W3", "W4"];
    const buckets: Record<string, number> = {};
    days.forEach((d) => (buckets[d] = 0));

    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      if (period === "week") {
        const dayIdx = (d.getDay() + 6) % 7;
        buckets[days[dayIdx]] = (buckets[days[dayIdx]] || 0) + tx.amount;
      } else {
        const weekIdx = Math.min(3, Math.floor(d.getDate() / 8));
        buckets[days[weekIdx]] = (buckets[days[weekIdx]] || 0) + tx.amount;
      }
    });

    return days.map((label) => ({ label, value: buckets[label] }));
  }, [filtered, period]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach((tx) => {
      const cat = tx.category ?? "other";
      totals[cat] = (totals[cat] ?? 0) + tx.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      </View>

      <View style={[styles.periodBar, { backgroundColor: colors.muted }]}>
        {(["week", "month"] as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodItem, p === period && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: p === period ? "#FFFFFF" : colors.mutedForeground }]}>
              {p === "week" ? "This Week" : "This Month"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.totalLabel}>
          {period === "week" ? "Spent This Week" : "Spent This Month"}
        </Text>
        <Text style={styles.totalAmount}>{totalSpent.toLocaleString("en-RW")} RWF</Text>
        <Text style={styles.totalSub}>{filtered.length} transactions</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {period === "week" ? "Daily Spending" : "Weekly Spending"}
        </Text>
        <AnalyticsChart data={chartData} maxHeight={130} activeColor={colors.primary} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>By Category</Text>
        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No data for this period
            </Text>
          </View>
        ) : (
          <View style={styles.categories}>
            {categoryBreakdown.map(([cat, amount]) => {
              const pct = totalSpent > 0 ? amount / totalSpent : 0;
              const catColor = CATEGORY_COLORS[cat] ?? "#6B7280";
              const catLabel = CATEGORY_LABELS[cat] ?? cat;
              const catIcon = CATEGORY_ICONS[cat] ?? "more-horizontal";
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIcon, { backgroundColor: `${catColor}20` }]}>
                      <Feather name={catIcon as any} size={14} color={catColor} />
                    </View>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{catLabel}</Text>
                  </View>
                  <View style={styles.catRight}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(pct * 100)}%`, backgroundColor: catColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.catAmount, { color: colors.foreground }]}>
                      {amount.toLocaleString("en-RW")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  periodBar: {
    flexDirection: "row", marginHorizontal: 24,
    borderRadius: 14, padding: 4, marginBottom: 20,
  },
  periodItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  periodText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalCard: { marginHorizontal: 20, borderRadius: 20, padding: 24, marginBottom: 16, gap: 6 },
  totalLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  totalAmount: { color: "#FFFFFF", fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  totalSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" },
  card: {
    marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 16,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  categories: { gap: 14 },
  catRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 10, width: 130 },
  catIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  catRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  catAmount: { fontSize: 12, fontFamily: "Inter_500Medium", width: 70, textAlign: "right" },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

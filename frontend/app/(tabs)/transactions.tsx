import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TransactionRow from "@/components/TransactionRow";
import { Transaction, TransactionType, useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | TransactionType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "payment", label: "Payments" },
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
];

function groupByDate(txs: Transaction[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const groups: { label: string; data: Transaction[] }[] = [];
  const buckets: Record<string, Transaction[]> = {};

  txs.forEach((tx) => {
    const d = new Date(tx.date).toDateString();
    const label =
      d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(tx.date).toLocaleDateString("en-RW", { weekday: "long", month: "short", day: "numeric" });
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(tx);
  });

  for (const label in buckets) {
    groups.push({ label, data: buckets[label] });
  }
  return groups;
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useWallet();
  const [filter, setFilter] = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const totalSpent = useMemo(
    () => transactions.filter((t) => t.type === "payment" || t.type === "sent").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  type ListItem =
    | { type: "header"; label: string }
    | { type: "tx"; tx: Transaction; isLast: boolean };

  const listData: ListItem[] = [];
  groups.forEach((g) => {
    listData.push({ type: "header", label: g.label });
    g.data.forEach((tx, i) =>
      listData.push({ type: "tx", tx, isLast: i === g.data.length - 1 })
    );
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={listData}
        keyExtractor={(item, idx) =>
          item.type === "header" ? `h-${item.label}` : `tx-${item.tx.id}-${idx}`
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingTop: topPad + 20, paddingHorizontal: 24, gap: 16 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Transactions</Text>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.summaryLabel}>Total Spent This Week</Text>
              <Text style={styles.summaryAmount}>
                {totalSpent.toLocaleString("en-RW")} RWF
              </Text>
            </View>

            {/* Filters */}
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        filter === f.key ? colors.primary : colors.muted,
                    },
                  ]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: filter === f.key ? "#FFFFFF" : colors.mutedForeground },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                {item.label}
              </Text>
            );
          }
          const { tx, isLast } = item;
          return (
            <View style={[styles.txGroup, { backgroundColor: colors.card }]}>
              <TransactionRow transaction={tx} showBorder={!isLast} />
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  summaryCard: {
    borderRadius: 18,
    padding: 20,
    gap: 6,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  summaryAmount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  txGroup: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});

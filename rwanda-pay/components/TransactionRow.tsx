import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Transaction, TransactionCategory } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, string> = {
  food: "coffee",
  transport: "map-pin",
  shopping: "shopping-bag",
  entertainment: "tv",
  utilities: "zap",
  health: "heart",
  education: "book",
  other: "circle",
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B35",
  transport: "#4ECDC4",
  shopping: "#A855F7",
  entertainment: "#EC4899",
  utilities: "#3B82F6",
  health: "#EF4444",
  education: "#F59E0B",
  other: "#6B7280",
};

// Incoming transaction types
const INCOMING_TYPES = new Set(["receive", "topup"]);

function formatAmount(amount: number, type: Transaction["type"]): string {
  const formatted = amount.toLocaleString("en-RW");
  return INCOMING_TYPES.has(type) ? `+${formatted}` : `-${formatted}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString("en-RW", { month: "short", day: "numeric" });
}

interface TransactionRowProps {
  transaction: Transaction;
  showBorder?: boolean;
  hideAmount?: boolean;
  onPress?: () => void;
}

export default function TransactionRow({
  transaction,
  showBorder = true,
  hideAmount = false,
  onPress,
}: TransactionRowProps) {
  const colors = useColors();
  const cat = transaction.category ?? "other";
  const iconName = (CATEGORY_ICONS[cat] ?? "circle") as any;
  const iconColor = CATEGORY_COLORS[cat] ?? "#6B7280";
  const isPositive = INCOMING_TYPES.has(transaction.type);
  const amountColor = isPositive ? colors.success : colors.foreground;

  const inner = (
    <View
      style={[
        styles.row,
        showBorder && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Feather name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.merchant, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.merchantName}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(transaction.date)}
          </Text>
          {transaction.status === "pending" && (
            <View style={[styles.pendingBadge, { backgroundColor: "#F59E0B30" }]}>
              <Text style={[styles.pendingText, { color: "#F59E0B" }]}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: hideAmount ? colors.mutedForeground : amountColor }]}>
          {hideAmount ? "••••••" : formatAmount(transaction.amount, transaction.type)}
        </Text>
        {!hideAmount && (
          <Text style={[styles.currency, { color: colors.mutedForeground }]}>RWF</Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  merchant: { fontSize: 15, fontFamily: "Inter_500Medium" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pendingBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  amountWrap: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
});

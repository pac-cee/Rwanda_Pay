import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Transaction, TransactionCategory } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  food: "coffee",
  transport: "map-pin",
  shopping: "shopping-bag",
  entertainment: "tv",
  utilities: "zap",
  transfer: "send",
};

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  food: "#FF6B35",
  transport: "#4ECDC4",
  shopping: "#A855F7",
  entertainment: "#EC4899",
  utilities: "#3B82F6",
  transfer: "#10B981",
};

function formatAmount(amount: number, type: Transaction["type"]): string {
  const formatted = amount.toLocaleString("en-RW");
  if (type === "received") return `+${formatted}`;
  return `-${formatted}`;
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
}

export default function TransactionRow({
  transaction,
  showBorder = true,
}: TransactionRowProps) {
  const colors = useColors();
  const iconName = CATEGORY_ICONS[transaction.category] as any;
  const iconColor = CATEGORY_COLORS[transaction.category];
  const isPositive = transaction.type === "received";
  const amountColor = isPositive ? colors.success : colors.foreground;

  return (
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
            <View style={[styles.pendingBadge, { backgroundColor: `${colors.accent}30` }]}>
              <Text style={[styles.pendingText, { color: colors.accent }]}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>
        <Text style={[styles.currency, { color: colors.mutedForeground }]}>RWF</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  merchant: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  amountWrap: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  currency: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});

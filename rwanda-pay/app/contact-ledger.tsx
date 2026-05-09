import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { transactionsApi, ApiTransaction } from "@/lib/api";

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-RW");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-RW", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LedgerData {
  contact: { id: string; name: string; email: string; initials: string };
  transactions: ApiTransaction[];
  totalSent: number;
  totalReceived: number;
  net: number;
}

function NetIndicator({ net, colors }: { net: number; colors: ReturnType<typeof useColors> }) {
  const isSent = net < 0;
  const label = isSent ? "Net sent" : net === 0 ? "Balanced" : "Net received";
  const color = net > 0 ? colors.success : net < 0 ? colors.destructive : colors.mutedForeground;
  return (
    <View style={[netStyles.wrap, { backgroundColor: `${color}12` }]}>
      <Feather name={net > 0 ? "trending-up" : net < 0 ? "trending-down" : "minus"} size={13} color={color} />
      <Text style={[netStyles.label, { color }]}>{label}</Text>
      {net !== 0 && (
        <Text style={[netStyles.amount, { color }]}>{formatAmount(Math.abs(net))} RWF</Text>
      )}
    </View>
  );
}

const netStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "center" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  amount: { fontSize: 12, fontFamily: "Inter_700Bold" },
});

function TxItem({ tx, colors }: { tx: ApiTransaction; colors: ReturnType<typeof useColors> }) {
  const isSend = tx.type === "send";
  const isReceive = tx.type === "receive";
  const color = isReceive ? colors.success : colors.destructive;
  const prefix = isReceive ? "+" : "−";

  return (
    <View style={[txStyles.wrap, { backgroundColor: colors.card }]}>
      <View style={[txStyles.iconWrap, { backgroundColor: isReceive ? `${colors.success}18` : `${colors.destructive}18` }]}>
        <Feather name={isReceive ? "arrow-down-left" : "arrow-up-right"} size={18} color={color} />
      </View>
      <View style={txStyles.info}>
        <Text style={[txStyles.desc, { color: colors.foreground }]} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={[txStyles.date, { color: colors.mutedForeground }]}>
          {formatFullDate(tx.createdAt)}
        </Text>
      </View>
      <View style={txStyles.amountWrap}>
        <Text style={[txStyles.amount, { color }]}>
          {prefix}{formatAmount(tx.amount)}
        </Text>
        <Text style={[txStyles.currency, { color: colors.mutedForeground }]}>RWF</Text>
      </View>
    </View>
  );
}

const txStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginHorizontal: 20, marginBottom: 8 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  desc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amountWrap: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
});

export default function ContactLedgerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email: string; name?: string }>();
  const email = params.email ?? "";
  const fallbackName = params.name ?? email;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const result = await transactionsApi.ledger(email);
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { load(); }, [load]);

  const contactInitials = data?.contact.initials ?? fallbackName.slice(0, 2).toUpperCase();
  const contactName = data?.contact.name ?? fallbackName;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Contact History</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={load}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.transactions ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
          ListHeaderComponent={
            <View style={{ gap: 20, paddingBottom: 8 }}>
              {/* Contact Card */}
              <View style={[styles.contactCard, { backgroundColor: colors.primary }]}>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>{contactInitials}</Text>
                </View>
                <Text style={styles.contactName}>{contactName}</Text>
                <Text style={styles.contactEmail}>{email}</Text>
                {data && <NetIndicator net={data.net} colors={colors} />}
              </View>

              {/* Stats row */}
              {data && (
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                    <View style={[styles.statIcon, { backgroundColor: `${colors.destructive}14` }]}>
                      <Feather name="arrow-up-right" size={16} color={colors.destructive} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>You sent</Text>
                    <Text style={[styles.statAmount, { color: colors.foreground }]}>
                      {formatAmount(data.totalSent)}
                    </Text>
                    <Text style={[styles.statCurrency, { color: colors.mutedForeground }]}>RWF</Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                    <View style={[styles.statIcon, { backgroundColor: `${colors.success}14` }]}>
                      <Feather name="arrow-down-left" size={16} color={colors.success} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>You received</Text>
                    <Text style={[styles.statAmount, { color: colors.foreground }]}>
                      {formatAmount(data.totalReceived)}
                    </Text>
                    <Text style={[styles.statCurrency, { color: colors.mutedForeground }]}>RWF</Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                    <View style={[styles.statIcon, { backgroundColor: `${colors.primary}14` }]}>
                      <Feather name="repeat" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transfers</Text>
                    <Text style={[styles.statAmount, { color: colors.foreground }]}>
                      {data.transactions.length}
                    </Text>
                    <Text style={[styles.statCurrency, { color: colors.mutedForeground }]}>total</Text>
                  </View>
                </View>
              )}

              {/* Section title */}
              {(data?.transactions.length ?? 0) > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  TRANSACTION HISTORY
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="inbox" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No transfers yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Your transaction history with {contactName} will appear here
                </Text>
                <Pressable
                  style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/send")}
                >
                  <Feather name="send" size={16} color="#FFF" />
                  <Text style={styles.sendBtnText}>Send Money</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => <TxItem tx={item} colors={colors} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  retryText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  contactCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#FFF", fontSize: 26, fontFamily: "Inter_700Bold" },
  contactName: { color: "#FFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  contactEmail: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  divider: { width: StyleSheet.hairlineWidth },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statCurrency: { fontSize: 9, fontFamily: "Inter_400Regular" },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sendBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 8 },
  sendBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

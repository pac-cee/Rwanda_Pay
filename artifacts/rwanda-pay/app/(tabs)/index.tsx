import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CardView from "@/components/CardView";
import TransactionRow from "@/components/TransactionRow";
import { Card, useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

const QUICK_ACTIONS = [
  { icon: "wifi", label: "Pay", route: "/(tabs)/pay" as const, primary: true },
  { icon: "send", label: "Send", route: "/send" as const, primary: false },
  { icon: "download", label: "Receive", route: "/receive" as const, primary: false },
  { icon: "plus", label: "Add Card", route: "/add-card" as const, primary: false },
];

const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B35",
  transport: "#4ECDC4",
  shopping: "#A855F7",
  entertainment: "#EC4899",
  utilities: "#3B82F6",
  transfer: "#10B981",
};

function InsightBar({
  label,
  amount,
  color,
  max,
}: {
  label: string;
  amount: number;
  color: string;
  max: number;
}) {
  const colors = useColors();
  const pct = max > 0 ? Math.min(amount / max, 1) : 0;
  return (
    <View style={insightStyles.row}>
      <View style={[insightStyles.dot, { backgroundColor: color }]} />
      <Text style={[insightStyles.label, { color: colors.foreground }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[insightStyles.track, { backgroundColor: colors.muted }]}>
        <View style={[insightStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[insightStyles.amount, { color: colors.mutedForeground }]}>
        {(amount / 1000).toFixed(0)}k
      </Text>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", width: 70 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  amount: { fontSize: 11, fontFamily: "Inter_400Regular", width: 30, textAlign: "right" },
});

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    cards,
    transactions,
    setSelectedCardId,
    totalBalance,
    hideBalance,
    toggleHideBalance,
    notificationCount,
    clearNotifications,
    profile,
  } = useWallet();

  const [activeIndex, setActiveIndex] = useState(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const recentTx = transactions.slice(0, 4);

  const thisWeekSpend = transactions
    .filter(
      (t) =>
        (t.type === "payment" || t.type === "sent") &&
        Date.now() - new Date(t.date).getTime() < 7 * 86400000
    )
    .reduce((s, t) => s + t.amount, 0);

  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "payment" || t.type === "sent")
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + t.amount;
    });
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxCat = topCategories[0]?.[1] ?? 1;

  const renderCard = ({ item, index }: { item: Card; index: number }) => (
    <View style={{ width: CARD_WIDTH, marginHorizontal: 4 }}>
      <Pressable
        onPress={() => {
          setSelectedCardId(item.id);
          router.push("/(tabs)/pay");
        }}
      >
        <CardView card={item} isSelected={index === activeIndex} hideBalance={hideBalance} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <View style={styles.topLeft}>
          <Pressable
            style={[styles.avatar, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </Pressable>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good morning 👋</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{profile.name}</Text>
          </View>
        </View>
        <Pressable
          style={styles.notifWrap}
          onPress={() => {
            clearNotifications();
          }}
        >
          <Feather name="bell" size={22} color={colors.foreground} />
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Total balance */}
      <View style={styles.balanceRow}>
        <View>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
          <Text style={[styles.balanceAmount, { color: colors.foreground }]}>
            {hideBalance ? "•••••••" : totalBalance.toLocaleString("en-RW")}
            {!hideBalance && (
              <Text style={[styles.balanceCurrency, { color: colors.mutedForeground }]}> RWF</Text>
            )}
          </Text>
        </View>
        <Pressable style={[styles.eyeBtn, { backgroundColor: colors.muted }]} onPress={toggleHideBalance}>
          <Feather name={hideBalance ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Card carousel */}
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 8}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 8));
          setActiveIndex(idx);
          if (cards[idx]) setSelectedCardId(cards[idx].id);
        }}
        scrollEventThrottle={16}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? colors.primary : colors.border, width: i === activeIndex ? 20 : 6 },
            ]}
          />
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: a.primary ? colors.primary : colors.card, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => router.push(a.route as any)}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.primary ? "rgba(255,255,255,0.18)" : colors.muted }]}>
              <Feather name={a.icon as any} size={18} color={a.primary ? "#FFFFFF" : colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: a.primary ? "#FFFFFF" : colors.foreground }]}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Insights */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Insights</Text>
        <Text style={[styles.weekTag, { color: colors.mutedForeground }]}>This week</Text>
      </View>

      <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
        <View style={styles.insightTop}>
          <View>
            <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Spent</Text>
            <Text style={[styles.insightAmount, { color: colors.foreground }]}>
              {hideBalance ? "•••••••" : thisWeekSpend.toLocaleString("en-RW") + " RWF"}
            </Text>
          </View>
          <View style={[styles.insightBadge, { backgroundColor: `${colors.primary}18` }]}>
            <Feather name="trending-down" size={14} color={colors.primary} />
            <Text style={[styles.insightBadgeText, { color: colors.primary }]}>-8%</Text>
          </View>
        </View>
        {topCategories.length > 0 ? (
          topCategories.map(([cat, amt]) => (
            <InsightBar
              key={cat}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              amount={amt}
              color={CATEGORY_COLORS[cat] ?? colors.primary}
              max={maxCat}
            />
          ))
        ) : (
          <Text style={[styles.noData, { color: colors.mutedForeground }]}>No spending data yet</Text>
        )}
      </View>

      {/* Recent transactions */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
        <Pressable onPress={() => router.push("/transactions-full")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
        </Pressable>
      </View>

      <View style={[styles.txCard, { backgroundColor: colors.card }]}>
        {recentTx.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
          </View>
        ) : (
          recentTx.map((tx, i) => (
            <TransactionRow key={tx.id} transaction={tx} showBorder={i < recentTx.length - 1} hideAmount={hideBalance} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 1 },
  notifWrap: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_700Bold" },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  balanceAmount: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  balanceCurrency: { fontSize: 16, fontFamily: "Inter_400Regular" },
  eyeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginVertical: 6 },
  dot: { height: 6, borderRadius: 3 },
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  weekTag: { fontSize: 13, fontFamily: "Inter_400Regular" },
  seeAll: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  insightCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  insightTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  insightLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  insightAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  insightBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  insightBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noData: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },
  txCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

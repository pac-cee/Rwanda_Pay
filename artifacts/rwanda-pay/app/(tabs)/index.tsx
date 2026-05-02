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

function QuickAction({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: primary ? colors.primary : colors.card,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Feather
        name={icon as any}
        size={22}
        color={primary ? "#FFFFFF" : colors.primary}
      />
      <Text
        style={[
          styles.quickLabel,
          { color: primary ? "#FFFFFF" : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cards, transactions, setSelectedCardId, totalBalance } = useWallet();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Card>>(null);

  const recentTx = transactions.slice(0, 5);

  const topPad =
    Platform.OS === "web" ? 67 : insets.top;

  const renderCard = ({ item, index }: { item: Card; index: number }) => (
    <View style={{ width: CARD_WIDTH, marginHorizontal: 4 }}>
      <Pressable
        onPress={() => {
          setSelectedCardId(item.id);
          router.push("/(tabs)/pay");
        }}
      >
        <CardView card={item} isSelected={index === activeIndex} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good morning
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            Alex Mugisha
          </Text>
        </View>
        <Pressable
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          onPress={() => {}}
        >
          <Text style={styles.avatarText}>AM</Text>
        </Pressable>
      </View>

      {/* Total balance */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
          Total Balance
        </Text>
        <Text style={[styles.totalBalance, { color: colors.foreground }]}>
          {totalBalance.toLocaleString("en-RW")}
          <Text style={[styles.balanceCurrency, { color: colors.mutedForeground }]}>
            {" "}RWF
          </Text>
        </Text>
      </View>

      {/* Cards carousel */}
      <FlatList
        ref={flatListRef}
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 8}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardList}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / (CARD_WIDTH + 8)
          );
          setActiveIndex(idx);
          if (cards[idx]) setSelectedCardId(cards[idx].id);
        }}
      />

      {/* Page dots */}
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? colors.primary : colors.border,
                width: i === activeIndex ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <QuickAction
          icon="credit-card"
          label="Pay"
          onPress={() => router.push("/(tabs)/pay")}
          primary
        />
        <QuickAction
          icon="send"
          label="Send"
          onPress={() => router.push("/(tabs)/transfer")}
        />
        <QuickAction
          icon="download"
          label="Receive"
          onPress={() => router.push("/(tabs)/transfer")}
        />
        <QuickAction
          icon="plus"
          label="Add Card"
          onPress={() => router.push("/add-card")}
        />
      </View>

      {/* Recent transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/transactions")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              See all
            </Text>
          </Pressable>
        </View>
        <View
          style={[styles.txCard, { backgroundColor: colors.card }]}
        >
          {recentTx.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No transactions yet
              </Text>
            </View>
          ) : (
            recentTx.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                showBorder={i < recentTx.length - 1}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  balanceSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  totalBalance: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  balanceCurrency: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
  },
  cardList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
    marginBottom: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  txCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});

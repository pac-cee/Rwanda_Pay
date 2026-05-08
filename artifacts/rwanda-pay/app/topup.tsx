import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const PRIMARY = "#1B5E20";
const ACCENT = "#FFD600";

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

function formatAmount(n: number): string {
  return n.toLocaleString("en-RW") + " RWF";
}

export default function TopUpScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { cards, refreshWallet } = useWallet();
  const { walletBalance, setWalletBalance } = useAuth();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];

  useEffect(() => {
    if (defaultCard) setSelectedCardId(defaultCard.id);
  }, [defaultCard?.id]);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const handlePreset = (val: number) => setAmount(String(val));

  const handleTopUp = async () => {
    const amt = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!amt || amt < 500) {
      Alert.alert("Invalid amount", "Minimum top-up is 500 RWF.");
      return;
    }
    if (!selectedCardId) {
      Alert.alert("No card", "Please select a card.");
      return;
    }
    setLoading(true);
    try {
      const { walletApi } = await import("@/lib/api");
      const { balance } = await walletApi.topup({ cardId: selectedCardId, amount: amt });
      setWalletBalance(balance);
      await refreshWallet();
      Alert.alert("Success!", `${formatAmount(amt)} added to your wallet.`, [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Top-up failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Top Up Wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current balance */}
        <View style={[styles.balanceCard, { backgroundColor: PRIMARY }]}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>{formatAmount(walletBalance)}</Text>
          <Text style={styles.balanceSub}>Funds available for payments</Text>
        </View>

        {/* Source card */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          CHARGE FROM
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {cards.map((card) => (
            <Pressable
              key={card.id}
              style={[
                styles.cardChip,
                { borderColor: selectedCardId === card.id ? PRIMARY : colors.border },
                selectedCardId === card.id && styles.cardChipActive,
              ]}
              onPress={() => setSelectedCardId(card.id)}
            >
              <View style={[styles.cardDot, { backgroundColor: card.color }]} />
              <View>
                <Text style={[styles.cardChipName, { color: colors.foreground }]}>
                  {card.cardName}
                </Text>
                <Text style={[styles.cardChipLast4, { color: colors.mutedForeground }]}>
                  ••••{card.last4}
                </Text>
              </View>
              {selectedCardId === card.id && (
                <Feather name="check-circle" size={16} color={PRIMARY} />
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Amount input */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AMOUNT (RWF)</Text>
        <View style={[styles.amountWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.amountPrefix, { color: colors.mutedForeground }]}>RWF</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.foreground }]}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
          />
        </View>

        {/* Preset amounts */}
        <View style={styles.presets}>
          {PRESET_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              style={({ pressed }) => [
                styles.preset,
                { borderColor: amount === String(val) ? PRIMARY : colors.border, backgroundColor: amount === String(val) ? "#E8F5E9" : colors.card },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handlePreset(val)}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: amount === String(val) ? PRIMARY : colors.foreground },
                ]}
              >
                {val >= 1000 ? `${val / 1000}K` : val}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Confirm button */}
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            { opacity: pressed || loading || !selectedCard ? 0.75 : 1 },
          ]}
          onPress={handleTopUp}
          disabled={loading || !selectedCard}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="arrow-down-circle" size={20} color="#FFF" />
              <Text style={styles.confirmText}>
                Add {amount ? formatAmount(parseInt(amount, 10) || 0) : "to Wallet"}
              </Text>
            </>
          )}
        </Pressable>

        {selectedCard && (
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Funds will be instantly added from{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>
              {selectedCard.cardName} ••••{selectedCard.last4}
            </Text>
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, gap: 16 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  balanceLabel: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_500Medium" },
  balanceAmount: { color: "#FFF", fontSize: 36, fontFamily: "Inter_700Bold" },
  balanceSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  cardsRow: { gap: 10, paddingRight: 4 },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "#FFF",
  },
  cardChipActive: { backgroundColor: "#F0FAF0" },
  cardDot: { width: 10, height: 10, borderRadius: 5 },
  cardChipName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardChipLast4: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 64,
    gap: 10,
  },
  amountPrefix: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  amountInput: { flex: 1, fontSize: 32, fontFamily: "Inter_700Bold", padding: 0 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  presetText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: {
    height: 58,
    backgroundColor: PRIMARY,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  confirmText: { color: "#FFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  disclaimer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});

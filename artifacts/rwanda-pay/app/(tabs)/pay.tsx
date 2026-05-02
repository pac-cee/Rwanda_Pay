import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
import CardView from "@/components/CardView";
import PaymentAnimation, { PaymentStatus } from "@/components/PaymentAnimation";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

export default function PayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCard, addTransaction } = useWallet();
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePay = async () => {
    if (!selectedCard) return;
    if (status === "scanning" || status === "success") return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus("scanning");
    setResultMsg("");

    await new Promise((r) => setTimeout(r, 2400));

    const amountNum = parseFloat(amount.replace(/,/g, "")) || Math.floor(Math.random() * 20000) + 1000;
    const merchantName = merchant.trim() || "Unknown Merchant";

    // Simulate success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus("success");
    setResultMsg(`Payment of ${amountNum.toLocaleString("en-RW")} RWF sent to ${merchantName}`);

    addTransaction({
      merchantName,
      amount: amountNum,
      date: new Date().toISOString(),
      status: "success",
      type: "payment",
      category: "shopping",
      cardId: selectedCard.id,
    });

    await new Promise((r) => setTimeout(r, 3000));
    setStatus("idle");
    setMerchant("");
    setAmount("");
    setResultMsg("");
  };

  const handleReset = () => {
    setStatus("idle");
    setResultMsg("");
    setMerchant("");
    setAmount("");
  };

  const canPay = status === "idle";

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.foreground }]}>Tap to Pay</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {status === "idle" && "Hold near NFC terminal to pay"}
          {status === "scanning" && "Detecting terminal…"}
          {status === "success" && "Payment successful!"}
          {status === "failed" && "Payment failed. Try again."}
        </Text>

        {/* Card preview */}
        {selectedCard ? (
          <View style={styles.cardWrap}>
            <CardView card={selectedCard} isSelected compact={false} />
          </View>
        ) : (
          <View style={[styles.noCard, { backgroundColor: colors.muted }]}>
            <Text style={[styles.noCardText, { color: colors.mutedForeground }]}>
              No card selected
            </Text>
          </View>
        )}

        {/* NFC Animation */}
        <View style={styles.animationWrap}>
          <PaymentAnimation
            status={status}
            color={selectedCard?.color ?? colors.primary}
          />
        </View>

        {/* Result message */}
        {resultMsg !== "" && (
          <View style={[styles.resultBox, { backgroundColor: `${colors.success}18` }]}>
            <Text style={[styles.resultText, { color: colors.success }]}>{resultMsg}</Text>
          </View>
        )}

        {/* Merchant + Amount fields */}
        {status === "idle" && (
          <View style={styles.fields}>
            <View
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Merchant (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Simba Supermarket"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Amount (RWF)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Action button */}
        {status !== "success" ? (
          <Pressable
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: canPay ? (selectedCard?.color ?? colors.primary) : colors.muted,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handlePay}
            disabled={!canPay || !selectedCard}
          >
            <Text style={[styles.payBtnText, { color: canPay ? "#FFFFFF" : colors.mutedForeground }]}>
              {status === "scanning" ? "Processing…" : "Hold to Pay"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.payBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleReset}
          >
            <Text style={[styles.payBtnText, { color: "#FFFFFF" }]}>Done</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-start",
    marginTop: -12,
  },
  cardWrap: {
    width: "100%",
  },
  noCard: {
    width: "100%",
    height: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noCardText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  animationWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  resultBox: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
  },
  resultText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  fields: {
    width: "100%",
    gap: 12,
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  payBtn: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  payBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});

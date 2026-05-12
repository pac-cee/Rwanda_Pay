import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import PaymentAnimation, { PaymentStatus } from "@/components/PaymentAnimation";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

type FlowState =
  | "idle"
  | "scanning"
  | "terminal_found"
  | "auth_prompt"
  | "processing"
  | "success"
  | "failed"
  | "auth_failed";

const STATUS_MESSAGES: Record<FlowState, string> = {
  idle: "Position near a payment terminal",
  scanning: "Scanning for terminal…",
  terminal_found: "Terminal detected! Authenticate to pay",
  auth_prompt: "Authenticating…",
  processing: "Processing payment…",
  success: "Payment successful!",
  failed: "Payment failed. Try again.",
  auth_failed: "Authentication failed. Try again.",
};

function FaceIdIcon({ size = 60 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Feather name="camera" size={size * 0.6} color={colors.primary} />
    </View>
  );
}

function AuthModal({
  visible,
  onAuth,
  onCancel,
  cardColor,
}: {
  visible: boolean;
  onAuth: (ok: boolean) => void;
  onCancel: () => void;
  cardColor: string;
}) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Pressable style={authStyles.backdrop} onPress={onCancel} />
      <Animated.View
        style={[
          authStyles.sheet,
          { backgroundColor: colors.card },
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={[authStyles.handle, { backgroundColor: colors.border }]} />
        <View style={[authStyles.iconCircle, { backgroundColor: `${cardColor}18` }]}>
          <Feather name="lock" size={36} color={cardColor} />
        </View>
        <Text style={[authStyles.title, { color: colors.foreground }]}>Confirm Payment</Text>
        <Text style={[authStyles.subtitle, { color: colors.mutedForeground }]}>
          Use Face ID or fingerprint to authorise this payment
        </Text>
        <Pressable
          style={({ pressed }) => [
            authStyles.authBtn,
            { backgroundColor: cardColor, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => onAuth(true)}
        >
          <Feather name="check" size={18} color="#FFF" />
          <Text style={authStyles.authBtnText}>Authenticate</Text>
        </Pressable>
        <Pressable style={authStyles.cancelBtn} onPress={onCancel}>
          <Text style={[authStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const authStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 48,
    alignItems: "center",
    gap: 14,
  },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 8 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 8,
  },
  authBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

export default function PayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCard, cards, walletBalance, doPay, doTopup, hideBalance } = useWallet();
  const [flow, setFlow] = useState<FlowState>("idle");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paymentSource, setPaymentSource] = useState<"wallet" | "card">("wallet");
  const [selectedPayCardId, setSelectedPayCardId] = useState<string | null>(null);
  const autoScanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const selectedPayCard = cards.find((c) => c.id === selectedPayCardId);
  
  // Dynamic color based on payment source
  const activeColor = paymentSource === "wallet" 
    ? colors.primary 
    : (selectedPayCard?.color ?? colors.primary);

  const animStatus: PaymentStatus =
    flow === "idle"
      ? "idle"
      : flow === "scanning"
      ? "scanning"
      : flow === "success"
      ? "success"
      : flow === "failed" || flow === "auth_failed"
      ? "failed"
      : "idle";

  const startScan = () => {
    if (flow !== "idle") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFlow("scanning");

    // Simulate NFC terminal detection after 2.5s
    autoScanTimer.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFlow("terminal_found");
    }, 2500);
  };

  const stopScan = () => {
    if (autoScanTimer.current) clearTimeout(autoScanTimer.current);
    setFlow("idle");
  };

  const handleTerminalTap = async () => {
    if (flow !== "terminal_found") return;
    setFlow("auth_prompt");
    setShowAuthModal(true);
  };

  const handleAuth = async (confirmed: boolean) => {
    setShowAuthModal(false);
    if (!confirmed) {
      setFlow("auth_failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setFlow("idle"), 2500);
      return;
    }

    // Try real biometrics on device
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to complete payment",
          fallbackLabel: "Use PIN",
          cancelLabel: "Cancel",
        });
        if (!result.success) {
          setFlow("auth_failed");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => setFlow("idle"), 2500);
          return;
        }
      }
    } catch {}

    // Proceed with payment
    setFlow("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 1500));

    const amountNum = parseFloat(amount.replace(/,/g, "")) || Math.floor(Math.random() * 20000) + 2000;
    const merchantName = merchant.trim() || "Rwanda Merchant";

    try {
      // If paying with card, first top up wallet from card, then pay
      if (paymentSource === "card" && selectedPayCardId) {
        await doTopup(selectedPayCardId, amountNum);
      }
      
      await doPay(amountNum, merchantName, "shopping", true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlow("success");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFlow("failed");
    }

    setTimeout(() => {
      setFlow("idle");
      setMerchant("");
      setAmount("");
    }, 3000);
  };

  const reset = () => {
    if (autoScanTimer.current) clearTimeout(autoScanTimer.current);
    setFlow("idle");
    setMerchant("");
    setAmount("");
  };

  const isIdle = flow === "idle";
  const isScanning = flow === "scanning";
  const isTerminalFound = flow === "terminal_found";
  const isSuccess = flow === "success";
  const isFailed = flow === "failed" || flow === "auth_failed";
  const isAuthPrompt = flow === "auth_prompt";
  const isProcessing = flow === "processing";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={[styles.title, { color: colors.foreground }]}>Tap to Pay</Text>
          <Text style={[styles.status, { color: isSuccess ? colors.success : isFailed ? colors.destructive : colors.mutedForeground }]}>
            {STATUS_MESSAGES[flow]}
          </Text>

          {/* Payment source selector */}
          {isIdle && (
            <View style={styles.sourceSelector}>
              <Pressable
                style={[
                  styles.sourceBtn,
                  { backgroundColor: paymentSource === "wallet" ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setPaymentSource("wallet")}
              >
                <Feather name="credit-card" size={18} color={paymentSource === "wallet" ? "#FFF" : colors.foreground} />
                <Text style={[styles.sourceText, { color: paymentSource === "wallet" ? "#FFF" : colors.foreground }]}>
                  Wallet
                </Text>
                <Text style={[styles.sourceBalance, { color: paymentSource === "wallet" ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                  {hideBalance ? "••••" : walletBalance.toLocaleString()} RWF
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sourceBtn,
                  { backgroundColor: paymentSource === "card" ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setPaymentSource("card")}
              >
                <Feather name="credit-card" size={18} color={paymentSource === "card" ? "#FFF" : colors.foreground} />
                <Text style={[styles.sourceText, { color: paymentSource === "card" ? "#FFF" : colors.foreground }]}>
                  Card
                </Text>
              </Pressable>
            </View>
          )}

          {/* Card display - wallet balance or selected card */}
          {paymentSource === "wallet" ? (
            <View style={[styles.walletCard, { backgroundColor: colors.primary }]}>
              <View style={styles.walletHeader}>
                <Feather name="credit-card" size={24} color="rgba(255,255,255,0.9)" />
                <Text style={styles.walletLabel}>Rwanda Pay Wallet</Text>
              </View>
              <Text style={styles.walletBalance}>
                {hideBalance ? "•••••••" : walletBalance.toLocaleString("en-RW")}
                <Text style={styles.walletCurrency}> RWF</Text>
              </Text>
              <Text style={styles.walletSub}>Available Balance</Text>
            </View>
          ) : (
            selectedPayCard && (
              <View style={styles.cardWrap}>
                <View style={[styles.miniCard, { backgroundColor: selectedPayCard.color }]}>
                  <View style={styles.miniCardTop}>
                    <Text style={styles.miniCardBank}>{selectedPayCard.bank}</Text>
                    <Feather name="credit-card" size={20} color="rgba(255,255,255,0.8)" />
                  </View>
                  <Text style={styles.miniCardNumber}>{selectedPayCard.cardNumber}</Text>
                  <View style={styles.miniCardBottom}>
                    <Text style={styles.miniCardHolder}>{selectedPayCard.holderName}</Text>
                    <Text style={styles.miniCardExpiry}>{selectedPayCard.expiry}</Text>
                  </View>
                </View>
              </View>
            )
          )}

          {/* Card selection (only if card source) */}
          {isIdle && paymentSource === "card" && (
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
                    { borderColor: selectedPayCardId === card.id ? colors.primary : colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={() => setSelectedPayCardId(card.id)}
                >
                  <View style={[styles.cardDot, { backgroundColor: card.color }]} />
                  <View>
                    <Text style={[styles.cardChipName, { color: colors.foreground }]}>{card.bank}</Text>
                    <Text style={[styles.cardChipLast4, { color: colors.mutedForeground }]}>••{card.cardNumber.slice(-4)}</Text>
                  </View>
                  {selectedPayCardId === card.id && <Feather name="check-circle" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* NFC animation */}
          <View style={styles.animWrap}>
            <PaymentAnimation status={animStatus} color={activeColor} />
          </View>

          {/* Terminal found indicator */}
          {isTerminalFound && (
            <View style={[styles.terminalBox, { backgroundColor: `${colors.secondary}15`, borderColor: colors.secondary }]}>
              <Feather name="wifi" size={18} color={colors.secondary} />
              <Text style={[styles.terminalText, { color: colors.secondary }]}>
                Terminal detected · Tap to authenticate
              </Text>
            </View>
          )}

          {/* Success / fail */}
          {isSuccess && (
            <View style={[styles.resultBox, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.resultText, { color: colors.success }]}>
                {merchant || "Merchant"} · {parseFloat(amount || "0").toLocaleString("en-RW") || "–"} RWF
              </Text>
            </View>
          )}
          {isFailed && (
            <View style={[styles.resultBox, { backgroundColor: `${colors.destructive}12` }]}>
              <Feather name="x-circle" size={18} color={colors.destructive} />
              <Text style={[styles.resultText, { color: colors.destructive }]}>
                {flow === "auth_failed" ? "Face ID cancelled" : "Payment failed"} — Please try again
              </Text>
            </View>
          )}

          {/* Input fields (only when idle) */}
          {isIdle && (
            <View style={styles.fields}>
              <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Merchant (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground }]}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="e.g. Simba Supermarket"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount RWF (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 15000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Action buttons */}
          {isIdle && (
            <Pressable
              style={({ pressed }) => [
                styles.mainBtn,
                { 
                  backgroundColor: (paymentSource === "wallet" || selectedPayCardId) ? activeColor : colors.muted, 
                  opacity: pressed ? 0.8 : 1 
                },
              ]}
              onPress={startScan}
              disabled={paymentSource === "card" && !selectedPayCardId}
            >
              <Feather name="wifi" size={20} color={(paymentSource === "wallet" || selectedPayCardId) ? "#FFF" : colors.mutedForeground} />
              <Text style={[styles.mainBtnText, { color: (paymentSource === "wallet" || selectedPayCardId) ? "#FFF" : colors.mutedForeground }]}>
                Start Scanning
              </Text>
            </Pressable>
          )}

          {isScanning && (
            <Pressable
              style={({ pressed }) => [styles.mainBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}
              onPress={stopScan}
            >
              <Text style={[styles.mainBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          )}

          {isTerminalFound && (
            <Pressable
              style={({ pressed }) => [styles.mainBtn, { backgroundColor: activeColor, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleTerminalTap}
            >
              <Feather name="lock" size={20} color="#FFF" />
              <Text style={[styles.mainBtnText, { color: "#FFF" }]}>Authenticate & Pay</Text>
            </Pressable>
          )}

          {(isSuccess || isFailed || isAuthPrompt) && (
            <Pressable
              style={({ pressed }) => [styles.mainBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={reset}
              disabled={isAuthPrompt || isProcessing}
            >
              <Text style={[styles.mainBtnText, { color: "#FFF" }]}>
                {isAuthPrompt || isProcessing ? "Please wait…" : "Done"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth modal */}
      <AuthModal
        visible={showAuthModal}
        onAuth={handleAuth}
        onCancel={() => {
          setShowAuthModal(false);
          handleAuth(false);
        }}
        cardColor={activeColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignItems: "center", paddingHorizontal: 24, gap: 18 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", alignSelf: "flex-start" },
  status: { fontSize: 14, fontFamily: "Inter_400Regular", alignSelf: "flex-start", marginTop: -10 },
  sourceSelector: { flexDirection: "row", width: "100%", gap: 10 },
  sourceBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
  sourceText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sourceBalance: { fontSize: 12, fontFamily: "Inter_400Regular" },
  walletCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  walletHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletLabel: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  walletBalance: { color: "#FFF", fontSize: 36, fontFamily: "Inter_700Bold", marginTop: 8 },
  walletCurrency: { fontSize: 18, fontFamily: "Inter_400Regular" },
  walletSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  cardWrap: { width: "100%" },
  miniCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  miniCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  miniCardBank: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  miniCardNumber: { color: "rgba(255,255,255,0.95)", fontSize: 18, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  miniCardBottom: { flexDirection: "row", justifyContent: "space-between" },
  miniCardHolder: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  miniCardExpiry: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_500Medium" },
  cardsRow: { gap: 10, paddingRight: 4, paddingVertical: 4 },
  cardChip: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  cardDot: { width: 10, height: 10, borderRadius: 5 },
  cardChipName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardChipLast4: { fontSize: 11, fontFamily: "Inter_400Regular" },
  animWrap: { alignItems: "center", justifyContent: "center", marginVertical: 4 },
  terminalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  terminalText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: 14,
    borderRadius: 14,
  },
  resultText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  fields: { width: "100%", gap: 12 },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: 56,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  mainBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
});

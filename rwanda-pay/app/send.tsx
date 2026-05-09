import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { walletApi } from "@/lib/api";
import { Feather } from "@expo/vector-icons";

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCard, refreshWallet } = useWallet();
  const { setWalletBalance } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  const handleSend = async () => {
    const email = recipientEmail.trim().toLowerCase();
    const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10);

    if (!email) {
      Alert.alert("Missing recipient", "Please enter the recipient's email address.");
      return;
    }
    if (!amountNum || amountNum < 100) {
      Alert.alert("Invalid amount", "Minimum transfer is 100 RWF.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      const { balance } = await walletApi.transfer({
        recipient_email: email,
        amount: amountNum,
        description: note.trim() || `Transfer to ${email}`,
      });
      setWalletBalance(balance);
      await refreshWallet();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      successScale.value = withSpring(1, { damping: 12 });
      successOpacity.value = withTiming(1);

      await new Promise((r) => setTimeout(r, 2500));
      router.back();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Transfer failed", err.message ?? "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingTop: topPad + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Send Money</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.form}>
          {/* Amount input */}
          <View style={[styles.amountBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.currency, { color: colors.mutedForeground }]}>RWF</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.border}
              keyboardType="numeric"
            />
          </View>

          {/* Recipient email */}
          <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Recipient Email</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="e.g. friend@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Note */}
          <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder="What's this for?"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {selectedCard && (
            <View style={[styles.fromRow, { backgroundColor: colors.muted }]}>
              <View style={[styles.fromDot, { backgroundColor: selectedCard.color }]} />
              <Text style={[styles.fromText, { color: colors.foreground }]}>
                From {selectedCard.bank} ••••{selectedCard.last4}
              </Text>
            </View>
          )}

          {done && (
            <Animated.View style={[styles.successBox, { backgroundColor: `${colors.success}15` }, successStyle]}>
              <Feather name="check-circle" size={28} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Sent successfully!</Text>
            </Animated.View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !recipientEmail.trim() || !amount.trim() || sending ? colors.muted : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={!recipientEmail.trim() || !amount.trim() || sending}
          >
            <Text
              style={[
                styles.sendBtnText,
                { color: !recipientEmail.trim() || !amount.trim() || sending ? colors.mutedForeground : "#FFF" },
              ]}
            >
              {sending ? "Sending…" : "Send Money"}
            </Text>
          </Pressable>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            The recipient must have a Rwanda Pay account.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  form: { paddingHorizontal: 20, gap: 14, marginTop: 8 },
  amountBox: { borderRadius: 18, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  currency: { fontSize: 22, fontFamily: "Inter_600SemiBold" },
  amountInput: { flex: 1, fontSize: 40, fontFamily: "Inter_700Bold", padding: 0 },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  fromRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  fromDot: { width: 10, height: 10, borderRadius: 5 },
  fromText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  successBox: { borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 10 },
  successText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sendBtn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sendBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});

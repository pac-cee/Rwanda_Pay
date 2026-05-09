import * as Haptics from "expo-haptics";
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

type Tab = "send" | "receive";

export default function TransferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCard, refreshWallet } = useWallet();
  const { user, setWalletBalance } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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
        recipientEmail: email,
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
      setDone(false);
      successScale.value = withTiming(0);
      successOpacity.value = withTiming(0);
      setRecipientEmail("");
      setAmount("");
      setNote("");
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
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: topPad + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Transfer</Text>
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
          {(["send", "receive"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tabItem, activeTab === t && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? "#FFFFFF" : colors.mutedForeground }]}>
                {t === "send" ? "Send Money" : "Receive Money"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "send" ? (
          <View style={styles.form}>
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

            <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount (RWF)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

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
              <View style={[styles.fromCard, { backgroundColor: colors.muted }]}>
                <Feather name="credit-card" size={16} color={colors.primary} />
                <Text style={[styles.fromCardText, { color: colors.foreground }]}>
                  From: {selectedCard.bank} ••••{selectedCard.last4}
                </Text>
              </View>
            )}

            {done && (
              <Animated.View style={[styles.successOverlay, { backgroundColor: `${colors.success}15` }, successStyle]}>
                <Feather name="check-circle" size={36} color={colors.success} />
                <Text style={[styles.successText, { color: colors.success }]}>Sent successfully!</Text>
              </Animated.View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: !recipientEmail.trim() || !amount.trim() || sending ? colors.muted : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={!recipientEmail.trim() || !amount.trim() || sending}
            >
              <Text style={[styles.sendBtnText, { color: !recipientEmail.trim() || !amount.trim() || sending ? colors.mutedForeground : "#FFFFFF" }]}>
                {sending ? "Sending…" : "Send Money"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.receiveContainer}>
            <View style={[styles.idBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>Your Rwanda Pay Email</Text>
              <Text style={[styles.idValue, { color: colors.foreground }]} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
            </View>

            <Text style={[styles.receiveHint, { color: colors.mutedForeground }]}>
              Share your email address so others can send money directly to your Rwanda Pay wallet.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.copyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Feather name="copy" size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Copy Email</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", marginHorizontal: 24, borderRadius: 14, padding: 4, marginBottom: 24 },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 24, gap: 14 },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  fromCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  fromCardText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  successOverlay: { borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 10 },
  successText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sendBtn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sendBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  receiveContainer: { paddingHorizontal: 24, gap: 16, alignItems: "center" },
  idBox: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
  idLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  idValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  receiveHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 18, width: "100%", justifyContent: "center",
  },
  copyBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

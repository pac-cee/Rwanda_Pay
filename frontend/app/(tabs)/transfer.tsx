import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

type Tab = "send" | "receive";

const CONTACTS = [
  { name: "John K.", phone: "+250 788 001 234" },
  { name: "Mary U.", phone: "+250 788 002 345" },
  { name: "Eric H.", phone: "+250 788 003 456" },
  { name: "Grace M.", phone: "+250 788 004 567" },
];

function ContactChip({
  name,
  onPress,
}: {
  name: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.chipAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.chipAvatarText}>{name[0]}</Text>
      </View>
      <Text style={[styles.chipName, { color: colors.foreground }]}>{name}</Text>
    </Pressable>
  );
}

export default function TransferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, doTransfer, walletBalance, hideBalance } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = async () => {
    if (!recipient.trim() || !amount.trim()) return;
    
    // Validate email format
    if (!recipient.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    
    try {
      const amountNum = parseFloat(amount.replace(/,/g, "")) || 0;
      await doTransfer(recipient.trim(), amountNum, note.trim() || "Transfer");
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSending(false);
      setDone(true);

      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          damping: 12,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      await new Promise((r) => setTimeout(r, 2500));
      setDone(false);

      Animated.parallel([
        Animated.timing(successScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setRecipient("");
      setAmount("");
      setNote("");
    } catch (err: any) {
      setSending(false);
      setError(err.message || "Transfer failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const myId = "+250 788 555 999";

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
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 20 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Transfer</Text>
        </View>

        {/* Tab selector */}
        <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
          {(["send", "receive"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[
                styles.tabItem,
                activeTab === t && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === t ? "#FFFFFF" : colors.mutedForeground },
                ]}
              >
                {t === "send" ? "Send Money" : "Receive Money"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "send" ? (
          <View style={styles.form}>
            {/* Quick contacts */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Quick Send
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contacts}
            >
              {CONTACTS.map((c) => (
                <ContactChip
                  key={c.phone}
                  name={c.name}
                  onPress={() => setRecipient(c.name)}
                />
              ))}
            </ScrollView>

            {/* Recipient */}
            <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                To (Email Address)
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={recipient}
                onChangeText={setRecipient}
                placeholder="e.g. user@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.destructive}15` }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            {/* Amount */}
            <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Amount (RWF)
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            {/* Note */}
            <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Note (optional)
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={note}
                onChangeText={setNote}
                placeholder="What's this for?"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Wallet balance info */}
            <View style={[styles.fromCard, { backgroundColor: colors.muted }]}>
              <Feather name="credit-card" size={16} color={colors.primary} />
              <Text style={[styles.fromCardText, { color: colors.foreground }]}>
                From Wallet: {hideBalance ? "••••" : walletBalance.toLocaleString()} RWF
              </Text>
            </View>

            {/* Success overlay */}
            {done && (
              <Animated.View
                style={[
                  styles.successOverlay,
                  { backgroundColor: `${colors.success}15` },
                  {
                    transform: [{ scale: successScale }],
                    opacity: successOpacity,
                  },
                ]}
              >
                <Feather name="check-circle" size={36} color={colors.success} />
                <Text style={[styles.successText, { color: colors.success }]}>
                  Sent successfully!
                </Text>
              </Animated.View>
            )}

            {/* Send button */}
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !recipient.trim() || !amount.trim() || sending
                      ? colors.muted
                      : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={!recipient.trim() || !amount.trim() || sending}
            >
              <Text
                style={[
                  styles.sendBtnText,
                  {
                    color:
                      !recipient.trim() || !amount.trim() || sending
                        ? colors.mutedForeground
                        : "#FFFFFF",
                  },
                ]}
              >
                {sending ? "Sending…" : "Send Money"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.receiveContainer}>
            {/* QR code placeholder */}
            <View style={[styles.qrBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.qrInner}>
                {/* QR grid simulation */}
                {Array.from({ length: 7 }).map((_, row) => (
                  <View key={row} style={styles.qrRow}>
                    {Array.from({ length: 7 }).map((_, col) => {
                      const isFilled =
                        (row < 3 && col < 3) ||
                        (row < 3 && col > 3) ||
                        (row > 3 && col < 3) ||
                        (row === 3 && col === 3) ||
                        (row % 2 === 0 && col % 2 === 0);
                      return (
                        <View
                          key={col}
                          style={[
                            styles.qrCell,
                            { backgroundColor: isFilled ? colors.foreground : "transparent" },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
              <Text style={[styles.qrLabel, { color: colors.mutedForeground }]}>
                Rwanda Pay QR Code
              </Text>
            </View>

            <View style={[styles.idBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>
                Your Email (Rwanda Pay ID)
              </Text>
              <Text style={[styles.idValue, { color: colors.foreground }]}>{profile.email}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.copyBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Feather name="copy" size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Copy Payment Link</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 24,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  form: {
    paddingHorizontal: 24,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  contacts: {
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipAvatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  chipName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  field: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  fromCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fromCardText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  successOverlay: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  successText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sendBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  receiveContainer: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
  },
  qrBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  qrInner: {
    gap: 4,
  },
  qrRow: {
    flexDirection: "row",
    gap: 4,
  },
  qrCell: {
    width: 24,
    height: 24,
    borderRadius: 3,
  },
  qrLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  idBox: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  idLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  idValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    width: "100%",
    justifyContent: "center",
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});

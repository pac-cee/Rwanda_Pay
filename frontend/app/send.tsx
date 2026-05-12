import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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

const CONTACTS = [
  { name: "John K.", phone: "+250 788 001 234", initials: "JK" },
  { name: "Mary U.", phone: "+250 788 002 345", initials: "MU" },
  { name: "Eric H.", phone: "+250 788 003 456", initials: "EH" },
  { name: "Grace M.", phone: "+250 788 004 567", initials: "GM" },
  { name: "David N.", phone: "+250 788 005 678", initials: "DN" },
];

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCard, addTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const handleSend = async () => {
    if (!recipient.trim() || !amount.trim() || !selectedCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    await new Promise((r) => setTimeout(r, 1800));

    const amountNum = parseFloat(amount.replace(/,/g, "")) || 0;
    addTransaction({
      merchantName: recipient.trim(),
      amount: amountNum,
      date: new Date().toISOString(),
      status: "success",
      type: "sent",
      category: "transfer",
      cardId: selectedCard.id,
    });

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
    router.back();
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

        {/* Quick contacts */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quick Send</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 4 }}
        >
          {CONTACTS.map((c) => (
            <Pressable
              key={c.phone}
              style={({ pressed }) => [
                styles.contact,
                { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => setRecipient(c.name)}
            >
              <View style={[styles.contactAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.contactInitials}>{c.initials}</Text>
              </View>
              <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.form}>
          {/* Amount large input */}
          <View style={[styles.amountBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.currency, { color: colors.mutedForeground }]}>RWF</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.border}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>To (Name or Phone)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="e.g. +250 788 ..."
              placeholderTextColor={colors.mutedForeground}
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
            <View style={[styles.fromRow, { backgroundColor: colors.muted }]}>
              <View style={[styles.fromDot, { backgroundColor: selectedCard.color }]} />
              <Text style={[styles.fromText, { color: colors.foreground }]}>
                From {selectedCard.bank} ···{selectedCard.cardNumber.slice(-4)}
              </Text>
            </View>
          )}

          {done && (
            <Animated.View
              style={[
                styles.successBox,
                { backgroundColor: `${colors.success}15` },
                {
                  transform: [{ scale: successScale }],
                  opacity: successOpacity,
                },
              ]}
            >
              <Feather name="check-circle" size={28} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Sent successfully!</Text>
            </Animated.View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !recipient.trim() || !amount.trim() || sending ? colors.muted : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={!recipient.trim() || !amount.trim() || sending}
          >
            <Text
              style={[
                styles.sendBtnText,
                { color: !recipient.trim() || !amount.trim() || sending ? colors.mutedForeground : "#FFF" },
              ]}
            >
              {sending ? "Sending…" : "Send Money"}
            </Text>
          </Pressable>
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
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 20, marginBottom: 10 },
  contact: { alignItems: "center", padding: 12, borderRadius: 16, width: 72, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  contactInitials: { color: "#FFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  contactName: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  form: { paddingHorizontal: 20, gap: 14, marginTop: 20 },
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
});

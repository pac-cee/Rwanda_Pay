import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { walletApi } from "@/lib/api";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setWalletBalance } = useAuth();
  const { refreshWallet } = useWallet();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  const handleSend = async () => {
    const amt = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!recipientEmail.trim()) {
      Alert.alert("Missing field", "Please enter the recipient's email.");
      return;
    }
    if (!amt || amt < 100) {
      Alert.alert("Invalid amount", "Minimum transfer is 100 RWF.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing field", "Please enter a description.");
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { balance } = await walletApi.transfer({
        recipientEmail: recipientEmail.trim().toLowerCase(),
        amount: amt,
        description: description.trim(),
      });
      setWalletBalance(balance);
      await refreshWallet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Sent!",
        `${amt.toLocaleString("en-RW")} RWF sent to ${recipientEmail.trim()}.`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Transfer failed", err.message ?? "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Send Money</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="mail" size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground }]}
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="Recipient email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

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

        <View style={styles.presets}>
          {PRESET_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              style={[
                styles.preset,
                {
                  borderColor: amount === String(val) ? colors.primary : colors.border,
                  backgroundColor: amount === String(val) ? "#E8F5E9" : colors.card,
                },
              ]}
              onPress={() => setAmount(String(val))}
            >
              <Text style={[styles.presetText, { color: amount === String(val) ? colors.primary : colors.foreground }]}>
                {val >= 1000 ? `${val / 1000}K` : val}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="edit-3" size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this for? e.g. Lunch"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <Pressable
          style={[styles.sendBtn, { opacity: sending ? 0.75 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="send" size={18} color="#FFF" />
              <Text style={styles.sendBtnText}>
                Send {amount ? `${parseInt(amount, 10).toLocaleString("en-RW")} RWF` : "Money"}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = "#1B5E20";
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, gap: 14 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: -4,
  },
  field: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, height: 52, gap: 10,
  },
  fieldIcon: { width: 20 },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  amountWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 16, height: 64, gap: 10,
  },
  amountPrefix: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  amountInput: { flex: 1, fontSize: 32, fontFamily: "Inter_700Bold", padding: 0 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, minWidth: 70, alignItems: "center",
  },
  presetText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sendBtn: {
    height: 58, backgroundColor: PRIMARY, borderRadius: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginTop: 4,
  },
  sendBtnText: { color: "#FFF", fontSize: 17, fontFamily: "Inter_700Bold" },
});

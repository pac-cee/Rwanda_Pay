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
import { cardsApi } from "@/lib/api";
import { Feather } from "@expo/vector-icons";

type CardNetwork = "visa" | "mastercard" | "amex";

const NETWORKS: { key: CardNetwork; label: string }[] = [
  { key: "visa", label: "Visa" },
  { key: "mastercard", label: "Mastercard" },
  { key: "amex", label: "Amex" },
];

const COLOR_OPTIONS = [
  "#1B5E20",
  "#E65100",
  "#0D47A1",
  "#4A148C",
  "#B71C1C",
];

const NETWORK_COLORS: Record<CardNetwork, string> = {
  visa: "#1B5E20",
  mastercard: "#E65100",
  amex: "#0D47A1",
};

export default function AddCardScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { refreshWallet } = useWallet();
  const { user } = useAuth();

  const [bank, setBank] = useState("");
  const [holder, setHolder] = useState(user?.name ?? "");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [balance, setBalance] = useState("");
  const [network, setNetwork] = useState<CardNetwork>("visa");
  const [cardColor, setCardColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const formatCardNumber = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, 16);
    const groups = clean.match(/.{1,4}/g) ?? [];
    return groups.join(" ");
  };

  const formatExpiry = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, 4);
    if (clean.length > 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };

  const rawCardNum = cardNum.replace(/\s/g, "");
  const last4 = rawCardNum.slice(-4) || "####";

  const isValid =
    bank.trim().length > 0 &&
    rawCardNum.length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    holder.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;

    const balanceNum = parseInt(balance.replace(/[^0-9]/g, ""), 10) || 0;

    setSaving(true);
    try {
      await cardsApi.add({
        card_number: rawCardNum,
        expiry_date: expiry,
        cvv: cvv,
        holder_name: holder.trim(),
        network: network,
        label: bank.trim(),
        color: cardColor,
        balance: balanceNum,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshWallet();
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to add card.");
    } finally {
      setSaving(false);
    }
  };

  // Live preview card
  const previewLast4 = rawCardNum.length >= 4 ? rawCardNum.slice(-4) : "####";
  const previewExpiry = expiry || "MM/YY";
  const previewHolder = holder.trim() || "Card Holder";
  const previewBank = bank.trim() || "Bank Name";

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={c.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: c.foreground }]}>Add Card</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Live card preview */}
        <View style={[styles.previewCard, { backgroundColor: cardColor }]}>
          <View style={styles.previewTop}>
            <Text style={styles.previewBank}>{previewBank}</Text>
            <Text style={styles.previewNetwork}>{network.toUpperCase()}</Text>
          </View>
          <Text style={styles.previewNumber}>
            {rawCardNum.length > 0
              ? `${cardNum.split(" ")[0] ?? "####"} •••• •••• ${previewLast4}`
              : "**** **** **** ****"}
          </Text>
          <View style={styles.previewBottom}>
            <View>
              <Text style={styles.previewLabel}>CARD HOLDER</Text>
              <Text style={styles.previewValue}>{previewHolder}</Text>
            </View>
            <View>
              <Text style={styles.previewLabel}>EXPIRES</Text>
              <Text style={styles.previewValue}>{previewExpiry}</Text>
            </View>
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Card Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((col) => (
              <Pressable
                key={col}
                style={[
                  styles.colorDot,
                  { backgroundColor: col },
                  cardColor === col && styles.colorDotSelected,
                ]}
                onPress={() => setCardColor(col)}
              />
            ))}
          </View>
        </View>

        {/* Network picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Network</Text>
          <View style={styles.typeRow}>
            {NETWORKS.map((n) => (
              <Pressable
                key={n.key}
                style={[
                  styles.typeChip,
                  { backgroundColor: network === n.key ? c.primary : c.muted },
                ]}
                onPress={() => {
                  setNetwork(n.key);
                  setCardColor(NETWORK_COLORS[n.key]);
                }}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: network === n.key ? "#FFFFFF" : c.mutedForeground },
                  ]}
                >
                  {n.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Form fields */}
        <View style={styles.fields}>
          <Field label="Bank / Issuer *" colors={c}>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={bank}
              onChangeText={setBank}
              placeholder="e.g. Bank of Kigali"
              placeholderTextColor={c.mutedForeground}
            />
          </Field>

          <Field label="Card Holder Name *" colors={c}>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={holder}
              onChangeText={setHolder}
              placeholder="Full name on card"
              placeholderTextColor={c.mutedForeground}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Card Number * (16 digits)" colors={c}>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={cardNum}
              onChangeText={(t) => setCardNum(formatCardNumber(t))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
              maxLength={19}
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Expiry * (MM/YY)" colors={c}>
                <TextInput
                  style={[styles.fieldInput, { color: c.foreground }]}
                  value={expiry}
                  onChangeText={(t) => setExpiry(formatExpiry(t))}
                  placeholder="MM/YY"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="CVV *" colors={c}>
                <TextInput
                  style={[styles.fieldInput, { color: c.foreground }]}
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </Field>
            </View>
          </View>

          <Field label="Initial Balance (RWF)" colors={c}>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={balance}
              onChangeText={(t) => setBalance(t.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 100000"
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
            />
          </Field>
        </View>

        <Text style={[styles.securityNote, { color: c.mutedForeground }]}>
          🔒 Card details are encrypted with AES-256-GCM before storage. Raw card numbers are never stored.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: isValid ? c.primary : c.muted, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { color: isValid ? "#FFFFFF" : c.mutedForeground }]}>
              Add Card
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  previewCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    minHeight: 180,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  previewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewBank: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontFamily: "Inter_700Bold" },
  previewNetwork: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  previewNumber: { color: "#FFF", fontSize: 18, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginVertical: 16 },
  previewBottom: { flexDirection: "row", justifyContent: "space-between" },
  previewLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  previewValue: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  typeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  fields: { paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  securityNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20, marginBottom: 16, lineHeight: 18 },
  saveBtn: { marginHorizontal: 20, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
});

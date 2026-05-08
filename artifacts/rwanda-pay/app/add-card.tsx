import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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

const NETWORKS = ["visa", "mastercard", "amex"] as const;
type Network = typeof NETWORKS[number];

const COLORS = ["#1B5E20", "#E65100", "#0D47A1", "#6A1B9A", "#B71C1C", "#00695C"];

const NETWORK_LABELS: Record<Network, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
};

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function AddCardScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { refreshWallet } = useWallet();
  const { user } = useAuth();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState(user?.name ?? "");
  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState<Network>("visa");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [cvvFocused, setCvvFocused] = useState(false);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  const digits = cardNumber.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const isValid =
    digits.length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    holderName.trim().length > 0;

  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to scan your card.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      Alert.alert(
        "Card scanned",
        "Please enter your card details manually. OCR scanning coming soon.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await cardsApi.add({
        cardNumber: digits,
        expiryDate: expiry,
        cvv,
        holderName: holderName.trim(),
        network,
        label: label.trim() || undefined,
        color,
      });
      await refreshWallet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert("Failed to add card", err.message ?? "Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Card preview display
  const displayNumber = cvvFocused
    ? "**** **** **** ****"
    : digits.length > 0
    ? `${digits.slice(0, 4) || "####"} ${digits.slice(4, 8) || "####"} ${digits.slice(8, 12) || "####"} ${digits.slice(12, 16) || "####"}`
    : "**** **** **** ****";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={c.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Add Card</Text>
        <Pressable onPress={handleScan} style={styles.scanBtn}>
          <Feather name="camera" size={18} color={c.primary} />
          <Text style={[styles.scanText, { color: c.primary }]}>Scan</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: color }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>{label || "My Card"}</Text>
            <Text style={styles.cardNetwork}>{NETWORK_LABELS[network]}</Text>
          </View>
          <Text style={styles.cardNumber}>{displayNumber}</Text>
          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardMeta}>CARD HOLDER</Text>
              <Text style={styles.cardHolder}>{holderName || "Full Name"}</Text>
            </View>
            <View>
              <Text style={styles.cardMeta}>EXPIRES</Text>
              <Text style={styles.cardHolder}>{expiry || "MM/YY"}</Text>
            </View>
          </View>
        </View>

        {/* Network selector */}
        <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>NETWORK</Text>
        <View style={styles.row}>
          {NETWORKS.map((n) => (
            <Pressable
              key={n}
              style={[styles.chip, { backgroundColor: network === n ? c.primary : c.muted }]}
              onPress={() => setNetwork(n)}
            >
              <Text style={[styles.chipText, { color: network === n ? "#FFF" : c.mutedForeground }]}>
                {NETWORK_LABELS[n]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Color selector */}
        <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>CARD COLOR</Text>
        <View style={styles.row}>
          {COLORS.map((col) => (
            <Pressable
              key={col}
              style={[
                styles.colorDot,
                { backgroundColor: col },
                color === col && styles.colorDotActive,
              ]}
              onPress={() => setColor(col)}
            />
          ))}
        </View>

        {/* Card Number */}
        <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Card Number</Text>
          <TextInput
            style={[styles.fieldInput, { color: c.foreground, letterSpacing: 2 }]}
            value={cardNumber}
            onChangeText={(t) => setCardNumber(formatCardNumber(t))}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={c.mutedForeground}
            keyboardType="number-pad"
            maxLength={19}
          />
        </View>

        {/* Expiry + CVV row */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Expiry Date</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={expiry}
              onChangeText={(t) => setExpiry(formatExpiry(t))}
              placeholder="MM/YY"
              placeholderTextColor={c.mutedForeground}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={[styles.field, styles.halfField, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>CVV</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={cvv}
              onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
              placeholder="•••"
              placeholderTextColor={c.mutedForeground}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              onFocus={() => setCvvFocused(true)}
              onBlur={() => setCvvFocused(false)}
            />
          </View>
        </View>

        {/* Holder Name */}
        <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Card Holder Name</Text>
          <TextInput
            style={[styles.fieldInput, { color: c.foreground }]}
            value={holderName}
            onChangeText={setHolderName}
            placeholder="Name as on card"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        {/* Card Label (optional) */}
        <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Card Label (optional)</Text>
          <TextInput
            style={[styles.fieldInput, { color: c.foreground }]}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Bank of Kigali, MTN MoMo"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        {/* Validation hint */}
        {digits.length > 0 && digits.length < 16 && (
          <Text style={[styles.hint, { color: "#EF4444" }]}>
            Card number must be 16 digits ({digits.length}/16)
          </Text>
        )}

        {/* Save button */}
        <Pressable
          style={[
            styles.saveBtn,
            { backgroundColor: isValid ? c.primary : c.muted, opacity: loading ? 0.75 : 1 },
          ]}
          onPress={handleSave}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="plus" size={18} color={isValid ? "#FFF" : c.mutedForeground} />
              <Text style={[styles.saveBtnText, { color: isValid ? "#FFF" : c.mutedForeground }]}>
                Add Card
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.secureNote, { color: c.mutedForeground }]}>
          🔒 Your card details are stored securely and never shared
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, justifyContent: "space-between",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8 },
  scanText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, gap: 14 },

  // Card preview
  cardPreview: {
    borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    gap: 16,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardNetwork: { color: "#FFF", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardNumber: { color: "#FFF", fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1, marginBottom: 2 },
  cardHolder: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },

  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: -4,
  },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: {
    borderWidth: 3, borderColor: "#FFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  saveBtn: {
    height: 56, borderRadius: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  secureNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});

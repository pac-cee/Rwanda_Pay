import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { Card, CardType, useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";

const CARD_TYPES: { key: CardType; label: string }[] = [
  { key: "visa", label: "Visa" },
  { key: "mastercard", label: "Mastercard" },
  { key: "momo", label: "MoMo" },
];

const COLOR_OPTIONS = [
  colors.cardColors.bk,
  colors.cardColors.momo,
  colors.cardColors.im,
  colors.cardColors.equity,
  colors.cardColors.cogebanque,
];

export default function AddCardScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { addCard } = useWallet();

  const [bank, setBank] = useState("");
  const [holder, setHolder] = useState("Alex Mugisha");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardType, setCardType] = useState<CardType>("visa");
  const [cardColor, setCardColor] = useState(COLOR_OPTIONS[0]);
  const [balance, setBalance] = useState("");

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

  const validateExpiry = (expiryStr: string): boolean => {
    if (expiryStr.length !== 5) return false;
    const [month, year] = expiryStr.split("/");
    const mm = parseInt(month, 10);
    const yy = parseInt(year, 10);
    
    if (mm < 1 || mm > 12) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Get last 2 digits
    const currentMonth = now.getMonth() + 1;
    
    // Card expired if year is less than current year
    if (yy < currentYear) return false;
    
    // If same year, check month
    if (yy === currentYear && mm < currentMonth) return false;
    
    return true;
  };

  const previewCard: Card = {
    id: "preview",
    bank: bank || "Bank Name",
    holderName: holder || "Card Holder",
    cardNumber:
      cardNum.length > 0
        ? `${cardNum.split(" ")[0] ?? "####"} **** **** ${cardNum.replace(/\s/g, "").slice(-4) || "####"}`
        : "**** **** **** ****",
    expiry: expiry || "MM/YY",
    balance: 0,
    type: cardType,
    color: cardColor,
  };

  const handleSave = async () => {
    if (!bank.trim() || !cardNum.trim() || !expiry.trim()) return;
    
    // Validate expiry date
    if (!validateExpiry(expiry)) {
      alert("Invalid or expired card. Please check the expiry date.");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const balanceNum = parseInt(balance.replace(/[^0-9]/g, "") || "0", 10);
    await addCard({
      card_number: cardNum.replace(/\s/g, ""),
      expiry_date: expiry.trim(),
      cvv: "123",
      holder_name: holder.trim() || "Alex Mugisha",
      network: cardType === "momo" ? "visa" : cardType,
      label: bank.trim(),
      color: cardColor,
      balance: balanceNum,
    });
    router.back();
  };

  const isValid = bank.trim().length > 0 && cardNum.replace(/\s/g, "").length >= 12 && expiry.length === 5 && validateExpiry(expiry);

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

        {/* Card preview */}
        <View style={styles.previewWrap}>
          <CardView card={previewCard} isSelected />
        </View>

        {/* Color selector */}
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

        {/* Card type */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Card Type</Text>
          <View style={styles.typeRow}>
            {CARD_TYPES.map((t) => (
              <Pressable
                key={t.key}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      cardType === t.key ? c.primary : c.muted,
                  },
                ]}
                onPress={() => setCardType(t.key)}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: cardType === t.key ? "#FFFFFF" : c.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Form fields */}
        <View style={styles.fields}>
          {[
            { label: "Bank / Issuer", value: bank, setter: setBank, placeholder: "e.g. Bank of Kigali", keyboard: "default" as const },
            { label: "Card Holder", value: holder, setter: setHolder, placeholder: "Full name", keyboard: "default" as const },
          ].map((f) => (
            <View key={f.label} style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, { color: c.foreground }]}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={c.mutedForeground}
                keyboardType={f.keyboard}
              />
            </View>
          ))}

          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Card Number</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={cardNum}
              onChangeText={(t) => setCardNum(formatCardNumber(t))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Expiry Date</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={expiry}
              onChangeText={(t) => setExpiry(formatExpiry(t))}
              placeholder="MM/YY"
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
              maxLength={5}
            />
            {expiry.length === 5 && !validateExpiry(expiry) && (
              <Text style={[styles.errorText, { color: "#EF4444" }]}>Card is expired or invalid date</Text>
            )}
          </View>

          <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Card Balance (RWF)</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={balance}
              onChangeText={(t) => setBalance(t.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 50000"
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: isValid ? c.primary : c.muted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text
            style={[
              styles.saveBtnText,
              { color: isValid ? "#FFFFFF" : c.mutedForeground },
            ]}
          >
            Add Card
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  previewWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  fields: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
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
  saveBtn: {
    marginHorizontal: 20,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
});

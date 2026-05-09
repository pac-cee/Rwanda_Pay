import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

function QRCode({ foreground }: { foreground: string }) {
  const pattern = [
    [1,1,1,0,1,1,1],
    [1,0,1,0,1,0,1],
    [1,1,1,0,1,1,1],
    [0,1,0,1,0,0,1],
    [1,0,1,0,1,1,1],
    [0,0,0,0,0,1,0],
    [1,1,0,1,1,0,1],
  ];

  return (
    <View style={{ gap: 3 }}>
      {pattern.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 3 }}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: cell ? foreground : "transparent" }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ReceiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const displayName = user?.name ?? "";
  const displayPhone = user?.phone ?? user?.email ?? "";
  const initials = user?.initials ?? "";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingTop: topPad + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Receive Money</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.qrTitle, { color: colors.foreground }]}>Scan to Pay Me</Text>
          <Text style={[styles.qrSubtitle, { color: colors.mutedForeground }]}>
            Use any Rwanda Pay or mobile money app
          </Text>

          <View style={[styles.qrContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <QRCode foreground={colors.foreground} />
            <View style={[styles.qrCenter, { backgroundColor: colors.primary }]}>
              <Feather name="wifi" size={14} color="#FFF" />
            </View>
          </View>

          <View style={[styles.profileRow, { backgroundColor: colors.muted }]}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
              <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{displayPhone}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>Rwanda Pay ID (Email)</Text>
            <Text style={[styles.idValue, { color: colors.foreground }]} numberOfLines={1}>{user?.email ?? ""}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.copyBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Feather name="copy" size={16} color={colors.primary} />
            <Text style={[styles.copyText, { color: colors.primary }]}>Copy</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.shareBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="share-2" size={18} color="#FFF" />
          <Text style={styles.shareBtnText}>Share Payment Link</Text>
        </Pressable>

        <View style={[styles.infoBox, { backgroundColor: `${colors.secondary}12` }]}>
          <Feather name="info" size={14} color={colors.secondary} />
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            Share your email address so others can send money to your Rwanda Pay wallet.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 24 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20, gap: 16, alignItems: "center" },
  qrCard: {
    width: "100%", borderRadius: 24, padding: 24, alignItems: "center", gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  qrTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  qrSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  qrContainer: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  qrCenter: {
    position: "absolute", width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  profileRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    width: "100%", padding: 14, borderRadius: 14,
  },
  profileAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  profileInitials: { color: "#FFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  profilePhone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  idCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", borderRadius: 16, borderWidth: 1, padding: 16,
  },
  idLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  idValue: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  copyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    width: "100%", height: 54, borderRadius: 18, justifyContent: "center",
  },
  shareBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, width: "100%", alignItems: "flex-start" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});

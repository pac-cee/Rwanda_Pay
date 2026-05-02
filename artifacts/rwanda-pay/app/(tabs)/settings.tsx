import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
  destructive,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed && onPress ? 0.7 : 1 },
      ]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.settingIcon, { backgroundColor: destructive ? `${colors.destructive}18` : colors.muted }]}>
        <Feather
          name={icon as any}
          size={16}
          color={destructive ? colors.destructive : colors.primary}
        />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSubLabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        )}
      </View>
      {right ?? (
        onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, hideBalance, toggleHideBalance, cards, removeCard } = useWallet();
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const saveName = () => {
    if (editName.trim()) {
      const parts = editName.trim().split(" ");
      const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
      updateProfile({ name: editName.trim(), initials });
    }
    setEditingName(false);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>{profile.initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          {editingName ? (
            <TextInput
              style={[styles.profileNameInput, { color: "#FFF", borderBottomColor: "rgba(255,255,255,0.5)" }]}
              value={editName}
              onChangeText={setEditName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Pressable onPress={() => { setEditName(profile.name); setEditingName(true); }} style={styles.nameRow}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Feather name="edit-2" size={12} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
          <Text style={styles.profilePhone}>{profile.phone}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
        </View>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon="credit-card"
          label="My Cards"
          sublabel={`${cards.length} card${cards.length !== 1 ? "s" : ""}`}
          onPress={() => router.push("/add-card")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="list"
          label="Transaction History"
          onPress={() => router.push("/transactions-full")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="bar-chart-2"
          label="Analytics"
          onPress={() => router.push("/analytics-full")}
        />
      </View>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon={hideBalance ? "eye-off" : "eye"}
          label="Hide Balance"
          sublabel="Mask balances on cards and home"
          right={
            <Switch
              value={hideBalance}
              onValueChange={toggleHideBalance}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="bell"
          label="Notifications"
          right={
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="moon"
          label="Dark Mode"
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          }
        />
      </View>

      {/* Security */}
      <SectionHeader title="Security" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon="lock"
          label="Face ID / Fingerprint"
          sublabel="Required for every payment"
          right={
            <Switch
              value={faceIdEnabled}
              onValueChange={setFaceIdEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="key"
          label="Change PIN"
          onPress={() =>
            Alert.alert("Change PIN", "PIN management coming soon.", [{ text: "OK" }])
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="shield"
          label="Two-Factor Authentication"
          sublabel="SMS verification enabled"
          onPress={() =>
            Alert.alert("2FA", "Two-factor authentication is active.", [{ text: "OK" }])
          }
        />
      </View>

      {/* Support */}
      <SectionHeader title="Support" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon="help-circle"
          label="Help & Support"
          onPress={() =>
            Alert.alert("Help", "Contact us at support@rwandapay.rw", [{ text: "OK" }])
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="info"
          label="About Rwanda Pay"
          sublabel="Version 1.0.0"
          onPress={() =>
            Alert.alert(
              "Rwanda Pay",
              "A premium digital wallet for Rwanda.\n\nVersion 1.0.0\n© 2025 Rwanda Pay",
              [{ text: "OK" }]
            )
          }
        />
      </View>

      {/* Logout */}
      <SectionHeader title="" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon="log-out"
          label="Sign Out"
          destructive
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: () => {} },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: { color: "#FFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  profileNameInput: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 1,
    padding: 0,
  },
  profilePhone: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  profileEmail: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

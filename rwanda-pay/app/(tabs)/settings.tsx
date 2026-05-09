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
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { authApi } from "@/lib/api";

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
      style={({ pressed }) => [styles.settingRow, { opacity: pressed && onPress ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.settingIcon, { backgroundColor: destructive ? `${colors.destructive}18` : colors.muted }]}>
        <Feather name={icon as any} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSubLabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        )}
      </View>
      {right ?? (onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hideBalance, toggleHideBalance, cards } = useWallet();
  const { user, signOut, refreshBalance } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const saveName = async () => {
    if (!editName.trim()) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await authApi.updateProfile({ name: editName.trim() });
      await refreshBalance();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update name.");
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await authApi.updateProfile({ phone: editPhone.trim() || undefined });
      await refreshBalance();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update phone.");
    } finally {
      setSavingPhone(false);
      setEditingPhone(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth");
        },
      },
    ]);
  };

  const initials = user?.initials ?? "";
  const displayName = user?.name ?? "";
  const displayPhone = user?.phone ?? "";
  const providerLabel = user?.email === "demo@rwandapay.rw" ? "Demo" : "Email";
  const providerIcon = user?.email === "demo@rwandapay.rw" ? "user" : "mail";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          {editingName ? (
            <TextInput
              style={[styles.profileNameInput, { borderBottomColor: "rgba(255,255,255,0.5)" }]}
              value={editName}
              onChangeText={setEditName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              autoFocus
              returnKeyType="done"
              editable={!savingName}
            />
          ) : (
            <Pressable
              onPress={() => { setEditName(displayName); setEditingName(true); }}
              style={styles.nameRow}
            >
              <Text style={styles.profileName}>{displayName}</Text>
              <Feather name="edit-2" size={12} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}

          {editingPhone ? (
            <TextInput
              style={[styles.profilePhoneInput, { borderBottomColor: "rgba(255,255,255,0.5)" }]}
              value={editPhone}
              onChangeText={setEditPhone}
              onBlur={savePhone}
              onSubmitEditing={savePhone}
              keyboardType="phone-pad"
              returnKeyType="done"
              editable={!savingPhone}
            />
          ) : (
            <Pressable onPress={() => { setEditPhone(displayPhone); setEditingPhone(true); }} style={styles.nameRow}>
              <Text style={styles.profilePhone}>{displayPhone || "Add phone number"}</Text>
              <Feather name="edit-2" size={10} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}

          {user && (
            <View style={styles.providerBadge}>
              <Feather name={providerIcon as any} size={10} color="rgba(255,255,255,0.7)" />
              <Text style={styles.providerText}>Connected via {providerLabel}</Text>
            </View>
          )}
        </View>
      </View>

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

      <SectionHeader title="Preferences" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon={hideBalance ? "eye-off" : "eye"}
          label="Hide Balance"
          sublabel="Mask amounts across the app"
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
      </View>

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
          onPress={() => Alert.alert("Change PIN", "Coming soon.", [{ text: "OK" }])}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="shield"
          label="Two-Factor Authentication"
          sublabel="SMS verification active"
          onPress={() => Alert.alert("2FA", "Two-factor authentication is enabled.", [{ text: "OK" }])}
        />
      </View>

      <SectionHeader title="Support" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow
          icon="help-circle"
          label="Help & Support"
          onPress={() => Alert.alert("Help", "Contact: support@rwandapay.rw", [{ text: "OK" }])}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="info"
          label="About Rwanda Pay"
          sublabel="Version 1.0.0"
          onPress={() =>
            Alert.alert("Rwanda Pay", "Premium digital wallet for Rwanda.\n\nVersion 1.0.0\n© 2025 Rwanda Pay", [{ text: "OK" }])
          }
        />
      </View>

      <SectionHeader title="" />
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingRow icon="log-out" label="Sign Out" destructive onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileCard: {
    marginHorizontal: 16, borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8,
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  profileInitials: { color: "#FFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  profileNameInput: {
    color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold",
    borderBottomWidth: 1, padding: 0,
  },
  profilePhone: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  profilePhoneInput: {
    color: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "Inter_400Regular",
    borderBottomWidth: 1, padding: 0,
  },
  providerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start",
  },
  providerText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8,
    textTransform: "uppercase", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PRIMARY = "#1B5E20";
const ACCENT = "#FFD600";

type Mode = "signin" | "signup";

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "phone-pad" | "default";
  autoCapitalize?: "none" | "words";
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Feather name={icon as any} size={16} color="#9CA3AF" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !visible}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "none"}
        autoComplete={autoComplete as any}
        autoCorrect={false}
      />
      {secureTextEntry && (
        <Pressable onPress={() => setVisible((v) => !v)}>
          <Feather name={visible ? "eye-off" : "eye"} size={16} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInDemo, isSigningIn, user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const cardY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500 });
    cardY.value = withDelay(200, withSpring(0, { damping: 22 }));
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      Alert.alert("Missing fields", "Please enter your name.");
      return;
    }
    try {
    if (mode === "signin") {
      await signIn(email.trim().toLowerCase(), password);
    } else {
      await signUp(email.trim().toLowerCase(), password, name.trim(), phone.trim() || undefined);
    }
  } catch (err: any) {
    Alert.alert("Error", err?.message ?? String(err));
  }
  };

  const btnLabel = mode === "signin" ? "Sign In" : "Create Account";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.screen}>
        {/* Hero */}
        <Animated.View style={[styles.hero, { paddingTop: topPad + 28 }, heroStyle]}>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <View style={styles.logoCircle}>
            <Feather name="wifi" size={38} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Rwanda Pay</Text>
          <View style={styles.accentBar} />
          <Text style={styles.heroSub}>Your premium digital wallet</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, cardStyle]}>
          <ScrollView
            contentContainerStyle={[styles.cardContent, { paddingBottom: bottomPad + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tab switcher */}
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, mode === "signin" && styles.tabActive]}
                onPress={() => setMode("signin")}
              >
                <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, mode === "signup" && styles.tabActive]}
                onPress={() => setMode("signup")}
              >
                <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            {/* Fields */}
            {mode === "signup" && (
              <InputField
                icon="user"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <InputField
              icon="mail"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
            />
            <InputField
              icon="lock"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            {mode === "signup" && (
              <InputField
                icon="phone"
                placeholder="Phone (optional) e.g. +250788..."
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            )}

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed || isSigningIn ? 0.8 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitText}>{btnLabel}</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons (coming soon placeholders) */}
            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn} onPress={handleGoogleSoon}>
                <Text style={styles.socialG}>G</Text>
                <Text style={styles.socialBtnText}>Google</Text>
              </Pressable>
              <Pressable style={[styles.socialBtn, styles.socialBtnDark]} onPress={handleAppleSoon}>
                <Text style={styles.socialApple}></Text>
                <Text style={[styles.socialBtnText, { color: "#FFF" }]}>Apple</Text>
              </Pressable>
            </View>

            {/* Demo */}
            <Pressable
              onPress={signInDemo}
              disabled={isSigningIn}
              style={({ pressed }) => [styles.demoBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.demoText}>Skip — explore demo account</Text>
            </Pressable>

            <Text style={styles.terms}>
              By continuing you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

function handleGoogleSoon() {
  Alert.alert("Coming Soon", "Google sign-in will be available soon.");
}
function handleAppleSoon() {
  Alert.alert("Coming Soon", "Apple sign-in will be available soon.");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PRIMARY },
  hero: {
    paddingHorizontal: 32,
    paddingBottom: 36,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -60,
  },
  heroCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -40,
    left: -40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#FFF", fontSize: 32, fontFamily: "Inter_700Bold" },
  accentBar: { width: 32, height: 3, backgroundColor: ACCENT, borderRadius: 2 },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    flex: 1,
    backgroundColor: "#F8FBF8",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardContent: { padding: 24, gap: 12 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 3,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  tabTextActive: { color: "#FFF" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputIcon: { width: 20 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0A0F0A",
    padding: 0,
  },
  submitBtn: {
    height: 54,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#D1D5DB" },
  dividerText: { color: "#9CA3AF", fontSize: 12, fontFamily: "Inter_400Regular" },
  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  socialBtnDark: { backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" },
  socialG: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#4285F4" },
  socialApple: { fontSize: 18, color: "#FFF" },
  socialBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1A1A1A" },
  demoBtn: { alignItems: "center", paddingVertical: 10 },
  demoText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  terms: {
    color: "#9CA3AF",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: { color: PRIMARY, fontFamily: "Inter_500Medium" },
});

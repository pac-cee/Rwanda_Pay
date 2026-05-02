import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

type SignInMethod = "google" | "apple" | "demo" | null;

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

function AppleIcon({ dark }: { dark?: boolean }) {
  return (
    <View style={styles.appleIcon}>
      <Text style={[styles.appleLogo, dark && { color: "#FFF" }]}></Text>
    </View>
  );
}

function AuthButton({
  onPress,
  loading,
  icon,
  label,
  dark,
  disabled,
}: {
  onPress: () => void;
  loading?: boolean;
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.authBtn,
        dark ? styles.authBtnDark : styles.authBtnLight,
        { opacity: pressed || disabled ? 0.75 : 1 },
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={dark ? "#FFF" : "#333"} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.authBtnText, dark && styles.authBtnTextDark]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithApple, signInDemo, isSigningIn, user } = useAuth();
  const [activeMethod, setActiveMethod] = useState<SignInMethod>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");

  // Animate card up on mount
  const cardY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.94);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500 });
    heroScale.value = withSpring(1, { damping: 20 });
    cardY.value = withDelay(200, withSpring(0, { damping: 22 }));
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  const handleGoogle = async () => {
    setActiveMethod("google");
    await signInWithGoogle();
  };

  const handleApple = async () => {
    setActiveMethod("apple");
    await signInWithApple();
  };

  const handleDemo = async () => {
    setActiveMethod("demo");
    await signInDemo();
  };

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <View style={styles.screen}>
      {/* Hero section */}
      <Animated.View style={[styles.hero, { paddingTop: topPad + 32 }, heroStyle]}>
        {/* Decorative circles */}
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Feather name="wifi" size={38} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Rwanda Pay</Text>
        <View style={styles.accentBar} />
        <Text style={styles.heroSub}>Your premium digital wallet</Text>
      </Animated.View>

      {/* Auth card */}
      <Animated.View style={[styles.card, cardStyle]}>
        <ScrollView
          contentContainerStyle={[styles.cardContent, { paddingBottom: bottomPad + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to access your wallet</Text>

          {/* Google */}
          <AuthButton
            onPress={handleGoogle}
            loading={isSigningIn && activeMethod === "google"}
            disabled={isSigningIn && activeMethod !== "google"}
            icon={<GoogleIcon />}
            label="Continue with Google"
          />

          {/* Apple (show on iOS and web for demo) */}
          <AuthButton
            onPress={handleApple}
            loading={isSigningIn && activeMethod === "apple"}
            disabled={isSigningIn && activeMethod !== "apple"}
            icon={<AppleIcon dark />}
            label="Continue with Apple"
            dark
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Phone number */}
          {showPhone ? (
            <View style={styles.phoneSection}>
              <View style={styles.phoneInput}>
                <Text style={styles.phoneFlag}>🇷🇼</Text>
                <Text style={styles.phoneCode}>+250</Text>
                <TextInput
                  style={styles.phoneField}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="788 000 000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.phoneBtn,
                  { backgroundColor: PRIMARY, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => phone.length >= 9 && handleDemo()}
              >
                <Text style={styles.phoneBtnText}>Send Code</Text>
              </Pressable>
              <Pressable onPress={() => setShowPhone(false)}>
                <Text style={styles.backToOptions}>← Other options</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.phoneOption, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setShowPhone(true)}
            >
              <Feather name="phone" size={18} color={PRIMARY} />
              <Text style={styles.phoneOptionText}>Continue with Phone</Text>
            </Pressable>
          )}

          {/* Demo */}
          <Pressable
            onPress={handleDemo}
            disabled={isSigningIn}
            style={({ pressed }) => [styles.demoBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            {isSigningIn && activeMethod === "demo" ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <Text style={styles.demoText}>Skip — explore demo</Text>
            )}
          </Pressable>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PRIMARY },
  hero: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: "center",
    gap: 10,
    position: "relative",
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
  logoWrap: { marginBottom: 4 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  accentBar: {
    width: 32,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  heroSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  card: {
    flex: 1,
    backgroundColor: "#F8FBF8",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  cardContent: {
    padding: 28,
    gap: 14,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#0A0F0A",
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: -6,
    marginBottom: 4,
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 54,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  authBtnLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  authBtnDark: {
    backgroundColor: "#0A0A0A",
  },
  authBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
  },
  authBtnTextDark: { color: "#FFFFFF" },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleG: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },
  appleIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  appleLogo: {
    fontSize: 20,
    color: "#0A0A0A",
    lineHeight: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#D1D5DB" },
  dividerText: { color: "#9CA3AF", fontSize: 13, fontFamily: "Inter_400Regular" },
  phoneOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1E4D2",
    backgroundColor: "#F0FAF0",
  },
  phoneOptionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: PRIMARY,
  },
  phoneSection: { gap: 12 },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1E4D2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    gap: 8,
  },
  phoneFlag: { fontSize: 20 },
  phoneCode: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#333" },
  phoneField: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#0A0F0A",
    padding: 0,
  },
  phoneBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneBtnText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  backToOptions: { color: "#6B7280", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  demoBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
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

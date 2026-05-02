import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Card } from "@/context/WalletContext";

interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  compact?: boolean;
}

function formatBalance(amount: number): string {
  return amount.toLocaleString("en-RW") + " RWF";
}

function CardTypeIcon({ type }: { type: Card["type"] }) {
  if (type === "visa") {
    return (
      <View style={styles.brandBadge}>
        <Text style={styles.visaText}>VISA</Text>
      </View>
    );
  }
  if (type === "mastercard") {
    return (
      <View style={styles.mcContainer}>
        <View style={[styles.mcCircle, { backgroundColor: "#EB001B" }]} />
        <View
          style={[
            styles.mcCircle,
            { backgroundColor: "#F79E1B", marginLeft: -10 },
          ]}
        />
      </View>
    );
  }
  return (
    <View style={styles.brandBadge}>
      <Text style={styles.momoText}>MoMo</Text>
    </View>
  );
}

export default function CardView({
  card,
  isSelected = false,
  compact = false,
}: CardViewProps) {
  const scale = useSharedValue(isSelected ? 1 : 0.97);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0.97);
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: card.color },
        compact && styles.compact,
        animStyle,
      ]}
    >
      {/* Decorative circles */}
      <View
        style={[
          styles.circle1,
          { backgroundColor: "rgba(255,255,255,0.08)" },
        ]}
      />
      <View
        style={[
          styles.circle2,
          { backgroundColor: "rgba(255,255,255,0.05)" },
        ]}
      />

      {/* Top row: bank + type */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.bankName}>{card.bank}</Text>
        </View>
        <CardTypeIcon type={card.type} />
      </View>

      {/* NFC icon */}
      {!compact && (
        <View style={styles.nfcRow}>
          <Feather name="wifi" size={18} color="rgba(255,255,255,0.7)" />
        </View>
      )}

      {/* Card number */}
      <Text style={styles.cardNumber}>{card.cardNumber}</Text>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.label}>CARD HOLDER</Text>
          <Text style={styles.holderName}>{card.holderName}</Text>
        </View>
        <View style={styles.rightBottom}>
          <Text style={styles.label}>EXPIRES</Text>
          <Text style={styles.expiry}>{card.expiry}</Text>
        </View>
        {!compact && (
          <View style={styles.balanceBlock}>
            <Text style={styles.label}>BALANCE</Text>
            <Text style={styles.balance}>{formatBalance(card.balance)}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: 200,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  compact: {
    height: 160,
    padding: 18,
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
  },
  circle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: -50,
    left: -30,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankName: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  brandBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  momoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  mcContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mcCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.9,
  },
  nfcRow: {
    alignSelf: "flex-start",
  },
  cardNumber: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  label: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  holderName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rightBottom: {
    alignItems: "center",
  },
  expiry: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  balanceBlock: {
    alignItems: "flex-end",
  },
  balance: {
    color: "#FFD600",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});

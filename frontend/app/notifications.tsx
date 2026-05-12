import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { notificationsApi, type ApiNotification } from "@/lib/api";

function NotificationRow({ notif, onPress }: { notif: ApiNotification; onPress: () => void }) {
  const colors = useColors();
  
  const iconMap: Record<string, string> = {
    payment_received: "arrow-down-circle",
    payment_sent: "arrow-up-circle",
    topup_success: "plus-circle",
    card_added: "credit-card",
    payment_success: "check-circle",
    payment_failed: "x-circle",
    system: "info",
  };

  const colorMap: Record<string, string> = {
    payment_received: "#10B981",
    payment_sent: "#3B82F6",
    topup_success: "#8B5CF6",
    card_added: "#F59E0B",
    payment_success: "#10B981",
    payment_failed: "#EF4444",
    system: "#6B7280",
  };

  const icon = iconMap[notif.type] || "bell";
  const iconColor = colorMap[notif.type] || colors.primary;
  const timeAgo = getTimeAgo(notif.created_at);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.notifRow,
        { backgroundColor: notif.is_read ? colors.card : `${colors.primary}08`, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.notifIcon, { backgroundColor: `${iconColor}18` }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: colors.foreground }]}>{notif.title}</Text>
        <Text style={[styles.notifMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
          {notif.message}
        </Text>
        <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeAgo}</Text>
      </View>
      {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<ApiNotification | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fetchNotifications = async () => {
    try {
      const { notifications: notifs } = await notificationsApi.list({ limit: 50 });
      setNotifications(notifs || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (notif: ApiNotification) => {
    setSelectedNotif(notif);
    if (!notif.is_read) {
      try {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {}
    }
  };

  const handleDelete = async (notifId: string) => {
    try {
      await notificationsApi.delete(notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      setSelectedNotif(null);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
        {unreadCount === 0 && <View style={{ width: 80 }} />}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                You'll see updates about your transactions here
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {notifications.map((notif) => (
                <NotificationRow key={notif.id} notif={notif} onPress={() => handleNotificationPress(notif)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={selectedNotif !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedNotif(null)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {selectedNotif && (
              <>
                {/* Icon header */}
                <View style={styles.modalIconWrap}>
                  <View
                    style={[
                      styles.modalIconCircle,
                      {
                        backgroundColor:
                          selectedNotif.type === "payment_received"
                            ? "#10B98118"
                            : selectedNotif.type === "payment_sent"
                            ? "#3B82F618"
                            : selectedNotif.type === "topup_success"
                            ? "#8B5CF618"
                            : selectedNotif.type === "card_added"
                            ? "#F59E0B18"
                            : selectedNotif.type === "payment_success"
                            ? "#10B98118"
                            : selectedNotif.type === "payment_failed"
                            ? "#EF444418"
                            : `${colors.primary}18`,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        selectedNotif.type === "payment_received"
                          ? "arrow-down-circle"
                          : selectedNotif.type === "payment_sent"
                          ? "arrow-up-circle"
                          : selectedNotif.type === "topup_success"
                          ? "plus-circle"
                          : selectedNotif.type === "card_added"
                          ? "credit-card"
                          : selectedNotif.type === "payment_success"
                          ? "check-circle"
                          : selectedNotif.type === "payment_failed"
                          ? "x-circle"
                          : ("bell" as any)
                      }
                      size={32}
                      color={
                        selectedNotif.type === "payment_received"
                          ? "#10B981"
                          : selectedNotif.type === "payment_sent"
                          ? "#3B82F6"
                          : selectedNotif.type === "topup_success"
                          ? "#8B5CF6"
                          : selectedNotif.type === "card_added"
                          ? "#F59E0B"
                          : selectedNotif.type === "payment_success"
                          ? "#10B981"
                          : selectedNotif.type === "payment_failed"
                          ? "#EF4444"
                          : colors.primary
                      }
                    />
                  </View>
                </View>

                {/* Content */}
                <View style={styles.modalBody}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedNotif.title}</Text>
                  <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>{selectedNotif.message}</Text>
                  
                  <View style={[styles.modalMeta, { backgroundColor: colors.muted }]}>
                    <View style={styles.modalMetaRow}>
                      <Feather name="clock" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.modalMetaText, { color: colors.mutedForeground }]}>
                        {new Date(selectedNotif.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    {selectedNotif.transaction_id && (
                      <View style={styles.modalMetaRow}>
                        <Feather name="hash" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.modalMetaText, { color: colors.mutedForeground }]}>
                          {selectedNotif.transaction_id.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalBtnSecondary,
                      { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => setSelectedNotif(null)}
                  >
                    <Text style={[styles.modalBtnSecondaryText, { color: colors.foreground }]}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalBtnDanger,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => handleDelete(selectedNotif.id)}
                  >
                    <Feather name="trash-2" size={16} color="#FFF" />
                    <Text style={styles.modalBtnDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  markAllText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 40, gap: 12 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtext: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  list: { paddingHorizontal: 16, gap: 8 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  notifMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalIconWrap: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  modalMeta: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalMetaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalBtnDanger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    gap: 8,
  },
  modalBtnDangerText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
});

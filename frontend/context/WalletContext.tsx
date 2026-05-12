import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cardsApi, transactionsApi, walletApi, type ApiCard, type ApiTransaction } from "@/lib/api";
import { useAuth } from "./AuthContext";

export type CardType = "visa" | "mastercard" | "amex";
export type TransactionType = "payment" | "received" | "sent" | "topup" | "send" | "receive" | "refund" | "withdrawal";
export type TransactionStatus = "success" | "pending" | "failed" | "reversed";
export type TransactionCategory =
  | "food" | "transport" | "shopping" | "entertainment"
  | "health" | "utilities" | "education" | "other" | "transfer";

export interface Card {
  id: string;
  bank: string;
  holderName: string;
  cardNumber: string;  // masked: "•••• •••• •••• 1234"
  expiry: string;      // MM/YY
  balance: number;     // card balance in RWF
  type: CardType;
  color: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  type: TransactionType;
  category: TransactionCategory;
  cardId: string | null;
  recipientName?: string | null;
}

export interface Profile {
  name: string;
  phone: string;
  email: string;
  initials: string;
}

// ── Mappers ────────────────────────────────────────────────────────────────

function apiCardToCard(c: ApiCard): Card {
  const networkToType: Record<string, CardType> = {
    visa: "visa", mastercard: "mastercard", amex: "amex",
  };
  return {
    id: c.id,
    bank: c.label || c.network.toUpperCase(),
    holderName: c.holder_name,
    cardNumber: `•••• •••• •••• ${c.last4}`,
    expiry: c.expiry_date,
    balance: c.balance,
    type: networkToType[c.network] ?? "visa",
    color: c.color,
    isDefault: c.is_default,
  };
}

function apiTxToTx(t: ApiTransaction): Transaction {
  const typeMap: Record<string, TransactionType> = {
    topup: "topup", payment: "payment", send: "sent",
    receive: "received", refund: "received", withdrawal: "sent",
  };
  return {
    id: t.id,
    merchantName: t.recipient_name ?? t.description,
    amount: t.amount,
    date: t.created_at,
    status: t.status as TransactionStatus,
    type: (typeMap[t.type] ?? t.type) as TransactionType,
    category: (t.category as TransactionCategory) ?? "other",
    cardId: t.card_id,
    recipientName: t.recipient_name,
  };
}

// ── Context ────────────────────────────────────────────────────────────────

interface WalletContextType {
  cards: Card[];
  transactions: Transaction[];
  walletBalance: number;
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  addCard: (card: {
    card_number: string; expiry_date: string; cvv: string;
    holder_name: string; network: "visa" | "mastercard" | "amex";
    label?: string; color?: string; balance?: number;
  }) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  selectedCard: Card | undefined;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  notificationCount: number;
  clearNotifications: () => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
  refreshWallet: () => Promise<void>;
  isLoading: boolean;
  doTopup: (cardId: string, amount: number) => Promise<void>;
  doTransfer: (recipientEmail: string, amount: number, description: string) => Promise<void>;
  doPay: (amount: number, description: string, category?: string, isNFC?: boolean) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SELECTED_CARD: "@rp_selected_card",
  HIDE_BALANCE: "@rp_hide_balance",
  PROFILE: "@rp_profile",
  NOTIFICATIONS: "@rp_notifications",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedCardId, setSelectedCardIdState] = useState<string>("");
  const [hideBalance, setHideBalance] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "", initials: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    try {
      const [cardsRes, txRes, walletRes] = await Promise.all([
        cardsApi.list(),
        transactionsApi.list({ limit: 50 }),
        walletApi.get(),
      ]);
      const mapped = (cardsRes.cards ?? []).map(apiCardToCard);
      setCards(mapped);
      if (mapped.length > 0) {
        const def = mapped.find((c) => c.isDefault) ?? mapped[0];
        setSelectedCardIdState((prev) => prev || def.id);
      }
      setTransactions((txRes.transactions ?? []).map(apiTxToTx));
      setWalletBalance(walletRes.balance);
    } catch {
      // Not authenticated yet
    }
  }, []);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId !== currentUserId) {
      setCards([]);
      setTransactions([]);
      setWalletBalance(0);
      setSelectedCardIdState("");
      setCurrentUserId(userId);
      
      // Update profile from user data
      if (user) {
        setProfile({
          name: user.name,
          phone: user.phone || "",
          email: user.email,
          initials: user.initials,
        });
      } else {
        setProfile({ name: "", phone: "", email: "", initials: "" });
      }
    }
  }, [user, currentUserId]);

  useEffect(() => {
    (async () => {
      try {
        const [sc, hb, prof, notifs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CARD),
          AsyncStorage.getItem(STORAGE_KEYS.HIDE_BALANCE),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        ]);
        if (sc) setSelectedCardIdState(sc);
        if (hb) setHideBalance(JSON.parse(hb));
        if (prof) setProfile(JSON.parse(prof));
        if (notifs) setNotificationCount(JSON.parse(notifs));
      } catch {}
      if (user) await refreshWallet();
      setIsLoading(false);
    })();
  }, [refreshWallet, user]);

  const setSelectedCardId = useCallback((id: string) => {
    setSelectedCardIdState(id);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CARD, id).catch(() => {});
  }, []);

  const toggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.HIDE_BALANCE, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotificationCount(0);
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, "0").catch(() => {});
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addCard = useCallback(async (card: Parameters<WalletContextType["addCard"]>[0]) => {
    await cardsApi.add(card);
    await refreshWallet();
  }, [refreshWallet]);

  const removeCard = useCallback(async (id: string) => {
    await cardsApi.remove(id);
    await refreshWallet();
  }, [refreshWallet]);

  const doTopup = useCallback(async (cardId: string, amount: number) => {
    const res = await walletApi.topup({ card_id: cardId, amount });
    setTransactions((prev) => [apiTxToTx(res.transaction), ...prev]);
    await refreshWallet();
  }, [refreshWallet]);

  const doTransfer = useCallback(async (recipientEmail: string, amount: number, description: string) => {
    const res = await walletApi.transfer({ recipient_email: recipientEmail, amount, description });
    setTransactions((prev) => [apiTxToTx(res.transaction), ...prev]);
    await refreshWallet();
  }, [refreshWallet]);

  const doPay = useCallback(async (amount: number, description: string, category = "other", isNFC = false) => {
    const res = await walletApi.pay({ amount, description, category, is_nfc: isNFC });
    setTransactions((prev) => [apiTxToTx(res.transaction), ...prev]);
    await refreshWallet();
  }, [refreshWallet]);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  return (
    <WalletContext.Provider value={{
      cards, transactions, walletBalance, selectedCardId, setSelectedCardId,
      addCard, removeCard, selectedCard, hideBalance, toggleHideBalance,
      notificationCount, clearNotifications, profile, updateProfile,
      refreshWallet, isLoading, doTopup, doTransfer, doPay,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

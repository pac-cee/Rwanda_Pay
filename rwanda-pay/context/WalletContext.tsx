import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cardsApi, transactionsApi, type ApiCard, type ApiTransaction } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export type CardType = "visa" | "mastercard" | "amex";
export type TransactionType = "payment" | "send" | "receive" | "topup";
export type TransactionStatus = "success" | "pending" | "failed";
export type TransactionCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "health"
  | "education"
  | "other";

export interface Card {
  id: string;
  bank: string;
  cardName: string;
  last4: string;
  holderName: string;
  expiryDate: string;
  balance: number;
  type: CardType;
  color: string;
  isDefault: boolean;
  status: string;
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
  balanceBefore?: number | null;
  balanceAfter?: number | null;
}

export interface Profile {
  name: string;
  phone: string;
  email: string;
  initials: string;
}

function apiCardToCard(c: ApiCard): Card {
  return {
    id: c.id,
    bank: c.label,
    cardName: c.label,
    last4: c.last4.trim(),
    holderName: c.holder_name,
    expiryDate: c.expiry_date,
    balance: c.balance,
    type: (c.network as CardType) ?? "visa",
    color: c.color,
    isDefault: c.is_default,
    status: c.status,
  };
}

function apiTxToTx(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    merchantName: t.merchant?.name ?? t.recipient_name ?? t.description,
    amount: t.amount,
    date: t.created_at,
    status: (t.status === "success" ? "success" : t.status === "failed" ? "failed" : "pending") as TransactionStatus,
    type: t.type as TransactionType,
    category: (t.category as TransactionCategory) ?? "other",
    cardId: t.card_id,
    recipientName: t.recipient_name,
    balanceBefore: t.balance_before,
    balanceAfter: t.balance_after,
  };
}

interface WalletContextType {
  cards: Card[];
  transactions: Transaction[];
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  removeCard: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  selectedCard: Card | undefined;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  notificationCount: number;
  clearNotifications: () => void;
  profile: Profile;
  refreshWallet: () => Promise<void>;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SELECTED_CARD: "@rp_selected_card",
  HIDE_BALANCE: "@rp_hide_balance",
  NOTIFICATIONS: "@rp_notifications",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCardId, setSelectedCardIdState] = useState<string>("");
  const [hideBalance, setHideBalance] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const profile: Profile = {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    initials: user?.initials ?? "",
  };

  const refreshWallet = useCallback(async () => {
    try {
      const [cardsRes, txRes] = await Promise.all([
        cardsApi.list(),
        transactionsApi.list({ limit: 50 }),
      ]);
      const mapped = (cardsRes.cards ?? []).map(apiCardToCard);
      setCards(mapped);
      // Set default selected card if none selected yet
      setSelectedCardIdState((prev) => {
        if (prev && mapped.find((c) => c.id === prev)) return prev;
        const def = mapped.find((c) => c.isDefault) ?? mapped[0];
        return def?.id ?? "";
      });
      setTransactions((txRes.transactions ?? []).map(apiTxToTx));
    } catch {
      // silently fail — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setCards([]);
      setTransactions([]);
      setSelectedCardIdState("");
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const [sc, hb, notifs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CARD),
          AsyncStorage.getItem(STORAGE_KEYS.HIDE_BALANCE),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        ]);
        if (sc) setSelectedCardIdState(sc);
        if (hb) setHideBalance(JSON.parse(hb));
        if (notifs) setNotificationCount(JSON.parse(notifs));
      } catch {}
      await refreshWallet();
      setIsLoading(false);
    })();
  }, [user, refreshWallet]);

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

  const removeCard = useCallback(async (id: string) => {
    await cardsApi.remove(id);
    await refreshWallet();
  }, [refreshWallet]);

  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    const newTx: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setTransactions((prev) => [newTx, ...prev]);
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  return (
    <WalletContext.Provider
      value={{
        cards,
        transactions,
        selectedCardId,
        setSelectedCardId,
        removeCard,
        addTransaction,
        selectedCard,
        hideBalance,
        toggleHideBalance,
        notificationCount,
        clearNotifications,
        profile,
        refreshWallet,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

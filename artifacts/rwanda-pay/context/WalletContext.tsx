import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cardsApi, transactionsApi, type ApiCard, type ApiTransaction } from "@/lib/api";

export type CardType = "visa" | "mastercard" | "momo";
export type TransactionType = "payment" | "received" | "sent" | "topup" | "send" | "receive";
export type TransactionStatus = "success" | "pending" | "failed";

export interface Card {
  id: string;
  bank: string;
  holderName: string;
  cardNumber: string;
  expiry: string;
  balance: number;
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
  category: string;
  cardId: string | null;
  recipientName?: string | null;
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
    holderName: c.holderName,
    cardNumber: `•••• •••• •••• ${c.last4}`,
    expiry: c.expiryDate,
    balance: 0,
    type: c.network === "mastercard" ? "mastercard" : c.network === "amex" ? "visa" : "visa",
    color: c.color,
    isDefault: c.isDefault,
  };
}

function apiTxToTx(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    merchantName: t.recipientName ?? t.description,
    amount: t.amount,
    date: t.createdAt,
    status: t.status as TransactionStatus,
    type: t.type as TransactionType,
    category: t.category as any,
    cardId: t.cardId,
    recipientName: t.recipientName,
  };
}

const MOCK_CARDS: Card[] = [];

interface WalletContextType {
  cards: Card[];
  transactions: Transaction[];
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  addCard: (card: Omit<Card, "id">) => void;
  removeCard: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  selectedCard: Card | undefined;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  notificationCount: number;
  clearNotifications: () => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
  setProfileFromUser: (u: { name: string; phone: string | null; email: string; initials: string }) => void;
  refreshWallet: () => Promise<void>;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SELECTED_CARD: "@rp_selected_card",
  HIDE_BALANCE: "@rp_hide_balance",
  PROFILE: "@rp_profile",
  NOTIFICATIONS: "@rp_notifications",
};

const DEFAULT_PROFILE: Profile = {
  name: "",
  phone: "",
  email: "",
  initials: "",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCardId, setSelectedCardIdState] = useState<string>("");
  const [hideBalance, setHideBalance] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    try {
      const [cardsRes, txRes] = await Promise.all([
        cardsApi.list(),
        transactionsApi.list({ limit: 50 }),
      ]);
      const mapped = cardsRes.cards.map(apiCardToCard);
      setCards(mapped);
      const def = mapped.find((c) => c.isDefault) ?? mapped[0];
      if (def) setSelectedCardIdState(def.id);
      setTransactions(txRes.transactions.map(apiTxToTx));
    } catch {
      // API not ready yet (unauthenticated)
    }
  }, []);

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
      await refreshWallet();
      setIsLoading(false);
    })();
  }, [refreshWallet]);

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

  const setProfileFromUser = useCallback((u: { name: string; phone: string | null; email: string; initials: string }) => {
    setProfile({ name: u.name, phone: u.phone ?? "", email: u.email, initials: u.initials });
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addCard = useCallback(async (card: Omit<Card, "id">) => {
    try {
      await cardsApi.add({
        cardNumber: card.cardNumber.replace(/\s/g, ""),
        expiryDate: card.expiry,
        cvv: (card as any).cvv ?? "000",
        holderName: card.holderName,
        network: card.type === "momo" ? "mastercard" : card.type,
        label: card.bank,
        color: card.color,
      });
      await refreshWallet();
    } catch (err) {
      throw err;
    }
  }, [refreshWallet]);

  const removeCard = useCallback(async (id: string) => {
    try {
      await cardsApi.remove(id);
      await refreshWallet();
    } catch (err) {
      throw err;
    }
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
        addCard,
        removeCard,
        addTransaction,
        selectedCard,
        hideBalance,
        toggleHideBalance,
        notificationCount,
        clearNotifications,
        profile,
        updateProfile,
        refreshWallet,
        isLoading,
        setProfileFromUser,
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

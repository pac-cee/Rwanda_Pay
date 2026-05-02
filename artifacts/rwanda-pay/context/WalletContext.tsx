import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CardType = "visa" | "mastercard" | "momo";
export type TransactionType = "payment" | "received" | "sent";
export type TransactionStatus = "success" | "pending" | "failed";
export type TransactionCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "transfer";

export interface Card {
  id: string;
  bank: string;
  holderName: string;
  cardNumber: string;
  expiry: string;
  balance: number;
  type: CardType;
  color: string;
}

export interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  type: TransactionType;
  category: TransactionCategory;
  cardId: string;
}

export interface Profile {
  name: string;
  phone: string;
  email: string;
  initials: string;
}

const MOCK_CARDS: Card[] = [
  {
    id: "card-1",
    bank: "Bank of Kigali",
    holderName: "Alex Mugisha",
    cardNumber: "4242 **** **** 8842",
    expiry: "09/27",
    balance: 450000,
    type: "visa",
    color: "#1B5E20",
  },
  {
    id: "card-2",
    bank: "MTN MoMo",
    holderName: "Alex Mugisha",
    cardNumber: "MTN **** **** 2210",
    expiry: "12/26",
    balance: 125500,
    type: "momo",
    color: "#E65100",
  },
  {
    id: "card-3",
    bank: "I&M Bank",
    holderName: "Alex Mugisha",
    cardNumber: "5356 **** **** 4471",
    expiry: "03/28",
    balance: 890000,
    type: "mastercard",
    color: "#0D47A1",
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    merchantName: "Simba Supermarket",
    amount: 12500,
    date: new Date().toISOString(),
    status: "success",
    type: "payment",
    category: "food",
    cardId: "card-1",
  },
  {
    id: "t2",
    merchantName: "John Kayiranga",
    amount: 50000,
    date: new Date(Date.now() - 3600000).toISOString(),
    status: "success",
    type: "received",
    category: "transfer",
    cardId: "card-1",
  },
  {
    id: "t3",
    merchantName: "Nyabugogo Bus",
    amount: 500,
    date: new Date(Date.now() - 7200000).toISOString(),
    status: "success",
    type: "payment",
    category: "transport",
    cardId: "card-2",
  },
  {
    id: "t4",
    merchantName: "MTN Rwanda",
    amount: 15000,
    date: new Date(Date.now() - 86400000).toISOString(),
    status: "success",
    type: "payment",
    category: "utilities",
    cardId: "card-2",
  },
  {
    id: "t5",
    merchantName: "Heaven Restaurant",
    amount: 35000,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "success",
    type: "payment",
    category: "food",
    cardId: "card-1",
  },
  {
    id: "t6",
    merchantName: "Kigali City Tower",
    amount: 45000,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "success",
    type: "payment",
    category: "shopping",
    cardId: "card-3",
  },
  {
    id: "t7",
    merchantName: "Mary Uwimana",
    amount: 100000,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: "success",
    type: "sent",
    category: "transfer",
    cardId: "card-1",
  },
  {
    id: "t8",
    merchantName: "Kacyiru Gas Station",
    amount: 20000,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: "success",
    type: "payment",
    category: "transport",
    cardId: "card-3",
  },
  {
    id: "t9",
    merchantName: "Netflix Rwanda",
    amount: 8000,
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: "success",
    type: "payment",
    category: "entertainment",
    cardId: "card-3",
  },
  {
    id: "t10",
    merchantName: "Nakumatt Kigali",
    amount: 28000,
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "success",
    type: "payment",
    category: "shopping",
    cardId: "card-1",
  },
  {
    id: "t11",
    merchantName: "Eric Habimana",
    amount: 75000,
    date: new Date(Date.now() - 86400000 * 6).toISOString(),
    status: "success",
    type: "received",
    category: "transfer",
    cardId: "card-2",
  },
  {
    id: "t12",
    merchantName: "Telecom Rwanda",
    amount: 5000,
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: "pending",
    type: "payment",
    category: "utilities",
    cardId: "card-2",
  },
];

const DEFAULT_PROFILE: Profile = {
  name: "Alex Mugisha",
  phone: "+250 788 555 999",
  email: "alex.mugisha@email.com",
  initials: "AM",
};

interface WalletContextType {
  cards: Card[];
  transactions: Transaction[];
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  addCard: (card: Omit<Card, "id">) => void;
  removeCard: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  selectedCard: Card | undefined;
  totalBalance: number;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  notificationCount: number;
  clearNotifications: () => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CARDS: "@rp_cards",
  TRANSACTIONS: "@rp_transactions",
  SELECTED_CARD: "@rp_selected_card",
  HIDE_BALANCE: "@rp_hide_balance",
  PROFILE: "@rp_profile",
  NOTIFICATIONS: "@rp_notifications",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>(MOCK_CARDS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [selectedCardId, setSelectedCardIdState] = useState<string>(MOCK_CARDS[0].id);
  const [hideBalance, setHideBalance] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    (async () => {
      try {
        const [sc, hb, prof, notifs, storedCards, storedTx] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CARD),
          AsyncStorage.getItem(STORAGE_KEYS.HIDE_BALANCE),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.CARDS),
          AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
        ]);
        if (sc) setSelectedCardIdState(sc);
        if (hb) setHideBalance(JSON.parse(hb));
        if (prof) setProfile(JSON.parse(prof));
        if (notifs) setNotificationCount(JSON.parse(notifs));
        if (storedCards) setCards(JSON.parse(storedCards));
        if (storedTx) setTransactions(JSON.parse(storedTx));
      } catch {}
    })();
  }, []);

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

  const addCard = useCallback((card: Omit<Card, "id">) => {
    const newCard: Card = { ...card, id: `card-${Date.now()}` };
    setCards((prev) => {
      const updated = [...prev, newCard];
      AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    const newTx: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);

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
        totalBalance,
        hideBalance,
        toggleHideBalance,
        notificationCount,
        clearNotifications,
        profile,
        updateProfile,
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

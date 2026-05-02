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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CARDS: "@rwanda_pay_cards",
  TRANSACTIONS: "@rwanda_pay_transactions",
  SELECTED_CARD: "@rwanda_pay_selected_card",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>(MOCK_CARDS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [selectedCardId, setSelectedCardIdState] = useState<string>(
    MOCK_CARDS[0].id
  );

  useEffect(() => {
    (async () => {
      try {
        const [storedCards, storedTx, storedCard] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CARDS),
          AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CARD),
        ]);
        if (storedCards) setCards(JSON.parse(storedCards));
        if (storedTx) setTransactions(JSON.parse(storedTx));
        if (storedCard) setSelectedCardIdState(storedCard);
      } catch {}
    })();
  }, []);

  const persist = useCallback(
    async (c: Card[], t: Transaction[], s: string) => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(c)),
          AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(t)),
          AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CARD, s),
        ]);
      } catch {}
    },
    []
  );

  const setSelectedCardId = useCallback(
    (id: string) => {
      setSelectedCardIdState(id);
      persist(cards, transactions, id);
    },
    [cards, transactions, persist]
  );

  const addCard = useCallback(
    (card: Omit<Card, "id">) => {
      const newCard: Card = {
        ...card,
        id: `card-${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
      };
      const updated = [...cards, newCard];
      setCards(updated);
      persist(updated, transactions, selectedCardId);
    },
    [cards, transactions, selectedCardId, persist]
  );

  const removeCard = useCallback(
    (id: string) => {
      const updated = cards.filter((c) => c.id !== id);
      setCards(updated);
      const newSelected =
        selectedCardId === id
          ? updated[0]?.id ?? ""
          : selectedCardId;
      setSelectedCardIdState(newSelected);
      persist(updated, transactions, newSelected);
    },
    [cards, transactions, selectedCardId, persist]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      const newTx: Transaction = {
        ...tx,
        id: `tx-${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      persist(cards, updated, selectedCardId);
    },
    [cards, transactions, selectedCardId, persist]
  );

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);

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

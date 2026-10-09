"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase-browser";

export type CartItem = {
  id: string | number;
  title: string;
  price: number;
  image?: string;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: CartItem["id"]) => void;
  setQty: (id: CartItem["id"], qty: number) => void;
  clear: () => void;
  loaded: boolean;
};

const CartContext = createContext<CartContextType | null>(null);
const LEGACY_STORAGE_KEY = "folio-cart";
const GUEST_STORAGE_KEY = "folio-cart:guest";

function storageKey(userId: string | null) {
  return userId ? `folio-cart:${userId}` : GUEST_STORAGE_KEY;
}

function mergeItems(...groups: CartItem[][]) {
  const merged = new Map<string, CartItem>();
  groups.flat().forEach((item) => {
    const key = String(item.id);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, qty: existing.qty + item.qty } : item);
  });
  return [...merged.values()];
}

function readItems(key: string) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as CartItem[] : [];
  } catch (error) {
    console.error("Failed to load cart from local storage:", error);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let activeRequest = 0;
    const supabase = createClient();

    async function loadForUser(nextUserId: string | null) {
      const requestId = ++activeRequest;
      setLoaded(false);
      setUserId(nextUserId);

      if (!localStorage.getItem(GUEST_STORAGE_KEY)) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          localStorage.setItem(GUEST_STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }

      let nextItems = readItems(storageKey(nextUserId));
      if (nextUserId) {
        const guestItems = readItems(GUEST_STORAGE_KEY);
        if (guestItems.length) {
          nextItems = mergeItems(nextItems, guestItems);
          try {
            const ids = nextItems.map((item) => Number(item.id));
            const [ownedResponse, availabilityResponse] = await Promise.all([
              fetch("/api/library/owned"),
              fetch("/api/products/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
              }),
            ]);
            const ownedData = await ownedResponse.json() as { productIds?: number[] };
            const availabilityData = await availabilityResponse.json() as { unavailableIds?: number[] };
            const owned = new Set(ownedData.productIds ?? []);
            const unavailable = new Set(availabilityData.unavailableIds ?? []);
            nextItems = nextItems.filter((item) => !owned.has(Number(item.id)) && !unavailable.has(Number(item.id)));
          } catch (error) {
            console.error("Failed to validate guest cart during sign-in:", error);
          }
          localStorage.setItem(storageKey(nextUserId), JSON.stringify(nextItems));
          localStorage.removeItem(GUEST_STORAGE_KEY);
        }
      }

      if (requestId !== activeRequest) return;
      setItems(nextItems);
      setLoaded(true);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user?.id ?? null);
    });
    void supabase.auth.getUser().then(({ data }) => {
      void loadForUser(data.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to local storage:", error);
    }
  }, [items, loaded, userId]);

  const addItem = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: CartItem["id"]) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: CartItem["id"], qty: number) => {
    if (qty < 1) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, count, total, addItem, removeItem, setQty, clear, loaded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart ต้องใช้ภายใน CartProvider");
  return ctx;
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { AppState, ExpenseCategory, Transaction } from './types';

const KEY = 'abotkaya:v1';
const ACTIVE_KEY = 'abotkaya:active-user:v1';
const accountKey = (email: string) => `${KEY}:user:${encodeURIComponent(email.trim().toLowerCase())}`;
const credentialsKey = (email: string) => `${KEY}:credentials:${encodeURIComponent(email.trim().toLowerCase())}`;
const hashPassword = (salt: string, password: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const today = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const display = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(text);
  if (display) {
    const month = MONTHS.findIndex(item => item.toLowerCase() === display[1].toLowerCase());
    if (month < 0) return null;
    return new Date(Number(display[3]), month, Number(display[2]));
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const seed: AppState = {
  user: { name: 'Alex', email: '' },
  onboarded: false, period: 'Weekly', allowance: 1000,
  budgets: { Food: 400, Transportation: 150, School: 150, Personal: 100, Savings: 200 },
  tx: [],
  goals: [],
  plan: {},
  settings: { push: true, budget: true, meal: false },
};

interface Store {
  s: AppState;
  email: string | null;
  ready: boolean;
}

type StorePatch = Partial<AppState> | ((state: AppState) => Partial<AppState>);
interface StoreContextValue extends Store {
  set: (patch: StorePatch) => void;
  reset: () => void;
  selectAccount: (email: string, password: string, createNew?: boolean, name?: string) => Promise<AppState>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<StoreContextValue | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>({ s: seed, email: null, ready: false });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const activeEmail = await AsyncStorage.getItem(ACTIVE_KEY);
        let email = activeEmail ? activeEmail.trim().toLowerCase() : null;
        let value = email ? await AsyncStorage.getItem(accountKey(email)) : null;
        let migratedLegacy = false;

        if (!value && !email) {
          const legacyValue = await AsyncStorage.getItem(KEY);
          if (legacyValue) {
            const legacy = JSON.parse(legacyValue) as Partial<AppState>;
            const legacyEmail = legacy.user?.email?.trim().toLowerCase();
            if (legacyEmail) {
              email = legacyEmail;
              value = legacyValue;
              migratedLegacy = true;
            }
          }
        }

        let next = seed;
        if (value) {
          const saved = JSON.parse(value) as Partial<AppState>;
          next = {
            ...seed,
            ...saved,
            user: { ...seed.user, ...saved.user, ...(email ? { email } : {}) },
            tx: Array.isArray(saved.tx) ? saved.tx : [],
            goals: Array.isArray(saved.goals) ? saved.goals : [],
          };
        } else if (email) {
          next = { ...seed, user: { ...seed.user, email } };
        }

        if (email) {
          await AsyncStorage.setItem(accountKey(email), JSON.stringify(next));
          await AsyncStorage.setItem(ACTIVE_KEY, email);
          if (migratedLegacy) await AsyncStorage.removeItem(KEY);
        }
        if (mounted) setStore({ s: next, email, ready: true });
      } catch (error) {
        console.error('Unable to load saved account data:', error);
        if (mounted) setStore({ s: seed, email: null, ready: true });
      }
    };
    load();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!store.ready || !store.email) return;
    AsyncStorage.setItem(accountKey(store.email), JSON.stringify(store.s))
      .catch(error => console.error('Unable to save account data:', error));
  }, [store]);
  const set = (patch: StorePatch) => setStore(p => ({ ...p, s: { ...p.s, ...(typeof patch === 'function' ? patch(p.s) : patch) } }));
  const selectAccount = async (email: string, password: string, createNew = false, name = ''): Promise<AppState> => {
    const normalizedEmail = email.trim().toLowerCase();
    const profileKey = accountKey(normalizedEmail);
    const authKey = credentialsKey(normalizedEmail);
    const [value, credentialsValue] = await Promise.all([
      AsyncStorage.getItem(profileKey),
      AsyncStorage.getItem(authKey),
    ]);

    if (createNew) {
      if (value || credentialsValue) throw new Error('An account already uses this email. Log in instead.');
      const salt = Crypto.randomUUID();
      const passwordHash = await hashPassword(salt, password);
      const next = {
        ...seed,
        user: { name: name.trim(), email: normalizedEmail },
      };
      try {
        await AsyncStorage.setItem(profileKey, JSON.stringify(next));
        await AsyncStorage.setItem(authKey, JSON.stringify({ salt, passwordHash }));
        await AsyncStorage.setItem(ACTIVE_KEY, normalizedEmail);
      } catch (error) {
        await Promise.all([
          AsyncStorage.removeItem(profileKey),
          AsyncStorage.removeItem(authKey),
        ]).catch(cleanupError => console.error('Unable to clean up incomplete account creation:', cleanupError));
        throw new Error('Could not create your account on this device. Check storage and try again.');
      }
      setStore({ s: next, email: normalizedEmail, ready: true });
      return next;
    }

    if (!value) throw new Error('No account found for this email. Create an account to start fresh.');
    const saved = JSON.parse(value) as Partial<AppState>;
    if (credentialsValue) {
      const credentials = JSON.parse(credentialsValue);
      const passwordHash = await hashPassword(credentials.salt, password);
      if (passwordHash !== credentials.passwordHash) throw new Error('Incorrect email or password.');
    } else {
      const salt = Crypto.randomUUID();
      const passwordHash = await hashPassword(salt, password);
      await AsyncStorage.setItem(authKey, JSON.stringify({ salt, passwordHash }));
    }

    const next = {
      ...seed,
      ...saved,
      user: { ...seed.user, ...saved.user, email: normalizedEmail },
      tx: Array.isArray(saved.tx) ? saved.tx : [],
      goals: Array.isArray(saved.goals) ? saved.goals : [],
    };
    await AsyncStorage.setItem(profileKey, JSON.stringify(next));
    await AsyncStorage.setItem(ACTIVE_KEY, normalizedEmail);
    setStore({ s: next, email: normalizedEmail, ready: true });
    return next;
  };
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!store.email) throw new Error('No signed-in account was found.');
    const key = credentialsKey(store.email);
    const value = await AsyncStorage.getItem(key);
    if (!value) throw new Error('This account has no saved password to verify. Log out and sign in again before changing it.');

    let credentials: { salt?: unknown; passwordHash?: unknown };
    try {
      credentials = JSON.parse(value) as { salt?: unknown; passwordHash?: unknown };
    } catch (error) {
      console.error('Unable to read account credentials:', error);
      throw new Error('Saved password data could not be read. Please contact support.');
    }
    if (typeof credentials.salt !== 'string' || typeof credentials.passwordHash !== 'string') {
      throw new Error('Saved password data is invalid. Please contact support.');
    }
    if (await hashPassword(credentials.salt, currentPassword) !== credentials.passwordHash) {
      throw new Error('Your current password is incorrect.');
    }

    const salt = Crypto.randomUUID();
    const passwordHash = await hashPassword(salt, newPassword);
    await AsyncStorage.setItem(key, JSON.stringify({ salt, passwordHash }));
  };
  const signOut = async () => {
    await AsyncStorage.removeItem(ACTIVE_KEY);
    setStore({ s: seed, email: null, ready: true });
  };
  const reset = () => setStore(p => ({ ...p, s: { ...seed, user: p.s.user } }));
  return <Ctx.Provider value={{ ...store, set, reset, selectAccount, updatePassword, signOut }}>{children}</Ctx.Provider>;
}
export const useStore = (): StoreContextValue => {
  const store = useContext(Ctx);
  if (!store) throw new Error('useStore must be used within StoreProvider.');
  return store;
};

export const totals = (s: AppState): { by: Partial<Record<ExpenseCategory, number>>; spent: number; left: number } => {
  const by: Partial<Record<ExpenseCategory, number>> = {}; let spent = 0;
  s.tx.forEach(t => { by[t.category] = (by[t.category] || 0) + t.amount; spent += t.amount; });
  return { by, spent, left: s.allowance - spent };
};

export const MEALS: import('./types').Meal[] = [
  { id: 'm1', name: 'Longsilog', price: 65, place: 'Canteen near campus', emoji: '🍳', cat: 'Rice meal', desc: 'Garlic rice, longganisa and a fried egg. Filling and budget-friendly.', ing: ['Garlic rice', 'Longganisa', 'Fried egg', 'Atchara'] },
  { id: 'm2', name: 'Monggo with rice', price: 35, place: 'Carinderia / home-cooked', emoji: '🍲', cat: 'Healthy', desc: 'A comforting bowl of mung bean stew with garlic, onion and leafy greens, served with rice.', ing: ['Mung beans', 'Malunggay leaves', 'Garlic & onion', 'Steamed rice'] },
  { id: 'm3', name: 'Chicken adobo rice', price: 80, place: 'Carinderia', emoji: '🍗', cat: 'Rice meal', desc: 'Classic soy-vinegar chicken with a scoop of rice.', ing: ['Chicken', 'Soy sauce', 'Vinegar', 'Rice'] },
  { id: 'm4', name: 'Pancit canton', price: 25, place: 'Home / sari-sari store', emoji: '🍜', cat: 'Budget', desc: 'Quick stir-fried noodles. Add an egg for extra protein.', ing: ['Noodles', 'Egg', 'Veggies'] },
  { id: 'm5', name: 'Tortang talong', price: 40, place: 'Carinderia', emoji: '🍆', cat: 'Healthy', desc: 'Grilled eggplant omelette with rice.', ing: ['Eggplant', 'Egg', 'Rice'] },
  { id: 'm6', name: 'Siomai rice', price: 50, place: 'Street stall', emoji: '🥟', cat: 'Budget', desc: 'Four pieces of siomai with rice and chili garlic.', ing: ['Siomai', 'Rice', 'Chili garlic'] },
  { id: 'm7', name: 'Banana cue', price: 15, place: 'Street stall', emoji: '🍌', cat: 'Snack', desc: 'Caramelized saba on a stick.', ing: ['Saba banana', 'Brown sugar'] },
  { id: 'm8', name: 'Sinigang na baboy', price: 95, place: 'Carinderia', emoji: '🥘', cat: 'Rice meal', desc: 'Sour tamarind soup with pork and vegetables.', ing: ['Pork', 'Tamarind', 'Kangkong', 'Rice'] },
];

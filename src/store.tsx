import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { AppState, ExpenseCategory, ManagedAccount, Meal, Transaction } from './types';
import { supabase } from './supabase';

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
  userId: string | null;
  ready: boolean;
  backend: 'device' | 'supabase';
  backendError: string | null;
  syncError?: string | null;
  isAdmin: boolean;
}

type StorePatch = Partial<AppState> | ((state: AppState) => Partial<AppState>);
interface ManagedAccountsPage {
  accounts: ManagedAccount[];
  hasMore: boolean;
}
interface StoreContextValue extends Store {
  meals: Meal[];
  mealError: string | null;
  set: (patch: StorePatch) => void;
  reset: () => void;
  selectAccount: (email: string, password: string, createNew?: boolean, name?: string) => Promise<AppState | null>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  listManagedAccounts: (page?: number) => Promise<ManagedAccountsPage>;
  setManagedAccountDisabled: (userId: string, disabled: boolean) => Promise<void>;
  refreshMeals: () => Promise<void>;
  saveMeal: (meal: Meal) => Promise<void>;
  setMealActive: (mealId: string, active: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const normalizeState = (saved: Partial<AppState> | null | undefined, email: string, fullName?: string): AppState => ({
  ...seed,
  ...(saved || {}),
  user: {
    ...seed.user,
    ...(saved?.user || {}),
    email,
    name: saved?.user?.name || fullName || seed.user.name,
  },
  budgets: { ...seed.budgets, ...(saved?.budgets || {}) },
  settings: { ...seed.settings, ...(saved?.settings || {}) },
  tx: Array.isArray(saved?.tx) ? saved.tx : [],
  goals: Array.isArray(saved?.goals) ? saved.goals : [],
  plan: saved?.plan && typeof saved.plan === 'object' ? saved.plan : {},
});

const loadDeviceAccount = async (email: string): Promise<AppState | null> => {
  let value = await AsyncStorage.getItem(accountKey(email));
  if (!value) {
    const legacyValue = await AsyncStorage.getItem(KEY);
    if (legacyValue) {
      const legacy = JSON.parse(legacyValue) as Partial<AppState>;
      if (legacy.user?.email?.trim().toLowerCase() === email) {
        value = legacyValue;
        await AsyncStorage.removeItem(KEY);
      }
    }
  }
  return value ? normalizeState(JSON.parse(value) as Partial<AppState>, email) : null;
};

const loadSharedMeals = async (): Promise<Meal[]> => {
  if (!supabase) return MEALS;
  const { data, error } = await supabase
    .from('meals')
    .select('id, name, price, place, emoji, category, meal_type, description, ingredients, is_active')
    .order('name');
  if (error) throw new Error(`Unable to load shared meals: ${error.message}`);
  return (data ?? []).map(meal => ({
    id: meal.id,
    name: meal.name,
    price: Number(meal.price),
    place: meal.place,
    emoji: meal.emoji,
    cat: meal.category,
    type: meal.meal_type,
    desc: meal.description,
    ing: meal.ingredients,
    active: meal.is_active,
  }));
};

const loadCloudAccount = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error('The signed-in Supabase account has no email address.');

  const { data, error } = await supabase.from('app_data').select('payload').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(`Unable to load account data: ${error.message}`);
  const local = data?.payload == null ? await loadDeviceAccount(email) : null;
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;
  const next = normalizeState((data?.payload ?? local) as Partial<AppState> | null, email, metadataName);
  if (data?.payload == null) {
    const { error: saveError } = await supabase.from('app_data').upsert(
      { user_id: user.id, payload: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (saveError) throw new Error(`Unable to initialize account data: ${saveError.message}`);
  }

  const { data: admin, error: roleError } = await supabase.rpc('is_admin');
  if (roleError) throw new Error(`Unable to check admin role. Apply the Supabase database migration first: ${roleError.message}`);
  return { s: next, email, userId: user.id, isAdmin: admin === true };
};

const Ctx = createContext<StoreContextValue | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>(MEALS);
  const [mealError, setMealError] = useState<string | null>(null);
  const [store, setStore] = useState<Store>({
    s: seed, email: null, userId: null, ready: false, backend: supabase ? 'supabase' : 'device',
    backendError: null, isAdmin: false,
  });
  useEffect(() => {
    let mounted = true;
    if (supabase) {
      let requestId = 0;
      const activate = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
        const currentRequest = ++requestId;
        if (!user) {
          if (mounted) {
            setMeals(MEALS);
            setMealError(null);
            setStore({ s: seed, email: null, userId: null, ready: true, backend: 'supabase', backendError: null, isAdmin: false });
          }
          return;
        }
        if (mounted) setStore(previous => ({ ...previous, ready: false, backendError: null, backend: 'supabase' }));
        try {
          const account = await loadCloudAccount(user);
          let catalog = MEALS;
          let catalogError: string | null = null;
          try {
            catalog = await loadSharedMeals();
          } catch (error) {
            console.error('Unable to load shared meals:', error);
            catalogError = error instanceof Error ? error.message : 'Unable to load shared meals.';
          }
          if (mounted && currentRequest === requestId) {
            setMeals(catalog);
            setMealError(catalogError);
            setStore({ ...account, ready: true, backend: 'supabase', backendError: null });
          }
        } catch (error) {
          console.error('Unable to load Supabase account:', error);
          if (mounted && currentRequest === requestId) {
            setStore({
              s: seed, email: user.email ?? null, userId: user.id, ready: true, backend: 'supabase',
              backendError: error instanceof Error ? error.message : 'Unable to load your online account.',
              isAdmin: false,
            });
          }
        }
      };
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        setTimeout(() => { void activate(user); }, 0);
      });
      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) throw error;
        void activate(data.session?.user ?? null);
      }).catch(error => {
        console.error('Unable to restore Supabase session:', error);
        if (mounted) setStore(previous => ({
          ...previous, ready: true, backendError: 'Unable to restore your online session. Please try signing in again.',
        }));
      });
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    const load = async () => {
      try {
        const activeEmail = await AsyncStorage.getItem(ACTIVE_KEY);
        let email = activeEmail ? activeEmail.trim().toLowerCase() : null;
        let next = email ? await loadDeviceAccount(email) : null;
        if (!next && !email) {
          const legacyValue = await AsyncStorage.getItem(KEY);
          if (legacyValue) {
            const legacy = JSON.parse(legacyValue) as Partial<AppState>;
            email = legacy.user?.email?.trim().toLowerCase() || null;
            if (email) {
              next = normalizeState(legacy, email);
              await AsyncStorage.setItem(accountKey(email), JSON.stringify(next));
              await AsyncStorage.removeItem(KEY);
            }
          }
        }
        if (email && !next) next = normalizeState(null, email);
        if (email) {
          await AsyncStorage.setItem(ACTIVE_KEY, email);
        }
        if (mounted) setStore({
          s: next || seed, email, userId: null, ready: true, backend: 'device',
          backendError: null, isAdmin: false,
        });
        if (mounted) {
          setMeals(MEALS);
          setMealError(null);
        }
      } catch (error) {
        console.error('Unable to load saved device account:', error);
        if (mounted) setStore({
          s: seed, email: null, userId: null, ready: true, backend: 'device',
          backendError: 'Unable to load saved account data from this device.', isAdmin: false,
        });
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!store.ready || !store.email) return;
    const saves: Promise<string | null>[] = [
      AsyncStorage.setItem(accountKey(store.email), JSON.stringify(store.s)).then(() => null).catch(error => {
        console.error('Unable to save local account cache:', error);
        return 'Changes could not be saved on this device.';
      }),
    ];
    if (store.backend === 'device') {
      saves.push(AsyncStorage.setItem(ACTIVE_KEY, store.email).then(() => null).catch(error => {
          console.error('Unable to save active device account:', error);
          return 'The active account could not be saved on this device.';
        }));
    } else if (supabase && store.userId) {
      saves.push((async () => {
        const { error } = await supabase.from('app_data').upsert(
          { user_id: store.userId, payload: store.s, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
        if (error) {
          console.error('Unable to sync account data to Supabase:', error.message);
          return 'Your latest changes could not sync online. Check your connection and try again.';
        }
        return null;
      })());
    }
    void Promise.all(saves).then(results => {
      const syncError = results.find(Boolean) ?? null;
      setStore(previous => previous.syncError === syncError ? previous : { ...previous, syncError });
    });
  }, [store]);
  const set = (patch: StorePatch) => setStore(p => ({ ...p, s: { ...p.s, ...(typeof patch === 'function' ? patch(p.s) : patch) } }));
  const selectAccount = async (email: string, password: string, createNew = false, name = ''): Promise<AppState | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (supabase) {
      const response = createNew
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: name.trim() } } })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (response.error) {
        if (/email not confirmed/i.test(response.error.message)) {
          throw new Error('Please verify your email using the link we sent, then log in.');
        }
        throw response.error;
      }
      const user = response.data.user;
      if (!user) throw new Error('Supabase did not return an account. Please try again.');
      if (!response.data.session) return null;
      const account = await loadCloudAccount(user);
      setStore({ ...account, ready: true, backend: 'supabase', backendError: null });
      return account.s;
    }

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
      setStore({
        s: next, email: normalizedEmail, userId: null, ready: true, backend: 'device',
        backendError: null, isAdmin: false,
      });
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
    setStore({
      s: next, email: normalizedEmail, userId: null, ready: true, backend: 'device',
      backendError: null, isAdmin: false,
    });
    return next;
  };
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!store.email) throw new Error('No signed-in account was found.');
    if (store.backend === 'supabase' && supabase) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: store.email, password: currentPassword });
      if (verifyError) throw new Error('Your current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return;
    }
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
  const listManagedAccounts = async (page = 1): Promise<ManagedAccountsPage> => {
    if (!supabase || store.backend !== 'supabase' || !store.isAdmin) throw new Error('Admin access is required.');
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list', page } });
    if (error) throw new Error(error.message || 'Unable to load managed accounts.');
    if (!data || !Array.isArray(data.accounts)) throw new Error('Admin service returned an invalid account list.');
    return data as ManagedAccountsPage;
  };
  const setManagedAccountDisabled = async (userId: string, disabled: boolean) => {
    if (!supabase || store.backend !== 'supabase' || !store.isAdmin) throw new Error('Admin access is required.');
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: disabled ? 'disable' : 'enable', userId },
    });
    if (error) throw new Error(error.message || 'Unable to update account status.');
    if (!data?.success) throw new Error(data?.error || 'Admin service did not update the account.');
  };
  const refreshMeals = async () => {
    try {
      const catalog = await loadSharedMeals();
      setMeals(catalog);
      setMealError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load shared meals.';
      setMealError(message);
      throw error;
    }
  };
  const saveMeal = async (meal: Meal) => {
    if (!supabase || store.backend !== 'supabase' || !store.isAdmin) throw new Error('Admin access is required.');
    const { error } = await supabase.from('meals').upsert({
      id: meal.id,
      name: meal.name.trim(),
      price: meal.price,
      place: meal.place.trim(),
      emoji: meal.emoji.trim(),
      category: meal.cat,
      meal_type: meal.type,
      description: meal.desc.trim(),
      ingredients: meal.ing,
      is_active: meal.active,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) throw new Error(`Unable to save meal: ${error.message}`);
    await refreshMeals();
  };
  const setMealActive = async (mealId: string, active: boolean) => {
    if (!supabase || store.backend !== 'supabase' || !store.isAdmin) throw new Error('Admin access is required.');
    const { error } = await supabase.from('meals')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', mealId);
    if (error) throw new Error(`Unable to update meal availability: ${error.message}`);
    await refreshMeals();
  };
  const signOut = async () => {
    if (store.backend === 'supabase' && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    await AsyncStorage.removeItem(ACTIVE_KEY);
    setStore({
      s: seed, email: null, userId: null, ready: true, backend: supabase ? 'supabase' : 'device',
      backendError: null, isAdmin: false,
    });
  };
  const reset = () => setStore(p => ({ ...p, s: { ...seed, user: p.s.user } }));
  return <Ctx.Provider value={{ ...store, meals, mealError, set, reset, selectAccount, updatePassword, listManagedAccounts, setManagedAccountDisabled, refreshMeals, saveMeal, setMealActive, signOut }}>{children}</Ctx.Provider>;
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
  { id: 'm1', name: 'Longsilog', price: 65, place: 'Canteen near campus', emoji: '🍳', cat: 'Rice meal', type: 'Breakfast', desc: 'Garlic rice, longganisa and a fried egg. Filling and budget-friendly.', ing: ['Garlic rice', 'Longganisa', 'Fried egg', 'Atchara'], active: true },
  { id: 'm2', name: 'Monggo with rice', price: 35, place: 'Carinderia / home-cooked', emoji: '🍲', cat: 'Healthy', type: 'Lunch', desc: 'A comforting bowl of mung bean stew with garlic, onion and leafy greens, served with rice.', ing: ['Mung beans', 'Malunggay leaves', 'Garlic & onion', 'Steamed rice'], active: true },
  { id: 'm3', name: 'Chicken adobo rice', price: 80, place: 'Carinderia', emoji: '🍗', cat: 'Rice meal', type: 'Dinner', desc: 'Classic soy-vinegar chicken with a scoop of rice.', ing: ['Chicken', 'Soy sauce', 'Vinegar', 'Rice'], active: true },
  { id: 'm4', name: 'Pancit canton', price: 25, place: 'Home / sari-sari store', emoji: '🍜', cat: 'Budget', type: 'Snacks', desc: 'Quick stir-fried noodles. Add an egg for extra protein.', ing: ['Noodles', 'Egg', 'Veggies'], active: true },
  { id: 'm5', name: 'Tortang talong', price: 40, place: 'Carinderia', emoji: '🍆', cat: 'Healthy', type: 'Lunch', desc: 'Grilled eggplant omelette with rice.', ing: ['Eggplant', 'Egg', 'Rice'], active: true },
  { id: 'm6', name: 'Siomai rice', price: 50, place: 'Street stall', emoji: '🥟', cat: 'Budget', type: 'Dinner', desc: 'Four pieces of siomai with rice and chili garlic.', ing: ['Siomai', 'Rice', 'Chili garlic'], active: true },
  { id: 'm7', name: 'Banana cue', price: 15, place: 'Street stall', emoji: '🍌', cat: 'Snack', type: 'Snacks', desc: 'Caramelized saba on a stick.', ing: ['Saba banana', 'Brown sugar'], active: true },
  { id: 'm8', name: 'Sinigang na baboy', price: 95, place: 'Carinderia', emoji: '🥘', cat: 'Rice meal', type: 'Dinner', desc: 'Sour tamarind soup with pork and vegetables.', ing: ['Pork', 'Tamarind', 'Kangkong', 'Rice'], active: true },
];

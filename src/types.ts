export const CATEGORIES = ['Food', 'Transportation', 'School', 'Personal', 'Savings'] as const;
export type ExpenseCategory = (typeof CATEGORIES)[number];
export type Period = 'Weekly' | 'Monthly';

export interface Transaction {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  date: string;
}

export interface Meal {
  id: string;
  name: string;
  price: number;
  place: string;
  emoji: string;
  cat: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  desc: string;
  ing: string[];
  active: boolean;
}

export interface AppState {
  user: { name: string; email: string; avatar?: string };
  onboarded: boolean;
  period: Period;
  allowance: number;
  budgets: Record<ExpenseCategory, number>;
  tx: Transaction[];
  goals: SavingsGoal[];
  plan: Record<string, string>;
  settings: { push: boolean; budget: boolean; meal: boolean };
}

export interface ManagedAccount {
  id: string;
  email: string;
  createdAt: string;
  disabled: boolean;
}

export type ScreenName =
  | 'Splash' | 'Login' | 'CreateAccount' | 'Setup' | 'Home' | 'AddExpense'
  | 'Transactions' | 'Scanner' | 'Budget' | 'EditBudget' | 'Meals'
  | 'MealDetails' | 'Planner' | 'MealManagement' | 'Reports' | 'Insights' | 'Savings'
  | 'AddSavings' | 'Profile' | 'Settings' | 'PrivacyPolicy' | 'HelpSupport'
  | 'About' | 'PasswordHelp' | 'AccountSecurity' | 'AccountManagement' | 'StateView';

export interface Navigation {
  params: Record<string, unknown>;
  go: (name: ScreenName, params?: Record<string, unknown>) => void;
  back: () => void;
  reset: (name: ScreenName, params?: Record<string, unknown>) => void;
  tab: (name: 'Home' | 'Budget' | 'Meals' | 'Reports' | 'Profile') => void;
}

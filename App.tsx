import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/store';
import { TabBar } from './src/components';
import { Splash, Login, CreateAccount, Setup, PasswordHelp } from './src/screens/Onboarding';
import { Home, AddExpense, Transactions, Scanner } from './src/screens/Main';
import { Budget, EditBudget, Meals, MealDetails, Planner, MealManagement } from './src/screens/Budget';
import { Reports, Insights, Savings, AddSavings, Profile, Settings, PrivacyPolicy, HelpSupport, About, AccountSecurity, AccountManagement, StateView } from './src/screens/More';
import { C } from './src/theme';
import type { Navigation, ScreenName } from './src/types';
import { useStore } from './src/store';

type ScreenProps = { nav: Navigation };
const SCREENS: Record<ScreenName, React.ComponentType<ScreenProps>> = { Splash, Login, CreateAccount, Setup, PasswordHelp, Home, AddExpense, Transactions, Scanner, Budget, EditBudget, Meals, MealDetails, Planner, MealManagement, Reports, Insights, Savings, AddSavings, Profile, Settings, PrivacyPolicy, HelpSupport, About, AccountSecurity, AccountManagement, StateView };
const TABS: Array<'Home' | 'Budget' | 'Meals' | 'Reports' | 'Profile'> = ['Home', 'Budget', 'Meals', 'Reports', 'Profile'];
const isTab = (name: ScreenName): name is (typeof TABS)[number] => TABS.includes(name as (typeof TABS)[number]);

function Root() {
  const { syncError } = useStore();
  const [stack, setStack] = useState<Array<{ name: ScreenName; params?: Record<string, unknown> }>>([{ name: 'Splash' }]);
  const cur = stack[stack.length - 1];
  const nav: Navigation = {
    params: cur.params || {},
    go: (name, params) => setStack(st => [...st, { name, params }]),
    back: () => setStack(st => (st.length > 1 ? st.slice(0, -1) : st)),
    reset: (name, params) => setStack([{ name, params }]),
    tab: name => setStack([{ name }]),
  };
  const Cmp = SCREENS[cur.name];
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StatusBar style={cur.name === 'Splash' ? 'light' : 'dark'} />
      {syncError ? <View accessibilityRole="alert" style={{ backgroundColor: '#FCE8E6', padding: 10 }}><Text style={{ color: '#A52B25', textAlign: 'center' }}>{syncError}</Text></View> : null}
      <View style={{ flex: 1 }}><Cmp key={stack.length + cur.name} nav={nav} /></View>
      {isTab(cur.name) ? <TabBar current={cur.name} onTab={nav.tab} /> : null}
    </View>
  );
}
export default function App() {
  return <SafeAreaProvider><StoreProvider><Root /></StoreProvider></SafeAreaProvider>;
}

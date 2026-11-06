import React, { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/store';
import { TabBar } from './src/components';
import { Splash, Login, CreateAccount, Setup, PasswordHelp } from './src/screens/Onboarding';
import { Home, AddExpense, Transactions, Scanner } from './src/screens/Main';
import { Budget, EditBudget, Meals, MealDetails, Planner } from './src/screens/Budget';
import { Reports, Insights, Savings, AddSavings, Profile, Settings, PrivacyPolicy, HelpSupport, About, AccountSecurity, StateView } from './src/screens/More';
import { C } from './src/theme';
import type { Navigation, ScreenName } from './src/types';

type ScreenProps = { nav: Navigation };
const SCREENS: Record<ScreenName, React.ComponentType<ScreenProps>> = { Splash, Login, CreateAccount, Setup, PasswordHelp, Home, AddExpense, Transactions, Scanner, Budget, EditBudget, Meals, MealDetails, Planner, Reports, Insights, Savings, AddSavings, Profile, Settings, PrivacyPolicy, HelpSupport, About, AccountSecurity, StateView };
const TABS: Array<'Home' | 'Budget' | 'Meals' | 'Reports' | 'Profile'> = ['Home', 'Budget', 'Meals', 'Reports', 'Profile'];
const isTab = (name: ScreenName): name is (typeof TABS)[number] => TABS.includes(name as (typeof TABS)[number]);

function Root() {
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
      <View style={{ flex: 1 }}><Cmp key={stack.length + cur.name} nav={nav} /></View>
      {isTab(cur.name) ? <TabBar current={cur.name} onTab={nav.tab} /> : null}
    </View>
  );
}
export default function App() {
  return <SafeAreaProvider><StoreProvider><Root /></StoreProvider></SafeAreaProvider>;
}

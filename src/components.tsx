import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from './theme';
import type { Navigation } from './types';

export const fmt = (n: number) => '₱' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

interface ScreenProps {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  bg?: string;
}

export function Screen({ children, footer, scroll = true, bg = C.cream }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {scroll ? <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        : <View style={{ flex: 1, padding: 20 }}>{children}</View>}
      {footer ? <View style={{ padding: 20, paddingTop: 8 }}>{footer}</View> : null}
    </SafeAreaView>
  );
}
interface HeaderProps { title: string; sub?: string; onBack?: () => void; right?: ReactNode }
export function Header({ title, sub, onBack, right }: HeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
      {onBack ? <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={22} color={C.green} /></TouchableOpacity> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>{title}</Text>
        {sub ? <Text style={{ color: C.muted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}
interface CardProps { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }
export const Card = ({ children, style, onPress }: CardProps) => {
  const P = onPress ? TouchableOpacity : View;
  return <P onPress={onPress} style={[{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }, style]}>{children}</P>;
};
interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'lime' | 'outline' | 'ghost';
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}
export function Btn({ label, onPress, variant = 'primary', disabled, icon }: BtnProps) {
  const v = { primary: [C.green, '#fff'], lime: [C.lime, C.green], outline: ['transparent', C.green], ghost: ['transparent', C.muted] }[variant];
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.8}
      style={{ backgroundColor: v[0], borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 8,
        borderWidth: variant === 'outline' ? 1.5 : 0, borderColor: C.green, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ color: v[1], fontWeight: '700', fontSize: 16 }}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color={v[1]} style={{ marginLeft: 6 }} /> : null}
    </TouchableOpacity>
  );
}
interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  style?: StyleProp<TextStyle>;
  rightAccessory?: ReactNode;
}
export function Field({ label, error, style, rightAccessory, ...p }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={{ fontWeight: '600', color: C.text, marginBottom: 6 }}>{label}</Text> : null}
      {rightAccessory ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.2, borderColor: error ? C.red : C.border, borderRadius: 12, paddingRight: 12 }}>
          <TextInput placeholderTextColor="#A5ABA2" {...p}
            style={[{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text }, style]} />
          {rightAccessory}
        </View>
      ) : (
        <TextInput placeholderTextColor="#A5ABA2" {...p}
          style={[{ backgroundColor: '#fff', borderWidth: 1.2, borderColor: error ? C.red : C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text }, style]} />
      )}
      {error ? <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
interface ChipProps { label: string; active?: boolean; onPress: () => void }
export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8,
      backgroundColor: active ? C.green : '#fff', borderWidth: 1, borderColor: active ? C.green : C.border }}>
      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}
interface BarProps { pct: number; color?: string; track?: string; h?: number }
export function Bar({ pct, color = C.green, track = '#E6E3D6', h = 8 }: BarProps) {
  return <View style={{ height: h, borderRadius: h, backgroundColor: track, overflow: 'hidden' }}>
    <View style={{ height: h, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} /></View>;
}
interface RowProps { children: ReactNode; style?: StyleProp<ViewStyle> }
export const Row = ({ children, style }: RowProps) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
interface LogoProps { size?: number; dark?: boolean }
export const Logo = ({ size = 44, dark }: LogoProps) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? C.lime : C.green, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="leaf" size={size * 0.5} color={dark ? C.green : '#fff'} />
  </View>
);
export const Section = ({ children }: { children: ReactNode }) => <Text style={{ fontWeight: '800', color: C.text, fontSize: 16, marginBottom: 10, marginTop: 6 }}>{children}</Text>;

type TabName = 'Home' | 'Budget' | 'Meals' | 'Reports' | 'Profile';
export function TabBar({ current, onTab }: { current: TabName; onTab: Navigation['tab'] }) {
  const tabs: Array<[TabName, React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']]> = [
    ['Home', 'home', 'home-outline'],
    ['Budget', 'pie-chart', 'pie-chart-outline'],
    ['Meals', 'restaurant', 'restaurant-outline'],
    ['Reports', 'stats-chart', 'stats-chart-outline'],
    ['Profile', 'person', 'person-outline'],
  ];
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.border }}>
      <Row style={{ justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4 }}>
        {tabs.map(([n, activeIcon, inactiveIcon]) => (
          <TouchableOpacity key={n} onPress={() => onTab(n)} style={{ alignItems: 'center', flex: 1 }}>
            <Ionicons name={current === n ? activeIcon : inactiveIcon} size={22} color={current === n ? C.green : C.muted} />
            <Text style={{ fontSize: 11, marginTop: 2, color: current === n ? C.green : C.muted, fontWeight: current === n ? '700' : '500' }}>{n}</Text>
          </TouchableOpacity>
        ))}
      </Row>
    </SafeAreaView>
  );
}

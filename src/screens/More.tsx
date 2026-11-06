import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, Linking, Image } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Header, Card, Btn, Field, Row, Bar, Section, Logo, fmt } from '../components';
import { useStore, totals, today, parseDate } from '../store';
import { C, CAT, CATS } from '../theme';
import type { ExpenseCategory, ManagedAccount, Navigation, SavingsGoal, Transaction } from '../types';

type ScreenProps = { nav: Navigation };

export function Reports({ nav }: ScreenProps) {
  const { s } = useStore(); const [range, setRange] = useState<'Week' | 'Month'>('Week');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  if (range === 'Week') start.setDate(now.getDate() - now.getDay());
  else start.setDate(1);
  const elapsedDays = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  const previousStart = new Date(start);
  let previousEnd;
  if (range === 'Week') {
    previousStart.setDate(start.getDate() - 7);
    previousEnd = new Date(previousStart);
    previousEnd.setDate(previousStart.getDate() + elapsedDays);
  } else {
    previousStart.setMonth(start.getMonth() - 1);
    previousEnd = new Date(previousStart);
    previousEnd.setDate(Math.min(now.getDate(), new Date(start.getFullYear(), start.getMonth(), 0).getDate()));
  }
  const dateFor = (value: string) => {
    const date = parseDate(value);
    if (!date) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const sumPeriod = (from: Date, through: Date) => s.tx.reduce((result, item) => {
    const date = dateFor(item.date);
    if (!date || date < from || date > through || !Number.isFinite(item.amount)) return result;
    result.total += item.amount;
    result.count += 1;
    result.byCategory[item.category] = (result.byCategory[item.category] || 0) + item.amount;
    return result;
  }, { total: 0, count: 0, byCategory: {} as Partial<Record<ExpenseCategory, number>> });
  const current = sumPeriod(start, now);
  const previous = sumPeriod(previousStart, previousEnd);
  const spent = current.total;
  const by = current.byCategory;
  const categories = CATS.filter(category => (by[category] ?? 0) > 0).sort((a, b) => (by[b] ?? 0) - (by[a] ?? 0));
  const top = categories[0] || null;
  const R = 70, L = 2 * Math.PI * R; let off = 0;
  const comparison = previous.total === 0
    ? (spent > 0 ? 'New spending this period' : 'No spending in either period')
    : `${spent > previous.total ? '+' : spent < previous.total ? '−' : ''}${fmt(Math.abs(spent - previous.total))} (${Math.round(Math.abs(spent - previous.total) / previous.total * 100)}%) ${spent > previous.total ? 'more' : spent < previous.total ? 'less' : 'change'} than the same days of the previous ${range.toLowerCase()}`;
  return (
    <Screen>
      <Header title="Your spending, clearly" sub="See where your baon goes and compare periods." />
      <View style={{ flexDirection: 'row', backgroundColor: C.mint, borderRadius: 24, padding: 4, marginBottom: 14 }}>
        {(['Week', 'Month'] as const).map(item => (
          <TouchableOpacity key={item} onPress={() => setRange(item)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 20, backgroundColor: range === item ? '#fff' : 'transparent' }}>
            <Text style={{ color: range === item ? C.green : C.muted, fontWeight: '700', fontSize: 12 }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>
        {range === 'Week' ? 'Sunday through today' : 'First day of this month through today'} · compared with the matching days before
      </Text>
      <Card style={{ alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 10, marginBottom: 12, fontWeight: '700' }}>
          THIS {range.toUpperCase()} TO DATE · {current.count} RECORDED EXPENSE{current.count === 1 ? '' : 'S'}
        </Text>
        <View style={{ width: 190, height: 190, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={190} height={190} viewBox="0 0 190 190" style={{ position: 'absolute' }}>
            <Circle cx="95" cy="95" r={R} stroke="#E6E3D6" strokeWidth="22" fill="none" />
            {categories.map(category => {
              const len = ((by[category] ?? 0) / spent) * L;
              const el = <Circle key={category} cx="95" cy="95" r={R} stroke={CAT[category].color} strokeWidth="22" fill="none" strokeDasharray={`${len} ${L - len}`} strokeDashoffset={-off} rotation="-90" origin="95,95" />;
              off += len;
              return el;
            })}
          </Svg>
          <Text style={{ color: C.muted, fontSize: 10 }}>TOTAL SPENT</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.green }}>{fmt(spent)}</Text>
        </View>
        <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
          {categories.map(category => (
            <View key={category} style={{ marginBottom: 12 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CAT[category].color, marginRight: 8 }} /><Text style={{ color: C.text }}>{category}</Text></Row>
                <Text style={{ fontWeight: '700' }}>{fmt(by[category] ?? 0)} · {Math.round((by[category] ?? 0) / spent * 100)}%</Text>
              </Row>
              <Bar pct={(by[category] ?? 0) / spent * 100} color={CAT[category].color} />
            </View>
          ))}
          {!current.count ? <Text style={{ color: C.muted, textAlign: 'center' }}>No expenses recorded this {range.toLowerCase()}.</Text> : null}
        </View>
      </Card>
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Text style={{ color: C.green, fontSize: 12, fontWeight: '800' }}>Compared with the equivalent previous {range.toLowerCase()}</Text>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', marginTop: 5 }}>{comparison}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Previous period: {fmt(previous.total)} from {previous.count} expense{previous.count === 1 ? '' : 's'}.</Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', color: C.text }}>Period summary</Text>
        <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
          <Text style={{ color: C.muted }}>Daily average ({elapsedDays + 1} days)</Text>
          <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(Math.round(spent / (elapsedDays + 1)))}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
          <Text style={{ color: C.muted }}>Largest category</Text>
          <Text style={{ color: C.green, fontWeight: '800' }}>{top || '—'}</Text>
        </Row>
      </Card>
      <Btn variant="outline" label="View spending insights" onPress={() => nav.go('Insights')} />
    </Screen>
  );
}

export function Insights({ nav }: ScreenProps) {
  const { s } = useStore(); const { by, spent } = totals(s);
  const top = spent ? CATS.slice().sort((a, b) => (by[b] || 0) - (by[a] || 0))[0] : null;
  const pct = top ? Math.round(((by[top] || 0) / spent) * 100) : 0;
  const saved = s.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const days = s.period === 'Monthly' ? 30 : 7;
  const dailyLimit = Math.floor((s.budgets.Food ?? 0) / days);
  return (
    <Screen footer={<Btn label="Explore Meal Finder" onPress={() => nav.tab('Meals')} />}>
      <Header title="Small steps, smarter baon" sub="Based on your recent spending." onBack={nav.back} />
      <View style={{ backgroundColor: C.green, borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <Ionicons name="bulb-outline" size={20} color={C.lime} style={{ marginBottom: 8 }} />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 19 }}>{top ? `${top} is your biggest category.` : 'Start tracking your spending.'}</Text>
        <Text style={{ color: '#CFE3D3', marginTop: 4 }}>
          {top ? `${fmt(by[top] ?? 0)} of ${fmt(spent)} spent · ${pct}% of your total.` : 'Add an expense to get personalized insights.'}
        </Text>
      </View>
      <Card style={{ padding: 14 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>Suggested daily limit</Text>
          <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(dailyLimit)}</Text>
        </Row>
        <Text style={{ color: C.muted, fontSize: 12 }}>
          {fmt(s.budgets.Food)} ÷ {days} days, rounded down. Use this as a guide, not a rule.
        </Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: '800', color: C.text }}>Try familiar, affordable meals</Text>
        <Text style={{ color: C.muted, marginTop: 5, fontSize: 12, lineHeight: 18 }}>
          Monggo with rice costs ₱35, or try tortang talong for ₱40. Either can leave more of your baon for the week.
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>Estimated price; may vary by seller.</Text>
      </Card>
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Text style={{ fontWeight: '800', color: C.green }}>Start small, when you can</Text>
        <Text style={{ color: C.text, marginTop: 5, fontSize: 12, lineHeight: 18 }}>
          {fmt(saved)} saved in your goals. If essentials are covered, consider setting aside a small amount. Don't skip meals to save.
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>Your spending history is still growing.</Text>
      </Card>
    </Screen>
  );
}

export function Savings({ nav }: ScreenProps) {
  const { s, set } = useStore();
  const actualSavings = s.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const [name, setName] = useState(''); const [target, setTarget] = useState(''); const [date, setDate] = useState(''); const [err, setErr] = useState<{ name?: string; target?: string }>({});
  const create = () => {
    const e: { name?: string; target?: string } = {}; if (!name.trim()) e.name = 'Give your goal a name.'; if (!(parseInt(target, 10) > 0)) e.target = 'Enter a target amount.';
    setErr(e); if (Object.keys(e).length) return;
    const g = { id: 'g' + Date.now(), name: name.trim(), target: parseInt(target, 10), saved: 0, date: date || 'No date' };
    set({ goals: [...s.goals, g] }); setName(''); setTarget(''); setDate(''); nav.go('StateView', { kind: 'goalCreated', goal: g });
  };
  return (
    <Screen>
      <Header title="A little closer, each time" sub="Save for what matters." onBack={nav.back} />
      <View style={{ backgroundColor: '#EAF3E8', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Ionicons name="wallet-outline" size={18} color={C.green} />
            <Text style={{ color: C.green, fontWeight: '800', marginLeft: 8 }}>Actual savings</Text>
          </Row>
          <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(actualSavings)}</Text>
        </Row>
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
          {fmt(s.budgets.Savings)} allocated from your budget.
        </Text>
      </View>
      {s.goals.map(g => (
        <Card key={g.id}>
          <Ionicons name="school-outline" size={22} color={C.green} style={{ marginBottom: 7 }} />
          <Text style={{ fontWeight: '800', color: C.text, fontSize: 16 }}>{g.name}</Text>
          <Row style={{ justifyContent: 'space-between', marginTop: 8, marginBottom: 6 }}>
            <Text style={{ color: C.text, fontSize: 12 }}>{fmt(g.saved)} saved</Text>
            <Text style={{ color: C.text, fontSize: 12 }}>{fmt(g.target)} target</Text>
          </Row>
          <Bar pct={(g.saved / g.target) * 100} />
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: C.muted, fontSize: 11 }}>{Math.min(100, Math.round((g.saved / g.target) * 100))}% complete</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{g.date}</Text>
          </Row>
          <Btn label="Add Savings" onPress={() => nav.go('AddSavings', { id: g.id })} />
        </Card>))}
      <Section>Create another goal</Section>
      <Field label="Goal name" placeholder="e.g. New phone" value={name} onChangeText={setName} error={err.name} />
      <Field label="Target amount (₱)" keyboardType="numeric" value={target} onChangeText={t => setTarget(t.replace(/\D/g, ''))} error={err.target} />
      <Field label="Target date" placeholder="e.g. Dec 31, 2026" value={date} onChangeText={setDate} />
      <Btn label="Create Savings Goal" onPress={create} />
    </Screen>
  );
}

export function AddSavings({ nav }: ScreenProps) {
  const { s, set } = useStore(); const goalId = nav.params.id; const g = s.goals.find(x => x.id === goalId) || s.goals[0];
  const [amt, setAmt] = useState(''); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const save = () => {
    const n = parseInt(amt, 10); if (!n || n <= 0) { setErr('Enter an amount greater than ₱0.'); return; }
    const ng = { ...g, saved: g.saved + n }; set({ goals: s.goals.map(x => x.id === g.id ? ng : x) });
    ng.saved >= ng.target ? nav.go('StateView', { kind: 'goalReached', goal: ng }) : nav.back();
  };
  return (
    <Screen footer={<><Btn label="Save Amount" onPress={save} /><Btn variant="ghost" label="Cancel" onPress={nav.back} /></>}>
      <Header title="Add to your savings" onBack={nav.back} />
      <View style={{ backgroundColor: C.green, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{g.name}</Text>
        <Text style={{ color: '#CFE3D3', marginVertical: 6 }}>{fmt(g.saved)} saved · {fmt(g.target)} goal</Text>
        <Bar pct={(g.saved / g.target) * 100} color={C.lime} track="#2E6B44" />
      </View>
      <Field label="How much will you save? (₱)" keyboardType="numeric" value={amt} onChangeText={t => { setAmt(t.replace(/\D/g, '')); setErr(''); }} error={err} />
      <Field label="What's it for? (optional)" placeholder="e.g. Baon leftover" value={note} onChangeText={setNote} />
    </Screen>
  );
}

export function Profile({ nav }: ScreenProps) {
  const { s, set, isAdmin, backend } = useStore();
  const [photoBusy, setPhotoBusy] = useState(false);
  const editAvatar = () => {
    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
      { text: 'Choose photo', onPress: () => { void chooseAvatar(); } },
    ];
    if (s.user.avatar) {
      options.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => set({ user: { ...s.user, avatar: undefined } }),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile photo', 'Choose or remove your profile photo.', options);
  };
  const chooseAvatar = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo?.base64) throw new Error('The selected photo could not be loaded. Please choose another image.');
      const mimeType = photo.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      set({ user: { ...s.user, avatar: `data:${mimeType};base64,${photo.base64}` } });
    } catch (error) {
      console.error('Unable to update profile photo:', error);
      Alert.alert('Unable to update photo', error instanceof Error ? error.message : 'Please try selecting another photo.');
    } finally {
      setPhotoBusy(false);
    }
  };
  const Item = ({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress}><Row style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.border }}>
      <Ionicons name={icon} size={20} color={C.green} /><Text style={{ flex: 1, marginLeft: 12, color: C.text, fontWeight: '600' }}>{label}</Text><Ionicons name="chevron-forward" size={18} color={C.muted} /></Row></TouchableOpacity>);
  return (
    <Screen>
      <Header title="My student profile" sub="Your details and goals." />
      <Card><Row>
        <TouchableOpacity onPress={editAvatar} accessibilityRole="button" accessibilityLabel="Edit profile photo" disabled={photoBusy}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {s.user.avatar ? <Image source={{ uri: s.user.avatar }} style={{ width: 64, height: 64 }} /> : <Text style={{ fontSize: 27 }}>🎓</Text>}
            <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: C.green, borderRadius: 10, padding: 3 }}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}><Text style={{ fontWeight: '800', color: C.green, fontSize: 18 }}>{s.user.name}</Text><Text style={{ color: C.muted }}>{s.user.email || 'Student'}</Text>
          <TouchableOpacity onPress={editAvatar} disabled={photoBusy}><Text style={{ color: C.green, fontWeight: '700', fontSize: 12, marginTop: 4 }}>{photoBusy ? 'Opening photos…' : s.user.avatar ? 'Edit profile photo' : 'Add profile photo'}</Text></TouchableOpacity>
        </View></Row></Card>
      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>Allowance & budget preferences</Text>
        {[['Frequency', s.period], ['Allowance', fmt(s.allowance)], ['Food budget', fmt(s.budgets.Food)]].map(([a, b]) => (
          <Row key={a} style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Text style={{ color: C.muted }}>{a}</Text><Text style={{ fontWeight: '700' }}>{b}</Text></Row>))}
      </Card>
      <Card style={{ paddingVertical: 2 }}>
        <Item icon="flag" label="Saved goals" onPress={() => nav.go('Savings')} />
        <Item icon="lock-closed" label="Account security" onPress={() => nav.go('AccountSecurity')} />
        {backend === 'supabase' && isAdmin ? <Item icon="people" label="Manage accounts" onPress={() => nav.go('AccountManagement')} /> : null}
        {backend === 'supabase' && isAdmin ? <Item icon="restaurant" label="Manage meal menu" onPress={() => nav.go('MealManagement')} /> : null}
        <Item icon="settings" label="Settings" onPress={() => nav.go('Settings')} />
      </Card>
      <Btn label="Edit Budget" onPress={() => nav.go('EditBudget')} />
    </Screen>
  );
}

export function AccountSecurity({ nav }: ScreenProps) {
  const { updatePassword, backend } = useStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const savePassword = async () => {
    if (busy) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Complete all password fields.');
      return;
    }
    if (newPassword.length < (backend === 'supabase' ? 6 : 4)) {
      setError(`Your new password must be at least ${backend === 'supabase' ? 6 : 4} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Choose a new password different from your current one.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', backend === 'supabase' ? 'Your online account password has been changed.' : 'Your password has been changed on this device.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Account security" sub={backend === 'supabase' ? 'Change your online account password.' : 'Change the password for this device account.'} onBack={nav.back} />
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Ionicons name="shield-checkmark-outline" size={22} color={C.green} />
        <Text style={{ color: C.text, lineHeight: 20, marginTop: 7 }}>
          {backend === 'supabase'
            ? 'Enter your current password to verify your account, then set a new password. It will apply anywhere you log in.'
            : 'Enter your current password to set a new one. Your account is stored on this device, so the change won’t sync to other devices.'}
        </Text>
      </Card>
      {error ? <Card style={{ backgroundColor: C.redBg, borderColor: C.redBg }}><Text style={{ color: C.red }}>{error}</Text></Card> : null}
      <Field label="Current password" placeholder="Enter current password" secureTextEntry value={currentPassword} onChangeText={value => { setCurrentPassword(value); setError(''); }} autoCapitalize="none" />
      <Field label="New password" placeholder="At least 4 characters" secureTextEntry value={newPassword} onChangeText={value => { setNewPassword(value); setError(''); }} autoCapitalize="none" />
      <Field label="Confirm new password" placeholder="Enter new password again" secureTextEntry value={confirmPassword} onChangeText={value => { setConfirmPassword(value); setError(''); }} autoCapitalize="none" />
      <Btn label={busy ? 'Updating…' : 'Update password'} disabled={busy} onPress={() => { void savePassword(); }} />
    </Screen>
  );
}

export function AccountManagement({ nav }: ScreenProps) {
  const { backend, isAdmin, listManagedAccounts, setManagedAccountDisabled } = useStore();
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadPage = async (nextPage: number, append: boolean) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await listManagedAccounts(nextPage);
      setAccounts(previous => append ? [...previous, ...result.accounts] : result.accounts);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load accounts.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (backend === 'supabase' && isAdmin) void loadPage(1, false);
  }, [backend, isAdmin]);

  const confirmStatusChange = (account: ManagedAccount) => {
    const disabled = !account.disabled;
    Alert.alert(
      disabled ? 'Disable this account?' : 'Enable this account?',
      `${account.email} ${disabled ? 'will no longer be able to sign in.' : 'will be able to sign in again.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: disabled ? 'Disable account' : 'Enable account',
          style: disabled ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError('');
              try {
                await setManagedAccountDisabled(account.id, disabled);
                setAccounts(previous => previous.map(item => item.id === account.id ? { ...item, disabled } : item));
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Unable to update account.');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Manage accounts" sub="Account access only; personal budgets and expenses stay private." onBack={nav.back} />
      {backend !== 'supabase' || !isAdmin ? (
        <Card><Text style={{ color: C.text }}>This screen is available only to an authorized Supabase admin account.</Text></Card>
      ) : (
        <>
          <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
            <Text style={{ color: C.green, fontWeight: '800' }}>Privacy protected</Text>
            <Text style={{ color: C.text, lineHeight: 20, marginTop: 5 }}>Admins can view account email addresses and enable or disable sign-in. They cannot view account budgets, transactions, savings goals, or profile photos.</Text>
          </Card>
          {error ? <Card style={{ backgroundColor: C.redBg, borderColor: C.redBg }}><Text style={{ color: C.red }}>{error}</Text></Card> : null}
          {accounts.map(account => (
            <Card key={account.id}>
              <Text style={{ color: C.text, fontWeight: '800' }}>{account.email || 'No email'}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Joined {new Date(account.createdAt).toLocaleDateString()}</Text>
              <Text style={{ color: account.disabled ? C.red : C.green, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{account.disabled ? 'Disabled' : 'Active'}</Text>
              <Btn
                label={account.disabled ? 'Enable account' : 'Disable account'}
                variant={account.disabled ? 'outline' : 'ghost'}
                disabled={busy}
                onPress={() => confirmStatusChange(account)}
              />
            </Card>
          ))}
          {busy && !accounts.length ? <Text style={{ color: C.muted }}>Loading accounts…</Text> : null}
          {!busy && !accounts.length && !error ? <Card><Text style={{ color: C.muted }}>No accounts found.</Text></Card> : null}
          {hasMore ? <Btn variant="outline" label={busy ? 'Loading…' : 'Load more accounts'} disabled={busy} onPress={() => { void loadPage(page + 1, true); }} /> : null}
          <Btn variant="ghost" label="Refresh accounts" disabled={busy} onPress={() => { void loadPage(1, false); }} />
        </>
      )}
    </Screen>
  );
}

export function Settings({ nav }: ScreenProps) {
  const { s, set, reset, signOut } = useStore();
  const T = ({ label, k }: { label: string; k: keyof typeof s.settings }) => (<Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}><Text style={{ color: C.text, fontWeight: '600' }}>{label}</Text>
    <Switch value={s.settings[k]} onValueChange={v => set({ settings: { ...s.settings, [k]: v } })} trackColor={{ true: C.green }} /></Row>);
  return (
    <Screen>
      <Header title="Settings" sub="Tune AbotKaya to fit you." onBack={nav.back} />
      <Card><Text style={{ fontWeight: '800' }}>Notifications</Text><T label="Push alerts" k="push" /><T label="Budget alerts" k="budget" /><T label="Meal plan reminders" k="meal" /></Card>
      <Card><Text style={{ fontWeight: '800', marginBottom: 6 }}>Preferences</Text>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Text style={{ color: C.muted }}>Currency</Text><Text style={{ fontWeight: '700' }}>PHP (₱)</Text></Row>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Text style={{ color: C.muted }}>Allowance settings</Text><Text style={{ fontWeight: '700' }}>{s.period} · {fmt(s.allowance)}</Text></Row></Card>
      <Card style={{ paddingVertical: 2 }}>
        <SettingsLink icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => nav.go('PrivacyPolicy')} />
        <SettingsLink icon="help-circle-outline" label="Help & Support" onPress={() => nav.go('HelpSupport')} />
        <SettingsLink icon="information-circle-outline" label="About AbotKaya" onPress={() => nav.go('About')} />
      </Card>
      <Btn variant="outline" label="Log out" onPress={async () => {
        try {
          await signOut();
          nav.reset('Login');
        } catch (error) {
          console.error('Unable to log out:', error);
          Alert.alert('Unable to log out', 'Please try again.');
        }
      }} />
      <Btn variant="ghost" label="Reset all data" onPress={() => { reset(); nav.reset('Splash'); }} />
    </Screen>
  );
}

function SettingsLink({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      <Row style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.border }}>
        <Ionicons name={icon} size={20} color={C.green} />
        <Text style={{ flex: 1, marginLeft: 12, color: C.text, fontWeight: '600' }}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Row>
    </TouchableOpacity>
  );
}

function InfoSection({ title, children }: { title: string; children: string }) {
  return (
    <Card>
      <Text style={{ color: C.green, fontWeight: '800', fontSize: 15 }}>{title}</Text>
      <Text style={{ color: C.text, lineHeight: 21, marginTop: 7 }}>{children}</Text>
    </Card>
  );
}

export function PrivacyPolicy({ nav }: ScreenProps) {
  const { backend } = useStore();
  return (
    <Screen>
      <Header title="Privacy Policy" sub={backend === 'supabase' ? 'Your account data syncs securely.' : 'Your information stays on your device.'} onBack={nav.back} />
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Last updated: November 6, 2026</Text>
      <InfoSection title="Information you enter">
        AbotKaya saves the details you add, such as your name, email address, profile photo, allowance, budgets, expenses, savings goals, and app preferences.
      </InfoSection>
      <InfoSection title="Where your information is stored">
        {backend === 'supabase'
          ? 'Your account and budgeting data are stored in the AbotKaya Supabase project and cached on this device. Access is protected so each account can read only its own budgeting data. Logging out does not delete your online data.'
          : 'Your account and app data are stored locally on this device. AbotKaya does not send them to an AbotKaya server. Your information may be removed if you uninstall the app, clear its storage, or use Reset all data.'}
      </InfoSection>
      <InfoSection title="Account security">
        {backend === 'supabase'
          ? 'Supabase securely manages your online sign-in. AbotKaya does not store your account password in its app data.'
          : 'Your password is checked on this device. The app stores a salted password hash rather than your original password. Anyone with access to your unlocked device may still be able to access data saved on it.'}
      </InfoSection>
      <InfoSection title="Camera permission">
        {`You can choose a profile photo from your device’s photo library; it is saved ${backend === 'supabase' ? 'with your online account data' : 'with your local account'}. If you scan a supported product barcode, its number is sent to public product catalogs to look up product details. These catalogs do not include every product or provide your store’s current price. You can deny or revoke photo or camera access in your device settings; other expense-tracking features remain available.`}
      </InfoSection>
      <InfoSection title="Your choices">
        You can log out in Settings or use Reset all data to clear the current account’s app data. You can also manage camera permission through your device settings.
      </InfoSection>
      <InfoSection title="Questions">
        For privacy questions, contact abotkaya@gmail.com.
      </InfoSection>
    </Screen>
  );
}

const HELP_TOPICS = [
  {
    title: 'How do I add an expense?',
    text: 'Tap Add Expense on the Home screen, enter the amount, choose a category, and add a short description. Notes are optional. Tap Save Expense when you are done.',
  },
  {
    title: 'Where can I see my spending?',
    text: 'Open Transactions to review individual expenses, or open Reports to see totals and category breakdowns for the week or month.',
  },
  {
    title: 'How do I change my allowance or budget?',
    text: 'Go to your Profile and tap Edit Budget. You can update your allowance frequency, amount, and category budgets there.',
  },
  {
    title: 'How do I scan a code?',
    text: 'Open Scan a product from Home and allow camera access when prompted. The app checks public food, general-product, beauty, and pet-food catalogs, then suggests an expense category when it finds a match. Catalogs do not include every barcode, and the barcode does not contain a price. Check the suggested category and enter the price you paid. If no match is found, enter the product name and category manually.',
  },
  {
    title: 'Will I keep my data if I log out?',
    text: 'Logging out keeps your saved account on this device. Sign in again with the same account to access it. Reset all data clears the current account’s app data.',
  },
];

export function HelpSupport({ nav }: ScreenProps) {
  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const contactSupport = async () => {
    const subject = encodeURIComponent('AbotKaya support');
    const body = encodeURIComponent('Hi AbotKaya Support,\n\nI need help with:\n\n');
    try {
      await Linking.openURL(`mailto:abotkaya@gmail.com?subject=${subject}&body=${body}`);
    } catch (error) {
      console.error('Unable to open support email:', error);
      Alert.alert('Unable to open email', 'Please email abotkaya@gmail.com for help.');
    }
  };

  return (
    <Screen>
      <Header title="Help & Support" sub="Answers to common questions." onBack={nav.back} />
      <Section>Frequently asked questions</Section>
      <Card style={{ paddingVertical: 2 }}>
        {HELP_TOPICS.map((topic, index) => {
          const expanded = openTopic === index;
          return (
            <TouchableOpacity
              key={topic.title}
              onPress={() => setOpenTopic(expanded ? null : index)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.border }}
            >
              <Row>
                <Text style={{ flex: 1, color: C.text, fontWeight: '700', paddingRight: 8 }}>{topic.title}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.green} />
              </Row>
              {expanded ? <Text style={{ color: C.muted, lineHeight: 20, marginTop: 9 }}>{topic.text}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </Card>
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>Still need help?</Text>
        <Text style={{ color: C.text, lineHeight: 20, marginTop: 5 }}>Send us an email and we’ll be glad to help.</Text>
        <Btn label="Email Support" icon="mail-outline" onPress={contactSupport} />
      </Card>
    </Screen>
  );
}

export function About({ nav }: ScreenProps) {
  return (
    <Screen>
      <Header title="About AbotKaya" sub="A little more confidence with your baon." onBack={nav.back} />
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Logo size={72} />
        <Text style={{ color: C.green, fontSize: 24, fontWeight: '800', marginTop: 12 }}>AbotKaya</Text>
        <Text style={{ color: C.muted, marginTop: 4 }}>Version 1.0.0</Text>
      </Card>
      <InfoSection title="Made for everyday student budgeting">
        AbotKaya helps you keep track of your allowance, plan category budgets, record expenses, and work toward savings goals—all in one place.
      </InfoSection>
      <InfoSection title="Your money, your choices">
        Use AbotKaya as a simple guide for making spending decisions. It is a budgeting tool, not a bank or financial adviser.
      </InfoSection>
      <SettingsLink icon="mail-outline" label="Contact AbotKaya" onPress={() => nav.go('HelpSupport')} />
    </Screen>
  );
}

export function StateView({ nav }: ScreenProps) {
  const p = nav.params as {
    kind?: string;
    tx?: Transaction;
    cat?: ExpenseCategory;
    catSpent?: number;
    goal?: SavingsGoal;
  };
  const { s } = useStore();
  const home = () => nav.reset('Home');
  type StatePresentation = {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tone: string;
    title: string;
    text: string;
    btn: [string, () => void];
    btn2?: [string, () => void];
  };
  const states: Record<string, StatePresentation> = {
    expenseSaved: { icon: 'checkmark-circle', tone: C.green, title: 'Expense saved!', text: p.tx ? `${fmt(p.tx.amount)} for ${p.tx.title} (${p.tx.category}) was recorded.` : '', btn: ['Back to Dashboard', home] },
    approaching: { icon: 'warning', tone: C.amber, title: 'Getting close to your limit', text: p.cat && p.catSpent !== undefined ? `You've used ${fmt(p.catSpent)} of ${fmt(s.budgets[p.cat])} ${p.cat} budget.` : '', btn: ['Review Budget', () => nav.tab('Budget')], btn2: ['Back to Dashboard', home] },
    exceeded: { icon: 'alert-circle', tone: C.red, title: 'Your budget needs a little care', text: p.cat && p.catSpent !== undefined ? `${p.cat} is over by ${fmt(p.catSpent - s.budgets[p.cat])}. You can adjust your budget or trim spending.` : '', btn: ['Edit Budget', () => nav.go('EditBudget')], btn2: ['Dismiss', home] },
    goalReached: { icon: 'trophy', tone: C.green, title: 'You reached your goal!', text: p.goal ? `${p.goal.name} is fully funded at ${fmt(p.goal.target)}. Congratulations!` : '', btn: ['View Savings Goals', nav.back] },
    goalCreated: { icon: 'flag', tone: C.green, title: 'Your goal is ready', text: p.goal ? `${p.goal.name} · target ${fmt(p.goal.target)}` : '', btn: ['View Savings Goals', nav.back] },
    failed: { icon: 'cloud-offline', tone: C.red, title: "We couldn't save that", text: 'Check your connection and try again. Your data is safe.', btn: ['Retry', () => nav.back()], btn2: ['Dismiss', home] },
  };
  const K = states[p.kind || 'failed'] ?? states.failed;
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={K.icon} size={46} color={K.tone} /></View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: K.tone, marginTop: 20, textAlign: 'center' }}>{K.title}</Text>
        <Text style={{ color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 12 }}>{K.text}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
          <Btn label={K.btn[0]} onPress={K.btn[1]} />{K.btn2 ? <Btn variant="outline" label={K.btn2[0]} onPress={K.btn2[1]} /> : null}</View>
      </View>
    </Screen>
  );
}

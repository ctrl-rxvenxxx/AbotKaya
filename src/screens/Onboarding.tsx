import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card, Btn, Field, Chip, Row, Logo, fmt } from '../components';
import { useStore } from '../store';
import { C, CATS, CAT } from '../theme';
import type { ExpenseCategory, Navigation, Period } from '../types';

type ScreenProps = { nav: Navigation };
type FormErrors = { name?: string; email?: string; pw?: string; account?: string };

export function Splash({ nav }: ScreenProps) {
  return (
    <Screen bg={C.green} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'space-between', overflow: 'hidden' }}>
        <Ionicons name="leaf" size={250} color="#6BA578" style={{ position: 'absolute', top: 34, right: -116, opacity: 0.16, transform: [{ rotate: '-18deg' }] }} />
        <View style={{ paddingTop: 48 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="leaf" size={46} color={C.lime} />
          </View>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 18 }}>AbotKaya</Text>
          <Text style={{ color: C.lime, fontSize: 14, marginTop: 6 }}>Plan. Eat. Save. Grow.</Text>
          <View style={{ width: 45, height: 3, backgroundColor: C.lime, marginTop: 24, marginBottom: 24 }} />
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36 }}>Better Food Choices,{'\n'}Brighter Futures.</Text>
          <Text style={{ color: '#CFE3D3', fontSize: 14, lineHeight: 21, marginTop: 18, maxWidth: 330 }}>
            Make your baon go further. Track your allowance, discover affordable meals, and build habits that grow with you.
          </Text>
        </View>
        <View style={{ paddingBottom: 54 }}>
          <TouchableOpacity onPress={() => nav.go('Login')} activeOpacity={0.8} style={{ minHeight: 56, borderRadius: 28, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 20 }}>
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 16 }}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={C.green} style={{ marginLeft: 10 }} />
          </TouchableOpacity>
          <Text style={{ color: '#CFE3D3', textAlign: 'center', marginTop: 14, fontSize: 12 }}>
            Made for student life · Inspired by SDG 2
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export function Login({ nav }: ScreenProps) {
  const { selectAccount, ready, backend, backendError } = useStore();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState<FormErrors>({});
  const submit = async () => {
    if (busy) return;
    const e: FormErrors = {};
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.';
    if (pw.length < (backend === 'supabase' ? 6 : 4)) e.pw = `Password must be at least ${backend === 'supabase' ? 6 : 4} characters.`;
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const account = await selectAccount(email, pw);
      if (!account) {
        setErr({ account: 'Please verify your email using the link we sent, then log in.' });
        return;
      }
      account.onboarded ? nav.reset('Home') : nav.go('Setup');
    } catch (error) {
      setErr({ account: error instanceof Error ? error.message : 'Unable to open this account. Please try again.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <View style={{ marginTop: 20 }}><Logo /><Text style={{ fontWeight: '800', color: C.green, fontSize: 18, marginTop: 8 }}>AbotKaya</Text></View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: C.green, marginTop: 24 }}>Welcome back, ka-budget.</Text>
      <Text style={{ color: C.muted, marginBottom: 24, marginTop: 4 }}>Log in to keep tracking your allowance.</Text>
      {backendError ? <View style={{ backgroundColor: C.redBg, borderRadius: 12, padding: 12, marginBottom: 14 }}><Text style={{ color: C.red }}>{backendError}</Text></View> : null}
      {err.account ? <View style={{ backgroundColor: C.redBg, borderRadius: 12, padding: 12, marginBottom: 14 }}><Text style={{ color: C.red }}>{err.account}</Text></View> : null}
      <Field label="Email address" placeholder="you@school.edu.ph" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={err.email} />
      <Field
        label="Password"
        placeholder={`At least ${backend === 'supabase' ? 6 : 4} characters`}
        secureTextEntry={!show}
        value={pw}
        onChangeText={setPw}
        error={err.pw}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShow(!show)}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: show }}
            hitSlop={8}
          >
            <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={21} color={C.muted} />
          </TouchableOpacity>
        }
      />
      <TouchableOpacity onPress={() => nav.go('PasswordHelp', { email: email.trim() })} accessibilityRole="button">
        <Text style={{ color: C.green, textAlign: 'right', fontWeight: '600', marginBottom: 10 }}>Forgot Password?</Text>
      </TouchableOpacity>
      <Btn label={busy ? 'Please wait…' : 'Login'} disabled={!ready || busy} onPress={submit} />
      <Text style={{ textAlign: 'center', color: C.muted, marginVertical: 12 }}>
        {backend === 'supabase' ? 'Your account and budgeting data sync securely across devices.' : 'For login, use the same email and password as when you created the account.'}
      </Text>
      <Btn variant="outline" label="Create Account" disabled={!ready || busy} onPress={() => nav.go('CreateAccount')} />
      {!ready ? <Text style={{ textAlign: 'center', color: C.muted, marginTop: 10, fontSize: 11 }}>Loading saved accounts…</Text> : null}
      {backend === 'device' ? <Text style={{ textAlign: 'center', color: C.muted, marginTop: 14, fontSize: 11 }}>Device-only accounts are enabled until Supabase is configured.</Text> : null}
    </Screen>
  );
}

export function CreateAccount({ nav }: ScreenProps) {
  const { selectAccount, ready, backend } = useStore();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState<FormErrors>({});
  const submit = async () => {
    if (busy) return;
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Enter your name to create an account.';
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.';
    if (pw.length < (backend === 'supabase' ? 6 : 4)) e.pw = `Password must be at least ${backend === 'supabase' ? 6 : 4} characters.`;
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const account = await selectAccount(email, pw, true, name);
      if (!account) {
        setErr({ account: 'Account created. Check your email to verify it, then log in.' });
        return;
      }
      account.onboarded ? nav.reset('Home') : nav.reset('Setup');
    } catch (error) {
      setErr({ account: error instanceof Error ? error.message : 'Unable to create your account. Please try again.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="Create your account" sub="Start fresh with your own allowance, expenses and goals." onBack={nav.back} />
      {err.account ? <View style={{ backgroundColor: C.redBg, borderRadius: 12, padding: 12, marginBottom: 14 }}><Text style={{ color: C.red }}>{err.account}</Text></View> : null}
      <Field label="Your name" placeholder="e.g. Alex Santos" autoCapitalize="words" value={name} onChangeText={setName} error={err.name} />
      <Field label="Email address" placeholder="you@school.edu.ph" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={err.email} />
      <Field
        label="Password"
        placeholder={`At least ${backend === 'supabase' ? 6 : 4} characters`}
        secureTextEntry={!show}
        value={pw}
        onChangeText={setPw}
        error={err.pw}
        rightAccessory={
          <TouchableOpacity
            onPress={() => setShow(!show)}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: show }}
            hitSlop={8}
          >
            <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={21} color={C.muted} />
          </TouchableOpacity>
        }
      />
      <Text style={{ color: C.muted, marginBottom: 16 }}>Your account starts with a clean setup. Other accounts on this device keep their own saved data.</Text>
      <Btn label={busy ? 'Please wait…' : 'Create Account'} disabled={!ready || busy} onPress={submit} />
    </Screen>
  );
}

export function PasswordHelp({ nav }: ScreenProps) {
  const { backend } = useStore();
  const email = typeof nav.params.email === 'string' ? nav.params.email : '';
  const contactSupport = async () => {
    const subject = encodeURIComponent('AbotKaya password help');
    const account = email ? `Account email: ${email}\n\n` : '';
    const body = encodeURIComponent(`Hi AbotKaya Support,\n\n${account}I need help with my account password.\n\n`);
    try {
      await Linking.openURL(`mailto:abotkaya@gmail.com?subject=${subject}&body=${body}`);
    } catch (error) {
      console.error('Unable to open password support email:', error);
      Alert.alert('Unable to open email', 'Please email abotkaya@gmail.com for help.');
    }
  };

  return (
    <Screen>
      <Header title="Forgot password?" sub={backend === 'supabase' ? 'Get help with your online account.' : 'Get help accessing your account.'} onBack={nav.back} />
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Ionicons name="lock-closed-outline" size={24} color={C.green} style={{ marginBottom: 8 }} />
        <Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>{backend === 'supabase' ? 'Online password recovery is not set up yet' : 'Your account is stored on this device'}</Text>
        <Text style={{ color: C.text, lineHeight: 21, marginTop: 8 }}>
          {backend === 'supabase'
            ? 'Contact AbotKaya support for help recovering access. Never send your password to anyone.'
            : 'AbotKaya has no online password reset for a local account. We can’t safely reset a local password remotely.'}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: C.text, lineHeight: 21 }}>
          {backend === 'supabase'
            ? 'If you can still log in, change your password from Profile → Account Security. If you’re locked out, contact support for guidance.'
            : 'If you still have access to your password, log in as usual. If you’re locked out, contact support for guidance. Your saved expenses and goals stay on this device, so don’t uninstall the app or reset its data if you want to keep them.'}
        </Text>
        {email ? <Text style={{ color: C.muted, marginTop: 10 }}>Account email: {email}</Text> : null}
      </Card>
      <Btn label="Email Support" icon="mail-outline" onPress={contactSupport} />
      <Btn variant="outline" label="Back to Login" onPress={nav.back} />
    </Screen>
  );
}

const SPLIT: Record<ExpenseCategory, number> = { Food: 40, Transportation: 15, School: 15, Personal: 10, Savings: 20 };
export function Setup({ nav }: ScreenProps) {
  const { set } = useStore();
  const [period, setPeriod] = useState<Period>('Weekly'); const [amt, setAmt] = useState('1000');
  const n = parseInt(amt, 10) || 0;
  const save = () => {
    const budgets: Record<ExpenseCategory, number> = { Food: 0, Transportation: 0, School: 0, Personal: 0, Savings: 0 };
    CATS.forEach(c => budgets[c] = Math.round(n * SPLIT[c] / 100));
    set({ allowance: n, period, budgets, onboarded: true }); nav.reset('Home');
  };
  return (
    <Screen footer={<Btn label="Continue" disabled={n <= 0} onPress={save} />}>
      <Header title="Plan your baon" sub="Set up your allowance first." />
      <Row style={{ marginBottom: 16 }}>{(['Weekly', 'Monthly'] as const).map(p => <Chip key={p} label={p} active={period === p} onPress={() => setPeriod(p)} />)}</Row>
      <Field label="Allowance amount (₱)" keyboardType="numeric" value={amt} onChangeText={t => setAmt(t.replace(/\D/g, ''))} />
      <Text style={{ color: C.muted, marginBottom: 10 }}>Here's a suggested split you can edit later.</Text>
      <Card>
        {CATS.map(c => (
          <Row key={c} style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <Row><Ionicons name={CAT[c].icon} size={18} color={CAT[c].color} /><Text style={{ marginLeft: 10, color: C.text }}>{c}</Text></Row>
            <Text style={{ color: C.muted }}>{SPLIT[c]}%  <Text style={{ color: C.text, fontWeight: '700' }}>{fmt(n * SPLIT[c] / 100)}</Text></Text>
          </Row>
        ))}
        <Text style={{ color: C.green, fontWeight: '700', marginTop: 6 }}>100% of your allowance is planned ✓</Text>
      </Card>
    </Screen>
  );
}

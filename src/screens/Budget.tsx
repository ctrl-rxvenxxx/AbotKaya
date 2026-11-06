import React, { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Screen, Header, Card, Btn, Field, Chip, Row, Bar, Section, fmt } from '../components';
import { useStore, totals, MEALS } from '../store';
import { C, CAT, CATS } from '../theme';
import type { ExpenseCategory, Meal, Navigation, Period } from '../types';

type ScreenProps = { nav: Navigation };
export function Budget({ nav }: ScreenProps) {
  const { s } = useStore(); const { by, spent, left } = totals(s);
  const allocated = CATS.reduce((sum, category) => sum + (s.budgets[category] || 0), 0);
  const remaining = s.allowance - spent;
  const recent = s.tx.slice(0, 3);
  return (
    <Screen>
      <Header title="Budget planner" sub="Give every peso a little purpose." />
      <View style={{ backgroundColor: C.green, borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <Text style={{ color: '#CFE3D3', fontSize: 10, fontWeight: '700' }}>{s.period.toUpperCase()} PLAN · {s.allowance ? Math.round((allocated / s.allowance) * 100) : 0}% ALLOCATED</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>{fmt(s.allowance)}</Text>
        <Text style={{ color: '#CFE3D3', fontSize: 12 }}>{fmt(allocated)} allocated · {s.allowance ? Math.round((spent / s.allowance) * 100) : 0}% recorded spending</Text>
      </View>
      <Card>
        {CATS.map(c => {
          const b = s.budgets[c] || 0, u = by[c] || 0, over = u > b;
          const allocationPct = s.allowance ? Math.round((b / s.allowance) * 100) : 0;
          return (<View key={c} style={{ marginBottom: c === CATS[CATS.length - 1] ? 0 : 14 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{c} · {allocationPct}%</Text>
              <Text style={{ color: over ? C.red : C.text, fontSize: 11 }}>{fmt(u)} / {fmt(b)}</Text></Row>
            <Bar pct={(u / (b || 1)) * 100} color={over ? C.red : CAT[c].color} h={6} />
          </View>);
        })}
      </Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ color: C.muted, fontSize: 11 }}>Remaining</Text>
          <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(remaining)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: C.muted, fontSize: 11 }}>Daily guide</Text>
          <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(Math.max(0, Math.ceil(remaining / (s.period === 'Monthly' ? 30 : 7))))} / day</Text>
        </View>
      </Row>
      <Row style={{ flexWrap: 'wrap', marginBottom: 10 }}>
        {[[C.green, 'Normal'], [C.amber, 'Approaching'], [C.red, 'Exceeded']].map(([color, label]) => (
          <Row key={label} style={{ marginRight: 14, marginBottom: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginRight: 5 }} />
            <Text style={{ color: C.muted, fontSize: 10 }}>{label}</Text>
          </Row>
        ))}
      </Row>
      <Text style={{ color: C.muted, fontSize: 10, marginBottom: 6, lineHeight: 15 }}>
        {recent.length ? `Recorded: ${recent.map(t => `${t.category} ${fmt(t.amount)} — ${t.title}`).join(' · ')}` : 'No expenses recorded this week yet.'}
      </Text>
      <Btn label="Edit Budget" onPress={() => nav.go('EditBudget')} />
    </Screen>
  );
}

export function EditBudget({ nav }: ScreenProps) {
  const { s, set } = useStore();
  const [allow, setAllow] = useState(String(s.allowance)); const [b, setB] = useState<Record<ExpenseCategory, string | number>>({ ...s.budgets });
  const a = parseInt(allow, 10) || 0; const sum = CATS.reduce((x, c) => x + (parseInt(String(b[c]), 10) || 0), 0);
  const ok = a > 0 && sum === a;
  const save = () => {
    const nb: Record<ExpenseCategory, number> = { Food: 0, Transportation: 0, School: 0, Personal: 0, Savings: 0 };
    CATS.forEach(c => nb[c] = parseInt(String(b[c]), 10) || 0);
    set({ allowance: a, budgets: nb });
    nav.back();
  };
  return (
    <Screen footer={<><Btn label="Save Changes" disabled={!ok} onPress={save} /><Btn variant="ghost" label="Cancel" onPress={nav.back} /></>}>
      <Header title="Edit your weekly budget" onBack={nav.back} />
      <Field label="Weekly allowance" keyboardType="numeric" value={allow} onChangeText={t => setAllow(t.replace(/\D/g, ''))} />
      {CATS.map(c => (
        <Row key={c} style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: C.text, fontWeight: '600' }}>{c}</Text>
          <Field keyboardType="numeric" value={String(b[c])} onChangeText={t => setB({ ...b, [c]: t.replace(/\D/g, '') })} style={{ width: 100, textAlign: 'right' }} />
        </Row>))}
      <Text style={{ color: ok ? C.green : C.red, fontWeight: '700' }}>Total allocation: {fmt(sum)} {ok ? '✓' : `(must equal ${fmt(a)})`}</Text>
    </Screen>
  );
}

const FILTERS: ReadonlyArray<readonly [string, number]> = [['Any price', 9999], ['Under ₱50', 50], ['Under ₱100', 100]];
const MEAL_TYPES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const PREFERENCES = ['All meals', 'Rice meal', 'Healthy', 'Budget', 'Snack'];
export function Meals({ nav }: ScreenProps) {
  const { s, meals, mealError, isAdmin } = useStore(); const { left } = totals(s);
  const [q, setQ] = useState(''); const [f, setF] = useState(0);
  const [type, setType] = useState('All'); const [preference, setPreference] = useState('All meals');
  const list = meals.filter(m =>
    m.active
    &&
    m.price <= FILTERS[f][1]
    && m.name.toLowerCase().includes(q.toLowerCase())
    && (type === 'All' || m.type === type)
    && (preference === 'All meals' || m.cat.toLowerCase() === preference.toLowerCase())
  );
  const reset = () => { setQ(''); setF(0); setType('All'); setPreference('All meals'); };
  return (
    <Screen>
      <Header title="Good food, within reach" sub="Affordable ideas for your school week." />
      {mealError ? <Card style={{ backgroundColor: C.redBg, borderColor: C.redBg }}><Text style={{ color: C.red }}>{mealError}</Text></Card> : null}
      {isAdmin ? <Btn variant="outline" label="Manage meal menu" onPress={() => nav.go('MealManagement')} /> : null}
      <Field placeholder="Search Filipino favorites" value={q} onChangeText={setQ} />
      <Row style={{ flexWrap: 'wrap', marginBottom: 2 }}>
        {FILTERS.map((x, i) => <Chip key={x[0]} label={x[0]} active={f === i} onPress={() => setF(i)} />)}
      </Row>
      <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>MEAL TYPE</Text>
      <Row style={{ flexWrap: 'wrap', marginBottom: 2 }}>
        {MEAL_TYPES.map(item => <Chip key={item} label={item} active={type === item} onPress={() => setType(item)} />)}
      </Row>
      <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>PREFERENCES</Text>
      <Row style={{ flexWrap: 'wrap', marginBottom: 2 }}>
        {PREFERENCES.map(item => <Chip key={item} label={item} active={preference === item} onPress={() => setPreference(item)} />)}
      </Row>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: C.muted, fontSize: 11 }}>Remaining baon</Text>
        <Text style={{ color: C.green, fontWeight: '800', fontSize: 12 }}>{fmt(left)}</Text>
      </Row>
      {list.length ? (
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {list.map(m => (
            <TouchableOpacity key={m.id} onPress={() => nav.go('MealDetails', { id: m.id })} style={{ width: '48%', marginBottom: 12, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
              <View style={{ height: 88, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 44 }}>{m.emoji}</Text></View>
              <View style={{ padding: 9 }}>
                <Text style={{ fontWeight: '700', color: C.text, fontSize: 12 }} numberOfLines={1}>{m.name}</Text>
                <Text style={{ color: C.green, fontWeight: '800', fontSize: 12, marginTop: 4 }}>{fmt(m.price)}</Text>
                <Text style={{ color: C.muted, fontSize: 9, marginTop: 3 }}>Estimated price, may vary by seller.</Text>
              </View>
            </TouchableOpacity>))}
        </Row>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Ionicons name="search" size={40} color={C.green} />
          <Text style={{ fontWeight: '800', color: C.green, fontSize: 17, marginTop: 8 }}>No meals match just yet</Text>
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 4 }}>Try a different budget, meal type, or preference.</Text>
          <Btn label="Clear filters" onPress={reset} />
        </Card>)}
      <Btn variant="outline" label="Weekly Meal Planner" onPress={() => nav.go('Planner')} />
    </Screen>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; const SLOTS = ['Breakfast', 'Lunch', 'Dinner'];
export function MealDetails({ nav }: ScreenProps) {
  const { s, set, meals } = useStore(); const mealId = nav.params.id; const m = meals.find(x => x.id === mealId) || MEALS[0];
  const [day, setDay] = useState('Mon'); const [slot, setSlot] = useState('Lunch');
  const add = () => { set({ plan: { ...s.plan, [day + '-' + slot]: m.id } }); nav.go('Planner'); };
  return (
    <Screen footer={<Btn label="Add to Weekly Plan" onPress={add} />}>
      <Header title="Meal details" onBack={nav.back} />
      <View style={{ height: 170, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Text style={{ fontSize: 80 }}>{m.emoji}</Text></View>
      <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>{m.name}</Text><Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>{fmt(m.price)}</Text></Row>
      <Text style={{ color: C.muted, marginVertical: 4 }}>📍 {m.place}</Text>
      <Text style={{ color: C.text, lineHeight: 21, marginBottom: 12 }}>{m.desc}</Text>
      <Card><Text style={{ fontWeight: '800', marginBottom: 6 }}>Common ingredients</Text>{m.ing.map(i => <Text key={i} style={{ color: C.text, paddingVertical: 2 }}>• {i}</Text>)}</Card>
      <Card style={{ backgroundColor: '#EAF5C8', borderColor: '#D8E8A8' }}><Text style={{ color: C.green, fontWeight: '700' }}>Fits your {fmt(s.budgets.Food)} food budget ✓</Text></Card>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Add to day</Text>
      <Row style={{ flexWrap: 'wrap' }}>{DAYS.map(d => <Chip key={d} label={d} active={day === d} onPress={() => setDay(d)} />)}</Row>
      <Row style={{ flexWrap: 'wrap' }}>{SLOTS.map(d => <Chip key={d} label={d} active={slot === d} onPress={() => setSlot(d)} />)}</Row>
    </Screen>
  );
}

export function Planner({ nav }: ScreenProps) {
  const { s, set, meals } = useStore(); const [pick, setPick] = useState<string | null>(null);
  const cost = Object.values(s.plan).reduce((a, id) => a + (meals.find(m => m.id === id)?.price || 0), 0);
  const choose = (id: string | null) => {
    if (!pick) return;
    const p = { ...s.plan };
    if (id) p[pick] = id;
    else delete p[pick];
    set({ plan: p });
    setPick(null);
  };
  return (
    <Screen footer={<Btn label="Save Meal Plan" onPress={nav.back} />}>
      <Header title="Your meal week" sub="Tap a slot to plan a meal." onBack={nav.back} />
      <View style={{ backgroundColor: C.green, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Planned: {fmt(cost)} of {fmt(s.budgets.Food)} food budget</Text>
        <View style={{ marginTop: 8 }}><Bar pct={(cost / s.budgets.Food) * 100} color={cost > s.budgets.Food ? '#FF8A8A' : C.lime} track="#2E6B44" /></View>
      </View>
      {DAYS.map(d => (
        <Card key={d} style={{ padding: 12 }}>
          <Text style={{ fontWeight: '800', color: C.green, marginBottom: 6 }}>{d}</Text>
          <Row>{SLOTS.map(sl => { const m = meals.find(x => x.id === s.plan[d + '-' + sl]);
            return (<TouchableOpacity key={sl} onPress={() => setPick(d + '-' + sl)} style={{ flex: 1, marginRight: 6, padding: 8, borderRadius: 10, backgroundColor: m ? C.mint : '#F4F2EA', borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 10, color: C.muted }}>{sl}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }} numberOfLines={1}>{m ? m.emoji + ' ' + m.name : '+ Add'}</Text>
            </TouchableOpacity>); })}</Row>
        </Card>))}
      <Modal visible={!!pick} transparent animationType="slide" onRequestClose={() => setPick(null)}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '70%' }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: C.green, marginBottom: 10 }}>Choose a meal</Text>
            <ScrollView>{meals.filter(m => m.active).map(m => (
              <TouchableOpacity key={m.id} onPress={() => choose(m.id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}>
                <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: C.text, fontWeight: '600' }}>{m.emoji} {m.name}</Text><Text style={{ color: C.green, fontWeight: '800' }}>{fmt(m.price)}</Text></Row>
              </TouchableOpacity>))}</ScrollView>
            <Btn variant="outline" label="Clear slot" onPress={() => choose(null)} />
            <Btn variant="ghost" label="Close" onPress={() => setPick(null)} />
          </View></View>
      </Modal>
    </Screen>
  );
}

type MealForm = {
  id: string;
  name: string;
  price: string;
  place: string;
  emoji: string;
  cat: string;
  type: Meal['type'];
  desc: string;
  ingredients: string;
  active: boolean;
};

const emptyMealForm = (): MealForm => ({
  id: '',
  name: '',
  price: '',
  place: '',
  emoji: '🍽️',
  cat: 'Budget',
  type: 'Lunch',
  desc: '',
  ingredients: '',
  active: true,
});

export function MealManagement({ nav }: ScreenProps) {
  const { backend, isAdmin, meals, mealError, refreshMeals, saveMeal, setMealActive } = useStore();
  const [form, setForm] = useState<MealForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const openMeal = (meal?: Meal) => setForm(meal ? {
    id: meal.id,
    name: meal.name,
    price: String(meal.price),
    place: meal.place,
    emoji: meal.emoji,
    cat: meal.cat,
    type: meal.type,
    desc: meal.desc,
    ingredients: meal.ing.join(', '),
    active: meal.active,
  } : emptyMealForm());
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      await refreshMeals();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load meals.');
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const price = Number(form?.price);
    if (!form || !form.name.trim() || !form.place.trim() || !form.desc.trim() || !Number.isFinite(price) || price < 0) {
      setError('Enter a meal name, valid non-negative price, place, and description.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveMeal({
        id: form.id || Crypto.randomUUID(),
        name: form.name.trim(),
        price,
        place: form.place.trim(),
        emoji: form.emoji.trim() || '🍽️',
        cat: form.cat,
        type: form.type,
        desc: form.desc.trim(),
        ing: form.ingredients.split(',').map(item => item.trim()).filter(Boolean),
        active: form.active,
      });
      setForm(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this meal.');
    } finally {
      setBusy(false);
    }
  };
  const toggleActive = (meal: Meal) => {
    Alert.alert(
      meal.active ? 'Hide this meal?' : 'Show this meal?',
      meal.active ? 'It will no longer appear in meal suggestions or new plans.' : 'It will appear in meal suggestions again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: meal.active ? 'Hide meal' : 'Show meal', onPress: () => {
          void (async () => {
            setBusy(true);
            setError('');
            try {
              await setMealActive(meal.id, !meal.active);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Unable to change meal availability.');
            } finally {
              setBusy(false);
            }
          })();
        } },
      ],
    );
  };
  if (backend !== 'supabase' || !isAdmin) {
    return <Screen><Header title="Manage meal menu" onBack={nav.back} /><Card><Text style={{ color: C.text }}>This screen is available only to an authorized Supabase admin account.</Text></Card></Screen>;
  }
  return (
    <Screen>
      <Header title="Manage meal menu" sub="Edit shared meal suggestions for everyone." onBack={nav.back} />
      <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
        <Text style={{ color: C.green, fontWeight: '800' }}>Shared menu</Text>
        <Text style={{ color: C.text, lineHeight: 20, marginTop: 5 }}>Meal details and estimated prices are visible to all users. Personal budgets and expenses stay private.</Text>
      </Card>
      {error || mealError ? <Card style={{ backgroundColor: C.redBg, borderColor: C.redBg }}><Text style={{ color: C.red }}>{error || mealError}</Text></Card> : null}
      {form ? (
        <Card>
          <Text style={{ color: C.green, fontWeight: '800', fontSize: 17, marginBottom: 10 }}>{form.id ? 'Edit meal' : 'Add a meal'}</Text>
          <Field label="Meal name" value={form.name} onChangeText={name => setForm({ ...form, name })} />
          <Field label="Estimated price (₱)" keyboardType="decimal-pad" value={form.price} onChangeText={price => setForm({ ...form, price: price.replace(/[^\d.]/g, '') })} />
          <Field label="Place" placeholder="e.g. Campus canteen" value={form.place} onChangeText={place => setForm({ ...form, place })} />
          <Field label="Emoji" value={form.emoji} onChangeText={emoji => setForm({ ...form, emoji })} />
          <Text style={{ color: C.text, fontWeight: '600', marginBottom: 6 }}>Category</Text>
          <Row style={{ flexWrap: 'wrap' }}>{['Rice meal', 'Healthy', 'Budget', 'Snack'].map(cat => <Chip key={cat} label={cat} active={form.cat === cat} onPress={() => setForm({ ...form, cat })} />)}</Row>
          <Text style={{ color: C.text, fontWeight: '600', marginBottom: 6 }}>Meal type</Text>
          <Row style={{ flexWrap: 'wrap' }}>{(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map(type => <Chip key={type} label={type} active={form.type === type} onPress={() => setForm({ ...form, type })} />)}</Row>
          <Field label="Description" multiline value={form.desc} onChangeText={desc => setForm({ ...form, desc })} style={{ minHeight: 88, textAlignVertical: 'top' }} />
          <Field label="Ingredients (comma-separated)" value={form.ingredients} onChangeText={ingredients => setForm({ ...form, ingredients })} />
          <Btn label={busy ? 'Saving…' : 'Save meal'} disabled={busy} onPress={() => { void save(); }} />
          <Btn variant="ghost" label="Cancel" disabled={busy} onPress={() => setForm(null)} />
        </Card>
      ) : (
        <Btn label="Add meal" icon="add" disabled={busy} onPress={() => { setError(''); openMeal(); }} />
      )}
      {meals.map(meal => (
        <Card key={meal.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: C.text, fontWeight: '800' }}>{meal.emoji} {meal.name}</Text>
              <Text style={{ color: C.muted, marginTop: 4 }}>{fmt(meal.price)} · {meal.type} · {meal.cat}</Text>
              <Text style={{ color: meal.active ? C.green : C.red, fontWeight: '700', marginTop: 4 }}>{meal.active ? 'Visible to users' : 'Hidden'}</Text>
            </View>
            <TouchableOpacity onPress={() => openMeal(meal)} accessibilityRole="button" accessibilityLabel={`Edit ${meal.name}`}><Ionicons name="create-outline" size={23} color={C.green} /></TouchableOpacity>
          </Row>
          <Btn variant="outline" label={meal.active ? 'Hide meal' : 'Show meal'} disabled={busy} onPress={() => toggleActive(meal)} />
        </Card>
      ))}
      <Btn variant="ghost" label={busy ? 'Refreshing…' : 'Refresh menu'} disabled={busy} onPress={() => { void refresh(); }} />
    </Screen>
  );
}

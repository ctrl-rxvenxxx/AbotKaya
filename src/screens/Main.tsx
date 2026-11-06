import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Header, Card, Btn, Field, Chip, Row, Bar, Section, fmt } from '../components';
import { useStore, totals, today, parseDate } from '../store';
import { C, CAT, CATS } from '../theme';
import type { ExpenseCategory, Navigation, ScreenName, Transaction } from '../types';
import type { ComponentProps } from 'react';

const TxRow = ({ t }: { t: Transaction }) => (
  <Row style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={CAT[t.category].icon} size={18} color={CAT[t.category].color} /></View>
    <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '700', color: C.text }}>{t.title}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{t.category} · {t.date}</Text></View>
    <Text style={{ fontWeight: '700', color: C.text }}>-{fmt(t.amount)}</Text>
  </Row>
);

type ScreenProps = { nav: Navigation };
type QuickAction = [string, ComponentProps<typeof Ionicons>['name'], ScreenName];
type ProductInfo = {
  name: string;
  category: ExpenseCategory;
  catalog: string;
  brand?: string;
  quantity?: string;
  image?: string;
};

const PRODUCT_CATALOGS = [
  { name: 'Open Food Facts', url: 'https://world.openfoodfacts.org', kind: 'food' },
  { name: 'Open Products Facts', url: 'https://world.openproductsfacts.org', kind: 'products' },
  { name: 'Open Beauty Facts', url: 'https://world.openbeautyfacts.org', kind: 'personal' },
  { name: 'Open Pet Food Facts', url: 'https://world.openpetfoodfacts.org', kind: 'personal' },
] as const;

function productCategory(name: string, tags: string[], kind: (typeof PRODUCT_CATALOGS)[number]['kind']): ExpenseCategory {
  if (kind === 'food') return 'Food';
  const text = `${name} ${tags.join(' ')}`.toLowerCase().replace(/[-_]/g, ' ');
  if (/\b(school|stationery|notebook|exercise book|pencil|eraser|ruler|highlighter|marker|crayon|ballpoint|school supplies|copy paper|printer paper)\b/.test(text)) return 'School';
  if (/\b(car|automotive|automobile|motorcycle|bicycle|bike|vehicle|motor oil|engine oil|tire|tyre)\b/.test(text)) return 'Transportation';
  return 'Personal';
}

export function Home({ nav }: ScreenProps) {
  const { s, ready, meals } = useStore();
  const { by, spent, left } = totals(s);
  if (!ready) return (
    <Screen><Header title="Your dashboard" sub="Loading your saved allowance and expenses…" />
      {[90, 60, 60, 60, 60].map((h, i) => <View key={i} style={{ height: h, borderRadius: 14, backgroundColor: '#E4E2D8', marginBottom: 12 }} />)}</Screen>
  );
  const top = CATS.slice().sort((a, b) => (by[b] || 0) - (by[a] || 0))[0];
  const featuredMeal = meals.find(meal => meal.id === 'm2' && meal.active) || meals.find(meal => meal.active);
  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>Magandang umaga, {s.user.name} 👋</Text>
      <Text style={{ color: C.muted, marginBottom: 16 }}>Here's how your {s.period.toLowerCase()} allowance is doing.</Text>
      <View style={{ backgroundColor: C.green, borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <Text style={{ color: '#A9CDB2', fontSize: 11, fontWeight: '700' }}>{s.period.toUpperCase()} ALLOWANCE LEFT</Text>
        <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 4 }}>{fmt(left)}</Text>
        <Bar pct={(spent / s.allowance) * 100} color={C.lime} track="#2E6B44" />
        <Text style={{ color: '#CFE3D3', marginTop: 8, fontSize: 12 }}>{fmt(spent)} spent of {fmt(s.allowance)}</Text>
      </View>
      <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        {([['Add Expense', 'add-circle', 'AddExpense'], ['Scan Code', 'scan', 'Scanner'], ['Budget', 'pie-chart', 'Budget'], ['Meal Plan', 'calendar', 'Planner'], ['Reports', 'stats-chart', 'Reports']] as QuickAction[]).map(([l, i, to]) => (
          <TouchableOpacity key={l} style={{ alignItems: 'center', width: '19%' }} onPress={() => to === 'Budget' || to === 'Reports' ? nav.tab(to) : nav.go(to)}>
            <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={i} size={24} color={C.green} /></View>
            <Text style={{ fontSize: 11, marginTop: 6, color: C.text, fontWeight: '600' }}>{l}</Text>
          </TouchableOpacity>))}
      </Row>
      <Card onPress={() => nav.go('Insights')} style={{ backgroundColor: '#EAF5C8', borderColor: '#D8E8A8' }}>
        <Text style={{ fontWeight: '800', color: C.green }}>Biggest spend: {top}</Text>
        <Text style={{ color: C.text, marginTop: 2 }}>{fmt(by[top] || 0)} so far. Tap for smart tips.</Text>
      </Card>
      <Row style={{ justifyContent: 'space-between' }}><Section>Recent transactions</Section>
        <TouchableOpacity onPress={() => nav.go('Transactions')}><Text style={{ color: C.green, fontWeight: '700' }}>See all</Text></TouchableOpacity></Row>
      <Card>{s.tx.slice(0, 3).map(t => <TxRow key={t.id} t={t} />)}
        {!s.tx.length ? <Text style={{ color: C.muted }}>No transactions yet.</Text> : null}</Card>
      {featuredMeal ? (
        <Card onPress={() => nav.go('MealDetails', { id: featuredMeal.id })}>
          <Text style={{ color: C.muted, fontSize: 12 }}>MEAL IDEA FOR TODAY</Text>
          <Text style={{ fontWeight: '800', color: C.text, fontSize: 16, marginTop: 2 }}>{featuredMeal.emoji} {featuredMeal.name} · {fmt(featuredMeal.price)}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

export function Scanner({ nav }: ScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<{ data: string; type: string } | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const lookupId = useRef(0);
  const lookupProduct = async (data: string, requestId: number) => {
    setProduct(null);
    setLookupState('loading');
    const responses = await Promise.allSettled(PRODUCT_CATALOGS.map(async catalog => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const fields = 'product_name,product_name_en,generic_name,brands,quantity,categories_tags,image_front_url';
        const response = await fetch(
          `${catalog.url}/api/v2/product/${encodeURIComponent(data)}.json?fields=${fields}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'AbotKaya - Expo - barcode lookup',
            },
            signal: controller.signal,
          },
        );
        if (response.status === 404) return { catalog, product: null, checked: true };
        if (!response.ok) throw new Error(`${catalog.name} returned ${response.status}.`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object') throw new Error(`${catalog.name} returned invalid data.`);
        const body = payload as { status?: unknown; product?: unknown };
        if (body.status !== 1 || !body.product || typeof body.product !== 'object') {
          return { catalog, product: null, checked: true };
        }

        const item = body.product as Record<string, unknown>;
        const name = [item.product_name, item.product_name_en, item.generic_name]
          .find(value => typeof value === 'string' && value.trim());
        if (typeof name !== 'string') return { catalog, product: null, checked: true };
        const tags = Array.isArray(item.categories_tags) ? item.categories_tags.filter((tag): tag is string => typeof tag === 'string') : [];
        return {
          catalog,
          checked: true,
          product: {
            name: name.trim(),
            category: productCategory(name, tags, catalog.kind),
            catalog: catalog.name,
            ...(typeof item.brands === 'string' && item.brands.trim() ? { brand: item.brands.trim() } : {}),
            ...(typeof item.quantity === 'string' && item.quantity.trim() ? { quantity: item.quantity.trim() } : {}),
            ...(typeof item.image_front_url === 'string' && /^https:\/\//.test(item.image_front_url) ? { image: item.image_front_url } : {}),
          } satisfies ProductInfo,
        };
      } finally {
        clearTimeout(timeout);
      }
    }));

    if (requestId !== lookupId.current) return;
    const found = responses.find(response => response.status === 'fulfilled' && response.value.product);
    if (found?.status === 'fulfilled' && found.value.product) {
      setProduct(found.value.product);
      setLookupState('found');
      return;
    }
    const checkedAnyCatalog = responses.some(response => response.status === 'fulfilled' && response.value.checked);
    setLookupState(checkedAnyCatalog ? 'not-found' : 'error');
  };
  const onBarcodeScanned = ({ data, type }: { data: string; type: string }) => {
    setResult({ data, type });
    const requestId = ++lookupId.current;
    if (!['ean13', 'ean8', 'upc_a', 'upc_e', 'upc_ean'].includes(type.toLowerCase()) || !/^\d{8,14}$/.test(data)) {
      setLookupState('idle');
      return;
    }
    void lookupProduct(data, requestId);
  };
  const retryLookup = () => {
    if (!result) return;
    const requestId = ++lookupId.current;
    void lookupProduct(result.data, requestId);
  };
  const scanAnother = () => {
    lookupId.current += 1;
    setResult(null);
    setProduct(null);
    setLookupState('idle');
  };
  const addScannedProduct = () => {
    if (!product || !result) return;
    const note = [product.brand, product.quantity, `Barcode: ${result.data}`].filter(Boolean).join(' · ');
    nav.go('AddExpense', { title: product.name, category: product.category, note, barcode: result.data });
  };
  const addBarcodeManually = () => {
    if (!result || !/^\d{8,14}$/.test(result.data)) return;
    nav.go('AddExpense', {
      title: 'Scanned product',
      note: `Barcode: ${result.data}`,
      barcode: result.data,
    });
  };

  return (
    <Screen scroll={false}>
      <Header title="Scan a product" sub="Look up barcodes across food, household, beauty and pet catalogs." onBack={nav.back} />
      {!permission ? (
        <Text style={{ color: C.muted }}>Checking camera permission…</Text>
      ) : !permission.granted ? (
        <Card>
          <Text style={{ color: C.text, marginBottom: 8 }}>
            {permission.canAskAgain
              ? 'Camera access is needed to scan codes.'
              : 'Camera access is disabled. Enable it in your device settings to scan codes.'}
          </Text>
          {permission.canAskAgain ? <Btn label="Allow camera access" onPress={requestPermission} /> : null}
        </Card>
      ) : (
        <>
          <View style={{ height: 340, overflow: 'hidden', borderRadius: 18, backgroundColor: '#111' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={result ? undefined : onBarcodeScanned}
            />
            {!result ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 220, height: 220, borderWidth: 3, borderColor: C.lime, borderRadius: 20 }} />
              </View>
            ) : null}
          </View>
          {result ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={{ color: C.green, fontWeight: '800', marginBottom: 6 }}>Code scanned · {result.type}</Text>
              <Text selectable style={{ color: C.text }}>{result.data}</Text>
              {lookupState === 'loading' ? (
                <Row style={{ marginTop: 14 }}>
                  <ActivityIndicator color={C.green} />
                  <Text style={{ color: C.muted, marginLeft: 9 }}>Looking up product…</Text>
                </Row>
              ) : null}
              {lookupState === 'found' && product ? (
                <View style={{ marginTop: 14 }}>
                  {product.image ? <Image source={{ uri: product.image }} style={{ width: 76, height: 76, borderRadius: 12, marginBottom: 10, backgroundColor: C.mint }} resizeMode="contain" /> : null}
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{product.name}</Text>
                  {product.brand ? <Text style={{ color: C.muted, marginTop: 3 }}>{product.brand}</Text> : null}
                  {product.quantity ? <Text style={{ color: C.muted, marginTop: 2 }}>{product.quantity}</Text> : null}
                  <Text style={{ color: C.muted, marginTop: 6 }}>Suggested category: <Text style={{ color: C.green, fontWeight: '700' }}>{product.category}</Text></Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Product details from {product.catalog}. Check the category and enter the price you paid next.</Text>
                  <Btn label="Continue to enter price" icon="add-circle-outline" onPress={addScannedProduct} />
                </View>
              ) : null}
              {lookupState === 'not-found' ? (
                <>
                  <Text style={{ color: C.muted, marginTop: 10 }}>We couldn’t find this item in the public food, household, beauty or pet catalogs. Add its name, category and the price you paid manually.</Text>
                  <Btn label="Enter product and price" icon="add-circle-outline" onPress={addBarcodeManually} />
                </>
              ) : null}
              {lookupState === 'error' ? (
                <>
                  <Text style={{ color: C.muted, marginTop: 10 }}>Couldn’t connect to the product catalogs. Check your internet connection, try again, or enter the product manually.</Text>
                  <Btn variant="outline" label="Try lookup again" onPress={retryLookup} />
                  <Btn label="Enter product and price" icon="add-circle-outline" onPress={addBarcodeManually} />
                </>
              ) : null}
              {lookupState === 'idle' ? (
                <Text style={{ color: C.muted, marginTop: 10 }}>This code isn’t a supported product barcode. You can add the expense manually.</Text>
              ) : null}
              <Btn variant="outline" label="Scan another code" onPress={scanAnother} />
            </Card>
          ) : (
            <Text style={{ color: C.muted, textAlign: 'center', marginTop: 14 }}>Hold the code inside the frame.</Text>
          )}
        </>
      )}
    </Screen>
  );
}

export function AddExpense({ nav }: ScreenProps) {
  const { s, set } = useStore();
  const initialTitle = typeof nav.params.title === 'string' ? nav.params.title : '';
  const initialCategory = CATS.includes(nav.params.category as ExpenseCategory) ? nav.params.category as ExpenseCategory : '';
  const initialNote = typeof nav.params.note === 'string' ? nav.params.note : '';
  const barcode = typeof nav.params.barcode === 'string' ? nav.params.barcode : '';
  const [amt, setAmt] = useState(''); const [cat, setCat] = useState<ExpenseCategory | ''>(initialCategory); const [title, setTitle] = useState(initialTitle); const [note, setNote] = useState(initialNote); const [err, setErr] = useState<{ amt?: string; cat?: string; title?: string }>({});
  const save = () => {
    const e: { amt?: string; cat?: string; title?: string } = {}; const n = parseInt(amt, 10);
    if (!n || n <= 0) e.amt = 'Enter an amount greater than ₱0.';
    if (!cat) e.cat = 'Please choose a category.';
    if (!title.trim()) e.title = 'Add a short description.';
    setErr(e); if (Object.keys(e).length) return;
    try {
      if (!cat) return;
      const tx: Transaction = { id: 't' + Date.now(), title: title.trim(), category: cat, amount: n, date: today(), note };
      const nt = [tx, ...s.tx]; set({ tx: nt });
      const catSpent = nt.filter(t => t.category === cat).reduce((a, t) => a + t.amount, 0);
      const pct = (catSpent / (s.budgets[cat] || 1)) * 100;
      const kind = pct > 100 ? 'exceeded' : pct >= 80 ? 'approaching' : 'expenseSaved';
      nav.go('StateView', { kind, tx, cat, catSpent });
    } catch (error) {
      console.error('Unable to save expense:', error);
      nav.go('StateView', { kind: 'failed' });
    }
  };
  const hasErr = Object.keys(err).length > 0;
  return (
    <Screen footer={<Btn label="Save Expense" onPress={save} />}>
      <Header title="Add expense" sub="Every peso counts, log it quickly." onBack={nav.back} />
      {barcode ? (
        <Card style={{ backgroundColor: '#EAF3E8', borderColor: '#EAF3E8' }}>
          <Text style={{ color: C.green, fontWeight: '800' }}>Scanned product</Text>
          <Text style={{ color: C.text, lineHeight: 20, marginTop: 5 }}>
            Enter the price shown at the store. A barcode identifies the product but doesn’t include its current price.
          </Text>
        </Card>
      ) : null}
      {hasErr ? <View style={{ backgroundColor: C.redBg, borderRadius: 12, padding: 12, marginBottom: 14 }}><Text style={{ color: C.red, fontWeight: '700' }}>Please check the highlighted fields.</Text></View> : null}
      <Field label="Amount (₱) *" keyboardType="numeric" placeholder="0" value={amt} onChangeText={t => setAmt(t.replace(/\D/g, ''))} error={err.amt} />
      <Text style={{ fontWeight: '600', color: C.text, marginBottom: 6 }}>Category *</Text>
      <Row style={{ flexWrap: 'wrap' }}>{CATS.map(c => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}</Row>
      {err.cat ? <Text style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{err.cat}</Text> : null}
      <Field label="Date" value={today()} editable={false} style={{ marginTop: 8 }} />
      <Field label="Description *" placeholder="e.g. Lunch at canteen" value={title} onChangeText={setTitle} error={err.title} />
      <Field label="Note (optional)" placeholder="Add more details" value={note} onChangeText={setNote} />
    </Screen>
  );
}

export function Transactions({ nav }: ScreenProps) {
  const { s, set } = useStore(); const [f, setF] = useState('All'); const [period, setPeriod] = useState('All time'); const [q, setQ] = useState('');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const list = s.tx.filter(t => {
    const date = parseDate(t.date);
    if (!date) return false;
    date.setHours(0, 0, 0, 0);
    const matchesDate = !Number.isNaN(date.getTime()) && date <= now
      && (period === 'All time' || (period === 'This week' ? date >= weekStart : date >= monthStart));
    const matchesSearch = `${t.title} ${t.category} ${t.note || ''}`.toLowerCase().includes(q.toLowerCase());
    return matchesDate && (f === 'All' || t.category === f) && matchesSearch;
  }).sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
  const total = list.reduce((a: number, t) => a + t.amount, 0);
  const groups = list.reduce<Record<string, Transaction[]>>((result, t) => {
    const date = parseDate(t.date);
    if (!date) return result;
    date.setHours(0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const label = date.getTime() === now.getTime() ? 'Today'
      : date.getTime() === yesterday.getTime() ? 'Yesterday' : t.date;
    (result[label] ||= []).push(t);
    return result;
  }, {});
  const remove = (t: Transaction) => Alert.alert('Delete expense?', `Remove ${t.title} (${fmt(t.amount)}) from your transactions?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => set({ tx: s.tx.filter(item => item.id !== t.id) }) },
  ]);
  return (
    <Screen>
      <Header title="Transactions" sub={`${list.length} expense${list.length === 1 ? '' : 's'} shown`} onBack={nav.back} />
      <Field placeholder="Search transactions" value={q} onChangeText={setQ} />
      <Row style={{ marginBottom: 8 }}>
        {['All time', 'This week', 'This month'].map(item => <Chip key={item} label={item} active={period === item} onPress={() => setPeriod(item)} />)}
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>{['All', ...CATS].map(c => <Chip key={c} label={c} active={f === c} onPress={() => setF(c)} />)}</Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 2, marginBottom: 10 }}>
        <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700' }}>{list.length} TRANSACTION{list.length === 1 ? '' : 'S'}</Text>
        <Text style={{ color: C.green, fontWeight: '800' }}>{fmt(total)} spent</Text>
      </Row>
      {list.length ? Object.entries(groups).map(([label, transactions]) => (
        <View key={label}>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{label}</Text>
          <Card style={{ paddingVertical: 4 }}>
            {transactions.map(t => (
              <Row key={t.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={CAT[t.category]?.icon || 'receipt-outline'} size={17} color={CAT[t.category]?.color || C.green} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '700', color: C.text }}>{t.title}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{t.category}</Text>
                </View>
                <Text style={{ color: C.text, fontSize: 12, fontWeight: '700', marginRight: 8 }}>{fmt(t.amount)}</Text>
                <TouchableOpacity onPress={() => remove(t)} hitSlop={8}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={C.green} />
                </TouchableOpacity>
              </Row>
            ))}
          </Card>
        </View>
      )) : (
        <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Ionicons name="document-text-outline" size={40} color={C.green} />
          <Text style={{ fontWeight: '800', color: C.green, fontSize: 17, marginTop: 8 }}>A fresh start for your baon</Text>
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 4 }}>No expenses match these filters. Try another search or add an expense.</Text>
          <Btn label="Add your first expense" onPress={() => nav.go('AddExpense')} />
        </Card>)}
    </Screen>
  );
}

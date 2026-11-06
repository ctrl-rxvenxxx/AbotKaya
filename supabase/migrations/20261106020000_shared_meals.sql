create table if not exists public.meals (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  price numeric(10, 2) not null check (price >= 0),
  place text not null check (length(trim(place)) > 0),
  emoji text not null default '🍽️',
  category text not null check (category in ('Rice meal', 'Healthy', 'Budget', 'Snack')),
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snacks')),
  description text not null check (length(trim(description)) > 0),
  ingredients text[] not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.meals enable row level security;
revoke all on table public.meals from anon, authenticated;
grant select, insert, update on table public.meals to authenticated;

drop policy if exists "Authenticated users can read meal suggestions" on public.meals;
create policy "Authenticated users can read meal suggestions"
  on public.meals for select to authenticated
  using ((select public.is_account_active()));

drop policy if exists "Admins can add meal suggestions" on public.meals;
create policy "Admins can add meal suggestions"
  on public.meals for insert to authenticated
  with check ((select public.is_admin()) and (select public.is_account_active()));

drop policy if exists "Admins can edit meal suggestions" on public.meals;
create policy "Admins can edit meal suggestions"
  on public.meals for update to authenticated
  using ((select public.is_admin()) and (select public.is_account_active()))
  with check ((select public.is_admin()) and (select public.is_account_active()));

insert into public.meals (id, name, price, place, emoji, category, meal_type, description, ingredients)
values
  ('m1', 'Longsilog', 65, 'Canteen near campus', '🍳', 'Rice meal', 'Breakfast', 'Garlic rice, longganisa and a fried egg. Filling and budget-friendly.', array['Garlic rice', 'Longganisa', 'Fried egg', 'Atchara']),
  ('m2', 'Monggo with rice', 35, 'Carinderia / home-cooked', '🍲', 'Healthy', 'Lunch', 'A comforting bowl of mung bean stew with garlic, onion and leafy greens, served with rice.', array['Mung beans', 'Malunggay leaves', 'Garlic & onion', 'Steamed rice']),
  ('m3', 'Chicken adobo rice', 80, 'Carinderia', '🍗', 'Rice meal', 'Dinner', 'Classic soy-vinegar chicken with a scoop of rice.', array['Chicken', 'Soy sauce', 'Vinegar', 'Rice']),
  ('m4', 'Pancit canton', 25, 'Home / sari-sari store', '🍜', 'Budget', 'Snacks', 'Quick stir-fried noodles. Add an egg for extra protein.', array['Noodles', 'Egg', 'Veggies']),
  ('m5', 'Tortang talong', 40, 'Carinderia', '🍆', 'Healthy', 'Lunch', 'Grilled eggplant omelette with rice.', array['Eggplant', 'Egg', 'Rice']),
  ('m6', 'Siomai rice', 50, 'Street stall', '🥟', 'Budget', 'Dinner', 'Four pieces of siomai with rice and chili garlic.', array['Siomai', 'Rice', 'Chili garlic']),
  ('m7', 'Banana cue', 15, 'Street stall', '🍌', 'Snack', 'Snacks', 'Caramelized saba on a stick.', array['Saba banana', 'Brown sugar']),
  ('m8', 'Sinigang na baboy', 95, 'Carinderia', '🥘', 'Rice meal', 'Dinner', 'Sour tamarind soup with pork and vegetables.', array['Pork', 'Tamarind', 'Kangkong', 'Rice'])
on conflict (id) do nothing;

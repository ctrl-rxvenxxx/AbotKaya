# AbotKaya

## Run on a phone with Expo Go

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go. Some native features, such as camera access and photo picking, should be tested on a physical device.

## Validate the app

```sh
npm run typecheck
npx expo install --check
npx expo export --platform android
```

## Build an installable Android APK

Set up the EAS project once, then build the internal preview APK:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:android:apk
```

During `init`, follow the prompts to create or link an Expo project. It saves the project ID to the app configuration. The APK download link appears when the cloud build finishes. This project does not include Android signing credentials or Expo account secrets.

## Accounts and data behavior

Device-only accounts are saved on this device and do not sync across devices. The app can optionally use Supabase for online accounts and secure data sync:

## Supabase accounts and admin setup

The app stays in device-only mode until both public Supabase values are configured. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` using the project URL and **publishable/anon** key from Supabase Project Settings → API Keys. Never put a database password or `service_role` key in the app.

1. In Supabase SQL Editor, run `supabase/migrations/20261106000000_initial_accounts.sql`, `supabase/migrations/20261106010000_admin_function_permissions.sql`, and `supabase/migrations/20261106020000_shared_meals.sql`.
2. Restart Expo after setting `.env`: `npx expo start --clear`.
3. Create and verify the first account in AbotKaya. To make it the administrator, replace the email below and run this one-time statement in SQL Editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'
   from auth.users
   where lower(email) = lower('YOUR_ADMIN_EMAIL')
   on conflict (user_id) do update set role = excluded.role;
   ```

4. Install the Supabase CLI and link/deploy the account-management function:

   ```sh
   npx supabase login
   npx supabase link --project-ref lxkvgkbdfuercyfrojkk
   npm run deploy:admin
   ```

   The project ref is in the Supabase dashboard project URL. The function uses Supabase’s server-side service-role environment; never copy that key into the app.

5. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as **preview** and **production** environment variables in the Expo project dashboard before creating new EAS builds.

Users can only read or change their own budgeting data. Admins can view account email addresses and disable/enable sign-in, but cannot read expenses, budgets, goals, or profile photos. They can add, edit, and hide shared meal suggestions; authenticated users can read the shared menu. Disabled accounts are also blocked from accessing their app data by Row Level Security.

Device-only accounts remain on their devices. If a cloud account signs up with the same email, existing local app data is copied to the cloud the first time that account successfully signs in and finds no cloud data.

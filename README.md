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

## Account and data behavior

Create separate accounts from the Login screen. Each account stores its expenses, goals, preferences, and profile photo locally on this device. Logging out preserves saved accounts. Authentication and password changes are device-local; they do not sync across devices and do not provide server-backed recovery.

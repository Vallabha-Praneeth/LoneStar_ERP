# AdTruck Campaign Proof — Demo Guide
## LoneStar ERP — Team Presentation

> **Prepared:** 24 Mar 2026
> **Demo Date:** 26 Mar 2026
> **Presenter:** Praneeth

---

## Table of Contents

1. [Login Credentials](#1-login-credentials)
2. [Option A: Web App (Easiest — No Setup)](#2-option-a-web-app-easiest--no-setup)
3. [Option B: Web App (Local Dev Server)](#3-option-b-web-app-local-dev-server)
4. [Option C: iOS Simulator](#4-option-c-ios-simulator)
5. [Option D: Android Emulator](#5-option-d-android-emulator)
6. [Demo Walkthrough Script](#6-demo-walkthrough-script)
7. [Architecture Overview](#7-architecture-overview)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Login Credentials

| Role | Username / Email | Password | What They See |
|------|-----------------|----------|---------------|
| **Admin** | `admin@adtruck.com` | `mawqex-rYsneq-kynja5` | Campaign management, reports, users, photo review |
| **Driver** | `driver1` | `DriverPass123!` | Active campaign, start/end shift, upload photos |
| **Client** | `client@acme.com` | `ClientPass123!` | Campaign proof photos, timing sheet, PDF export |

> **Note:** The driver uses a **username** (not email). Admin and Client use **email**.
> On the mobile app, all three can use either username or email — the login form handles both.

---

## 2. Option A: Web App (Easiest — No Setup)

### Live URL
```
https://lonestar-adtruck-proof.vercel.app
```

Open this URL in any browser. No installation needed.

### Steps
1. Open the URL above
2. You'll see the **Role Selection** screen with three cards: Driver, Admin, Client
3. Click a role to go to its login page
4. Enter the credentials from the table above
5. You're in!

### What Each Role Can Do (Web)

**Admin** (full dashboard):
- `/admin/campaigns` — View all campaigns with search
- `/admin/campaigns/create` — Create a new campaign
- `/admin/campaigns/:id` — Campaign detail with costs, shifts, photos, PDF export
- `/admin/campaigns/:id/photos` — Photo management (delete)
- `/admin/reports` — Stats dashboard
- `/admin/users` — User management

**Driver** (field worker):
- `/driver/campaign` — See active campaign, start/end shift
- `/driver/upload` — Take or select a photo, add a note, submit
- `/driver/upload-success` — Confirmation screen

**Client** (customer portal):
- `/client/campaign` — View approved photos from campaigns
- `/client/campaign/timing` — Shift timing sheet with photo timestamps

---

## 3. Option B: Web App (Local Dev Server)

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup (One-Time)
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-proof-main
npm install
```

### Start
```bash
npm run dev
```
Opens at: **http://localhost:5173**

### Environment
The `.env` file is already configured with Supabase credentials. No changes needed.

---

## 4. Option C: iOS Simulator

### Prerequisites
- Xcode 16+ installed
- iPhone 16e simulator (or any iOS 18+ simulator)
- pnpm (`npm install -g pnpm` if not installed)

### Setup (One-Time)
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native

# Switch to the branch with admin screens
git checkout feature/admin-unified-login

# Install dependencies
pnpm install

# Generate native iOS project
npx expo prebuild --clean --platform ios
```

### Start the App
```bash
# Terminal 1: Start Metro bundler
pnpm start

# Terminal 2: Build and run on iOS simulator
pnpm ios
```

The app will:
1. Build the native iOS project (~2-3 min first time)
2. Install on the iPhone 16e simulator
3. Open and connect to Metro

### If You See the Expo Dev Client Screen
This means the app lost its Metro connection. To fix:
1. Tap **`http://localhost:8081`** in the server list
2. If the dev menu appears, tap **Close**
3. You should now see the login screen

### Login on iOS
1. Tap the **Username or Email** field
2. Type `driver1` (or `admin@adtruck.com` for admin)
3. Tap the **Password** field
4. Type the password from the credentials table
5. Tap **Sign In**

> **Important:** If you get "No active campaign" for the driver, the campaign date
> needs to be today. See [Troubleshooting](#update-campaign-date) below.

---

## 5. Option D: Android Emulator

### Prerequisites
- Android Studio with SDK installed
- An AVD created (Pixel 9a recommended)
- Java 17 (NOT Java 25 — see note below)
- pnpm

### Critical: Java Version
Java 25 breaks the Android build. You MUST use Java 17:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
```

Add this to your `~/.zshrc` or run it before every Android build.

### Setup (One-Time)
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native

# Switch to the branch with admin screens
git checkout feature/admin-unified-login

# Install dependencies
pnpm install

# Set Java 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Set Android SDK
export ANDROID_HOME=~/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Generate native Android project
npx expo prebuild --clean --platform android
```

### Start the Emulator
```bash
# List available emulators
emulator -list-avds

# Start one (e.g., Pixel_9a)
emulator -avd Pixel_9a &
```

### Start the App
```bash
# Terminal 1: Start Metro bundler
pnpm start

# Terminal 2: Build and run on Android (remember Java 17!)
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$PATH"
pnpm android
```

First build takes ~3-5 minutes. Subsequent builds are cached (~30s).

### Login on Android
Same as iOS — type credentials and tap Sign In. The password field works
normally on Android (no special handling needed).

---

## 6. Demo Walkthrough Script

### Recommended Demo Order (15-20 minutes)

#### Act 1: Admin Creates a Campaign (Web — 5 min)

1. Open `https://lonestar-adtruck-proof.vercel.app`
2. Click **Admin** → Login with `admin@adtruck.com` / `mawqex-rYsneq-kynja5`
3. Show the **Campaigns** list (2 campaigns: Spring Promo + Summer Launch)
4. Click **Acme Corp — Summer Launch** to show detail:
   - Campaign info (client, driver, route, date)
   - Cost breakdown (driver wage, transport, total)
   - Photos section (uploaded photos with timestamps)
   - Click **Export PDF** to download the campaign report
5. Navigate to **Reports** — show aggregate stats
6. Navigate to **Users** — show 3 users (admin, driver, client)
7. Sign out

#### Act 2: Driver Uploads a Photo (Mobile — 5 min)

> Use iOS simulator or Android emulator

1. Open the mobile app
2. Login as `driver1` / `DriverPass123!`
3. Show the **My Campaign** screen — "Acme Corp — Summer Launch"
4. Tap **Start Shift** — shift timer starts
5. Tap **Upload Photo**
6. Tap **Gallery** → select a photo → optionally add a note
7. Tap **Submit Photo** → see **"Photo Submitted!"** success screen
8. Go back → tap **End Shift** — returns to login
9. *"This photo was just sent to the client via WhatsApp automatically"*

#### Act 3: Client Views the Proof (Web — 3 min)

1. Open web app in a new **incognito/private** window (to avoid session conflict)
2. Click **Client** → Login with `client@acme.com` / `ClientPass123!`
3. Show the **Campaign View** with approved photos
4. Show the **Timing Sheet** — shift start/end times + photo timestamps
5. *"The client sees proof of delivery without needing admin involvement"*

#### Act 4: Show the Tech (Optional — 3 min)

1. Show Supabase dashboard (if accessible):
   - Tables: campaigns, campaign_photos, driver_shifts, profiles
   - Storage bucket: campaign-photos
   - RLS policies
2. Show the WhatsApp template in Meta Business Manager
3. Run the Maestro E2E test on Android to show automated testing:
   ```bash
   maestro test .maestro/driver/shift-flow.yaml
   ```

### Demo Tips

- **Session conflict:** Web app uses Supabase sessions stored in localStorage. Logging
  in as admin then client on the same browser will overwrite the session. Use
  **incognito/private windows** for different roles, or demo one role at a time.

- **Campaign date:** The driver's mobile app only shows campaigns where
  `campaign_date >= today`. If nothing shows up, update the date (see Troubleshooting).

- **Photo upload on simulator:** The simulator gallery has sample photos. You can also
  add a test photo: `xcrun simctl addmedia booted /path/to/photo.jpg`

- **WhatsApp notification:** The `campaign_photo` template is pending Meta approval.
  If approved by demo day, the driver's photo upload will trigger a WhatsApp message
  to the client with the photo. If not approved yet, mention it as "coming soon."

---

## 7. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
├──────────────┬──────────────┬───────────────────────────────┤
│   Web App    │  iOS App     │  Android App                  │
│   (React +   │  (React      │  (React Native +              │
│    Vite)     │   Native +   │   Expo)                       │
│              │   Expo)      │                               │
│  Vercel      │  Simulator   │  Emulator                     │
├──────────────┴──────────────┴───────────────────────────────┤
│                     SUPABASE                                 │
├─────────────┬───────────────┬───────────────────────────────┤
│   Auth      │   Postgres    │   Storage                     │
│  (JWT +     │  (profiles,   │  (campaign-photos             │
│   RLS)      │   campaigns,  │   bucket, signed              │
│             │   shifts,     │   URLs)                       │
│             │   photos,     │                               │
│             │   clients)    │                               │
├─────────────┴───────────────┴───────────────────────────────┤
│                  EDGE FUNCTIONS                               │
├─────────────────────────────────────────────────────────────┤
│  send-whatsapp-photo                                         │
│  (Supabase → Meta Cloud API → WhatsApp Business)            │
└─────────────────────────────────────────────────────────────┘
```

### Key Numbers
- **3 roles:** Admin, Driver, Client
- **13 web screens** — all wired to live Supabase data
- **8 mobile screens** — driver + admin (client placeholder)
- **5 database tables** — profiles, campaigns, clients, driver_shifts, campaign_photos
- **Row-Level Security** on all tables — JWT claim-based
- **2 E2E test suites** — driver shift flow + admin campaign flow (Maestro)
- **25 web E2E tests** — Playwright (public, admin, client, RLS)
- **44 unit tests** — Jest + React Testing Library (mobile)

### Versions
| Component | Version | Location |
|-----------|---------|----------|
| Web app | v1.5.0 | github.com/Vallabha-Praneeth/LoneStar_ERP |
| Mobile app | v0.3.0 | github.com/Vallabha-Praneeth/LoneStar_EPR_mobile_stack |
| Supabase edge fn | v7 | cleooniqbagrpewlkans.supabase.co |

---

## 8. Troubleshooting

### Update Campaign Date

The driver's mobile app only shows campaigns where `campaign_date >= today`. To update:

```bash
# 1. Get an admin JWT
ANON_KEY=$(grep EXPO_PUBLIC_SUPABASE_ANON_KEY /Users/praneeth/LoneStar_ERP/adtruck-driver-native/.env | cut -d= -f2)

ADMIN_JWT=$(curl -s -X POST \
  "https://cleooniqbagrpewlkans.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adtruck.com","password":"mawqex-rYsneq-kynja5"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Update the campaign date to today
TODAY=$(date +%Y-%m-%d)
curl -s -X PATCH \
  "https://cleooniqbagrpewlkans.supabase.co/rest/v1/campaigns?id=eq.00000000-0000-0000-0000-000000000010" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"campaign_date\":\"$TODAY\"}"

echo "Campaign date updated to $TODAY"
```

### iOS Simulator — App Shows Dev Client Instead of Login

```bash
# Kill and restart
xcrun simctl terminate booted com.adtruck-driver-native.development
# Re-run
pnpm ios
```

### Android — Gradle Build Fails

```
Error resolving plugin [id: 'com.facebook.react.settings'] > 25.0.2
```

**Fix:** You're using Java 25. Switch to Java 17:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
pnpm android
```

### Android — Emulator Not Found

```bash
# Make sure ANDROID_HOME is set
export ANDROID_HOME=~/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Start emulator manually
emulator -avd Pixel_9a &

# Wait 30s, then run
pnpm android
```

### Web — Session Conflict Between Roles

Supabase sessions are stored in `localStorage` per domain. Logging in as one role
overwrites the previous session.

**Fix:** Use separate browser profiles or incognito/private windows for each role.

### Metro Bundler Port Conflict

```
Error: listen EADDRINUSE :::8081
```

**Fix:**
```bash
# Kill existing Metro
lsof -i :8081 | awk 'NR>1 {print $2}' | xargs kill -9
# Restart
pnpm start
```

### Photo Upload — "Max file limit 15MB"

The upload screen limits photos to 15MB. Simulator galleries may contain
high-res wallpapers. Add a small test photo:
```bash
# iOS
xcrun simctl addmedia booted .maestro/test-assets/sample-photo.jpg

# Android
adb push .maestro/test-assets/sample-photo.jpg /sdcard/Pictures/
```

---

## Quick Start Cheat Sheet

### Fastest Demo (Zero Setup)
```
Open: https://lonestar-adtruck-proof.vercel.app
Admin: admin@adtruck.com / mawqex-rYsneq-kynja5
Driver: driver1 / DriverPass123!  (use incognito window)
Client: client@acme.com / ClientPass123!  (use incognito window)
```

### Mobile Demo (iOS)
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
git checkout feature/admin-unified-login
pnpm start          # Terminal 1
pnpm ios            # Terminal 2
# Login: driver1 / DriverPass123!
```

### Mobile Demo (Android)
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
git checkout feature/admin-unified-login
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
emulator -avd Pixel_9a &     # Start emulator
pnpm start                    # Terminal 1
pnpm android                  # Terminal 2
# Login: driver1 / DriverPass123!
```

### Run E2E Tests (Automated Demo)
```bash
# Android (emulator must be running)
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
maestro test .maestro/driver/shift-flow.yaml       # Driver flow
maestro test .maestro/admin/admin-campaign-flow.yaml  # Admin flow
```

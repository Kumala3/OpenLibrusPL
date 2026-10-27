<div align="center">

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md)
[![Polski](https://img.shields.io/badge/lang-Polski-lightgrey.svg)](README.pl.md)

</div>

<p align="center"><img src="assets/icon.png" width="96" alt="OpenLibrus"></p>

# OpenLibrus

An Android app for Librus Synergia that keeps a copy of your school data on
the phone. You log in once, download everything in one go, and use it whenever you want with no
connection needed. A piece of open-source software that is free, with no
ads, no tracking, no account other than your school one.

<p align="center">
  <a href="https://github.com/Kumala3/OpenLibrusPL/releases/latest/download/OpenLibrus.apk"><img src="https://img.shields.io/badge/Download-OpenLibrus.apk-2447c4?style=for-the-badge&logo=android&logoColor=white" alt="Download OpenLibrus.apk"></a>
</p>
<p align="center">
  <a href="https://github.com/Kumala3/OpenLibrusPL/releases/latest/download/OpenLibrus.apk"><img src="docs/download-qr.png" width="160" alt="QR code: download OpenLibrus.apk"></a><br>
  <sub>On a computer? Scan with your phone's camera.</sub>
</p>

**Unofficial.** Not made by, affiliated with or endorsed by Librus Sp. z o.o.
"Librus" and "Librus Synergia" are its trademarks. The app reads the same API
the official app reads, with your own login, and never writes anything back.

## Functions

Five tabs:

| Tab | What it shows |
|---|---|
| Kalendarz | Week strip that opens into a month; swipe sideways to change week. An orange dot marks a day with a test or kartkówka, a grey dot a day with other entries, a green circle a day off. The chosen day lists its lessons with room and teacher, cancellations and substitutions, the lesson on now and the time until the next one, which of your teachers are absent, and what is due that day. Tydzień shows the whole week as a grid. |
| Terminarz | Sprawdziany, kartkówki and zadania domowe by date, with filters and past entries. |
| Oceny | Every subject you take with its grades and average, and your behaviour grade and notes (uwagi). Okresowe lists the proposed and given semester and final grades. Tap a subject for each grade's category, comment and teacher, its attendance, what is coming up in it, and a target average (Mój cel) with the grade you need next to reach it. |
| Frekwencja | Overall rate, rate per subject (worst first, red under 50%, where nieklasyfikowany starts), absences grouped by day. |
| Ogłoszenia | School notices with tappable links, and the days off ahead. |

The bell in the header opens Co nowego: grades, entries, notices, notes and
teacher absences that arrived since the previous download, kept for 30 days.
The lucky number (szczęśliwy numerek) shows on the calendar on days the school
publishes one.

"Konto" page shows the class, the form tutor, the school and the semester dates. It
also has the theme (light and dark follow the system, or can be fixed) and an
optional reminder at 18:00 the evening before each test or kartkówka. The
phone schedules those from the data it already has, without asking Librus.

Not included: messages (wiadomości), which sit behind a separate "Konto
LIBRUS" login with an email that the Synergia login cannot open; and iOS
builds. It has been tested with a student account; parent accounts may work
but have not been tried.

## Install

1. On the phone, tap **Download** above or scan the QR code. You get
   `OpenLibrus.apk` (always the newest version).
2. Open the file. The first time, Android asks to allow installs from your
   browser; switch it on and go back. Play Protect may call it an unknown app,
   which it says about anything from outside the Play Store (don't worry, just tap Install anyway). The app is signed with the same key for every release, so Android will accept updates from this page only.
3. Sign in with the login and password you use on synergia.librus.pl.

Updates: when a new version is out, the calendar page shows **Nowa wersja** with a
download button. Install it over the old one; the login and data stay.

Only install APKs from this repository's Releases page. Every release is signed
with the same private key, and Android refuses an update signed with any other
key. A copy from elsewhere could be a modified app that keeps your password.

To check a downloaded APK before installing, compare its certificate with the
SHA-256 fingerprint listed in the release notes:

```bash
apksigner verify --print-certs OpenLibrus.apk
```

## Privacy and security

- The password is stored with `expo-secure-store`, encrypted by a key in the
  Android Keystore that only this app can use. It fetches data directly from the same source Librus app does. There is no server of ours in between, and no analytics.
- School data and the Librus session cookie stay in the app's private storage.
  Google backups and Android 12+ phone-to-phone transfers are off for this app
  (`plugins/withPrivacy.js`), so neither leaves the phone that way.
- All traffic is HTTPS to `api.librus.pl` and `synergia.librus.pl`, plus one
  request a day to `api.github.com` asking for the latest version number (you can turn that off
  in Konto page if you want). Links in notices open in the browser only when
  they are `http(s)`.
- Permissions: internet, network and Wi-Fi state (to tell Wi-Fi from mobile
  data), vibration, and what notifications and the background check need
  (notifications, run at startup to restore reminders, wake lock, WorkManager's
  service). Android asks about notifications only when you switch on reminders
  or background checking. No push service: every notification is created on
  the phone.
- "Konto" -> "Wyloguj": deletes the password, the data and the session cookies.

A rooted phone, or malware running with root, can read any app's storage, this
one included obviously, so if your phone is hacked, you're cooked.

## How often it talks to Librus

Synergia's terms give every user API access for outside apps (§3 ust. 10) and
forbid downloading heavy enough to destabilise its servers (§4 ust. 3 lit. c),
on pain of a blocked account. A block, even a temporary one, means losing the
school's system of record mid-year. So the app keeps its traffic close to what
one person tapping through the official app would cause:

- One sync is a fixed 26 requests, `Me` included: 21 list endpoints, three
  timetable weeks, the lucky number. Never a request per subject or per day.
- It syncs on launch only when its copy is over 6 hours old. Pull to refresh
  works at most every 3 minutes. Two syncs never run at once.
- Background checking is off unless you switch it on in Konto. Then Android
  runs a 12-request check every 30, 60 or 120 minutes at the soonest (it
  delays them to save battery), only when online, never between 22:00 and
  6:00. New grades, entries, notices, notes and timetable changes arrive as a
  notification.
- Moving the calendar to a week outside the copy costs one request, once.
- After Librus rejects the saved password, the app stops trying until you sign
  in again.

Use it at your own risk. The risk is small though, even negligible. The API is undocumented and Librus can change it, or
object to third-party clients, at any time.

## Build APK yourself

Requirements: Node 22 or later, JDK 17 and the Android SDK (API 36), with `JAVA_HOME`
and `ANDROID_HOME` set.

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install app/build/outputs/apk/release/app-release.apk
```

`android/` is generated (Expo's Continuous Native Generation) and gitignored.
Native settings live in `app.json` and the config plugins in `plugins/`, never
in `android/` by hand.

Without a signing key configured, release builds are signed with React
Native's public debug key. That is fine for your own phone. To distribute
builds, set up a private key as described in `plugins/withReleaseSigning.js`.

iOS would need a Mac or an EAS cloud build, and has not been tried.

### Releases

`node scripts/release.mjs 1.1.0` sets the version in `app.json`, derives
Android's `versionCode` from it (major×10000 + minor×100 + patch, so every
release installs over the last), commits and tags. Pushing the tag
(`git push origin v1.1.0`) runs `.github/workflows/release.yml`, which builds
and signs the APK and publishes it as `OpenLibrus.apk` with the signing
certificate's fingerprint in the notes.

The workflow signs with the key from four repository secrets.
`bash scripts/set-release-secrets.sh` copies them from
`~/.gradle/gradle.properties` once, without printing them.

### Working on the UI

Librus blocks browser requests (CORS), so the web build cannot log in. Instead
it loads a snapshot from `public/fixture.json` at runtime. That file is
gitignored and fetched, never imported, so no one's grades end up in a bundle.

```bash
npx expo start --web
npm run typecheck
npm run lint
```

On a phone, a debug build (`./gradlew assembleDebug`) loads JavaScript from
Metro (`adb reverse tcp:8081 tcp:8081`, then `npx expo start`), so changes
reload without a native rebuild. Test with a large system font too: the layout
was tuned at font scale 1.4.

On Windows, keep `react-native-gesture-handler` at the SDK's version (2.32).
npm may pull 3.x as an optional peer of expo-router, and 3.x's native sources
nest deep enough to break the 260-character path limit in the C++ build.

`src/librus/` is plain TypeScript with `fetch` passed in, so it also runs under
Node (`node --experimental-strip-types`) for testing.

[ARCHITECTURE.md](ARCHITECTURE.md) walks through the main code from login to how the app works.

## Credits

The login flow is a port of the gateway login in
[librus-sdk](https://github.com/andrewkoltsov/librus-sdk) by Andrey Koltsov
(MIT). Icons are [Lucide](https://lucide.dev) (ISC).

## License

[MIT](LICENSE).

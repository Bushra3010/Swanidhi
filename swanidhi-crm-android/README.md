# Swanidhi CRM — Android app

Native Android shell for the Swanidhi CRM (https://swanidhigroupofinstitutions.com/crm/),
styled with the Zavtoo app theme: navy gradient splash, blue (#0B5CFF) primary, gold (#F5A623)
highlights, Poppins type, 3-slide first-run onboarding.

What the app adds on top of the website:
- CSV / Excel exports and invoice / salary-slip PDFs save to **Downloads** (assets/bridge.js → WebBridge)
- Receipt printing (`window.print`, `window.open('') + document.write`) uses Android printing / Save as PDF
- WhatsApp, phone, email and other external links open in their apps
- Location permission for attendance punch-in; camera or files for document uploads
- Share sheet for `navigator.share`, offline screen with retry, stays signed in across launches
- `https://swanidhigroupofinstitutions.com/crm/...` links can open straight in the app

## Demo mode (current)

The live CRM can't sign anyone in yet: the deployed site has no Supabase keys
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset on Netlify).
Until then the app runs a bundled **offline demo CRM** (`app/src/main/assets/demo/`) on dummy data:

| Login (password `Demo@12345`) | Portal |
|---|---|
| `demo.admin@swanidhi.test` (or any staff email under More → Team) | Staff CRM — dashboard, leads, students, fees, attendance, HRMS, finance, associates, targets, tasks, courses |
| Enrollment `DEMO-STU-001` | Student portal — admission status, fees & receipts, document upload, support |
| `demo.associate@swanidhi.test` | Associate portal — wallet, referred leads, students, refer a student |

Or tap a **Demo login** button. Courses and fees come from the real fee structure
(`courses.js`, generated from `src/data/courses.ts`); people, leads and payments are made up.
Changes are saved on the phone; More → *Reset demo data* restores the originals.

**Switching to the live CRM:** connect Supabase on the website, then set
`DEMO_MODE` to `false` in `app/build.gradle`, bump `versionCode`, and rebuild.

## Build

Requires JDK 17 and the Android SDK (platform 35).

```bash
./gradlew assembleRelease        # app/build/outputs/apk/release/app-release.apk
```

Release signing reads `keystore.properties` + `swanidhi-release.jks` (both git-ignored).
**Back up both files** — every future update must be signed with the same key.

To ship an update, bump `versionCode` / `versionName` in `app/build.gradle`. The CRM URL is the
`CRM_URL` build field in the same file.

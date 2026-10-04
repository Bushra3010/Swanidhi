# Swanidhi CRM — Android app

Android app for the Swanidhi Group of Institutions CRM, styled with the Zavtoo app theme
(navy splash, blue `#0B5CFF` primary, gold `#F5A623` highlights, Poppins).

- **Download:** [`releases/SwanidhiCRM-v1.1.0-demo.apk`](releases/SwanidhiCRM-v1.1.0-demo.apk)
- **Source:** [`swanidhi-crm-android/`](swanidhi-crm-android/) — build steps and demo logins in its README

The current build runs an offline **demo CRM on dummy data** (staff CRM, student portal,
associate portal — password `Demo@12345`). Once Supabase is connected on
https://swanidhigroupofinstitutions.com/crm/, set `DEMO_MODE` to `false` in
`swanidhi-crm-android/app/build.gradle` and rebuild to load the live CRM.

Based on:
- CRM / website: https://github.com/alisha-khan0808/SwanidhiGroupOfInstitutions
- Theme: https://github.com/Alok16012/zevto

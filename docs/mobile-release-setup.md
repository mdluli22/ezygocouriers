# Mobile production build and credentials

Repository configuration is prepared for release 1.0.0. Accounts and credentials
have not been created or provisioned. Run all EAS commands from `apps/mobile`.

## First-time account setup

1. Create an Expo account at https://expo.dev/signup. From `apps/mobile`, run
   `npx eas-cli@latest login`, then `npx eas-cli@latest init`. Use the business's
   account as owner. Keep the generated `extra.eas.projectId` in app.json; the
   dynamic config also accepts EXPO_PUBLIC_EAS_PROJECT_ID as an override.
2. Enrol the business in Apple Developer for App Store distribution and create an
   App Store Connect app for `za.co.ezygocouriers.app`. Add its numeric app ID as
   `submit.production.ios.ascAppId` in eas.json. Without it, submission asks
   interactively. A free Personal Team cannot sign this release with push enabled.
3. Create a Google Play developer account and an app for the same package name.
   Configure Play App Signing. Create a Play submission service account with
   access to this app and upload its key to EAS Submit credentials. Store private
   JSON files outside the repository or under ignored `apps/mobile/credentials/`.
   Google requires the first app upload to be performed manually before API
   submissions; subsequent EAS submissions use the internal track as drafts.

## Production environment and push

In the Expo project dashboard, create production environment variables:

| Variable | Value | Visibility |
| --- | --- | --- |
| EXPO_PUBLIC_EAS_PROJECT_ID | Linked project's UUID (optional if committed in app.json) | Plain text |
| EXPO_PUBLIC_GOOGLE_MAPS_API_KEY | Android Maps SDK restricted key | Plain text |
| GOOGLE_SERVICES_JSON | Upload Firebase Android google-services.json as a file variable | Sensitive |

The API origin is set to https://ezygocouriers.co.za in the production profile.
Do not set EZYGO_IOS_PERSONAL_TEAM for production. EAS uses remote signing
credentials. Run `npx eas-cli@latest credentials --platform ios` and choose the
production profile to provision distribution signing and an APNs push key.

Create a Firebase project and register Android package `za.co.ezygocouriers.app`.
Download its google-services.json for the file variable above. Separately upload
an FCM V1 service-account private key using
`npx eas-cli@latest credentials --platform android`, production, Google Service
Account, Push Notifications (FCM V1). The Firebase client configuration and FCM
private key are different files; never bundle the private key.

## Android maps restrictions

Enable Maps SDK for Android in a billing-enabled Google Cloud project. Restrict
the maps key to that API and Android package `za.co.ezygocouriers.app` plus the
release certificate SHA-1. For Play installs use the **Play app signing**
certificate from Play Console App integrity. For directly installed EAS builds,
add the EAS keystore signing certificate SHA-1 too. Upload and Play signing keys
may differ. Verify a map on both distribution paths; config cannot establish
whether a cloud key has the correct restrictions.

## Build and submit

Install dependencies at the repository root with `npm ci`, then run typecheck,
mobile tests and the mobile export before requesting native builds.

From `apps/mobile`:

```sh
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
```

EAS increments iOS buildNumber and Android versionCode remotely on production
builds. Change expo.version in app.json deliberately for each user-facing release.
If this app has previously shipped, initialise EAS build versions using
`eas build:version:set` to avoid reusing a store build number.

Submissions are separate from public store publication. Complete store metadata
and signed physical-device testing before requesting review/public rollout.
Production config rejects a missing project UUID, Personal Team mode, and (on
Android builders) missing Maps key or Firebase configuration file. It cannot
verify remote APNs/FCM keys, account enrolment or cloud key restrictions.

Sources: [version management](https://docs.expo.dev/build-reference/app-versions/),
[submission configuration](https://docs.expo.dev/submit/eas-json/),
[FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).

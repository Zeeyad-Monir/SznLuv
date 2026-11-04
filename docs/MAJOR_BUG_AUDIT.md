# SznLuv major-bug audit

Audit date: November 3, 2026, America/New_York. Target: iPhone 16 simulator, iOS 18.0, Expo Go with Expo SDK 52. No SDK upgrade or backend deployment was performed.

## Result

The app launches and its repaired signup/login services work in the actual iOS runtime. The final iOS bundle builds. All 44 automated tests pass. All 14 live Firebase service regression checks pass, covering account provisioning, failure cleanup, concurrent saves, votes, and all review sort/filter shapes.

Two major backend issues remain unresolved: cross-account access to private Firestore records, and Google Directions billing. The available admin sessions cannot inspect or publish the project's rules. See [the concrete rules remediation and retest procedure](FIRESTORE_OWNERSHIP_FIX.md).

This is **not a completed visual walkthrough**. The booted simulator runs Expo Go, but the installed Xcode bundle has no Simulator.app and the available device UI has no usable window. Native service calls and console diagnostics were exercised through React Native's debugger. All 15 main screens were rendered in automated tests with mocked native modules. Those tests do not establish native layout, touch behavior, map rendering, or real permission-dialog behavior.

## Major findings

| Priority | Finding and evidence | Status |
| --- | --- | --- |
| P1 | **Private records accessible across accounts.** Using two newly created audit accounts, one could read the other's existing profile and favourites, and update the other's favourites. The temporary write marker was removed immediately. | **Unresolved backend security issue.** Ownership regression command deliberately exits 1 with three failing checks. Requires deployed-rule review and an owner-only access boundary. |
| P1 | **Signup blocked before Auth.** Original signup reads `/usernames/{name}` while signed out. The actual client SDK returned `permission-denied`, `7 PERMISSION_DENIED: Missing or insufficient permissions.` An independent REST lookup returned HTTP 403 with the same message. Authenticated provisioning succeeded. | **Fixed.** Authenticate first, then atomically reserve the username and create the profile. No public username access was added. |
| P1 | **Incomplete accounts could enter Home.** Firebase signs in immediately on account creation; original navigation only checked whether an Auth user existed, before profile writes completed. Profile/username writes were separate. | **Fixed.** Keep signup pending, commit both documents in one transaction, and sign out before returning to Login. Failed setup deletes only the newly created Auth account and attempts logout; cleanup failures are surfaced. A restored account missing its profile receives a recovery form. |
| P1 | **Login session lost on app restart.** The actual iOS runtime printed Firebase's warning that Auth was initialized without AsyncStorage and would use memory persistence. | **Fixed.** Configure native AsyncStorage persistence and reuse Firebase initialization. Actual native login restored with the same UID after terminating/reopening Expo Go; logout also survived a restart. |
| P1 | **Favourites/collections could lose data.** Two saves derived from the same snapshot erased the first change on the audit account. Existing writes replaced whole documents or collection arrays without a transaction. | **Fixed.** All favourite/collection mutations use shared Firestore transactions that recompute on retry. Concurrent additions/membership changes survived live tests. Removals preserve other seasons and collections. Lists refresh when revisited; seasonal cards subscribe to current favourites. |
| P2 | **Several cards navigate to nonexistent screens.** Spring, summer, and winter referenced 11 detail-screen names absent from the navigator and repository. Custom collections also showed a placeholder for available fall venues. | **Fixed.** Share a venue-route map for the three implemented detail pages and show an explicit unavailable-details message for other venues. No new venue content was invented. |
| P2 | **Repeated upvote race.** Original code checked for a vote outside the transaction, then incremented without rereading the vote inside it. Concurrent requests could both pass the first check. | **Fixed.** Read the review and vote in the same transaction. The live concurrent test counted exactly one successful vote and one `review/already-voted` result; temporary review and vote records were removed. |
| P2 | **Location tracking could start after leaving a venue page.** Tests reproduced this on all three pages by resolving the permission request after unmount. Cleanup had already run before the subscription existed. Saved location preferences could also be overwritten by the initial default before hydration. | **Fixed.** Cancel pending tracking work and remove late subscriptions; stop blocking the entire venue page while waiting for the first GPS fix. Hydrate settings before saving. Denied permission and delayed-unmount tests pass. |
| P1 | **Directions fail at Google Cloud.** The Directions API returned HTTP 200 with `status: REQUEST_DENIED` and `You must enable Billing on the Google Cloud Project`. The test used public venue coordinates, not the user's location. | **Backend requirement remains.** Enable billing for the project owning the Directions key and verify its API configuration. App now displays a readable directions-unavailable message while retaining the venue map. No billing changes were made. |

## Exact Firebase outcomes

| Check | Observed result |
| --- | --- |
| Original unauthenticated username lookup | `permission-denied`: `7 PERMISSION_DENIED: Missing or insufficient permissions.` |
| New test account creation | Succeeded through Firebase Auth; repaired provisioning succeeded in native and Node SDK checks. |
| Wrong password | `auth/invalid-credential`: `Firebase: Error (auth/invalid-credential).` Login now explains that the email or password is incorrect. |
| Duplicate email | `auth/email-already-in-use`: `Firebase: Error (auth/email-already-in-use).` |
| Duplicate username after repair | App code `signup/username-taken`; newly created Auth user was removed, logout completed, and login to the removed candidate returned `auth/invalid-credential`. Existing reservation ownership was preserved. |
| Native persistence before repair | `You are initializing Firebase Auth for React Native without providing AsyncStorage. Auth state will default to memory persistence and will not persist between sessions.` |
| Native persistence after repair | `LOCAL`; same verified UID restored after a cold restart. Original warning no longer appears on a fresh launch. |
| Rules administration | HTTP 403: `The caller does not have permission` when reading the deployed Rules API release. This is Firebase authorization, not a sandbox approval rejection. |

The existing Firebase CLI login is `monirtraders1@gmail.com`; its project list contains only `minimartstaffclockin`. The browser's `flamingapps786@gmail.com` account shows “The project does not exist or you do not have permission to list apps in the project” for `sznluv`. Existing app-client access allows the audited operations, but does not grant administrative access to the rules.

## Verification and limits

- `npm test`: **44 passed**, covering service failure recovery, signup submission locking and normalization, all 15 main screen renders, account gating/recovery, denied profile access, missing detail routes, wheel selection/storage restoration, preference hydration, location denial, and cancellation after unmount.
- Live app-service regression suite: **14 passed**. The separate ownership suite has **3 failures**, each confirming an unresolved backend authorization defect.
- Final `expo export --platform ios`: passed; output is `/private/tmp/sznluv-audit-final-ios`.
- Actual iOS services: signup → atomic profile → signout; wrong-password rejection; valid login; matching created/login/reservation UIDs; `LOCAL` persistence; cold restart restores login; logout persists across a subsequent restart.
- Live Firestore tests: own account/profile access, duplicate-username rollback, concurrent favourites/collection mutations, repeated-vote prevention, and review sorting by recent/popular/highest/lowest with and without a minimum rating. No missing-index errors were observed for those query shapes.
- OpenWeatherMap returned HTTP 200 with valid forecast data for public coordinates. Successful forecast fetches now clear previous weather errors.
- Native startup's earlier raw-text-child warning and circular imports through App were corrected. The SDK 52 new-architecture configuration warning remains deferred; no production build was tested.
- A previous debugger-driven audit fixture had a UID/profile mismatch. Fresh serialized native and SDK signups both passed UID/profile consistency checks. The earlier fixture was excluded from acceptance results; its cause was not established as a reproducible product defect.
- A separate sandboxed Metro startup attempt failed with `ERR_SOCKET_BAD_PORT` while searching for a port. The existing host Expo server worked and was reused; this was treated as a diagnostic environment limitation.
- Physical-device behavior, Android, web, actual native map rendering, and a complete touch/visual walkthrough remain unverified. Simulated denied-permission tests do not substitute for OS prompt testing.

## Retesting

```sh
npm test
node scripts/firebase-live-audit.cjs --live \
  --account-file /private/tmp/sznluv-final-native-account.json
node scripts/firebase-access-audit.cjs --live \
  --actor /private/tmp/sznluv-audit-account.json \
  --other /private/tmp/sznluv-final-native-account.json
```

The last command currently fails intentionally because it expects cross-account access to be denied. It should pass after the deployed ownership rules are corrected.

The retained final native test account's generated credentials are in `/private/tmp/sznluv-final-native-account.json`, created with permissions 0600. Passwords and tokens were not added to repository files. Earlier diagnostic account files are also in `/private/tmp`; use the final account for acceptance testing. Only new audit accounts and labelled test records were modified. The existing Expo server was reused and left running, with the native app signed out.

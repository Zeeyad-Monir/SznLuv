# Firestore ownership fix — not deployed

The live audit confirmed that one authenticated audit account can read another audit account's favourites and modify them. The test used only newly created audit accounts and removed its test marker immediately. Changing the React Native client cannot enforce ownership against another client.

## Required rule change

First export and review the deployed rules using the account that owns the `sznluv` project. Current sessions cannot retrieve that release: the Rules API returns HTTP 403, “The caller does not have permission.” The available CLI account (`monirtraders1@gmail.com`) lists only `minimartstaffclockin`. The Firebase Console account (`flamingapps786@gmail.com`) also shows that it cannot access `sznluv`.

Merge an owner-only rule for favourites into the reviewed ruleset:

```text
match /favourites/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Firestore combines matching `allow` statements with OR. Remove or narrow any overlapping wildcard rule granting access to everyone who is authenticated; adding the block above alone cannot override that grant. Do not replace the entire production ruleset with this snippet: it does not define access for profiles, usernames, reviews, votes, or date counts.

Apply the same owner boundary to private `/users/{userId}` documents and `/users/{userId}/votes/{reviewId}` records after reviewing how existing review-vote transactions use them. Preserve authenticated username reservation transactions and shared review/date-count reads. Username documents currently contain email addresses, so public reads must remain disabled. Review authenticated username reads and the stored email fields separately before deciding whether to migrate reservation data.

## Acceptance checks

Use two audit accounts that both have profiles and favourites documents:

```sh
node scripts/firebase-access-audit.cjs --live \
  --actor /private/tmp/sznluv-audit-account.json \
  --other /private/tmp/sznluv-final-native-account.json
```

Own reads must succeed; all three cross-account checks must report `passed: true` (access denied). The command currently exits 1 because the deployed rules allow cross-account access. It only touches audit accounts and removes its write probe immediately.

Then run the live app-service regression suite:

```sh
node scripts/firebase-live-audit.cjs --live \
  --account-file /private/tmp/sznluv-final-native-account.json
```

Signup, duplicate-username handling, own profile/favourites writes, reviews, and one-vote-per-user transactions must continue to work. Save the previous rules release for rollback before publishing a reviewed change. No backend rule or IAM change was made by this audit.

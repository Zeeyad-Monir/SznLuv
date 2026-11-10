# SznLuv — Top 4, Lists and Following: final plan

## 1. Context

`docs/SznLuvSocialMedia-Annotated-Research.pdf` (and the prototype in `docs/spot-lists/prototype/`) proposes a first social layer: a per-city **Top 4** on profiles, **private and public spot lists**, **curated and manual spots**, **public links**, **follow person / follow list / save spot** as three distinct actions, and a **library** to return to. The research itself says its visuals are throwaway ("use the current app's palette, typography and components").

This plan keeps those objectives and rebuilds everything else around the app as it actually is (re-checked against commit `b883d87`): a transparent header with the ink "SznLuv" wordmark and a profile badge, a floating glass pill at the bottom with **Home · Favourites · Explore** (Explore opens Spin the Wheel), cream pages, huge bold system type, illustrated season cards, coloured "worlds" per destination, cream spot cards with a heart, and native bottom sheets.

Decisions you already made: **in-app links only** (no web guest page), **you deploy the Firestore rules**, **Collections become Lists**.

## 2. What changes from the research, and why

| Research / prototype | Final decision | Reason |
|---|---|---|
| Bottom tab bar: Explore, Library, Profile | The floating pill gains one slot: **Home · Explore · Favourites · Spin**. Explore (search icon) is the new home for finding public lists and people. Library = the **Favourites** slot. Profile = the header's **profile badge**. The Vancouver page gets a 3-card teaser that leads into Explore | You asked for a search/explore slot in the bottom navigation. Spin the Wheel keeps its own slot and its real name (today it is mislabelled "Explore" for VoiceOver). `FloatingTabBar` already sizes slots from the item count: four slots are 84pt wide on current iPhones and 68pt at 320pt, all above the 44pt minimum |
| Lists are a new concept beside favourites | Collections are migrated into lists; one concept | Collections already are private lists (title, colour, spot names) |
| "Save spot" labelled button on every row | The existing **heart** is Save spot, everywhere | The heart already means this on 4 season screens. Follow list and Follow person stay labelled buttons, so the three scopes are still unmistakable |
| Burgundy accent, serif headings, line-icon squares, white hairline cards | Charcoal `#333` + cream + the existing pastel and season colours; system bold type; existing spot card | Prototype look is generic; nothing in it exists in SznLuv |
| List page with compact header or illustrated cover | Every list is a **colour world** (full-bleed pastel or season colour, like `FallDatesScreen` / `CustomCollectionScreen`). Illustration appears on list *tiles* only | Keeps creator + first spot above the fold at 390×844 (the research's own test) and reuses the app's strongest visual idea. No per-list artwork exists |
| City pill + picker vs chips | Data is keyed by city; the UI shows a plain "Vancouver" label. It becomes selectable chips only when a second city exists | Only one city exists. A switcher with one option is noise. Chips reuse the filter sheet's `Option` style |
| Separate "Edit list" form + "Visitor preview" screen | The owner's list page *is* the visitor layout, with an in-place Edit mode | What you see is what goes public; removes a screen and the preview step |
| Edits to a public list stay in draft until "review and publish again" | Kept (two documents), but lighter: an "Update" bar; the review sheet appears only when the update exposes a **new note or custom location** | Nothing goes public without a tap, but adding a catalogue spot is one tap, not a ceremony |
| Guest browsing before sign-in | Dropped for v1 (your choice). Links open for signed-in users; a signed-out tap is remembered and opened after login | The app has no guest mode or website |
| Making a list private "clears follows" | Follows are private pointers owned by the follower; a pointer whose list is gone or was re-published later is pruned by the follower's own client | No Cloud Functions; an owner cannot (and should not) write to another user's data |
| Up/down arrows to reorder | Kept, inside Edit mode, with VoiceOver actions | No drag library installed; lists are short |
| Not in research | **Report** and **Block** | Public user content needs both for App Store review (guideline 1.2) |
| Not in research | Fixes found on the way: Favourites grid renders one column on current iPhones; white text on pale collection colours is unreadable; blocking `Alert` on every heart tap; blue `#4A90E2`/`#8DA9F2` buttons that match nothing else | These screens are being rebuilt anyway |

Out of scope (unchanged from research): comments, collaboration, notifications, activity feed, follower counts, web guest page, SznLuv "official guides" (the season screens already are the official content).

## 3. Design language (new `components/theme.js`, used by new code only)

- **Colour**: ink `#333333`; page cream `#FFF5E4`; library cream `#F5E7D8`; profile cream `#FAF3E0`; card `#FFF8DC`; field `#FFF9F1` with 1px `#00000020`; section label tan `#C2B697`; body muted `#62584E`; summary text `#30261D`; hairline `#DED8D1`; dark row `#2C2C2C`; danger `#D24B3A`; error text `#982D24`; snackbar `#323232`, snackbar action `#FFD39B`; heart red `#FF0000` / idle `#A9A9A9`.
- **List covers**: the 7 existing pastels (`#FFC1E3 #A7C8FF #A8E6CF #FFF9C4 #FF8B94 #D3BFFF #FF8657`) plus 4 season covers (art `fall2/winter2/spring2/summer3.png` on tiles; page background `#F4A460 #BBCDEC #FF9FD2 #F8DD74`). **Text on any cover background is ink `#333`**, never white (white only over illustrations, with the existing text shadow).
- **Type** (system font, as today): page title 48/700; world title 34/700 centred, 2 lines max, shrink-to-fit; section label 18/700 tan; card name 22/700; tile title 20/700; body 15–16; meta 13–14/600.
- **Shape**: cards radius 14, tiles 15, fields/buttons 12, chips 10, sheets 16. Shadow = existing card shadow (`0,1 / 0.1 / 2`).
- **Controls**: primary button ink background, white 15/700, 48 high; secondary = field style; chips = `Option` style from `SpotFilterSheet` (selected = ink); switches = existing dark rows with `#D9E5B6` track. All targets ≥44pt.
- **Segment pill** (`components/SegmentPill.js`, used for Saved · My lists · Following and Spots · Map): a small sibling of the floating tab bar. Capsule track `#FAECD9`, 44 high; sliding highlight `rgba(255,252,247,0.83)` with hairline `rgba(157,118,77,0.26)`, moved with the same spring as `FloatingTabBar` (stiffness 340, damping 31, mass 0.85); ink 15/600 labels; `selectionAsync` haptic on a real change (iOS).
- **Page frame**: every new screen is wrapped in `SignedInScreen` (content starts below the transparent header, the page colour runs behind it) and passes its scroll style through `useFloatingScrollStyle` so the last card clears the pill. Anything pinned to the bottom (snackbar, map) sits above `useFloatingNavClearance()`. The header is ink on the page colour, which is why text on covers is ink too.
- **Spacing**: screen gutter 20; grid gap 16; tile width `(screenWidth − 40 − 16) / 2` (two columns at every phone width); card gap 16.
- **Icons**: Ionicons / MaterialIcons already in use: `favorite`, `chevron-right`, `lock-closed`, `globe-outline`, `share-outline`, `ellipsis-horizontal`, `add`, `location-outline`, `arrow-up/down`, `remove-circle-outline`, `checkmark`.

## 4. Navigation

- `navigation/MainTabs.js`: a new **`ExploreTab`** stack (`Explore` + social + venue screens) and a fourth `bottomItems` entry placed second: `{ route: 'ExploreTab', label: 'Explore', hint: 'Search lists and people', returnToRoot: false }` with Ionicons `search` / `search-outline` at 26. The Spin item's label becomes "Spin the Wheel" and its hint is dropped. Tab order in the navigator: Home, Explore, Favourites, Spin, Profile.
- Profile becomes a stack (`Profile`, `Settings`). A new `socialScreens` array, registered in all four stacks exactly like `venueScreens`: `ListScreen`, `PersonScreen`, `OwnSpotScreen`, `CustomSpotScreen`. A list or person therefore opens inside whichever section you are in, and the header's back chevron works unchanged (`NavBar` already reads the active section's nested stack, so the new Profile stack gets it for free). Add the new routes to `PARENT_TITLES` in `NavBar.js`. `FloatingTabBar` and `pressTab` are not changed; Explore and Favourites keep their place when you leave and return (no `returnToRoot`).
- `App.js` root stack native sheets (existing `bottomSheet` options): `ListDetails` (replaces `CreateCollection`), `AddToList` (replaces `ChooseCollection`), `Sharing`, `Note`, `Top4Pick`, `EditProfile`, `Report`.
- "Add a spot" search uses `DiscoveryBottomSheet` (75% height, keyboard-aware); add `closeLabel` and `testID` props to it.
- **Links**: `sznluv://list/{listId}` and `sznluv://u/{username}`; `"scheme": "sznluv"` in `app.json`; built with `expo-linking`'s `createURL` so they also work in Expo Go. `App.js` listens with `Linking.getInitialURL` + `url` events, parses with pure `services/links.js`, and stores the target in `services/pendingLink.js` (same pattern as `collectionPicker.js`); once `shown === 'home'` and navigation is ready it navigates to `ExploreTab › ListScreen/PersonScreen`. A link tapped while signed out opens after login.
- New dependency: `expo-linking` only (`npx expo install`). `expo-haptics` and `expo-blur` are already installed. Share uses React Native's built-in `Share`.

## 5. Data model

Spot reference (used in lists and Top 4):
`{ k: 'c', name }` for a catalogue spot (name is already the app-wide key) or `{ k: 'x', id, name, address?, lat?, lng? }` for a user's own spot.

| Path | Fields | Who reads / writes |
|---|---|---|
| `favourites/{uid}` | unchanged season hearts; `collections` removed by migration; `listsMigratedAt` | owner only (**fixes the open hole in `docs/FIRESTORE_OWNERSHIP_FIX.md`**) |
| `users/{uid}` | existing + `top4: { vancouver: { picks: [spotRef ≤4], public } }`, `blocked: [uid]` | owner only |
| `users/{uid}/followedLists/{listId}` | `ownerUid, title, cover, publishedAt, followedAt, lastOpenedAt` | owner only |
| `users/{uid}/followedPeople/{uid2}` | `username, avatarColor, followedAt` | owner only |
| `lists/{listId}` (private draft, always the owner's working copy) | `ownerUid, title ≤40, description ≤120, cityId, cover, items: [{ spot, note ≤140 }] ≤50, public, publishedAt, createdAt, updatedAt` | owner only |
| `publicLists/{listId}` (snapshot visitors see) | `ownerUid, ownerUsername, title, description, cityId, cover, items, spotCount, publishedAt, updatedAt, searchTerms: [string ≤120]` | any signed-in user reads; owner writes |
| `profiles/{uid}` | `username, avatarColor, bio ≤80, top4: { vancouver: [spotRef] }` (only public picks) | any signed-in user reads; owner writes. Created the first time a user makes something public or edits their profile, so nobody is discoverable by default |
| `reports/{id}` | `reporterUid, targetType, targetId, ownerUid, reason, createdAt` | create only |

- Publish = one `writeBatch`: set `publicLists/{id}` from the draft, set `lists/{id}.public/publishedAt`, merge `profiles/{uid}`. Make private = batch delete `publicLists/{id}` + update the draft. Delete = batch delete both.
- "Unpublished changes" = deep-compare of the draft's public fields against the loaded `publicLists` doc (owner view loads both). No hashes stored.
- Queries avoid composite indexes: my lists `where ownerUid == me`; a person's lists `where ownerUid == x` on `publicLists` (sorted client-side); newest lists `orderBy publishedAt desc limit 20`; people search = prefix range on `profiles.username` (`>= q`, `<= q + ''`, limit 10; usernames are already lowercase); list search = `publicLists where searchTerms array-contains <term> limit 30`.
- **List search without a search server** (`services/listSearch.js`, pure): at publish, `searchTerms` is built from the title, description, owner username, spot names and localities using the existing `normalize` / `wordForm` helpers exported from `services/spotDiscovery.js` (so "leaves", "colour", plurals match as they do on the season screens), plus prefixes (3+ letters) of the title words and username so typing "gold" finds "Golden Hour". At query time the longest query word goes to Firestore; remaining words are matched client-side against each result's terms; results are ranked title > creator > spot name > description, then newest. Capped at 120 terms and checked in rules.
- `firestore.rules` (new file in repo, you merge and deploy): owner-only for `favourites`, `users` and subcollections, `lists`; signed-in read + owner write with size checks for `publicLists` (must own the matching `lists` doc) and `profiles` (username must equal `users/{uid}.username`); create-only `reports`; existing `reviews`, `dateCounts`, `usernames` behaviour preserved. Also stop writing `email` into new `usernames` docs (`services/accounts.js`, one line; login never reads it).

## 6. Screens

### 6.0 Explore — `screens/ExploreScreen.js` (new bottom-bar slot)
Page cream `#FFF5E4`, left-aligned like Home.
1. Title **Explore** (48/700 ink) with the tan label "Lists and people" beneath, same pairing as Home's greeting and "Locations".
2. Search field: the existing `SpotSearchBar` look (48 high, `#FFF9F1`, radius 12, search glyph, clear button), placeholder "Search lists and people".
3. **Empty query**: tan label **New in Vancouver** and the newest public lists as full-width 88pt cards in their cover colour (title 22/700 ink, "by maya · 6 spots"), 20 at a time with a "Load more" text button. If you follow people, a tan label **From people you follow** sits above it with their latest lists (up to 6, read from each followed person's public lists).
4. **Typing** (2+ characters, 300ms debounce, stale responses ignored): results replace the feed. **People** first (up to 3 rows: avatar initial in their colour, username, chevron; "See all people" expands to 10), then **Lists** (same cards as the feed). The count line reuses the season screens' summary style: "4 results".
5. States: searching = small ink spinner in the field's right slot, previous results stay dimmed so nothing jumps; none = cream empty card "Nothing for 'gold'. Try a username or a word from a list's title." + "Clear search"; error = "Couldn't search. Check your connection." + Retry; no public lists at all = "No lists yet. Yours could be the first." + **Make a list** (opens Favourites › My lists).
6. Behaviour: the query and scroll position persist while the tab stays mounted; re-tapping the Explore slot scrolls to top and focuses the field (`tabPress` + `useScrollToTop`); the pill hides while the keyboard is up (existing behaviour) and results use `keyboardShouldPersistTaps="handled"` and dismiss on drag; your own lists and blocked users never appear; tapping a result pushes `ListScreen` / `PersonScreen` inside the Explore stack.

### 6.1 Favourites (the library) — `screens/Favourites.js` rewritten
Title "Favourites" (48) and the existing subtitle stay. Below: the segment pill **Saved · My lists · Following** (last choice remembered for the session).
- **Saved**: the four season tiles, now a true 2×2 grid. Opens `SeasonalFavourites` as today.
- **My lists**: first tile is a dashed-outline **New list** tile (`+`), replacing the blue Create button; then one tile per list: cover colour or season art, title (20/700, 3 lines), "6 spots", and a small lock or globe top-right. The tiny `X` delete is removed (delete moves into the list's `…` menu).
- **Following**: label **Lists** with followed list tiles (byline "by maya"; a red dot + "Updated" when `publicLists.updatedAt > lastOpenedAt`); label **People** with rows (avatar initial, username, chevron).
- Empty states (cream `#FFF9F1` card, radius 14, same shape as `SpotEmptyState`): My lists "Make a list for a plan, a mood, or a whole season." + New list; Following lists "Follow a list and it lives here, always up to date." + **Explore lists**; People "Follow someone to keep their profile close." + **Find people** (both switch to the Explore slot).
- Loading: tiles keep their place; entrance via `useItemEntrance` so refetch on focus never blanks the grid.

### 6.2 List page — `screens/ListScreen.js` (owner and visitor)
Background = cover colour. Falling-leaves style Lottie is *not* used (reserved for seasons).
1. Title (34/700 ink, centred).
2. Byline, centred: 24pt avatar + "by **username**" (opens `PersonScreen`); second line "Vancouver · 6 spots" (14/600).
3. Description (15, ≤3 lines).
4. Action row. Visitor: **Follow list** (primary, fills width) · share (48 square) · `…` (Report list, Block user). Owner: **Add a spot** (primary) · status pill **Private 🔒 / Public 🌐** (opens `Sharing`) · `…` (Edit, List details, Delete list).
5. Owner only, when public with changes: cream bar "Changes not public yet" + **Update**.
6. **Spots · Map** segment pill, only when ≥2 spots have coordinates. Map = `react-native-maps` fitted to numbered markers, mounted after the push (`useAfterTransition`); a callout tap opens the spot.
7. Spot cards (`components/SpotCard.js`, visually the existing `dateSpotCard`): heart left, name 22/700 shrink-to-fit, meta "Langley · Fall" (13/600 muted), note beneath (15, ≤3 lines), chevron right. Catalogue spots open the existing venue pages via `openVenue`; own spots open `CustomSpotScreen`.

States: loading = cream page + ink spinner, then content eases in (`useEntrance`); visitor view of a missing/private list = neutral page "This list isn't available. It may have been made private or removed." + **Back to Explore**, showing nothing of the list; empty owner list = "Add your first spot" card with the search button; a catalogue spot later removed from the app renders dimmed "No longer listed" and is skipped on the map.

**Edit mode** (owner, `…` › Edit or long-press a card): hearts are replaced by ▲▼ (disabled at the ends) and a remove button; each card shows "Add a note" / the note as a tappable line (opens `Note` sheet, 140-char counter); the action row's **Add a spot** button becomes **Done** (nothing new floats at the bottom, so it never competes with the tab pill). Rows animate with `LayoutAnimation` (skipped under Reduce Motion). Remove gives a snackbar with Undo.

### 6.3 Sheets
- **ListDetails** (create + edit; from `CreateCollectionSheet`): title (required, 40), description (optional, 120), cover picker = 7 colour circles + 4 round season thumbnails. Button "Create list" / "Save". Duplicate titles are allowed (lists have ids now).
- **AddToList** (from `ChooseCollectionSheet`): rows in each list's cover colour with a checkmark when the spot is already there; tapping toggles membership and the sheet stays open; first row "New list" (opens `ListDetails`, then adds the spot). Done closes.
- **Add a spot** (search sheet): `SpotSearchBar` over all seasons using the existing ranked search (`createSpotIndex` / `findMatchingSpots`); result rows show name, "Langley · Fall", and **Add** → **Added ✓**; a "Your spots" group lists own spots already used elsewhere; the sheet stays open for several adds; a fixed footer row "Can't find it? **Add your own spot**" carries the typed text forward.
- **Sharing**: Private → one sentence "Only you can see this list.", a **What people will see** block (spot count, every note verbatim, every own-spot address or pin), then **Make public** (disabled with "Add a spot first" when empty). On success the sheet swaps to "It's public" with **Share link** and Done. Public → "Anyone on SznLuv can open this list. It's on your profile.", **Share link**, "Revert to public version" (only with pending changes), **Make private** (danger text; inline confirm "The link stops working and it leaves followers' libraries.").
- **Note**, **Top4Pick** (Open · Replace · Move up · Move down · Remove), **EditProfile** (avatar colour, bio), **Report** (reason chips: Spam, Inappropriate, Private information, Other → "Thanks. We'll take a look.").

### 6.4 Own spot — `screens/OwnSpotScreen.js`, `screens/CustomSpotScreen.js`
"Add your own spot" on page cream: Name (required, 60) → two chips **Drop a pin · Type an address**. Pin: 220pt map with a fixed centre pin you pan under (precise, no tap-to-drop guessing), starting on Vancouver or your location if Location is on. Address: free text; when the Geoapify key is present it offers matches with the existing `findCustomOrigins` (attribution line included), otherwise it is stored as written. Valid = name + (pin or address). A same-name spot within ~15 m or with the same address in the catalogue or your spots is reused ("Matched an existing spot").
`CustomSpotScreen`: name, address or "Dropped pin", "Added by username", map, **Directions** (opens Apple/Google Maps), **Add to list**.

### 6.5 Profile — `screens/ProfileSettings.js` split
`Profile`: identity row (72pt avatar in chosen colour, username 28/700, bio, "Edit profile") → **Top 4** label with "Vancouver" at right → 2×2 tiles → dark switch row "Show Top 4 on my profile" → **Public lists** label + tiles (or "Lists you make public appear here.") → one dark row **Settings ›**. `Settings` (`screens/SettingsScreen.js`): the existing four rows and Sign Out, moved unchanged.
Top 4 tile: square, coloured by the spot's season (own spots cream with a pin glyph), large translucent rank numeral, name 17/700 (3 lines), locality. Owner sees empty slots as dashed "+ Add pick" tiles (opens the search sheet targeting Top 4); tapping a filled slot opens `Top4Pick`. Turning the switch on with own spots among the picks, or adding an own spot while public, first shows a confirm listing those locations. Removing the last pick turns the switch off.

### 6.6 Person — `screens/PersonScreen.js`
Same layout, read-only: identity row + **Follow username** / **Following ✓** button; Top 4 only if public and non-empty (visitors never see empty slots); **Lists** grid; `…` Report / Block. Blocked or missing → "This profile isn't available."

### 6.7 Vancouver page — `screens/VancouverScreen.js`
Under the Seasons card: tan label **From the community** + the 3 most followed public lists for the city, newest first among ties, live while the page is open (same 88pt cards as Explore; ranked by `publicLists.followerCount`, which each follow and unfollow moves by one in the same transaction as the follower's pointer) + "See all in Explore" (switches to the Explore slot). The section is hidden when there are no public lists, so the page never shows an empty promise. Blocked users are filtered out.

## 7. Behaviour

- **Save (heart)** — new `hooks/useSaveSpot.js`, used by the four season screens, `SpotCard`, and venue pages' list cards: catalogue spot → toggles the season favourite exactly as `toggleSavedSpot` does today, optimistically, with a snackbar "Saved to Fall favourites · **Add to list**" (opens `AddToList`) or "Removed · **Undo**". The blocking alerts and the two blue toasts are removed. Own spot (no season bucket) → opens `AddToList` directly; saving copies the location with a blank note, never the creator's note.
- **Follow list**: writes the pointer, button flips to **Following ✓**, light haptic, snackbar "Following. It's in Favourites › Following." Tap again to unfollow (snackbar Undo). Opening a followed list sets `lastOpenedAt`.
- **Follow person**: same pattern, "…in Favourites › Following › People."
- **Pruning**: on Following load each pointer is checked against `publicLists`. Definitively missing, or `publishedAt` newer than the pointer's → the pointer is deleted and a one-time line shows "‘Golden Hour’ is no longer shared." Network errors never prune.
- **Publish / update / private**: as in 6.3. Update with no newly exposed note or location publishes immediately ("Public list updated").
- **Migration** (`services/listMigration.js`): on first library load, one transaction turns each `favourites.collections` entry into a private list with a deterministic id (`{uid}_c{index}`), preserving title, colour and spot order, then removes `collections` and sets `listsMigratedAt`. Idempotent; on failure nothing changes and a retry card is shown.
- **Errors**: every write is optimistic with rollback and a snackbar "Couldn't save. Check your connection."; `Alert` is kept only for destructive confirms (delete list, block). Double-submits are guarded with the existing `submitting` ref pattern; navigation taps use `canNavigate`.
- **Limits**: 50 spots per list (Add disabled with a hint), 4 picks, text limits enforced in UI and rules.
- **Block**: adds to `users.blocked`, unfollows that person and their lists, hides their content locally.
- **Metrics**: `services/metrics.js` `track(name, props)` no-op wrapper (dev console) called at: list started, first spot added (with entry point), list followed, spot saved from a list, followed list reopened. Lets the research's four launch metrics be switched on later without touching screens.

## 8. Motion and feedback

- Screens and tiles enter with the existing `useEntrance` / `useItemEntrance` (240ms, 40ms stagger, 12pt rise).
- `components/Snackbar.js` + provider mounted in `MainTabs` inside `FloatingNavigationLayoutProvider` (survives navigation): slides 12pt + fades in 220ms, 4s (6s with an action), one at a time, polite live region. Its bottom edge is `max(24, useFloatingNavClearance())`, so it rides just above the pill and drops to the keyboard edge when the pill hides. The season screens' existing toasts already use this clearance; the snackbar replaces them.
- Heart: scale 1 → 1.2 → 1 spring on save. Follow button: 150ms cross-fade between states. `selectionAsync` haptic on save, follow, publish and segment change, iOS only, matching `FloatingTabBar`.
- All of it respects `useReduceMotion` (instant states).
- Accessibility: every control labelled; reorder and remove exposed as `accessibilityActions`; sheets focus their title (existing `focusAccessibility`); status pill reads "Private list, change sharing".

## 9. Implementation

**New**: `components/theme.js`, `SpotCard.js`, `ListTile.js`, `Snackbar.js`, `SegmentPill.js`, `EmptyCard.js`; `screens/ExploreScreen.js`, `ListScreen.js`, `PersonScreen.js`, `OwnSpotScreen.js`, `CustomSpotScreen.js`, `SettingsScreen.js`, `components/ListCard.js` (the 88pt card), `services/listSearch.js`, sheets `ListDetailsSheet.js`, `AddToListSheet.js`, `AddSpotSheet.js`, `SharingSheet.js`, `NoteSheet.js`, `Top4PickSheet.js`, `EditProfileSheet.js`, `ReportSheet.js`; `hooks/useSaveSpot.js`, `useMyLists.js`; pure CommonJS (unit-testable like `favouritesState.js`): `services/listsState.js` (add/remove/move/note, limits, exposure diff, public snapshot), `top4State.js`, `links.js`, `catalogue.js` (all seasons, `findCatalogueSpot`, `seasonOf`, `locality`), `seasonSpots.js` (winter/spring/summer data lifted out of their screens); Firestore wrappers `services/lists.js`, `follows.js`, `profiles.js`, `listMigration.js`, `moderation.js`, `pendingLink.js`, `metrics.js`; `firestore.rules`, `firebase.json` (emulators).

**Changed**: `App.js`, `app.json`, `navigation/MainTabs.js` (Explore stack and slot, Spin label, Profile stack, `socialScreens`, snackbar provider), `services/spotDiscovery.js` (export `normalize`, `wordForm`), `components/NavBar.js` (`PARENT_TITLES` only), `components/DiscoveryBottomSheet.js`, `screens/Favourites.js`, `ProfileSettings.js`, `VancouverScreen.js`, the four `*DatesScreen.js` (heart flow only), `SeasonalFavourites.js` (snackbar), `services/accounts.js`, `firebaseConfig.js` (emulator switch), `tests/renderHarness.cjs` (stubs for `Share`, `writeBatch`, `getDocs`, `expo-linking`, `expo-haptics`).

**Removed**: `ChooseCollectionSheet.js`, `CreateCollectionSheet.js`, `CustomCollectionScreen.js`, `services/collectionPicker.js`, `changeCollection` in `favouritesState.js`, and their tests.

**Order** (each step leaves the app working):
0. `firestore.rules` + emulator config; rules tests; **you deploy the rules**; `scripts/firebase-access-audit.cjs` (extended to the new collections) passes with the audit accounts.
1. Foundations: theme, catalogue, pure state modules, services, Snackbar, SpotCard, unit tests.
2. Private lists: migration, Favourites library, ListScreen (owner), ListDetails / AddToList / Note / Add-a-spot, own spots, new heart flow.
3. Public: Sharing sheet, visitor ListScreen, **Explore slot with the newest-lists feed and list search**, links, follow list, Following, unavailable state, report.
4. People: Profile split + Settings, Top 4, PersonScreen, follow person, **people search and "From people you follow" in Explore**, block, Vancouver teaser, map toggle.

## 10. Verification

- `npm test`: new unit tests for `listsState`, `top4State`, `links`, `catalogue`, migration, `listSearch` (terms built at publish, prefix and word-form matches, ranking, own and blocked results excluded); floating bar with four slots (order, labels, slot width at 320 and 402pt, Explore re-tap focuses search); Explore states (feed, results, none, error); harness screen tests for the library segments, heart → snackbar → AddToList, publish review contents, update-without-review, unavailable link, visitor never seeing empty Top 4 slots, NavBar back titles for new routes, back chevron inside the new Profile stack, snackbar position above the pill and with the keyboard up. Existing suites stay green, including the header and floating-bar tests (collection tests replaced).
- Rules: `firebase emulators:exec --only firestore "node --test tests/rules/*.test.cjs"` covering owner-only drafts, public read, cross-user write denial, size limits, report create-only.
- In the simulator, against the **Firebase emulator only** (`EXPO_PUBLIC_FIREBASE_EMULATOR=1`; `firebaseConfig.js` then uses a separately named app so the real signed-in session on the simulator is neither replaced nor written to). Run the research's journeys with two emulator accounts: (1) create "My Hottest Summer Spots", add a catalogue spot, add a note, add an own spot by pin, check the review lists the note and pin, publish, reorder, update; (2) second account opens the link, follows the list, hearts a spot into a list, returns via Favourites › Following, follows the person separately; (3) edges: one-pick public Top 4, unmatched search → own spot, make private → old link shows the unavailable page and the follow is pruned, signed-out link opens after login. Check each at iPhone 16 Pro and at 375pt width, with Reduce Motion and VoiceOver.
- No verification step signs out of, or writes to, the real account on the simulator.

## 11. Step 0 status: deploying the rules

Done in the repo: `firestore.rules`, `firebase.json` (emulator config), `tests/rules/firestore.rules.test.cjs` (11 tests, `npm run test:rules`), and new checks in `scripts/firebase-access-audit.cjs`.

Still to do, by the project owner:

1. In the Firebase console (project `sznluv` › Firestore › Rules), copy the rules that are live now into a file you keep, so you can roll back.
2. Compare them with `firestore.rules`. Anything the live rules allow that this file does not mention will be **denied** after deploy (Firestore denies by default). The file covers every path the app uses today: `users` (+ `votes`), `usernames`, `favourites`, `reviews`, `dateCounts`, plus the new `lists`, `publicLists`, `profiles`, `reports` and follow subcollections.
3. Deploy: `firebase deploy --only firestore:rules --project sznluv` (signed in to the Firebase CLI as an owner or editor of the project).
4. Confirm with the two audit accounts: `node scripts/firebase-access-audit.cjs --live --actor <audit-account.json> --other <other-audit-account.json>`. Every line must report `passed: true`.

Behaviour changes for the current app once deployed: other accounts can no longer read or edit your favourites or `users` document; reviews can only be deleted by the account whose username is on them; review edits other than a +1 upvote are refused. Nothing else changes.

## 12. Step 1 status: foundations

Built and tested; no screen uses them yet except where noted.

- Data and rules of the feature, as pure modules: `services/catalogue.js`, `seasonSpots.js`, `listsState.js`, `listSearch.js`, `top4State.js`, `links.js`, `pendingLink.js`, `metrics.js`.
- Firestore services: `services/lists.js`, `follows.js`, `profiles.js`, `moderation.js`.
- Components: `components/theme.js`, `Snackbar.js` (provider mounted in `navigation/MainTabs.js`), `SpotCard.js`.
- In use already: the winter, spring and summer screens read their spots from `services/seasonSpots.js`; signup no longer stores an email on the username reservation.
- Tests: `tests/lists.test.cjs` (27, part of `npm test`) and `tests/rules/services.test.cjs` (9, part of `npm run test:rules`), which runs the real services against the emulator under the real rules.

Two things settled while building, both different from sections 5 to 7 above:

- Timestamps on lists, follows and profiles are plain millisecond numbers (`Date.now()`), not server timestamps, so the pure modules can compare them.
- List search asks Firestore for two terms at once (`array-contains-any`: the typed word and its base form), not one.

## 13. Step 2 status: private lists

Built, tested, and walked through on an iPhone SE simulator against the local emulators.

- Favourites is now the library: **Saved** (the four seasons, two to a row) and **My lists**. The Following side arrives with step 3.
- Old collections become private lists the first time My lists (or any list sheet) is opened. Opening the app alone changes no data.
- List page in the list's colour: add a spot (search across all seasons), add your own spot (pin or address), notes, reorder, remove with Undo, list details, delete.
- The heart saves straight to the season with a snackbar offering "Add to list"; the blocking alerts and blue toasts are gone on all four season screens.
- Removed: `ChooseCollectionSheet`, `CreateCollectionSheet`, `CustomCollectionScreen`, `collectionPicker`, and the collection functions in the favourites service.

Not in this step: the Private pill only says who can see the list (publishing is step 3); the Spots · Map switch is step 4.

### Trying it without touching live data

```
npm run emulators
EXPO_PUBLIC_FIREBASE_EMULATOR=1 npx expo start --port 8082
```

Open `exp://127.0.0.1:8082` in a simulator and sign up with any made-up account. This build signs in separately from the normal one, so the real session on that device is left alone. Run it from a second terminal with its own `TMPDIR` if the normal dev server is also running.

## 14. Step 3 status: public lists, Explore, following

Built, tested, and walked through on the iPhone 16 Pro simulator against the local emulators.

- **Sharing sheet** from the Private/Public pill: what going public reveals (every note, every place you added yourself), Make public, Share link, Make private with a confirm. Each step reopens the sheet so it is always the right height.
- **Owner's list page**: a "Changes not public yet" bar with Update. Plain changes publish in one tap; a new note or own place goes through the review first.
- **Visitor's list page**: creator byline, Follow list / Following, share, report. No editing.
- **Explore**, the new second slot in the bottom bar: newest public lists and a search by title, creator, spot or town. Your own lists and blocked people are left out.
- **Favourites › Following**: followed lists, an "Updated" mark, and a line when a list is no longer shared.
- **Links**: `sznluv://list/{id}` opens the list on top of Explore; tapped while signed out, it opens after login. A missing or private list shows one neutral page.
- **Report** sheet for lists.

Left for step 4: people (profiles, Top 4, follow person, people search, block), the Vancouver teaser, and the Spots · Map switch. The creator's name on a list is not tappable until profiles exist.

## 15. Step 4 status: people

Built, tested, and spot-checked on the iPhone 16 Pro simulator against the local emulators.

- **Profile** (the header badge): avatar, username, bio, Edit profile; Top 4 with open slots, reorder and remove from each pick's menu, and a "Show Top 4 on my profile" switch that confirms any place you added yourself; your public lists; a row into **Settings**, which holds what the old profile screen had.
- **Person page**: their public picks (never empty slots), their public lists, Follow, and a menu to report or block. A blocked or missing profile shows one neutral page.
- **Explore**: search also finds people by the start of their username; lists from people you follow lead the page.
- **Favourites › Following**: a People section under the lists.
- **List page**: the creator's name opens their profile; Block is in the menu; a Spots · Map switch appears when two or more spots have a location.
- **Vancouver page**: up to three community lists and a link into Explore, shown only when there is something to show.
- **Links**: `sznluv://u/{username}` opens that person's page.

Publish-to-search was checked three ways: a screen test (publish in the sheet, another user's Explore search finds it by title, half a word, town and creator, and it disappears when made private), the emulator service test under the real rules, and by hand (search empty, publish through the app's own publish code, same search finds it).

Differences from sections 6.3 to 6.5: Top 4 picks come from the app's spots or places already in your lists (no "add your own spot" from the Top 4 sheet); a pick's actions are a native menu, not a sheet, and there is no Replace (remove, then add).

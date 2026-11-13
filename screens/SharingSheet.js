// Who can see a list. Private lists show exactly what going public would reveal before the switch;
// public lists can be shared, updated with pending changes, or made private again. Opened with { listId }.
// A list whose spots aren't all somewhere the map can pin can't go public, or push changes, until they are.
import React, { useContext, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SheetHeader from '../components/SheetHeader';
import { spotCount } from '../components/ListTile';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useMyLists from '../hooks/useMyLists';
import useMySpots from '../hooks/useMySpots';
import useSpotEntries from '../hooks/useSpotEntries';
import usePublishedList, { rememberPublished } from '../hooks/usePublishedList';
import { publishList, revertListToPublic, unpublishList } from '../services/lists';
import { exposure, hasUnpublishedChanges, newExposure, placeFromEntries, spotsOffTheMap } from '../services/listsState';
import { isMine } from '../services/customSpotsState';
import { shareList } from '../services/shareList';

const FAILED = 'Couldn’t save. Check your connection.';

export default function SharingSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, username } = useContext(AuthContext);
  const { lists, status } = useMyLists();
  const list = lists.find(candidate => candidate.id === route?.params?.listId);
  const { published, loaded, refresh } = usePublishedList(list);
  // Where every spot is, the way the owner's list page reads it.
  const mySpots = useMySpots();
  const { entries } = useSpotEntries((list?.items ?? []).map(item => item.spot), { privateSpots: mySpots, ownedDraft: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The sheet is as tall as its content when it opens and does not resize afterwards, so a step with a
  // different amount of content (just published, confirm going private) reopens the sheet for that step.
  const { listId, justPublished = false, confirmPrivate: confirmingPrivate = false } = route?.params ?? {};
  const show = step => navigation.replace('Sharing', { listId, ...step });
  const working = useRef(false);
  const close = () => navigation.goBack();

  const run = async (action, after) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      after?.();
    } catch (failure) {
      console.error('Sharing change failed:', { code: failure?.code });
      setError(failure?.code?.startsWith('list/') ? failure.message : FAILED);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const frame = children => (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Sharing" closeLabel="Close Sharing" onClose={close} />
      {children}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
  const primary = (label, onPress, { disabled = false, icon } = {}) => (
    <TouchableOpacity style={[controls.primary, styles.button, (disabled || busy) && controls.primaryDisabled]}
      onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }}>
      {!!icon && <Ionicons name={icon} size={18} color={colors.white} />}
      <Text style={controls.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
  const secondary = (label, onPress, { danger = false } = {}) => (
    <TouchableOpacity style={[controls.secondary, styles.button]} onPress={onPress} disabled={busy} accessibilityRole="button">
      <Text style={[controls.secondaryText, danger && styles.danger]}>{label}</Text>
    </TouchableOpacity>
  );

  if (!list) {
    return frame(status === 'ready' || status === 'error'
      ? <Text style={styles.body}>This list isn’t available.</Text>
      : <ActivityIndicator style={styles.loading} color={colors.ink} />);
  }

  // Spots still loading aren't judged here; publishing checks every one again before it writes.
  const offMap = spotsOffTheMap(list.items, placeFromEntries(entries));
  const blocked = offMap.length > 0;
  const offMapNote = blocked && <Reveal heading="Needs a place on the map" entries={offMap} />;

  const publish = () => run(async () => {
    rememberPublished(list.id, await publishList(user?.uid, username, list.id));
  }, () => (list.public ? refresh() : show({ justPublished: true })));

  // Spots the owner made go public with the list: where they are, their photos and details, and reviews.
  const madeHere = list.items.filter(item => isMine(item.spot, user?.uid)).length;
  const madeNote = madeHere > 0 && (
    <Text style={[styles.body, styles.madeNote]}>
      {madeHere === 1 ? 'The spot you made is' : `The ${madeHere} spots you made are`} shared too, with photos and details, and people can review {madeHere === 1 ? 'it' : 'them'}.
    </Text>
  );

  // ------------------------------------------------------------ Private: review, then make public
  if (!list.public) {
    const revealed = exposure(list);
    const empty = list.items.length === 0;
    return frame(
      <>
        <Text style={styles.status}><Ionicons name="lock-closed" size={15} color={colors.ink} />  Only you can see this list.</Text>
        <Text style={styles.label} accessibilityRole="header">What people will see</Text>
        <ScrollView style={styles.review}>
          <Text style={styles.body}>“{list.title}”, with your username and {spotCount(list.items.length)}.</Text>
          <Reveal heading="Your notes" entries={revealed.notes} none="No notes." />
          <Reveal heading="Places you added yourself" entries={revealed.locations} none="None." />
          {madeNote}
        </ScrollView>
        {offMapNote}
        <Text style={styles.hint}>
          {empty ? 'Add a spot first.'
            : blocked ? 'Fix or remove these spots to make the list public.'
              : 'Anyone on SznLuv will be able to open it, and it will show on your profile.'}
        </Text>
        {primary('Make public', publish, { disabled: empty || blocked, icon: 'globe-outline' })}
      </>,
    );
  }

  // ------------------------------------------------------------ Public
  if (!loaded) return frame(<View style={styles.waiting}><ActivityIndicator color={colors.ink} /></View>);
  const pending = hasUnpublishedChanges(list, published);
  const fresh = pending ? newExposure(list, published) : { notes: [], locations: [] };
  const share = () => shareList({ ...list, ownerUsername: username }).catch(() => {});

  if (confirmingPrivate) {
    return frame(
      <>
        <Text style={styles.label} accessibilityRole="header">Make this list private?</Text>
        <Text style={styles.body}>The link stops working and it leaves followers’ libraries. Your list and its spots stay as they are.</Text>
        {madeHere > 0 && (
          <Text style={[styles.body, styles.madeNote]}>Spots you made stop being shared unless they’re in another public list. Their reviews are kept, out of sight.</Text>
        )}
        {primary('Make private', () => run(() => unpublishList(list.id), close), { icon: 'lock-closed' })}
        {secondary('Keep it public', () => show({}))}
      </>,
    );
  }

  return frame(
    <>
      <Text style={styles.status}>
        <Ionicons name="globe-outline" size={15} color={colors.ink} />  {justPublished && !pending ? 'It’s public.' : 'Anyone on SznLuv can open this list.'} It’s on your profile.
      </Text>
      {pending && (
        <View style={styles.pending}>
          <Text style={styles.label} accessibilityRole="header">Changes not public yet</Text>
          {fresh.notes.length + fresh.locations.length > 0 ? (
            <ScrollView style={styles.review}>
              <Text style={styles.body}>Updating will also show:</Text>
              {fresh.notes.length > 0 && <Reveal heading="New notes" entries={fresh.notes} />}
              {fresh.locations.length > 0 && <Reveal heading="New places you added yourself" entries={fresh.locations} />}
              {fresh.locations.length > 0 && madeNote}
            </ScrollView>
          ) : <Text style={styles.body}>Nothing personal is added by this update.</Text>}
          {offMapNote}
          {blocked && <Text style={styles.hint}>Fix or remove these spots to update the public list.</Text>}
          {primary('Update public list', publish, { disabled: blocked })}
          {secondary('Revert to public version', () => run(() => revertListToPublic(list.id), refresh))}
        </View>
      )}
      {!pending && blocked && (
        <View style={styles.pending}>
          {offMapNote}
          <Text style={styles.hint}>Visitors still see the list as it is. Your next update will need these spots fixed or removed.</Text>
        </View>
      )}
      {!pending && primary('Share link', share, { icon: 'share-outline' })}
      {pending && secondary('Share link', share)}
      {secondary('Make private', () => show({ confirmPrivate: true }), { danger: true })}
    </>,
  );
}

function Reveal({ heading, entries, none }) {
  return (
    <View style={styles.reveal}>
      <Text style={styles.revealHeading}>{heading}</Text>
      {entries.length === 0
        ? <Text style={styles.revealNone}>{none}</Text>
        : entries.map(entry => (
          <Text key={entry.key} style={styles.revealLine}><Text style={styles.revealName}>{entry.name}</Text>: {entry.text}</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  status: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  label: { marginBottom: 6, fontSize: 16, fontWeight: '700', color: '#323232' },
  body: { fontSize: 15, lineHeight: 21, color: colors.summary },
  review: { maxHeight: 190, marginBottom: 4 },
  madeNote: { marginTop: 10 },
  reveal: { marginTop: 10 },
  revealHeading: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  revealNone: { fontSize: 15, lineHeight: 21, color: colors.muted },
  revealLine: { fontSize: 15, lineHeight: 21, color: colors.summary, marginTop: 2 },
  revealName: { fontWeight: '700' },
  hint: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.muted },
  pending: { marginBottom: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  button: { marginTop: 10, flexDirection: 'row', gap: 6 },
  danger: { color: colors.danger },
  error: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  loading: { marginVertical: 24 },
  // As tall as the public state it turns into, so the sheet opens at the right height.
  waiting: { height: 170, justifyContent: 'center' },
});

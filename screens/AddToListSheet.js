// Bottom sheet for filing a spot into your lists. Each row toggles that list; the sheet stays open
// so one spot can go into several. Opened with { spot } (a spot reference).
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SheetHeader from '../components/SheetHeader';
import { spotCount } from '../components/ListTile';
import { colors, controls } from '../components/theme';
import useMyLists from '../hooks/useMyLists';
import { spotKey } from '../services/catalogue';
import { mutateList } from '../services/lists';
import { addSpot, coverBackground, hasSpot, removeSpot } from '../services/listsState';
import { EVENTS, track } from '../services/metrics';

const ROW_HEIGHT = 64; // 56pt row + 8pt gap; the list shows four rows, then scrolls

export default function AddToListSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { lists, status, retry } = useMyLists();
  const spot = route?.params?.spot;
  const sourceListId = route?.params?.sourceListId;
  const [error, setError] = useState('');
  const busy = useRef(new Set());

  const toggle = async list => {
    if (busy.current.has(list.id)) return;
    busy.current.add(list.id);
    setError('');
    const adding = !hasSpot(list, spot);
    try {
      // Only the place is copied. A note belongs to the list it was written for.
      await mutateList(list.id, current => (adding ? addSpot(current, { ...spot }) : removeSpot(current, spotKey(spot))));
      if (adding && !list.items.length) track(EVENTS.firstSpotAdded, { entry: 'save' });
      if (adding && sourceListId) track(EVENTS.spotSavedFromList, { listId: sourceListId });
    } catch (failure) {
      console.error('Error updating list:', { code: failure?.code });
      setError(failure?.code === 'list/full' ? failure.message : 'Couldn’t save. Check your connection.');
    } finally {
      busy.current.delete(list.id);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Add to list" closeLabel="Close Add to list" onClose={() => navigation.goBack()} />
      {!!spot && <Text style={styles.subject} numberOfLines={1}>{spot.name}</Text>}

      <TouchableOpacity style={[controls.secondary, styles.newList]} accessibilityRole="button"
        onPress={() => navigation.navigate('ListDetails', { addSpot: spot })}>
        <Ionicons name="add" size={22} color={colors.ink} />
        <Text style={controls.secondaryText}>New list</Text>
      </TouchableOpacity>

      {status === 'error' ? (
        <TouchableOpacity style={styles.message} accessibilityRole="button" onPress={retry}>
          <Text style={styles.hint}>Couldn’t load your lists. Tap to try again.</Text>
        </TouchableOpacity>
      ) : status !== 'ready' ? (
        <ActivityIndicator style={styles.message} color={colors.ink} />
      ) : lists.length === 0 ? (
        <Text style={[styles.hint, styles.message]}>You don’t have any lists yet. Start one with this spot.</Text>
      ) : (
        <View style={{ height: Math.min(lists.length, 4) * ROW_HEIGHT }}>
          <ScrollView>
            {lists.map(list => {
              const included = hasSpot(list, spot);
              return (
                <TouchableOpacity key={list.id} onPress={() => toggle(list)}
                  style={[styles.row, { backgroundColor: coverBackground(list.cover) }]}
                  accessibilityRole="checkbox" accessibilityState={{ checked: included }}
                  accessibilityLabel={`${list.title}, ${spotCount(list.items.length)}`}>
                  <View style={styles.rowWords}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{list.title}</Text>
                    <Text style={styles.rowMeta}>{spotCount(list.items.length)}</Text>
                  </View>
                  <View style={[styles.check, included && styles.checked]}>
                    {included && <Ionicons name="checkmark" size={18} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity style={[controls.primary, styles.done]} accessibilityRole="button" onPress={() => navigation.goBack()}>
        <Text style={controls.primaryText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  subject: { marginTop: -12, marginBottom: 16, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.muted },
  newList: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  message: { minHeight: 56, justifyContent: 'center', marginBottom: 4 },
  hint: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  row: { height: 56, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  rowWords: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 13, fontWeight: '600', color: colors.summary },
  check: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.ink, backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  checked: { backgroundColor: colors.ink },
  error: { marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.error },
  done: { marginTop: 8 },
});

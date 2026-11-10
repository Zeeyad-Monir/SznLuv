// Up to three photos for a spot, in the editor. Each starts uploading as soon as it is picked and shows
// its progress; one that fails can be retried or removed. The first photo is the cover. Press and hold
// (or use the VoiceOver actions) to make a photo the cover, move it, replace it or remove it.
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StoragePhoto from './StoragePhoto';
import { colors } from './theme';
import { showMenu } from '../services/actionMenu';
import { PHOTO_LIMIT, pickPhotos, uploadPhoto } from '../services/spotPhotos';

const GAP = 10;
let keyCount = 0;
const newKey = () => `photo${++keyCount}`;

// The photos as the editor holds them: saved ones ({ id, path }) and new ones still on their way.
const fromRecord = saved => saved.map(photo => ({ key: photo.id, id: photo.id, path: photo.path, status: 'done' }));

export function usePhotoSlots(uid, spotId, initial = []) {
  const [photos, setPhotos] = useState(() => fromRecord(initial));
  const latest = useRef(photos);
  latest.current = photos;
  const [pickError, setPickError] = useState('');

  const update = (key, patch) => setPhotos(list => list.map(photo => (photo.key === key ? { ...photo, ...patch } : photo)));
  const start = useCallback((key, asset) => {
    update(key, { status: 'uploading', progress: 0, error: '' });
    uploadPhoto(uid, spotId, asset, { onProgress: progress => update(key, { progress }) })
      .then(({ id, path }) => update(key, { status: 'done', id, path, progress: 1 }))
      .catch(error => {
        console.error('Photo upload failed:', { code: error?.code });
        update(key, { status: 'failed', error: error?.code?.startsWith('photo/') ? error.message : 'Upload failed.' });
      });
  }, [uid, spotId]);

  const pick = async room => {
    setPickError('');
    try {
      return await pickPhotos(room);
    } catch (error) {
      console.error('Photo library unavailable:', { code: error?.code });
      setPickError('Couldn’t open your photos.');
      return [];
    }
  };

  const add = async () => {
    const assets = await pick(PHOTO_LIMIT - latest.current.length);
    const fresh = assets.map(asset => ({ key: newKey(), asset, localUri: asset.uri, status: 'uploading', progress: 0 }));
    if (!fresh.length) return;
    setPhotos(list => [...list, ...fresh].slice(0, PHOTO_LIMIT));
    fresh.forEach(photo => start(photo.key, photo.asset));
  };
  const replace = async key => {
    const [asset] = await pick(1);
    if (!asset) return;
    const fresh = { key: newKey(), asset, localUri: asset.uri, status: 'uploading', progress: 0 };
    setPhotos(list => list.map(photo => (photo.key === key ? fresh : photo)));
    start(fresh.key, asset);
  };
  const retry = key => {
    const photo = latest.current.find(candidate => candidate.key === key);
    if (photo?.asset) start(key, photo.asset);
  };
  const remove = key => setPhotos(list => list.filter(photo => photo.key !== key));
  const move = (key, to) => setPhotos(list => {
    const from = list.findIndex(photo => photo.key === key);
    if (from === -1 || to < 0 || to >= list.length || to === from) return list;
    const next = [...list];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    return next;
  });

  return {
    photos,
    pickError,
    add, replace, retry, remove, move,
    reset: saved => setPhotos(fromRecord(saved)), // For a spot that arrives after the editor opened
    uploading: photos.some(photo => photo.status === 'uploading'),
    failed: photos.some(photo => photo.status === 'failed'),
    // What the record keeps: finished photos, in order.
    saved: photos.filter(photo => photo.status === 'done').map(({ id, path }) => ({ id, path })),
  };
}

export default function PhotoSlots({ slots }) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 40 - GAP * (PHOTO_LIMIT - 1)) / PHOTO_LIMIT);
  const { photos } = slots;
  const last = photos.length - 1;

  const actionsFor = (photo, index) => [
    index > 0 && { name: 'cover', label: 'Make cover', run: () => slots.move(photo.key, 0) },
    index > 0 && { name: 'left', label: 'Move left', run: () => slots.move(photo.key, index - 1) },
    index < last && { name: 'right', label: 'Move right', run: () => slots.move(photo.key, index + 1) },
    { name: 'replace', label: 'Replace', run: () => slots.replace(photo.key) },
    { name: 'remove', label: 'Remove', run: () => slots.remove(photo.key), destructive: true },
  ].filter(Boolean);

  return (
    <View>
      <View style={styles.row}>
        {photos.map((photo, index) => {
          const actions = actionsFor(photo, index);
          const label = `Photo ${index + 1} of ${photos.length}${index === 0 ? ', cover' : ''}`
            + (photo.status === 'uploading' ? ', uploading' : photo.status === 'failed' ? ', upload failed' : '');
          return (
            <View key={photo.key} style={{ width: size, height: size }}>
              <TouchableOpacity style={styles.fill} activeOpacity={0.8} delayLongPress={300}
                accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Press and hold for photo options"
                accessibilityActions={actions.map(({ name, label: actionLabel }) => ({ name, label: actionLabel }))}
                onAccessibilityAction={({ nativeEvent }) => actions.find(action => action.name === nativeEvent.actionName)?.run()}
                onLongPress={() => showMenu({ title: `Photo ${index + 1}`, options: actions.map(({ label: actionLabel, run, destructive }) => ({ label: actionLabel, onPress: run, destructive })) })}>
                <StoragePhoto path={photo.path} localUri={photo.localUri} style={[styles.photo, { width: size, height: size }]} />
                {index === 0 && <Text style={styles.cover}>Cover</Text>}
                {photo.status === 'uploading' && (
                  <View style={styles.veil} accessibilityLiveRegion="polite">
                    <ActivityIndicator color={colors.white} />
                    <Text style={styles.veilText}>{Math.round((photo.progress ?? 0) * 100)}%</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photo.status === 'failed' && (
                <TouchableOpacity style={[styles.veil, styles.failed]} onPress={() => slots.retry(photo.key)}
                  accessibilityRole="button" accessibilityLabel={`Retry photo ${index + 1}`}>
                  <Icon name="refresh" size={22} color={colors.white} />
                  <Text style={styles.veilText}>Retry</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.remove} hitSlop={8} onPress={() => slots.remove(photo.key)}
                accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`}>
                <Icon name="close" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          );
        })}
        {photos.length < PHOTO_LIMIT && (
          <TouchableOpacity style={[styles.add, { width: size, height: size }]} onPress={slots.add}
            accessibilityRole="button" accessibilityLabel={photos.length ? 'Add another photo' : 'Add photos'}>
            <Icon name="add-a-photo" size={26} color={colors.ink} />
            <Text style={styles.addText}>{photos.length ? 'Add' : 'Add photos'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {photos.some(photo => photo.status === 'failed') && (
        <Text style={styles.problem} accessibilityRole="alert">
          {photos.find(photo => photo.status === 'failed').error} Retry it, or remove it to save without it.
        </Text>
      )}
      {!!slots.pickError && <Text style={styles.problem} accessibilityRole="alert">{slots.pickError}</Text>}
      <Text style={styles.hint}>
        Up to {PHOTO_LIMIT} photos. The first is the cover{photos.length > 1 ? '; press and hold one to move it' : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  fill: { flex: 1 },
  photo: { borderRadius: 12, overflow: 'hidden' },
  cover: {
    position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
    fontSize: 11, fontWeight: '700', color: colors.white, backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  veil: {
    ...StyleSheet.absoluteFillObject, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  failed: { backgroundColor: 'rgba(152, 45, 36, 0.75)' },
  veilText: { fontSize: 13, fontWeight: '700', color: colors.white },
  remove: {
    position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  add: {
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  addText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  problem: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  hint: { marginTop: 8, fontSize: 13, color: colors.muted },
});

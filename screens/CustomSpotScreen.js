// The page for a spot someone made, laid out like SznLuv's own spot pages: photos, name, where it is,
// what its creator wrote, a map and directions, and (while it is in a public list) reviews.
// Opened with { spot } (a reference from a list, Saved or Top 4) and optionally { addedBy } (a username).
// Its creator sees their own record, live, and can edit or delete it. Anyone else sees its public copy,
// or only its name when it isn't shared.
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Animated, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import HeartButton from '../components/HeartButton';
import ReviewSection from '../components/reviews/ReviewSection';
import { useSnackbar } from '../components/Snackbar';
import PhotoGallery from '../components/spot/PhotoGallery';
import ReadMoreText from '../components/spot/ReadMoreText';
import { colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useAfterTransition from '../hooks/useAfterTransition';
import useDeleteSpot from '../hooks/useDeleteSpot';
import useDistanceTo from '../hooks/useDistanceTo';
import useEntrance from '../hooks/useEntrance';
import useMyLists from '../hooks/useMyLists';
import useMySpots from '../hooks/useMySpots';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import useSpotReviews from '../hooks/useSpotReviews';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { describeWhere, resolveSpot } from '../services/catalogue';
import { getPublicSpot } from '../services/customSpots';
import { SPOT_SEASONS, isMine, thinFields, toRef } from '../services/customSpotsState';
import { directionsUrl } from '../services/directions';
import { getBlocked } from '../services/moderation';
import { deleteReview, reviewSource } from '../services/reviews';

const seasonNames = values => values.map(value => SPOT_SEASONS.find(season => season.value === value)?.label ?? value).join(', ');
const quoted = titles => titles.map(title => `“${title}”`).join(', ');

export default function CustomSpotScreen({ navigation, route }) {
  const { spot: given, addedBy } = route.params;
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const snackbar = useSnackbar();
  const floatingScrollStyle = useFloatingScrollStyle(styles.content);
  const mapReady = useAfterTransition();
  const entrance = useEntrance(3);
  const { byId } = useMySpots();
  const { lists: myLists } = useMyLists();
  const [favourites, setFavourites] = useFavouriteSpots();
  const { saveRef, isSaved } = useSaveSpot(favourites, setFavourites);
  const askToDelete = useDeleteSpot();

  // My own spot is read live, so an edit made a moment ago is already here.
  const mine = isMine(given, uid) || !!byId[given.id];
  const record = mine ? byId[given.id] : null;

  // Someone else's: its public copy, checked to really be theirs. undefined while loading, null when not shared.
  const [shared, setShared] = useState(undefined);
  useEffect(() => {
    if (mine) return undefined;
    let live = true;
    getPublicSpot(given.id, { fresh: true })
      .then(copy => { if (live) setShared(copy && (!given.owner || copy.ownerUid === given.owner) ? copy : null); })
      .catch(error => {
        console.error('Shared spot unavailable:', { code: error?.code });
        if (live) setShared(null);
      });
    return () => { live = false; };
  }, [given.id, given.owner, mine]);

  // Reviews by people the reader blocked stay hidden.
  const [blocked, setBlocked] = useState(null);
  useEffect(() => {
    if (!uid) return;
    getBlocked(uid).then(list => setBlocked(new Set(list))).catch(() => {});
  }, [uid]);

  const details = record ?? shared ?? null;
  const ref = details ? toRef(given.id, { ...details, ownerUid: details.ownerUid ?? given.owner }) : given;
  const spot = resolveSpot(ref);
  const isShared = mine ? (record?.publicListIds?.length ?? 0) > 0 : !!shared;
  const reviews = useSpotReviews(isShared ? reviewSource({ spotId: given.id }) : null, { hiddenUids: blocked });
  const distance = useDistanceTo(spot.latitude, spot.longitude);
  const hasPin = spot.latitude !== undefined;
  const where = describeWhere(thinFields(ref));
  const url = where ? directionsUrl({ latitude: spot.latitude, longitude: spot.longitude, address: ref.address }, Platform.OS) : null;
  const creator = mine ? null : shared?.ownerUsername ?? addedBy;
  const publicIn = mine ? myLists.filter(list => record?.publicListIds?.includes(list.id)).map(list => list.title) : [];
  const saved = isSaved(ref);

  const openDirections = () => Linking.openURL(url).catch(() => snackbar.show({ message: 'Couldn’t open Maps.' }));
  const edit = () => navigation.navigate('OwnSpotScreen', { spotId: given.id });

  const confirmDelete = () => askToDelete({ id: given.id, name: spot.name, shared: isShared }, () => navigation.goBack());

  const openMenu = () => showMenu({
    title: spot.name,
    options: mine
      ? [{ label: 'Edit spot', onPress: edit }, { label: 'Delete spot', onPress: confirmDelete, destructive: true }]
      : [{ label: 'Report spot', onPress: () => navigation.navigate('Report', { targetType: 'spot', targetId: given.id, ownerUid: shared?.ownerUid ?? given.owner ?? null, name: spot.name }) }],
  });

  // Each review: report it (someone else's), or delete it (your own, or any on your own spot).
  const reviewMenu = review => {
    const ownReview = review.uid === uid;
    showMenu({
      title: `${review.username || 'This'}’s review`,
      options: [
        !ownReview && {
          label: 'Report review',
          onPress: () => navigation.navigate('Report', { targetType: 'review', targetId: review.path, ownerUid: review.uid ?? null, name: `${review.username || 'this'}’s review` }),
        },
        (ownReview || mine) && {
          label: 'Delete review',
          destructive: true,
          onPress: () => Alert.alert('Delete this review?', 'This can’t be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteReview(review).catch(error => {
                console.error('Error deleting review:', { code: error?.code });
                snackbar.show({ message: 'Couldn’t delete. Check your connection.' });
              }),
            },
          ]),
        },
      ].filter(Boolean),
    });
  };

  const facts = [
    details?.hours && { icon: 'time-outline', label: 'Hours', value: details.hours },
    details?.cost && { icon: 'pricetag-outline', label: 'Cost', value: details.cost },
    details?.seasons?.length && { icon: 'leaf-outline', label: 'Best in', value: seasonNames(details.seasons) },
  ].filter(Boolean);

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView contentContainerStyle={floatingScrollStyle}>
        <Animated.View style={entrance[0]}>
          {details?.photos?.length ? (
            <PhotoGallery photos={details.photos} name={spot.name} />
          ) : mine && (
            <TouchableOpacity style={styles.addPhotos} onPress={edit} accessibilityRole="button" accessibilityLabel="Add photos to this spot">
              <Ionicons name="images-outline" size={26} color={colors.ink} />
              <Text style={styles.addPhotosText}>Add up to 3 photos</Text>
            </TouchableOpacity>
          )}

          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">{spot.name}</Text>
            <TouchableOpacity style={styles.more} hitSlop={8} onPress={openMenu} accessibilityRole="button" accessibilityLabel="More options">
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          {!!where && <Text style={[text.summary, styles.where]}>{where}</Text>}
          {(!!details?.category || !!distance) && (
            <Text style={[text.meta, styles.meta]}>{[details?.category, distance].filter(Boolean).join(' · ')}</Text>
          )}
          {!!creator && <Text style={[text.meta, styles.meta]}>Added by {creator}</Text>}
          {mine && (
            <View style={styles.visibility}>
              <Ionicons name={isShared ? 'globe-outline' : 'lock-closed'} size={14} color={colors.muted} />
              <Text style={[text.meta, styles.visibilityText]}>
                {isShared
                  ? `Public in ${publicIn.length ? quoted(publicIn) : 'a public list'}. People can see it and review it.`
                  : 'Only you can see this spot. Add it to a public list to share it.'}
              </Text>
            </View>
          )}
          {!mine && shared === null && (
            <Text style={[text.body, styles.notice]}>Only the name is shown: its creator isn’t sharing this spot right now.</Text>
          )}
        </Animated.View>

        <Animated.View style={entrance[1]}>
          <View style={styles.actions}>
            <View style={styles.heartBox}>
              <HeartButton saved={saved} onPress={() => saveRef(ref)} size={24} hitSlop={10}
                label={saved ? `Remove ${spot.name} from favourites` : `Save ${spot.name}`} />
            </View>
            {!!url && (
              <TouchableOpacity style={[controls.primary, styles.action]} accessibilityRole="button" onPress={openDirections}>
                <Ionicons name="navigate" size={18} color={colors.white} />
                <Text style={controls.primaryText}>Directions</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[controls.secondary, styles.action]} accessibilityRole="button"
              onPress={() => navigation.navigate('AddToList', { spot: ref })}>
              <Ionicons name="add" size={20} color={colors.ink} />
              <Text style={controls.secondaryText}>Add to list</Text>
            </TouchableOpacity>
          </View>

          {!!details?.description && (
            <View style={styles.block}>
              <ReadMoreText>{details.description}</ReadMoreText>
            </View>
          )}
          {facts.length > 0 && (
            <View style={styles.facts}>
              {facts.map(fact => (
                <View key={fact.label} style={styles.fact}>
                  <Ionicons name={fact.icon} size={18} color={colors.muted} />
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factValue}>{fact.value}</Text>
                </View>
              ))}
            </View>
          )}
          {!!details?.tips && (
            <View style={styles.block}>
              <Text style={text.sectionLabel} accessibilityRole="header">Good to know</Text>
              <Text style={[text.body, styles.tips]}>{details.tips}</Text>
            </View>
          )}
          {hasPin && (
            <View style={styles.mapFrame}>
              {mapReady && (
                <MapView style={styles.fill} initialRegion={{
                  latitude: spot.latitude, longitude: spot.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03,
                }}>
                  <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} title={spot.name} />
                </MapView>
              )}
            </View>
          )}
        </Animated.View>

        {isShared && (
          <Animated.View style={entrance[2]}>
            <ReviewSection reviews={reviews} tone="theme" title="Reviews" style={styles.reviews}
              canReview={!mine} cannotReviewText="Reviews from people who find this spot in your public lists appear here."
              emptyText={mine ? 'No reviews yet.' : 'No reviews yet. Be the first.'} onReviewMenu={reviewMenu} />
          </Animated.View>
        )}
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  addPhotos: {
    height: 120, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9A88F', backgroundColor: 'rgba(255, 249, 241, 0.6)',
  },
  addPhotosText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16 },
  title: { flex: 1, fontSize: 34, fontWeight: '700', color: colors.ink },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  where: { marginTop: 8 },
  meta: { marginTop: 4 },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  visibilityText: { flex: 1 },
  notice: { marginTop: 12, color: colors.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  heartBox: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.field, borderWidth: 1, borderColor: colors.fieldBorder,
  },
  action: { flex: 1, flexDirection: 'row', gap: 6 },
  block: { marginTop: 20 },
  tips: { marginTop: 8 },
  facts: { marginTop: 20, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 14 },
  fact: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline,
  },
  factLabel: { width: 64, fontSize: 14, fontWeight: '700', color: colors.muted },
  factValue: { flex: 1, fontSize: 15, color: colors.summary, paddingVertical: 10 },
  mapFrame: { height: 240, marginTop: 20, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E8E1D5' },
  reviews: { marginTop: 24 },
});

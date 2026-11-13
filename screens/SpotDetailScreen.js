import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyCard from '../components/EmptyCard';
import HeartButton from '../components/HeartButton';
import ReviewSection from '../components/reviews/ReviewSection';
import { useSnackbar } from '../components/Snackbar';
import PhotoGallery from '../components/spot/PhotoGallery';
import ReadMoreText from '../components/spot/ReadMoreText';
import SpotLocation from '../components/spot/SpotLocation';
import SpotWeather from '../components/spot/SpotWeather';
import { colors, controls, honey, spot as spotStyle } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import useDeleteSpot from '../hooks/useDeleteSpot';
import useDistanceTo from '../hooks/useDistanceTo';
import useEntrance from '../hooks/useEntrance';
import useMyLists from '../hooks/useMyLists';
import useMySpots from '../hooks/useMySpots';
import useSaveSpot, { useFavouriteSpots } from '../hooks/useSaveSpot';
import useSpotEntries from '../hooks/useSpotEntries';
import useSpotReviews from '../hooks/useSpotReviews';
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SCREEN_CONTENT_TOP_GAP, SignedInScreen } from '../navigation/topNavigationLayout';
import { showMenu } from '../services/actionMenu';
import { describeWhere, findCatalogueSpot, isCustomSpot, spotKey } from '../services/catalogue';
import { SPOT_LIMITS, SPOT_SEASONS } from '../services/customSpotsState';
import { directionsUrl } from '../services/directions';
import { EVENTS, track } from '../services/metrics';
import { getBlocked } from '../services/moderation';
import { deleteReview, reviewSource } from '../services/reviews';
import { hasCoordinates } from '../services/spotDiscovery';
import { findSpotByName } from '../services/spots';
import spotImages, { spotPhotoCredits } from './spotImages';

const seasonNames = values => values?.map(value => SPOT_SEASONS.find(season => season.value === value)?.label ?? value).join(', ');

export default function SpotDetailScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { spot, sourceListId } = route?.params ?? {};
  const key = JSON.stringify([user?.uid, spot && spotKey(spot), spot?.owner]);
  // Looking inside a public list is a stronger sign of interest than opening it.
  useEffect(() => {
    if (sourceListId) track(EVENTS.spotOpened, { listId: sourceListId });
  }, [sourceListId, key]);
  if (spot && isCustomSpot(spot)) {
    return <CustomSpotDetails key={key} given={spot} navigation={navigation} sourceListId={sourceListId} />;
  }
  const listed = findCatalogueSpot(spot?.name);
  const details = listed && { ...listed, ...findSpotByName(spot.name) };
  const about = details?.about ?? [];
  const photo = details && spotImages[details.name];

  return (
    <SpotPage key={key} navigation={navigation} sourceListId={sourceListId} reference={spot}
      name={details?.title ?? spot?.name} status={details ? 'ready' : 'unavailable'}
      address={details?.detailAddress ?? details?.address}
      directionsAddress={details?.placeholderAddress ? undefined : (details?.detailAddress ?? details?.address)}
      category={details?.category} creator="By SznLuv" tagline={details?.tagline}
      description={about.filter(paragraph => !paragraph.startsWith('Good to know:')).join('\n\n')}
      tips={about.find(paragraph => paragraph.startsWith('Good to know:'))?.slice('Good to know:'.length).trim()}
      bestSeason={details?.season} photos={photo ? [{ id: details.name, source: photo, credit: spotPhotoCredits[details.name] }] : []}
      latitude={details?.latitude} longitude={details?.longitude} venue
      source={details?.placeID ? reviewSource({ placeID: details.placeID }) : null} />
  );
}

function CustomSpotDetails({ given, navigation, sourceListId }) {
  const { user } = useContext(AuthContext);
  const privateSpots = useMySpots();
  const { lists } = useMyLists();
  const { entries: [entry], retry } = useSpotEntries([given], { privateSpots });
  const { ref, spot, details, status, mine } = entry;
  const shared = mine ? !!details?.publicListIds?.length : !!details;
  const publicIn = mine ? lists.filter(list => details?.publicListIds?.includes(list.id)) : [];
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    if (!shared) return undefined;
    let active = true;
    getBlocked(user?.uid).then(list => {
      if (active) setBlocked(new Set(list));
    }).catch(() => { if (active) setBlocked(new Set()); });
    return () => { active = false; };
  }, [shared, user?.uid]);

  const askToDelete = useDeleteSpot();
  const snackbar = useSnackbar();
  const edit = () => navigation.navigate('OwnSpotScreen', { spotId: ref.id });
  const report = (type, id, ownerUid, name) => navigation.navigate('Report', {
    targetType: type, targetId: id, ownerUid: ownerUid ?? null, name,
  });
  const openMenu = () => showMenu({
    title: spot.name,
    options: mine ? [
      { label: 'Edit spot', onPress: edit },
      {
        label: 'Delete spot', destructive: true,
        onPress: () => askToDelete({ id: ref.id, name: spot.name, shared }, () => navigation.goBack()),
      },
    ] : [{ label: 'Report spot', onPress: () => report('spot', ref.id, ref.owner, spot.name) }],
  });
  const reviewMenu = review => {
    const ownReview = review.uid === user?.uid;
    const name = `${review.username || 'This'}’s review`;
    showMenu({
      title: name,
      options: [
        !ownReview && { label: 'Report review', onPress: () => report('review', review.path, review.uid, name) },
        (ownReview || mine) && {
          label: 'Delete review', destructive: true,
          onPress: () => Alert.alert('Delete this review?', 'This can’t be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive',
              onPress: () => deleteReview(review).catch(() => {
                snackbar.show({ message: 'Couldn’t delete. Check your connection.' });
              }),
            },
          ]),
        },
      ].filter(Boolean),
    });
  };

  const { latitude, longitude } = spot;
  const address = details && (ref.address || (hasCoordinates(spot) ? describeWhere(ref) : ''));
  const distance = useDistanceTo(latitude, longitude);
  const visibility = mine && details && (shared
    ? `Public in ${publicIn.length ? publicIn.map(list => `“${list.title}”`).join(', ') : 'a public list'}. People can see it and review it.`
    : 'Only you can see this spot. Add it to a public list to share it.');

  return (
    <SpotPage navigation={navigation} sourceListId={sourceListId} reference={ref} status={status} retry={retry}
      name={spot.name} address={address} directionsAddress={details?.address} latitude={latitude} longitude={longitude}
      category={details?.category} distance={distance} visibility={visibility}
      creator={details && (mine ? 'Added by you' : details.ownerUsername && `Added by ${details.ownerUsername}`)}
      photos={details?.photos} onAddPhotos={mine && details && (details.photos?.length ?? 0) < SPOT_LIMITS.photos ? edit : undefined}
      onMenu={(mine && details) || (!mine && status !== 'loading') ? openMenu : undefined}
      description={details?.description} hours={details?.hours} cost={details?.cost}
      bestSeason={seasonNames(details?.seasons)} tips={details?.tips}
      source={shared && blocked ? reviewSource({ spotId: ref.id }) : null}
      hiddenUids={blocked} canReview={!mine} onReviewMenu={reviewMenu}
      unavailableCopy={!mine ? 'Only the name is shown. Its creator isn’t sharing this spot right now.' : undefined}
      allowNameOnlyActions={!mine && status === 'unavailable'} />
  );
}

function SpotPage({
  navigation, sourceListId, reference, status, retry, name, address, directionsAddress, category, creator, distance, visibility,
  photos, onAddPhotos, onMenu, tagline, description, hours, cost, bestSeason, tips, latitude, longitude, venue,
  source, hiddenUids, canReview = true, onReviewMenu, unavailableCopy, allowNameOnlyActions,
}) {
  const snackbar = useSnackbar();
  const scrollStyle = useFloatingScrollStyle(styles.content);
  const entrance = useEntrance(3);
  const [favourites, setFavourites] = useFavouriteSpots();
  const { saveRef, isSaved, addToList } = useSaveSpot(favourites, setFavourites, { sourceListId });
  const reviews = useSpotReviews(source, { hiddenUids });
  const ready = status === 'ready';
  const hasPin = hasCoordinates({ latitude, longitude });
  const url = ready ? directionsUrl({ latitude, longitude, address: directionsAddress }, Platform.OS) : null;
  const saved = reference && isSaved(reference);
  const facts = [['Hours', hours], ['Cost', cost], ['Best season', bestSeason]].filter(([, value]) => value);

  return (
    <SignedInScreen style={styles.container}>
      <ScrollView contentContainerStyle={scrollStyle} keyboardShouldPersistTaps="handled">
        <Animated.View style={entrance[0]}>
          {!!name && (
            <View style={styles.titleRow}>
              {/* Balances the menu button so the title sits in the true centre. */}
              {!!onMenu && <View style={styles.more} accessible={false} />}
              <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {name}
              </Text>
              {!!onMenu && (
                <TouchableOpacity style={styles.more} onPress={onMenu} accessibilityRole="button" accessibilityLabel="More options">
                  <Ionicons name="ellipsis-horizontal" size={22} color={honey.ink} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {ready && (
            <>
              {!!address && <Text style={[spotStyle.label, styles.meta]}>{address}</Text>}
              {!!(category || distance) && <Text style={[spotStyle.meta, styles.meta]}>{[category, distance].filter(Boolean).join(' · ')}</Text>}
              {!!creator && <Text style={[spotStyle.meta, styles.meta]}>{creator}</Text>}
              {!!visibility && <Text style={[spotStyle.meta, styles.meta]}>{visibility}</Text>}
              <View style={styles.photos}>
                <PhotoGallery photos={photos} name={name} />
                {!!onAddPhotos && (
                  <TouchableOpacity style={[controls.secondary, styles.light, styles.addPhotos]} onPress={onAddPhotos} accessibilityRole="button">
                    <Text style={[controls.secondaryText, styles.lightText]}>Add photos</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </Animated.View>
        {status === 'loading' && <ActivityIndicator style={styles.status} size="large" color={honey.ink} accessibilityLabel="Loading spot" />}
        {status === 'error' && (
          <EmptyCard style={styles.status} icon="cloud-off" title="Couldn’t open this spot"
            text="Check your connection and try again." actionLabel="Try again" onAction={retry} />
        )}
        {status === 'unavailable' && (
          <EmptyCard style={styles.status} icon="lock-outline" title="This spot isn’t available"
            text={unavailableCopy} actionLabel="Go back" onAction={() => navigation.goBack()} />
        )}
        {(ready || allowNameOnlyActions) && (
          <Animated.View style={entrance[1]}>
            <View style={styles.actions}>
              <HeartButton style={styles.heartBox} saved={saved} size={24} hitSlop={0}
                label={saved ? `Remove ${name} from favourites` : `Save ${name}`} onPress={() => saveRef(reference)} />
              {!!url && (
                <TouchableOpacity style={[controls.primary, styles.dark, styles.action]} accessibilityRole="button"
                  onPress={() => Linking.openURL(url).catch(() => snackbar.show({ message: 'Couldn’t open Maps.' }))}>
                  <Ionicons name="navigate" size={17} color={honey.onAccent} />
                  <Text style={[controls.primaryText, styles.darkText, styles.actionText]}>Directions</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[controls.secondary, styles.light, styles.action]} accessibilityRole="button" onPress={() => addToList(reference)}>
                <Ionicons name="add" size={18} color={honey.ink} />
                <Text style={[controls.secondaryText, styles.lightText, styles.actionText]}>Add to list</Text>
              </TouchableOpacity>
            </View>
            {!!(tagline || description) && (
              <View style={spotStyle.section}>
                <Text style={spotStyle.heading} accessibilityRole="header">About</Text>
                {!!tagline && <Text style={spotStyle.label}>{tagline}</Text>}
                {!!description && <ReadMoreText style={spotStyle.body}>{description}</ReadMoreText>}
              </View>
            )}
            {facts.length > 0 && (
              <View style={spotStyle.section}>
                {facts.map(([label, value]) => (
                  <View key={label} style={styles.fact}>
                    <Text style={spotStyle.label}>{label}</Text>
                    <Text style={spotStyle.body}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!tips && (
              <View style={spotStyle.section}>
                <Text style={spotStyle.heading} accessibilityRole="header">Good to know</Text>
                <Text style={spotStyle.body}>{tips}</Text>
              </View>
            )}
            {(hasPin || !!address) && <SpotLocation name={name} address={address} latitude={latitude} longitude={longitude} previewRoute={venue} />}
            {hasPin && <SpotWeather key={`${latitude},${longitude}`} latitude={latitude} longitude={longitude} />}
          </Animated.View>
        )}
        {!!source && (
          <Animated.View style={entrance[2]}>
            <ReviewSection reviews={reviews} tone="theme" title="Reviews" style={styles.reviews} canReview={canReview}
              cannotReviewText="Reviews from people who find this spot in your public lists appear here."
              emptyText={canReview ? 'No reviews yet. Be the first.' : 'No reviews yet.'} onReviewMenu={onReviewMenu} />
          </Animated.View>
        )}
      </ScrollView>
    </SignedInScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: honey.page },
  content: { paddingHorizontal: 20, paddingTop: SCREEN_CONTENT_TOP_GAP, paddingBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, fontSize: 32, fontWeight: '800', color: honey.ink, textAlign: 'center', letterSpacing: -0.4 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta: { marginTop: 4, textAlign: 'center' },
  photos: { marginTop: 16 },
  addPhotos: { marginTop: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 8, marginTop: 20 },
  heartBox: {
    width: 48, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: honey.card, borderWidth: 1, borderColor: honey.cardBorder,
  },
  light: { backgroundColor: honey.card, borderColor: honey.cardBorder },
  lightText: { color: honey.ink },
  dark: { backgroundColor: honey.accent },
  darkText: { color: honey.onAccent },
  action: { flexGrow: 1, flexBasis: 98, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 8 },
  actionText: { flexShrink: 1 },
  fact: { paddingVertical: 2, gap: 2 },
  reviews: { marginTop: 16 },
  status: { marginTop: 16 },
});

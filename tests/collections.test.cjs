// Collections the app makes (each city's seasons): their IDs, the hearts on the season cards, and My lists.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, quiet, flush, pinNames, pinNamed, mapPreview } = require('./support.cjs');
const { COLLECTIONS, collectionById, collectionsForCity, collectionSpots, collectionCaption } = require('../services/collections');
const { catalogueSections } = require('../services/catalogue');
const { fallSpotNames } = require('../services/spots');
const { springCategories, springSpotNames, summerCategories, winterCategories, winterSpotNames } = require('../services/seasonSpots');

const summerSpotNames = summerCategories.flatMap(category => category.spots.map(spot => spot.name));

const kept = h => [...h.documents.keys()].filter(key => key.startsWith('users/audit/savedCollections/'));

// ---------------------------------------------------------------- The registry (pure)

test('collections: one per season per city, with IDs that include the city', () => {
  assert.deepEqual(collectionsForCity('vancouver').map(collection => collection.id),
    ['vancouver-fall', 'vancouver-winter', 'vancouver-spring', 'vancouver-summer']);
  assert.equal(new Set(COLLECTIONS.map(collection => collection.id)).size, COLLECTIONS.length);
  assert.deepEqual(collectionById('vancouver-fall'), {
    id: 'vancouver-fall', cityId: 'vancouver', kind: 'season', key: 'fall', title: 'Fall', season: 'Fall', screen: 'FallDatesScreen',
  });
  assert.equal(collectionById('toronto-fall'), undefined);
  assert.deepEqual(collectionsForCity('nowhere'), []);
});

test('collections: spots are read live from the catalogue, never copied', () => {
  const fall = catalogueSections.find(section => section.title === 'Fall').spots;
  assert.deepEqual(collectionSpots('vancouver-fall').map(spot => spot.name), fall.map(spot => spot.name));
  assert.equal(collectionSpots('vancouver-fall').length, fallSpotNames.length);
  assert.deepEqual(collectionSpots('gone'), []);
  assert.equal(collectionCaption('vancouver-fall'), `Vancouver · ${fallSpotNames.length} spots`);
  assert.equal(collectionCaption('gone'), '');
});

test('season cards count catalogue spots even when Firestore has old placeholder counts', async () => {
  const h = createHarness({
    documents: { 'dateCounts/spring': { count: 4 }, 'dateCounts/summer': { count: 3 } },
  });
  const screen = await mount(h, 'screens/SeasonsScreen.js');
  for (const { id, title } of collectionsForCity('vancouver')) {
    const cover = screen.button(`${title} Season - View Active Date Ideas`);
    assert.ok(cover);
    assert.deepEqual(cover.findAllByType('Text').map(node => node.children.join('')),
      [title, `${collectionSpots(id).length} Active Ideas`]);
  }
  await act(async () => screen.renderer.unmount());
});

test('Winter browses, maps and opens all fifty complete spot pages', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/WinterDatesScreen.js');
  const spots = winterCategories.flatMap(category => category.spots);
  assert.equal(spots.length, 50);
  assert.deepEqual(winterSpotNames, spots.map(spot => spot.name));
  assert.equal(collectionCaption('vancouver-winter'), 'Vancouver · 50 spots');
  assert.deepEqual(winterCategories.map(category => category.spots.length), [4, 14, 6, 5, 13, 8]);
  const { default: photos, spotPhotoCredits: credits } = h.load('screens/spotImages.js');
  for (const spot of spots) {
    assert.ok(photos[spot.name] && credits[spot.name]?.licenseUrl, spot.name);
    assert.ok(spot.websiteUrl && spot.hours && spot.cost && spot.searchTags.length, spot.name);
    assert.ok(screen.button(`View details for ${spot.name}`), spot.name);
  }

  await screen.press('Map');
  assert.deepEqual(pinNames(screen), winterSpotNames);
  await screen.press('Filter spots');
  await screen.press('Winter Shows');
  await screen.press('Apply Filters');
  const shows = winterCategories.find(category => category.title === 'Winter Shows').spots;
  assert.deepEqual(pinNames(screen), shows.map(spot => spot.name));

  const show = shows.find(spot => spot.name === 'Gateway Theatre Holiday Musical');
  await act(async () => pinNamed(screen, show.name).props.onPress());
  await act(async () => mapPreview(screen).props.onPress());
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { spot: { k: 'c', name: show.name } }]);
  const detail = await mount(h, 'screens/SpotDetailScreen.js', { params: h.navigations.at(-1)[1] });
  assert.ok(detail.texts().includes(show.hours));
  assert.ok(detail.texts().includes(show.cost));
  await detail.press('Official website');
  assert.deepEqual(h.calls.at(-1), ['openURL', show.websiteUrl]);
  await detail.press('Tickets & booking');
  assert.deepEqual(h.calls.at(-1), ['openURL', show.bookingUrl]);
  await detail.press('Directions');
  assert.match(h.calls.at(-1)[1], /49\.16734%2C-123\.14713/);
  await act(async () => { detail.renderer.unmount(); screen.renderer.unmount(); });
});

for (const [season, categories, expectedNames, categorySizes] of [
  ['Spring', springCategories, springSpotNames, [11, 8, 9, 18, 4]],
  ['Summer', summerCategories, summerSpotNames, [4, 2, 4]],
]) {
  test(`${season} cards, category filters and map open complete venue records`, async () => {
    const h = createHarness();
    const key = season.toLowerCase();
    const screen = await mount(h, `screens/${season}DatesScreen.js`);
    const spots = collectionSpots(`vancouver-${key}`);
    const count = categorySizes.reduce((total, size) => total + size, 0);
    assert.equal(collectionCaption(`vancouver-${key}`), `Vancouver · ${count} spots`);
    assert.deepEqual(categories.map(category => category.spots.length), categorySizes);
    assert.deepEqual(spots.map(spot => spot.name), expectedNames);
    assert.equal(new Set(spots.map(spot => spot.placeID)).size, count);
    assert.ok(!spots.some(spot => spot.placeholderAddress));

    const { default: photos, spotPhotoCredits: credits } = h.load('screens/spotImages.js');
    for (const spot of spots) {
      assert.ok(existsSync(photos[spot.name]), spot.name);
      assert.match(String(photos[spot.name]), new RegExp(`Seasonal/${key}/.+\\.jpg$`));
      assert.ok(credits[spot.name]?.licenseUrl && credits[spot.name]?.sourceUrl, spot.name);
      const card = screen.button(`View details for ${spot.name}`);
      assert.ok(card?.findAllByType('Image').some(image => image.props.source === photos[spot.name]), spot.name);
    }

    await screen.press('Map');
    for (const category of categories) {
      await screen.press('Filter spots');
      await screen.press(category.title);
      await screen.press('Apply Filters');
      assert.deepEqual(pinNames(screen), category.spots.map(spot => spot.name));
      await screen.press('Clear filters');
    }
    assert.deepEqual(pinNames(screen), expectedNames);

    for (const spot of spots) {
      const pin = pinNamed(screen, spot.name);
      assert.deepEqual(pin.props.coordinate, { latitude: spot.latitude, longitude: spot.longitude });
      await act(async () => pin.props.onPress());
      await act(async () => mapPreview(screen).props.onPress());
      const [route, params] = h.navigations.at(-1);
      assert.equal(route, 'SpotDetailScreen');
      assert.deepEqual(params, { spot: { k: 'c', name: spot.name } });
      const detail = await mount(h, 'screens/SpotDetailScreen.js', { params });
      assert.ok(detail.texts().includes(spot.title));
      assert.ok(detail.texts().includes(spot.hours));
      assert.ok(detail.texts().includes(spot.cost));
      assert.ok(detail.all('Image').some(image => image.props.source === photos[spot.name]));
      await detail.press('Official website');
      assert.deepEqual(h.calls.at(-1), ['openURL', spot.websiteUrl]);
      if (spot.bookingUrl) {
        await detail.press('Tickets & booking');
        assert.deepEqual(h.calls.at(-1), ['openURL', spot.bookingUrl]);
      }
      await detail.press('Directions');
      assert.ok(h.calls.at(-1)[1].endsWith(encodeURIComponent(`${spot.latitude},${spot.longitude}`)));
      await act(async () => detail.renderer.unmount());
    }
    await act(async () => screen.renderer.unmount());
  });
}

test('every catalogue spot with real data has the same detail fields as the Winter template', () => {
  const { catalogueSpots, findCatalogueSpot } = require('../services/catalogue');
  const { findSpotByName } = require('../services/spots');
  const spots = catalogueSpots.filter(spot => !spot.placeholderAddress)
    .map(spot => ({ ...findCatalogueSpot(spot.name), ...findSpotByName(spot.name) }));
  assert.equal(spots.length, fallSpotNames.length + winterSpotNames.length + springSpotNames.length + summerSpotNames.length);
  for (const spot of spots) {
    assert.ok(spot.tagline && spot.hours && spot.cost && spot.websiteUrl, spot.name);
    assert.equal(spot.about.length, 3, spot.name);
    assert.deepEqual(spot.about.map(paragraph => paragraph.startsWith('Good to know:')), [false, false, true], spot.name);
  }
});

test('Fall spot pages show hours, cost and visit links like Winter', async () => {
  const { findSpotByName } = require('../services/spots');
  const h = createHarness();
  for (const name of ['Aldor Family Farm', 'Fright Nights at Playland', 'Stanley Park']) {
    const spot = findSpotByName(name);
    const detail = await mount(h, 'screens/SpotDetailScreen.js', { params: { spot: { k: 'c', name } } });
    const texts = detail.texts();
    for (const text of ['Hours', spot.hours, 'Cost', spot.cost, 'Best season', 'Fall', 'Good to know']) assert.ok(texts.includes(text), `${name}: ${text}`);
    assert.ok(texts.includes(spot.about[2].slice('Good to know:'.length).trim()), name);
    assert.ok(!texts.includes('N/A'), name);
    await detail.press('Official website');
    assert.deepEqual(h.calls.at(-1), ['openURL', spot.websiteUrl]);
    if (spot.bookingUrl) {
      await detail.press('Tickets & booking');
      assert.deepEqual(h.calls.at(-1), ['openURL', spot.bookingUrl]);
    }
    await act(async () => detail.renderer.unmount());
  }
});

// ---------------------------------------------------------------- Hearts on the season cards

test('season card heart keeps the whole collection, without opening it or filling its spots\' hearts', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/SeasonsScreen.js');
  await screen.press('Save Fall collection to My lists');
  assert.deepEqual(h.navigations, [], 'the heart never opens the season');
  const saved = h.documents.get('users/audit/savedCollections/vancouver-fall');
  assert.equal(saved.collectionId, 'vancouver-fall');
  assert.equal(saved.cityId, 'vancouver');
  assert.equal(h.documents.get('favourites/audit'), undefined, 'no spot is saved on its own');
  assert.ok(screen.button('Remove Fall collection from My lists'), 'the heart fills');
  assert.ok(h.calls.some(([name]) => name === 'selectionHaptic'));
  assert.deepEqual(screen.snackbar(), ['Fall saved to My lists', 'View']);
  await screen.press('View');
  assert.deepEqual(h.navigations.at(-1), ['FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } }]);

  // The card itself still opens the season.
  await screen.press('Fall Season - View Active Date Ideas');
  assert.deepEqual(h.navigations.at(-1), ['FallDatesScreen']);

  await screen.press('Remove Fall collection from My lists');
  assert.deepEqual(kept(h), []);
  assert.deepEqual(screen.snackbar(), ['Removed Fall from My lists', 'Undo']);
  await screen.press('Undo');
  assert.deepEqual(kept(h), ['users/audit/savedCollections/vancouver-fall']);
});

test('season card hearts are independent, and rapid taps never make a second entry', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/SeasonsScreen.js');
  const heart = screen.button('Save Winter collection to My lists');
  await act(async () => { heart.props.onPress(); heart.props.onPress(); heart.props.onPress(); });
  await flush();
  assert.deepEqual(kept(h), ['users/audit/savedCollections/vancouver-winter'], 'taps while saving are ignored');
  assert.ok(screen.button('Save Fall collection to My lists'), 'other seasons are untouched');
  assert.ok(screen.button('Remove Winter collection from My lists'));
});

test('a failed collection save puts the heart back and says so', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } }, writeError: 'unavailable' });
  await quiet(async () => {
    const screen = await mount(h, 'screens/SeasonsScreen.js');
    await screen.press('Save Spring collection to My lists');
    assert.ok(screen.button('Save Spring collection to My lists'), 'the heart is empty again');
    assert.deepEqual(screen.snackbar(), ['Couldn’t save. Check your connection.']);
    assert.deepEqual(kept(h), []);
  });
});

// ---------------------------------------------------------------- My lists

test('My lists shows kept collections apart from lists, opens them, and can let them go', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit' },
    'users/audit/savedCollections/vancouver-summer': { collectionId: 'vancouver-summer', cityId: 'vancouver', savedAt: 2 },
    'users/audit/savedCollections/vancouver-fall': { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 1 },
    'users/audit/savedCollections/retired-thing': { collectionId: 'retired-thing', cityId: 'vancouver', savedAt: 3 },
  } });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'lists' } });
  const texts = screen.texts();
  assert.ok(texts.includes('Collections'), texts.join(' | '));
  const fallTile = `Fall, Vancouver · ${fallSpotNames.length} spots`;
  assert.ok(screen.button(fallTile));
  assert.ok(screen.button('Summer, Vancouver · 10 spots'));
  assert.ok(texts.indexOf('Fall') < texts.indexOf('Summer'), 'oldest first');
  assert.ok(!texts.join(' ').includes('retired'), 'a collection the app no longer makes is left out');
  assert.ok(texts.includes('No lists yet'), 'lists keep their own empty state');

  await screen.press(fallTile);
  assert.deepEqual(h.navigations.at(-1), ['FallDatesScreen']);

  await screen.press('Remove Summer collection from My lists');
  assert.equal(h.documents.get('users/audit/savedCollections/vancouver-summer'), undefined);
  assert.equal(screen.button('Summer, Vancouver · 10 spots'), undefined);
  assert.deepEqual(screen.snackbar(), ['Removed Summer from My lists', 'Undo']);
});

test('My lists with no lists and no collections suggests both ways to fill it', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'lists' } });
  assert.ok(screen.texts().includes('Make a list for a plan, a mood, or a whole season. Or tap the heart on a season to keep it here.'));
  assert.ok(!screen.texts().includes('Collections'));
});

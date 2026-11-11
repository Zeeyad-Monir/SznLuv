// Regions, viewports and pin clustering for the Map tab. Pure math over plain objects, so it is unit-tested
// without a map. Plain CommonJS.
//
// A region is what react-native-maps uses: { latitude, longitude, latitudeDelta, longitudeDelta }, the
// centre and how many degrees the view spans.
const { hasCoordinates } = require('./spotDiscovery');

const KM_PER_DEGREE_LATITUDE = 110.574;
const KM_PER_DEGREE_LONGITUDE = 111.32; // at the equator
const MAX_LATITUDE_SPAN = 170;
const MAX_LONGITUDE_SPAN = 360;
const TILE = 256;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const wrapLongitude = longitude => ((((longitude + 180) % 360) + 360) % 360) - 180;

function validRegion(region) {
  return hasCoordinates(region)
    && Number.isFinite(region.latitudeDelta) && region.latitudeDelta > 0 && region.latitudeDelta <= 180
    && Number.isFinite(region.longitudeDelta) && region.longitudeDelta > 0 && region.longitudeDelta <= 360;
}

// The region that shows `radiusKm` either side of a point across the screen's narrow side.
// `aspect` is the map's height divided by its width.
function regionAround(centre, radiusKm, aspect = 1) {
  const narrowKm = radiusKm * 2;
  const tall = Math.max(aspect, 0.01) >= 1;
  const widthKm = tall ? narrowKm : narrowKm / aspect;
  const heightKm = tall ? narrowKm * aspect : narrowKm;
  const shrink = Math.max(0.01, Math.cos(centre.latitude * Math.PI / 180));
  return {
    latitude: centre.latitude,
    longitude: centre.longitude,
    latitudeDelta: clamp(heightKm / KM_PER_DEGREE_LATITUDE, 0.0005, MAX_LATITUDE_SPAN),
    longitudeDelta: clamp(widthKm / (KM_PER_DEGREE_LONGITUDE * shrink), 0.0005, MAX_LONGITUDE_SPAN),
  };
}

// The smallest region holding every point, with a margin, or null when there are none.
function regionFor(points, margin = 1.4) {
  const placed = points.filter(hasCoordinates);
  if (!placed.length) return null;
  const latitudes = placed.map(point => point.latitude), longitudes = placed.map(point => point.longitude);
  const south = Math.min(...latitudes), north = Math.max(...latitudes);
  const west = Math.min(...longitudes), east = Math.max(...longitudes);
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: clamp((north - south) * margin, 0.02, MAX_LATITUDE_SPAN),
    longitudeDelta: clamp((east - west) * margin, 0.02, MAX_LONGITUDE_SPAN),
  };
}

// The edges of a region, grown by `pad` (0.25 = a quarter of the view on every side) so pins just
// off-screen are ready before they are panned in.
function regionBounds(region, pad = 0) {
  const halfHeight = region.latitudeDelta * (0.5 + pad), halfWidth = region.longitudeDelta * (0.5 + pad);
  return {
    south: Math.max(-90, region.latitude - halfHeight),
    north: Math.min(90, region.latitude + halfHeight),
    west: region.longitude - halfWidth,
    east: region.longitude + halfWidth,
    everywhere: halfWidth >= 180,
  };
}

function inBounds(point, bounds) {
  if (point.latitude < bounds.south || point.latitude > bounds.north) return false;
  if (bounds.everywhere) return true;
  // A view across the 180th meridian has a west edge "greater" than its east edge once wrapped.
  const west = wrapLongitude(bounds.west), east = wrapLongitude(bounds.east);
  return west <= east ? point.longitude >= west && point.longitude <= east
    : point.longitude >= west || point.longitude <= east;
}

const spotsInRegion = (spots, region, pad = 0.25) => {
  const bounds = regionBounds(region, pad);
  return spots.filter(spot => hasCoordinates(spot) && inBounds(spot, bounds));
};

// Web-map zoom level for a region drawn `width` points wide.
const zoomOf = (region, width) => Math.log2((360 * width) / (region.longitudeDelta * TILE));

// The whole world as a unit square, so a distance in screen points means the same everywhere on screen.
function project({ latitude, longitude }) {
  const sine = clamp(Math.sin(latitude * Math.PI / 180), -0.9999, 0.9999);
  return { x: longitude / 360 + 0.5, y: 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI) };
}
function unproject({ x, y }) {
  return {
    latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI,
    longitude: (x - 0.5) * 360,
  };
}

const DEFAULT_CLUSTERING = { radius: 46, maxZoom: 15 };

// Groups pins that would sit on top of each other at this zoom. Returns, in a stable order,
// { type: 'spot', spot } and { type: 'cluster', id, count, latitude, longitude, spots }.
// The grid depends only on the whole-number zoom, so clusters hold still while the map is dragged.
// `pinnedKey` (the open preview's spot) is never folded into a cluster.
function clusterSpots(spots, region, { width, radius = DEFAULT_CLUSTERING.radius, maxZoom = DEFAULT_CLUSTERING.maxZoom, pinnedKey } = {}) {
  const placed = spots.filter(hasCoordinates);
  const single = spot => ({ type: 'spot', spot });
  if (!validRegion(region) || !(width > 0)) return placed.map(single);
  const zoom = Math.floor(zoomOf(region, width));
  if (zoom >= maxZoom) return placed.map(single);

  const reach = radius / (TILE * 2 ** zoom); // the clustering radius, in unit-square terms
  const points = placed.map(spot => ({ spot, ...project(spot) })).sort((a, b) => (a.spot.key < b.spot.key ? -1 : a.spot.key > b.spot.key ? 1 : 0));
  const cellOf = point => `${Math.floor(point.x / reach)}:${Math.floor(point.y / reach)}`;
  const grid = new Map();
  for (const point of points) {
    if (point.spot.key === pinnedKey) continue;
    const cell = cellOf(point);
    if (!grid.has(cell)) grid.set(cell, []);
    grid.get(cell).push(point);
  }

  const taken = new Set();
  const items = [];
  for (const point of points) {
    if (taken.has(point)) continue;
    taken.add(point);
    if (point.spot.key === pinnedKey) { items.push(single(point.spot)); continue; }
    const column = Math.floor(point.x / reach), row = Math.floor(point.y / reach);
    const members = [point];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of grid.get(`${column + dx}:${row + dy}`) ?? []) {
          if (taken.has(other) || Math.hypot(other.x - point.x, other.y - point.y) > reach) continue;
          taken.add(other);
          members.push(other);
        }
      }
    }
    if (members.length === 1) { items.push(single(point.spot)); continue; }
    const centre = unproject({
      x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
      y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
    });
    items.push({
      type: 'cluster', id: `cluster:${point.spot.key}:${members.length}`, count: members.length,
      latitude: centre.latitude, longitude: centre.longitude, spots: members.map(member => member.spot),
    });
  }
  return items;
}

// The region after sliding the view by a number of screen points (positive dx shows more to the right,
// positive dy more below). `size` is the map's size on screen.
function shiftRegion(region, dx, dy, { width, height }) {
  return {
    ...region,
    latitude: clamp(region.latitude - dy * (region.latitudeDelta / height), -85, 85),
    longitude: wrapLongitude(region.longitude + dx * (region.longitudeDelta / width)),
  };
}

// How far to slide the view so a card of `card` size, floating `gap` above the pin at `point`, sits inside
// `frame` ({ top, bottom, left, right } in screen points). { dx: 0, dy: 0 } when it already does.
function nudgeIntoFrame(point, card, frame, gap = 0) {
  const left = point.x - card.width / 2, right = point.x + card.width / 2;
  const top = point.y - gap - card.height, bottom = point.y + gap;
  const dx = left < frame.left ? left - frame.left : right > frame.right ? right - frame.right : 0;
  const dy = top < frame.top ? top - frame.top : bottom > frame.bottom ? bottom - frame.bottom : 0;
  return { dx, dy };
}

module.exports = {
  validRegion, regionAround, regionFor, regionBounds, inBounds, spotsInRegion, zoomOf,
  clusterSpots, shiftRegion, nudgeIntoFrame, wrapLongitude,
};

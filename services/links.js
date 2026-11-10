// Links to a list or a person: sznluv://list/{id} and sznluv://u/{username}.
// In Expo Go the same paths arrive as exp://host/--/list/{id}. Pure, for unit tests.
const LIST_ID = /^[A-Za-z0-9_-]{1,64}$/;
const USERNAME = /^[a-z0-9_.-]{3,40}$/;

const linkPath = target => (target.type === 'list' ? `list/${target.listId}` : `u/${target.username}`);

// Returns { type: 'list', listId } or { type: 'person', username }, or null for anything else.
function parseLink(url) {
  if (typeof url !== 'string') return null;
  const withoutQuery = url.split(/[?#]/)[0];
  const marker = withoutQuery.indexOf('/--/');
  const path = marker !== -1
    ? withoutQuery.slice(marker + 4)
    : withoutQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const [kind, value, ...rest] = path.split('/').filter(Boolean);
  if (rest.length || !value) return null;
  if (kind === 'list' && LIST_ID.test(value)) return { type: 'list', listId: value };
  if (kind === 'u' && USERNAME.test(value.toLowerCase())) return { type: 'person', username: value.toLowerCase() };
  return null;
}

// The text handed to the system share sheet. The creator's name is in it so the list can still be
// found from Explore when a messaging app doesn't make the link tappable.
function shareMessage(list, url) {
  return `“${list.title}”, a SznLuv list by ${list.ownerUsername}\n${url}`;
}

module.exports = { linkPath, parseLink, shareMessage };

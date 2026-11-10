function toggleFavourite(data, name, entry) {
  const next = { ...data };
  if (next[name]?.isFavourite) delete next[name];
  else next[name] = entry;
  return next;
}
function removeFavourite(data, name) {
  const next = { ...data };
  delete next[name];
  return next;
}
module.exports = { toggleFavourite, removeFavourite };

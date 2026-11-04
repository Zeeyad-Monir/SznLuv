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
function changeCollection(data, action) {
  const collections = (data.collections || []).map(col => ({ ...col, dates: [...(col.dates || [])] }));
  const index = collections.findIndex(col => col.title === action.title);
  if (action.type === 'create') {
    if (collections.some(col => col.title.toLowerCase() === action.title.toLowerCase())) throw new Error('Title already exists.');
    collections.push({ title: action.title, color: action.color, dates: [] });
  } else if (action.type === 'delete') {
    return { ...data, collections: collections.filter(col => col.title !== action.title) };
  } else {
    if (index === -1) throw new Error('Collection not found.');
    if (action.type === 'add') {
      if (!collections[index].dates.includes(action.spot)) collections[index].dates.push(action.spot);
    } else if (action.type === 'remove') {
      collections[index].dates = collections[index].dates.filter(spot => spot !== action.spot);
    } else throw new Error('Unknown collection operation.');
  }
  return { ...data, collections };
}
module.exports = { toggleFavourite, removeFavourite, changeCollection };

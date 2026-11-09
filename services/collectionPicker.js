// Route params can't carry functions, so the screen that opened the picker leaves its callback here.
let pendingPick = null;

function openCollectionPicker(navigation, collections, onPick) {
  pendingPick = onPick;
  navigation.navigate('ChooseCollection', { collections });
}

function deliverCollectionPick(title) {
  const onPick = pendingPick;
  pendingPick = null;
  if (onPick) onPick(title);
}

module.exports = { openCollectionPicker, deliverCollectionPick };

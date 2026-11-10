// Sheets live above the tabs. Closing one and opening a page inside a tab is a single move:
// pop back to the tabs, naming the page to show there. (Two separate actions leave the sheet up.)
export function closeSheetAndOpenList(navigation, listId) {
  navigation.popTo('Main', {
    screen: 'FavouritesTab',
    params: { screen: 'ListScreen', params: { listId } },
  });
}

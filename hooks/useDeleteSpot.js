// Deleting a spot you made, the deliberate way: a confirmation that says what else changes (the lists it
// leaves, any public list that would be left empty and so made private, its photos and reviews), then
// services/customSpots.js deleteSpot. Used by the spot page and the editor.
import { useCallback, useContext } from 'react';
import { Alert } from 'react-native';
import { useSnackbar } from '../components/Snackbar';
import { AuthContext } from '../contexts/AuthContext';
import useMyLists from './useMyLists';
import { deleteSpot, deletionEffects } from '../services/customSpots';

const quoted = titles => titles.map(title => `“${title}”`).join(', ');

export default function useDeleteSpot() {
  const { user } = useContext(AuthContext);
  const { lists } = useMyLists();
  const snackbar = useSnackbar();

  // `onDeleted` leaves the page; it runs only once the spot is gone.
  return useCallback(({ id, name, shared }, onDeleted) => {
    const { holding, emptied } = deletionEffects(id, lists);
    const message = [
      holding.length ? `It will be removed from ${quoted(holding.map(list => list.title))}, and from Saved.` : 'It will be removed from Saved.',
      emptied.length ? `${quoted(emptied.map(list => list.title))} would be left empty, so ${emptied.length === 1 ? 'it' : 'they'} will be made private.` : '',
      `Its photos${shared ? ' and reviews' : ''} will be deleted. This can’t be undone.`,
    ].filter(Boolean).join(' ');
    Alert.alert(`Delete ${name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete spot',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSpot(user?.uid, id);
            onDeleted();
            snackbar.show({ message: `Deleted ${name}` });
          } catch (error) {
            console.error('Error deleting spot:', { code: error?.code });
            snackbar.show({ message: 'Couldn’t delete. Check your connection.' });
          }
        },
      },
    ]);
  }, [lists, snackbar, user]);
}

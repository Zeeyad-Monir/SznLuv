// "From the community": the three most followed public lists for this city, with a way into Explore
// for the rest. Live while the screen is focused, so a list that overtakes another moves into the top three.
// Renders nothing until there is something to show, so the page never carries an empty promise.
import React, { useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { subscribeCommunityCandidates } from '../services/lists';
import { mostFollowed } from '../services/listSearch';
import { getBlocked } from '../services/moderation';
import { DEFAULT_CITY } from '../services/catalogue';
import { canNavigate } from '../services/venueNavigation';
import ListCard from './ListCard';
import { colors } from './theme';

const SHOWN = 3;
// Extra candidates so that hiding your own, blocked people's and other cities' lists still leaves three.
const CANDIDATES = 20;

export default function CommunityTeaser({ cityId = DEFAULT_CITY.id }) {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [lists, setLists] = useState([]);

  useFocusEffect(useCallback(() => {
    let active = true, blocked = [], candidates = [];
    const show = () => { if (active) setLists(mostFollowed(candidates, { cityId, viewerUid: uid, blocked, count: SHOWN })); };
    getBlocked(uid).then(next => { blocked = next; show(); }).catch(() => {});
    const stop = subscribeCommunityCandidates(CANDIDATES, next => { candidates = next; show(); },
      () => {}); // The page works without it
    return () => { active = false; stop(); };
  }, [uid, cityId]));

  if (!lists.length) return null;
  return (
    <View>
      <Text style={styles.label} accessibilityRole="header">From the community</Text>
      {lists.map(list => (
        <ListCard key={list.id} list={list}
          onPress={() => { if (canNavigate(navigation)) navigation.navigate('ListScreen', { listId: list.id }); }} />
      ))}
      <TouchableOpacity style={styles.more} accessibilityRole="button"
        onPress={() => navigation.navigate('ExploreTab', { screen: 'Explore' })}>
        <Text style={styles.moreText}>See all in Explore</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 8, marginBottom: 12, fontSize: 18, fontWeight: '700', color: colors.label },
  more: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '700', color: colors.ink, textDecorationLine: 'underline' },
});

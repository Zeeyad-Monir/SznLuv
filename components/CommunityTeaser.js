// "From the community": the three newest public lists, with a way into Explore for the rest.
// Renders nothing until there is something to show, so the page never carries an empty promise.
import React, { useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { getNewestPublicLists } from '../services/lists';
import { visibleLists } from '../services/listSearch';
import { getBlocked } from '../services/moderation';
import { canNavigate } from '../services/venueNavigation';
import ListCard from './ListCard';
import { colors } from './theme';

const SHOWN = 3;

export default function CommunityTeaser() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const uid = user?.uid;
  const [lists, setLists] = useState([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    // A few extra are fetched so that hiding your own and blocked people's lists still leaves three.
    Promise.all([getNewestPublicLists({ count: SHOWN * 3 }), getBlocked(uid)])
      .then(([newest, blocked]) => { if (active) setLists(visibleLists(newest, { viewerUid: uid, blocked }).slice(0, SHOWN)); })
      .catch(() => {}); // The page works without it
    return () => { active = false; };
  }, [uid]));

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

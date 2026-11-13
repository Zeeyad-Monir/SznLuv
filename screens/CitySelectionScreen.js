// Where a person chooses their city. The same screen serves two routes:
//  - ChooseCity: required before the app opens, for a new account or one from before cities were chosen.
//    It is the only screen there is until a city is saved, so there is no way round it.
//  - CitySelection: opened from the city in Home's header, to switch city later.
// Tapping a card only selects it. The button saves the choice to the person's profile; nothing is taken
// as chosen until that save succeeds.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import CityCard from '../components/CityCard';
import EmptyCard from '../components/EmptyCard';
import { GUTTER, colors, controls, text } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { logout } from '../firebaseConfig';
import useEntrance from '../hooks/useEntrance';
import { activeCities } from '../services/catalogue';
import { isNewAccount } from '../services/cityPreference';
import { firebaseErrorMessage } from '../services/firebaseErrors';

const SAVE_FAILED = "Couldn't save your city. Check your connection and try again.";

function wording({ required, welcome, unavailableCity }) {
  if (!required) {
    return { title: 'Explore another city', body: 'Choose where to explore. Your favourites and lists stay with you.' };
  }
  if (unavailableCity) {
    return {
      title: 'Choose your city',
      body: `${unavailableCity.name} isn't available right now. Select where you'd like to keep exploring SznLuv.`,
    };
  }
  return welcome
    ? { title: 'Where should we explore?', body: 'Choose a city to discover spots, collections, and experiences near you.' }
    : { title: 'Choose your city', body: "Select where you'd like to start exploring SznLuv." };
}

export default function CitySelectionScreen({ navigation, route }) {
  const required = route.name === 'ChooseCity';
  const { user } = useContext(AuthContext);
  const { city, chosen, unavailableCity, changeCity } = useCity();
  const insets = useSafeAreaInsets();
  const entrance = useEntrance(2);
  const cities = activeCities();
  const currentId = !required && chosen ? city?.id : null;
  // Nothing is chosen for a person the first time: the city is theirs to pick, even with one on offer.
  const [selectedId, setSelectedId] = useState(currentId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const selected = cities.find(candidate => candidate.id === selectedId);
  const keeping = !!selected && selected.id === currentId;
  const { title, body } = wording({ required, welcome: isNewAccount(user?.metadata?.creationTime), unavailableCity });

  const confirm = async () => {
    if (!selected || busy) return;
    if (keeping) {
      navigation.goBack();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changeCity(selected.id);
      // The app is still open underneath on the old city's pages, so it starts again from Home.
      // When the choice was required, saving it is what opens the app: there is nothing to go back to.
      if (!required) navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
    } catch (failure) {
      console.error('City save failed:', { code: failure?.code });
      if (mounted.current) {
        setError(SAVE_FAILED);
        setBusy(false);
      }
    }
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await logout(); }
    catch (failure) {
      if (mounted.current) {
        setError(firebaseErrorMessage(failure));
        setBusy(false);
      }
    }
  };

  const buttonLabel = !selected ? 'Choose a city' : keeping ? `Keep ${selected.name}` : `Explore ${selected.name}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {!required && (
        <BackButton style={styles.back} onPress={() => navigation.goBack()} label="Back" tintColor={colors.ink} iconSize={28}
          disabled={busy} />
      )}
      <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical={false}>
        <Animated.View style={entrance[0]}>
          <Text style={[text.heroTitle, styles.title]} accessibilityRole="header">{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </Animated.View>
        <Animated.View style={[styles.cities, entrance[1]]} accessibilityRole="radiogroup">
          {cities.map(candidate => (
            <CityCard key={candidate.id} city={candidate} selected={candidate.id === selectedId}
              current={candidate.id === currentId} disabled={busy}
              onPress={() => { setSelectedId(candidate.id); setError(''); }} />
          ))}
          {cities.length === 0 && (
            <EmptyCard icon="location-off" title="No cities yet" text="SznLuv isn't available in any city right now. Please check back soon." />
          )}
          {!required && cities.length === 1 && <Text style={styles.note}>More cities are on the way.</Text>}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {cities.length > 0 && (
          <TouchableOpacity style={[controls.primary, styles.confirm, (!selected || busy) && controls.primaryDisabled]}
            onPress={confirm} disabled={!selected || busy} accessibilityRole="button"
            accessibilityLabel={busy ? 'Saving your city' : buttonLabel}
            accessibilityState={{ disabled: !selected || busy, busy }}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={controls.primaryText}>{buttonLabel}</Text>}
          </TouchableOpacity>
        )}
        {required && (
          <TouchableOpacity style={styles.signOut} onPress={signOut} disabled={busy} accessibilityRole="button">
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  back: { marginLeft: GUTTER - 16 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 24 },
  title: { marginBottom: 10 },
  body: { fontSize: 16, lineHeight: 23, color: colors.muted },
  cities: { marginTop: 28, gap: 16 },
  note: { marginTop: 4, fontSize: 14, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, gap: 6 },
  error: { fontSize: 15, lineHeight: 21, color: colors.error, textAlign: 'center', marginBottom: 6 },
  confirm: { minHeight: 54 },
  signOut: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});

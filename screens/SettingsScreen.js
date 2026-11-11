import React, { useContext, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { GUTTER, colors, text } from '../components/theme';
import { logout } from '../firebaseConfig';
import { SettingsContext } from './SettingsContext';

const trackColor = { false: '#A9A9A9', true: '#D9E5B6' };

function SettingsSection({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

function SettingsAction({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.row} accessibilityRole="button" onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.white} />
    </TouchableOpacity>
  );
}

function SettingsSwitch({ label, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch accessibilityLabel={label} trackColor={trackColor} thumbColor={colors.white}
        ios_backgroundColor={trackColor.false} value={value} onValueChange={onValueChange} />
    </View>
  );
}

function confirmSignOut() {
  Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign Out', style: 'destructive',
      onPress: async () => {
        try {
          await logout();
          Alert.alert('Signed Out', 'You have been signed out successfully.');
        } catch (error) {
          console.error('Error signing out:', { code: error?.code });
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      },
    },
  ], { cancelable: true });
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isLocationEnabled, toggleLocationServices } = useContext(SettingsContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} tintColor={colors.ink} iconSize={28} />
        <Text style={styles.title} accessibilityRole="header">Settings</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SettingsSection title="Account & Security">
          <SettingsAction label="Account Settings" onPress={() => Alert.alert('Info', 'Account Settings feature coming soon.')} />
          <SettingsAction label="Change Password" onPress={() => Alert.alert('Info', 'Change Password feature coming soon.')} />
        </SettingsSection>
        <SettingsSection title="Privacy">
          <SettingsSwitch label="Allow Location Services" value={isLocationEnabled} onValueChange={toggleLocationServices} />
        </SettingsSection>
        <SettingsSection title="Notifications">
          <SettingsSwitch label="Allow Notifications" value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
          <Text style={text.meta}>Notification delivery isn’t available yet.</Text>
        </SettingsSection>
        <TouchableOpacity style={styles.signOut} accessibilityRole="button" onPress={confirmSignOut}>
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.profile },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: GUTTER, paddingVertical: 8 },
  title: { flex: 1, fontSize: 29, fontWeight: '700', color: colors.ink },
  content: { gap: 24, paddingHorizontal: GUTTER, paddingTop: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.muted },
  row: {
    minHeight: 50, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: colors.darkRow,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.white },
  signOut: { minHeight: 50, padding: 12, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  signOutLabel: { color: colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

// Bottom sheet for reporting a list or a person. Opened with { targetType, targetId, ownerUid, name }.
import React, { useContext, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetHeader from '../components/SheetHeader';
import { colors, controls } from '../components/theme';
import { AuthContext } from '../contexts/AuthContext';
import { REPORT_REASONS, report } from '../services/moderation';

export default function ReportSheet({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const { targetType, targetId, ownerUid, name } = route?.params ?? {};
  const [reason, setReason] = useState(null);
  const [state, setState] = useState('choosing'); // choosing | sending | sent
  const [error, setError] = useState('');
  const sending = useRef(false);

  const send = async () => {
    if (sending.current || !reason) return;
    sending.current = true;
    setState('sending');
    setError('');
    try {
      await report(user?.uid, { targetType, targetId, ownerUid, reason });
      setState('sent');
    } catch (failure) {
      console.error('Report failed:', { code: failure?.code });
      setError('Couldn’t send. Check your connection.');
      sending.current = false;
      setState('choosing');
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title="Report" closeLabel="Close Report" onClose={() => navigation.goBack()} />
      {state === 'sent' ? (
        <>
          <Text style={styles.body} accessibilityRole="alert">Thanks. We’ll take a look.</Text>
          <TouchableOpacity style={[controls.primary, styles.button]} accessibilityRole="button" onPress={() => navigation.goBack()}>
            <Text style={controls.primaryText}>Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.body}>What’s wrong with {targetType === 'person' ? name : `“${name}”`}?</Text>
          <View style={styles.reasons}>
            {REPORT_REASONS.map(option => {
              const selected = option === reason;
              return (
                <TouchableOpacity key={option} style={[styles.reason, selected && styles.reasonSelected]}
                  accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setReason(option)}>
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <TouchableOpacity style={[controls.primary, styles.button, (!reason || state === 'sending') && controls.primaryDisabled]}
            disabled={!reason || state === 'sending'} accessibilityRole="button"
            accessibilityState={{ disabled: !reason || state === 'sending' }} onPress={send}>
            <Text style={controls.primaryText}>Send report</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized by its content, not flex: the sheet's height is fitted to this view.
  sheet: { width: '100%', backgroundColor: '#fff', paddingHorizontal: 20 },
  body: { fontSize: 16, lineHeight: 22, color: colors.summary },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reason: {
    minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#DDD5CC', backgroundColor: colors.field,
  },
  reasonSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  reasonText: { color: '#36322E', fontSize: 14, fontWeight: '500' },
  reasonTextSelected: { color: colors.white },
  error: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.error },
  button: { marginTop: 16 },
});

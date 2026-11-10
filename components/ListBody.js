import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import EmptyCard from './EmptyCard';
import ListMap, { mappable } from './ListMap';
import SegmentPill from './SegmentPill';
import SpotCard from './SpotCard';
import { colors, text } from './theme';

const VIEWS = [{ value: 'spots', label: 'Spots' }, { value: 'map', label: 'Map' }];

export default function ListBody({
  sections, view, onViewChange, onOpen, isSaved, onSave, empty, editing, editProps, retry, sectionTitleStyle,
}) {
  const entries = sections.flatMap(section => section.entries);
  const showingMap = view === 'map' && !editing;
  const points = showingMap ? mappable(entries) : [];
  const loading = showingMap && entries.some(entry => entry.status === 'loading');
  const failed = showingMap && entries.some(entry => entry.status === 'error');

  return (
    <>
      {!editing && <SegmentPill options={VIEWS} value={view} onChange={onViewChange} style={styles.views} />}
      {showingMap ? (
        <>
          {points.length > 0 && points.length < entries.length && (
            <Text style={[text.summary, styles.status]} accessibilityLiveRegion="polite">
              {points.length} of {entries.length} spots on the map
            </Text>
          )}
          {loading && (
            <View style={styles.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.ink} />
              <Text style={text.body}>Checking locations…</Text>
            </View>
          )}
          {failed && (
            <EmptyCard icon="cloud-off" title="Couldn’t check some locations"
              text="Check your connection and try again." actionLabel="Try again" onAction={retry} />
          )}
          {!points.length && !loading && !failed && (
            <EmptyCard icon="location-off" title="No locations to map"
              text="Spots with a pin will appear here." actionLabel="Back to Spots" onAction={() => onViewChange('spots')} />
          )}
          {points.length > 0 && <ListMap points={points} onOpen={onOpen} />}
        </>
      ) : (
        <>
          {entries.length === 0 && empty}
          {sections.map(({ title, entries: group }, sectionIndex) => (
            <View key={title ?? sectionIndex}>
              {!!title && <Text style={sectionTitleStyle} accessibilityRole="header">{title}</Text>}
              {group.map((entry, index) => (
                <SpotCard key={entry.spot.key} spot={entry.spot} note={entry.note}
                  thumbnail={entry.details?.photos?.[0]} saved={isSaved(entry.ref)}
                  onToggleSave={() => onSave(entry.ref)} onPress={() => onOpen(entry.ref)}
                  editing={editing} {...editProps?.(entry, index)} />
              ))}
            </View>
          ))}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  views: { marginBottom: 16, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  status: { marginVertical: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
});

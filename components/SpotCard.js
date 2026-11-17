// The cream spot card from the season screens, for lists: heart, name, where it is, an optional note.
// In edit mode the heart gives way to move and remove controls and the note becomes tappable.
// `style` can recolour the card for one page. `variant="saved"` is the Saved pages' own look (ivory, a thin
// edge, more room inside); every other page gets the default, which that variant never changes.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Art from './Art';
import HeartButton from './HeartButton';
import StoragePhoto from './StoragePhoto';
import SpotName from './SpotName';
import { cardShadow, colors, text } from './theme';
import spotThumbs from '../screens/spotThumbs';

// Custom spots supply an authorized Storage photo. Catalogue spots use the small copy of their bundled photo.
export default function SpotCard({
  spot, note, saved = false, thumbnail, onPress, onToggleSave, onLongPress, style, variant,
  editing = false, canMoveUp = false, canMoveDown = false, onMoveUp, onMoveDown, onRemove, onNotePress,
}) {
  const disabled = spot.missing;
  const look = variant === 'saved' ? savedLook : null;
  const hasHeart = !editing && !!onToggleSave && !disabled;
  const bundledPhoto = !spot.own && Object.hasOwn(spotThumbs, spot.name) && spotThumbs[spot.name];
  const toggleSave = () => onToggleSave?.();

  const actions = editing
    ? [
      canMoveUp && { name: 'moveUp', label: 'Move up' },
      canMoveDown && { name: 'moveDown', label: 'Move down' },
      { name: 'remove', label: 'Remove from list' },
    ].filter(Boolean)
    : onToggleSave ? [{ name: 'save', label: saved ? 'Remove from favourites' : 'Save spot' }] : [];
  const runAction = ({ nativeEvent }) => ({
    moveUp: onMoveUp, moveDown: onMoveDown, remove: onRemove, save: toggleSave,
  })[nativeEvent.actionName]?.();

  return (
    <View style={[styles.card, look?.card, style, disabled && styles.cardMissing]}>
      {hasHeart && (
        <HeartButton style={[styles.heart, look?.heart]} saved={saved} onPress={toggleSave} hitSlop={0}
          size={look?.heartSize} color={look?.heartColor}
          label={saved ? `Remove ${spot.name} from favourites` : `Save ${spot.name}`} />
      )}
      <TouchableOpacity
        style={[
          styles.content, look?.content, !editing && !note && !look && styles.fixed,
          hasHeart && styles.withHeart, hasHeart && look?.withHeart,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled || editing}
        accessibilityRole="button"
        accessibilityLabel={disabled ? `${spot.name}, no longer listed` : `View details for ${spot.name}`}
        accessibilityActions={actions}
        onAccessibilityAction={runAction}
      >
        {bundledPhoto
          ? <Art source={bundledPhoto} style={[styles.thumb, look?.thumb]} />
          : <StoragePhoto key={thumbnail?.path} path={thumbnail?.path} style={[styles.thumb, look?.thumb]} placeholderIcon="place" />}
        <View style={styles.words}>
          <SpotName style={look?.name ?? text.cardName} numberOfLines={look ? 2 : 1}>{spot.name}</SpotName>
          {!!spot.meta && <Text style={[text.meta, styles.meta, look?.meta]} numberOfLines={1}>{spot.meta}</Text>}
          {!editing && !!note && <Text style={[text.body, styles.note]} numberOfLines={3}>{note}</Text>}
        </View>

        {!editing && !disabled && (
          <Icon name="chevron-right" size={look ? 22 : 18} color={look ? colors.spotMeta : '#000'} style={[styles.chevron, look?.chevron]} />
        )}
      </TouchableOpacity>

      {editing && (
        <View style={styles.editing}>
          <TouchableOpacity style={styles.noteButton} onPress={onNotePress} accessibilityRole="button"
            accessibilityLabel={note ? `Edit note for ${spot.name}` : `Add a note for ${spot.name}`}>
            <Text style={[text.body, !note && styles.notePlaceholder]} numberOfLines={2}>{note || 'Add a note'}</Text>
          </TouchableOpacity>
          <View style={styles.tools}>
            <ToolButton icon="arrow-upward" label={`Move ${spot.name} up`} onPress={onMoveUp} disabled={!canMoveUp} />
            <ToolButton icon="arrow-downward" label={`Move ${spot.name} down`} onPress={onMoveDown} disabled={!canMoveDown} />
            <ToolButton icon="remove-circle-outline" label={`Remove ${spot.name}`} onPress={onRemove} color={colors.danger} />
          </View>
        </View>
      )}
    </View>
  );
}

function ToolButton({ icon, label, onPress, disabled = false, color = colors.ink }) {
  return (
    <TouchableOpacity style={styles.tool} onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}>
      <Icon name={icon} size={22} color={disabled ? '#B9B1A7' : color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 16, ...cardShadow },
  cardMissing: { opacity: 0.55 },
  // Padding is on the touchable, so the whole card responds and not just its middle.
  content: { minHeight: 80, padding: 12, flexDirection: 'row', alignItems: 'center' },
  // Every plain card is the same height, however long its name is.
  fixed: { height: 80 },
  withHeart: { paddingLeft: 50 },
  heart: { width: 44, height: 44, position: 'absolute', zIndex: 1, top: 18, left: 4, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10, marginRight: 12, overflow: 'hidden' },
  words: { flex: 1 },
  meta: { marginTop: 2 },
  note: { marginTop: 6 },
  chevron: { marginLeft: 16 },
  editing: {
    flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  noteButton: { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 6, paddingRight: 8 },
  notePlaceholder: { color: colors.muted, textDecorationLine: 'underline' },
  tools: { flexDirection: 'row' },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

// The Saved pages' card. The page there is plain cream, so the card is lighter than it and edged, with a faint
// warm shadow. A long name takes a second line, and larger text sizes make the card taller instead of clipping.
const savedLook = {
  heartSize: 22,
  heartColor: colors.savedHeart,
  ...StyleSheet.create({
    card: {
      backgroundColor: colors.savedCard, borderRadius: 16, borderWidth: 1, borderColor: colors.savedCardBorder,
      shadowColor: '#5A3E22', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 1,
    },
    // 88 points holds a two-line name and its place, so short and long names make cards of one height.
    content: { minHeight: 88, paddingVertical: 12, paddingRight: 12 },
    withHeart: { paddingLeft: 54 },
    // Still a 44-point target, centred however tall the card grows.
    heart: { top: '50%', marginTop: -22, left: 6 },
    thumb: { width: 56, height: 56, borderRadius: 12, marginRight: 14 },
    name: { fontSize: 18, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2, color: colors.spotInk },
    meta: { marginTop: 2, fontSize: 14, lineHeight: 18, fontWeight: '500', color: colors.spotMeta },
    chevron: { marginLeft: 10 },
  }),
};

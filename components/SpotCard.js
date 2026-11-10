// The cream spot card from the season screens, for lists: heart, name, where it is, an optional note.
// In edit mode the heart gives way to move and remove controls and the note becomes tappable.
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeartButton from './HeartButton';
import StoragePhoto from './StoragePhoto';
import { cardShadow, colors, text } from './theme';
import spotImages from '../screens/spotImages';

// Custom spots supply an authorized Storage photo. Catalogue spots use their bundled photo.
export default function SpotCard({
  spot, note, saved = false, thumbnail, onPress, onToggleSave, onLongPress,
  editing = false, canMoveUp = false, canMoveDown = false, onMoveUp, onMoveDown, onRemove, onNotePress,
}) {
  const disabled = spot.missing;
  const bundledPhoto = !spot.own && Object.hasOwn(spotImages, spot.name) && spotImages[spot.name];
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
    <View style={[styles.card, disabled && styles.cardMissing]}>
      {!editing && onToggleSave && !disabled && (
        <HeartButton style={styles.heart} saved={saved} onPress={toggleSave} hitSlop={0}
          label={saved ? `Remove ${spot.name} from favourites` : `Save ${spot.name}`} />
      )}
      <TouchableOpacity
        style={[styles.content, !editing && !note && styles.fixed, !editing && onToggleSave && !disabled && styles.withHeart]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled || editing}
        accessibilityRole="button"
        accessibilityLabel={disabled ? `${spot.name}, no longer listed` : `View details for ${spot.name}`}
        accessibilityActions={actions}
        onAccessibilityAction={runAction}
      >
        {bundledPhoto
          ? <Image source={bundledPhoto} style={styles.thumb} resizeMode="cover" accessible={false} />
          : <StoragePhoto key={thumbnail?.path} path={thumbnail?.path} style={styles.thumb} placeholderIcon="place" />}
        <View style={styles.words}>
          <Text style={text.cardName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} ellipsizeMode="tail">
            {spot.name}
          </Text>
          {!!spot.meta && <Text style={[text.meta, styles.meta]} numberOfLines={1}>{spot.meta}</Text>}
          {!editing && !!note && <Text style={[text.body, styles.note]} numberOfLines={3}>{note}</Text>}
        </View>

        {!editing && !disabled && <Icon name="chevron-right" size={18} color="#000" style={styles.chevron} />}
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

import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useThemeStore } from '@/store/themeStore';
import { deleteProgressPhoto, ProgressPhotoCategory } from '@/services/progressPhotos';

const PRIMARY = '#84c440';

type RouteParams = {
  photoId: string;
  signedUrl?: string | null;
  storagePath: string;
  photoDate: string;
  category: ProgressPhotoCategory;
  note?: string | null;
  createdAt?: string;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgressPhotoDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RouteParams;
  const { isDark } = useThemeStore();
  const [deleting, setDeleting] = useState(false);

  const colors = {
    background: isDark ? '#030303' : '#FAFBFC',
    text: isDark ? '#FFFFFF' : '#161A1D',
    muted: isDark ? 'rgba(255,255,255,0.54)' : 'rgba(22,26,29,0.56)',
    panel: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.78)',
    border: isDark ? 'rgba(132,196,64,0.18)' : 'rgba(61,140,82,0.16)',
  };

  const confirmDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete photo?', 'This removes the photo from your private journal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteProgressPhoto({ id: params.photoId, storage_path: params.storagePath });
            navigation.goBack();
          } catch {
            Alert.alert('Delete failed', 'The photo could not be deleted. Please try again.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['rgba(132,196,64,0.18)', 'transparent'] : ['rgba(132,196,64,0.12)', 'transparent']}
        style={styles.ambient}
      />
      <ScreenHeader
        title="PROGRESS PHOTO"
        rightElement={
          <TouchableOpacity style={styles.deleteIconButton} onPress={confirmDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#FF6B6B" /> : <Trash2 size={18} color="#FF6B6B" />}
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        <View style={[styles.imagePanel, { borderColor: colors.border, backgroundColor: colors.panel }]}>
          {params.signedUrl ? (
            <Image source={{ uri: params.signedUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.missingImage}>
              <Text style={[styles.missingText, { color: colors.muted }]}>Photo link expired. Pull to refresh from the gallery.</Text>
            </View>
          )}
        </View>

        <View style={[styles.metaPanel, { borderColor: colors.border, backgroundColor: colors.panel }]}>
          <View style={styles.metaTopRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Date</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(params.photoDate)}</Text>
            </View>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{params.category.toUpperCase()}</Text>
            </View>
          </View>

          {params.note ? (
            <View style={styles.noteBlock}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Note</Text>
              <Text style={[styles.noteText, { color: colors.text }]}>{params.note}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambient: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 300,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.22)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 104,
    paddingBottom: 110,
  },
  imagePanel: {
    flex: 1,
    minHeight: 360,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  missingImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  metaPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
  },
  metaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 18,
    marginTop: 5,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(132,196,64,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(132,196,64,0.32)',
  },
  categoryText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 11,
    color: PRIMARY,
  },
  noteBlock: {
    marginTop: 18,
  },
  noteText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
});

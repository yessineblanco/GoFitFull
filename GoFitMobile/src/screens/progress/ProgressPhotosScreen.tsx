import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Camera, ChevronRight, ImagePlus, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import {
  addProgressPhoto,
  listProgressPhotos,
  ProgressPhoto,
  ProgressPhotoCategory,
} from '@/services/progressPhotos';

const PRIMARY = '#84c440';
const CATEGORIES: Array<{ key: ProgressPhotoCategory; label: string }> = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
  { key: 'other', label: 'Other' },
];
const FILTERS: Array<'all' | ProgressPhotoCategory> = ['all', 'front', 'side', 'back', 'other'];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonth(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Progress';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function validatePhotoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export default function ProgressPhotosScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | ProgressPhotoCategory>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<ProgressPhotoCategory>('front');
  const [photoDate, setPhotoDate] = useState(todayString());
  const [note, setNote] = useState('');

  const colors = {
    background: isDark ? '#030303' : '#FAFBFC',
    text: isDark ? '#FFFFFF' : '#161A1D',
    muted: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(22,26,29,0.55)',
    panel: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.78)',
    border: isDark ? 'rgba(132,196,64,0.18)' : 'rgba(61,140,82,0.16)',
  };

  const loadPhotos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await listProgressPhotos(user.id);
      setPhotos(rows);
    } catch {
      Alert.alert('Progress photos', 'Could not load your photos right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadPhotos();
    }, [loadPhotos])
  );

  const visiblePhotos = useMemo(
    () => photos.filter((photo) => filter === 'all' || photo.category === filter),
    [filter, photos]
  );

  const resetAddForm = () => {
    setCategory('front');
    setPhotoDate(todayString());
    setNote('');
  };

  const openAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAddForm();
    setShowAdd(true);
  };

  const uploadSelectedAsset = async (assetUri: string) => {
    if (!user?.id) return;
    if (!validatePhotoDate(photoDate)) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD for the photo date.');
      return;
    }

    setSaving(true);
    try {
      await addProgressPhoto(user.id, assetUri, category, photoDate, note);
      setShowAdd(false);
      await loadPhotos();
    } catch {
      Alert.alert('Upload failed', 'Your photo could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add progress photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadSelectedAsset(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a progress photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadSelectedAsset(result.assets[0].uri);
    }
  };

  const renderPhoto = ({ item, index }: { item: ProgressPhoto; index: number }) => {
    const showMonth = index === 0 || formatMonth(visiblePhotos[index - 1].photo_date) !== formatMonth(item.photo_date);
    return (
      <View style={styles.gridItemWrap}>
        {showMonth ? <Text style={[styles.monthLabel, { color: colors.muted }]}>{formatMonth(item.photo_date)}</Text> : null}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.photoCard, { borderColor: colors.border, backgroundColor: colors.panel }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('ProgressPhotoDetail', {
              photoId: item.id,
              signedUrl: item.signed_url,
              storagePath: item.storage_path,
              photoDate: item.photo_date,
              category: item.category,
              note: item.note,
              createdAt: item.created_at,
            });
          }}
        >
          {item.signed_url ? (
            <Image source={{ uri: item.signed_url }} style={styles.photoImage} contentFit="cover" />
          ) : (
            <View style={styles.missingImage}>
              <ImagePlus size={24} color={PRIMARY} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.82)']}
            style={styles.photoOverlay}
          >
            <Text style={styles.photoCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.photoDate}>{formatDate(item.photo_date)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['rgba(132,196,64,0.18)', 'transparent'] : ['rgba(132,196,64,0.12)', 'transparent']}
        style={styles.ambient}
      />
      <ScreenHeader
        title="PROGRESS PHOTOS"
        rightElement={
          <TouchableOpacity style={styles.headerAddButton} onPress={openAddSheet} activeOpacity={0.85}>
            <Plus size={18} color="#10140D" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={visiblePhotos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderPhoto}
        ListHeaderComponent={
          <View style={[styles.headerContent, { paddingTop: insets.top + 82 }]}>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Your private timeline
            </Text>
            <View style={styles.filters}>
              {FILTERS.map((item) => {
                const active = item === filter;
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.82}
                    onPress={() => setFilter(item)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? 'rgba(132,196,64,0.18)' : colors.panel,
                        borderColor: active ? 'rgba(132,196,64,0.42)' : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterText, { color: active ? PRIMARY : colors.muted }]}>
                      {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 80 }} />
          ) : (
            <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.panel }]}>
              <ImagePlus size={34} color={PRIMARY} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No photos yet</Text>
              <Text style={[styles.emptyCopy, { color: colors.muted }]}>
                Add a private progress photo to start your timeline.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddSheet} activeOpacity={0.88}>
                <Text style={styles.emptyButtonText}>Add Photo</Text>
                <ChevronRight size={15} color="#10140D" />
              </TouchableOpacity>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={PRIMARY}
            onRefresh={() => {
              setRefreshing(true);
              void loadPhotos();
            }}
          />
        }
      />

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.addSheet, { backgroundColor: isDark ? '#10130F' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add progress photo</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeButton}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((item) => {
                const active = item.key === category;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setCategory(item.key)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? 'rgba(132,196,64,0.18)' : colors.panel,
                        borderColor: active ? 'rgba(132,196,64,0.44)' : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: active ? PRIMARY : colors.muted }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Date</Text>
            <TextInput
              value={photoDate}
              onChangeText={setPhotoDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.panel }]}
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.panel }]}
            />

            <View style={styles.sourceRow}>
              <TouchableOpacity disabled={saving} onPress={takePhoto} style={styles.sourceButton} activeOpacity={0.88}>
                {saving ? <ActivityIndicator color="#10140D" /> : <Camera size={18} color="#10140D" />}
                <Text style={styles.sourceText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={pickFromLibrary} style={styles.sourceButton} activeOpacity={0.88}>
                {saving ? <ActivityIndicator color="#10140D" /> : <ImagePlus size={18} color="#10140D" />}
                <Text style={styles.sourceText}>Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  gridItemWrap: {
    flex: 1,
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  monthLabel: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  photoCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  missingImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(132,196,64,0.08)',
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  photoCategory: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 11,
    color: PRIMARY,
    letterSpacing: 0,
  },
  photoDate: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 2,
  },
  emptyState: {
    marginHorizontal: 8,
    marginTop: 70,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 20,
    marginTop: 12,
  },
  emptyCopy: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  emptyButtonText: {
    fontFamily: 'Barlow_800ExtraBold',
    color: '#10140D',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  addSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 20,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inputLabel: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  categoryText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  sourceButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sourceText: {
    fontFamily: 'Barlow_800ExtraBold',
    color: '#10140D',
    fontSize: 14,
  },
});

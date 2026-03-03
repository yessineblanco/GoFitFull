import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, StickyNote, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useClientManagementStore } from '@/store/clientManagementStore';
import { useCoachStore } from '@/store/coachStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';

export const ClientNotesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const {
    clientNotes,
    loadingNotes,
    loadClientNotes,
    createNote,
    updateNote,
    deleteNote,
  } = useClientManagementStore();

  const clientId = route.params?.clientId;
  const clientName = route.params?.clientName || '';

  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState('');

  useEffect(() => {
    if (clientId && profile?.id) loadClientNotes(profile.id, clientId);
  }, [clientId, profile?.id]);

  const handleRefresh = useCallback(() => {
    if (clientId && profile?.id) loadClientNotes(profile.id, clientId);
  }, [clientId, profile?.id]);

  const openAddModal = () => {
    setEditingNoteId(null);
    setNoteText('');
    setModalVisible(true);
  };

  const openEditModal = (id: string, text: string) => {
    setEditingNoteId(id);
    setNoteText(text);
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !profile?.id || !clientId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, noteText.trim());
        dialogManager.success(t('common.success'), t('clientManagement.editNote'));
      } else {
        await createNote(profile.id, clientId, noteText.trim());
        dialogManager.success(t('common.success'), t('clientManagement.addNote'));
      }
      setModalVisible(false);
    } catch {
      dialogManager.error(t('common.error'), t('common.failedToSave'));
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dialogManager.show(
      t('common.delete'),
      t('sessionPacks.deletePackConfirm'),
      'warning',
      {
        showCancel: true,
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          try {
            await deleteNote(noteId);
            dialogManager.success(t('common.success'), t('common.success'));
          } catch {
            dialogManager.error(t('common.error'), t('common.failedToSave'));
          }
        },
      }
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNote = ({ item }: { item: { id: string; note: string; updated_at: string } }) => (
    <View style={styles.noteCard}>
      <Text style={styles.noteText}>{item.note}</Text>
      <View style={styles.noteFooter}>
        <Text style={styles.noteDate}>{formatDate(item.updated_at)}</Text>
        <View style={styles.noteActions}>
          <TouchableOpacity onPress={() => openEditModal(item.id, item.note)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <StickyNote size={16} color={PRIMARY_GREEN} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteNote(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={16} color="#EF5350" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <StickyNote size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('clientManagement.noNotes')}</Text>
      <Text style={styles.emptySubtitle}>{t('clientManagement.noNotesDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('clientManagement.privateNotes')}</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Plus size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={clientNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loadingNotes} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListEmptyComponent={loadingNotes ? null : renderEmpty}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <LinearGradient colors={['#0a0a0a', '#0d1a0d', '#0a0a0a']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingNoteId ? t('clientManagement.editNote') : t('clientManagement.addNote')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder={t('clientManagement.notesPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNote} disabled={!noteText.trim()}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  addButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 10,
  },
  noteText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
    lineHeight: 22,
  },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  noteDate: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.35)',
  },
  noteActions: { flexDirection: 'row', gap: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 260,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF' },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
    minHeight: 120,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#000000' },
});

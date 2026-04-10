import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Send, MessageCircle, Paperclip, Camera, ImageIcon,
  FileText, Mic, MicOff, X, Play, Pause, File,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatService, type Message } from '@/services/chat';
import { supabase } from '@/config/supabase';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

const PRIMARY_GREEN = '#B4F04E';
const SCREEN_WIDTH = Dimensions.get('window').width;

type ListItem = { type: 'date'; dateKey: string; label: string } | { type: 'message'; message: Message };

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, userType } = useAuthStore();
  const { messages, loadingMessages, loadMessages, sendMessage, addRealtimeMessage, activeConversation } = useChatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversationId = route.params?.conversationId;
  const recipientName = route.params?.recipientName
    || activeConversation?.other_user_name
    || (userType === 'coach' ? t('chat.fallbackClient') : t('chat.fallbackCoach'));

  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    let lastDateKey = '';
    messages.forEach((msg) => {
      const d = new Date(msg.created_at);
      const dateKey = d.toDateString();
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        const now = new Date();
        const label = dateKey === now.toDateString()
          ? t('chat.today')
          : new Date(now.getTime() - 86400000).toDateString() === dateKey
            ? t('chat.yesterday')
            : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        items.push({ type: 'date', dateKey, label });
      }
      items.push({ type: 'message', message: msg });
    });
    return items;
  }, [messages, t]);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      if (user?.id) chatService.markAsRead(conversationId, user.id);

      const channel = chatService.subscribeToMessages(conversationId, (msg) => {
        addRealtimeMessage(msg);
        if (user?.id && msg.sender_id !== user.id) {
          chatService.markAsRead(conversationId, user.id);
        }
      });
      return () => { channel.unsubscribe(); };
    }
  }, [conversationId]);

  useEffect(() => {
    if (listItems.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [listItems.length]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const uploadMedia = async (uri: string, folder: string, filename: string): Promise<string | null> => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = filename.split('.').pop() || 'bin';
      const path = `${conversationId}/${Date.now()}_${filename}`;
      const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav',
        pdf: 'application/pdf', doc: 'application/msword',
      };
      const contentType = contentTypeMap[ext.toLowerCase()] || 'application/octet-stream';

      const bytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));

      const { error } = await supabase.storage
        .from('chat-media')
        .upload(path, bytes, { contentType, upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || !user?.id || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendMessage(conversationId, user.id, text);
    } catch {}
    setSending(false);
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const filename = asset.fileName || `image_${Date.now()}.jpg`;
    setSending(true);
    const url = await uploadMedia(asset.uri, 'images', filename);
    if (url && conversationId && user?.id) {
      await sendMessage(conversationId, user.id, t('chat.photoMessage'), 'image', url);
    }
    setSending(false);
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.error'), t('chat.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const filename = `photo_${Date.now()}.jpg`;
    setSending(true);
    const url = await uploadMedia(asset.uri, 'images', filename);
    if (url && conversationId && user?.id) {
      await sendMessage(conversationId, user.id, t('chat.photoMessage'), 'image', url);
    }
    setSending(false);
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const filename = asset.name || `file_${Date.now()}`;
    setSending(true);
    const url = await uploadMedia(asset.uri, 'files', filename);
    if (url && conversationId && user?.id) {
      await sendMessage(conversationId, user.id, filename, 'file', url);
    }
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common.error'), t('chat.micPermission'));
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Start recording failed:', err);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      await recording?.stopAndUnloadAsync();
    } catch {}
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const stopAndSendRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (!recording || !conversationId || !user?.id) return;
    setIsRecording(false);
    setSending(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        const filename = `voice_${Date.now()}.m4a`;
        const url = await uploadMedia(uri, 'voice', filename);
        if (url) {
          const durationLabel = formatDuration(recordingDuration);
          await sendMessage(conversationId, user.id, `🎤 ${durationLabel}`, 'voice', url);
        }
      }
    } catch (err) {
      console.error('Send recording failed:', err);
    }
    setRecording(null);
    setRecordingDuration(0);
    setSending(false);
  };

  const togglePlayVoice = async (url: string, msgId: string) => {
    if (playingId === msgId) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      setPlayingId(null);
      return;
    }
    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      setPlayingId(msgId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
      await sound.playAsync();
    } catch (err) {
      console.error('Playback failed:', err);
      setPlayingId(null);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isOwnMessage = (msg: Message) => msg.sender_id === user?.id;

  const renderMediaContent = (msg: Message, own: boolean) => {
    if (msg.type === 'image' && msg.media_url) {
      return (
        <TouchableOpacity activeOpacity={0.9}>
          <Image
            source={{ uri: msg.media_url }}
            style={styles.imageMessage}
            contentFit="cover"
            transition={200}
          />
          {msg.content && msg.content !== t('chat.photoMessage') && (
            <Text style={[styles.messageText, own && styles.ownMessageText, { marginTop: 6 }]}>
              {msg.content}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    if (msg.type === 'voice' && msg.media_url) {
      const isPlaying = playingId === msg.id;
      return (
        <TouchableOpacity
          style={styles.voiceBubbleContent}
          onPress={() => togglePlayVoice(msg.media_url!, msg.id)}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <Pause size={18} color={own ? '#000' : PRIMARY_GREEN} />
          ) : (
            <Play size={18} color={own ? '#000' : PRIMARY_GREEN} />
          )}
          <View style={[styles.voiceWaveform, own && styles.ownVoiceWaveform]}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  { height: 6 + Math.random() * 14, backgroundColor: own ? 'rgba(0,0,0,0.3)' : 'rgba(180,240,78,0.4)' },
                  isPlaying && i <= 6 && { backgroundColor: own ? '#000' : PRIMARY_GREEN },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.voiceDuration, own && styles.ownVoiceDuration]}>
            {msg.content?.replace('🎤 ', '') || '0:00'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (msg.type === 'file' && msg.media_url) {
      return (
        <TouchableOpacity style={styles.fileBubbleContent} activeOpacity={0.7}>
          <File size={20} color={own ? '#000' : PRIMARY_GREEN} />
          <Text style={[styles.fileName, own && styles.ownFileName]} numberOfLines={2}>
            {msg.content || 'File'}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[styles.messageText, own && styles.ownMessageText]}>{msg.content}</Text>
    );
  };

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }
    const msg = item.message;
    const own = isOwnMessage(msg);
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.messageBubbleWrapper, own && styles.messageBubbleWrapperOwn]}>
        <View style={[styles.messageBubble, own ? styles.ownBubble : styles.otherBubble]}>
          {renderMediaContent(msg, own)}
          <Text style={[styles.messageTime, own && styles.ownMessageTime]}>{time}</Text>
        </View>
      </View>
    );
  }, [messages, playingId, t]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyText}>{t('chat.sendFirstMessage')}</Text>
    </View>
  );

  if (loadingMessages && messages.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recipientName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipientName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={(item) => item.type === 'date' ? item.dateKey : item.message.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 12, flexGrow: listItems.length === 0 ? 1 : undefined }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={!loadingMessages ? renderEmpty : null}
        />

        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(180,240,78,0.15)' }]}>
                <Camera size={20} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.attachLabel}>{t('chat.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(100,149,237,0.15)' }]}>
                <ImageIcon size={20} color="#6495ED" />
              </View>
              <Text style={styles.attachLabel}>{t('chat.gallery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(255,165,0,0.15)' }]}>
                <FileText size={20} color="#FFA500" />
              </View>
              <Text style={styles.attachLabel}>{t('chat.document')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording ? (
          <View style={[styles.recordingBar, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity onPress={cancelRecording} style={styles.recordCancelBtn}>
              <X size={20} color="#FF4444" />
            </TouchableOpacity>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity onPress={stopAndSendRecording} style={styles.recordSendBtn}>
              <Send size={18} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachMenu(!showAttachMenu)}
            >
              <Paperclip size={20} color={showAttachMenu ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)'} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={(text) => { setInput(text); if (showAttachMenu) setShowAttachMenu(false); }}
              placeholder={t('chat.typeMessage')}
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={2000}
            />
            {input.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                <Send size={18} color={sending ? 'rgba(0,0,0,0.3)' : '#000000'} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={startRecording}
              >
                <Mic size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  messagesList: { paddingHorizontal: 16, paddingTop: 12 },
  messageBubbleWrapper: { marginBottom: 6, alignItems: 'flex-start' },
  messageBubbleWrapperOwn: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '78%', borderRadius: 16, padding: 12, paddingBottom: 8 },
  ownBubble: { backgroundColor: PRIMARY_GREEN, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
  messageText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: '#FFFFFF', lineHeight: 20 },
  ownMessageText: { color: '#000000' },
  messageTime: { fontFamily: 'Barlow_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, alignSelf: 'flex-end' },
  ownMessageTime: { color: 'rgba(0,0,0,0.4)' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  attachButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
    fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: '#FFFFFF',
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY_GREEN,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendButtonDisabled: { backgroundColor: 'rgba(180,240,78,0.3)' },
  micButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(15), color: 'rgba(255,255,255,0.5)' },

  attachMenu: {
    flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 16, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(10,10,10,0.95)',
  },
  attachOption: { alignItems: 'center', gap: 6 },
  attachIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  attachLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.6)' },

  recordingBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', gap: 12,
  },
  recordCancelBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,68,68,0.15)', alignItems: 'center', justifyContent: 'center' },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },
  recordingTime: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#FFFFFF' },
  recordSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center' },

  imageMessage: { width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.55, borderRadius: 12 },

  voiceBubbleContent: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
  voiceWaveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  ownVoiceWaveform: {},
  waveformBar: { width: 3, borderRadius: 2 },
  voiceDuration: { fontFamily: 'Barlow_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 30 },
  ownVoiceDuration: { color: 'rgba(0,0,0,0.5)' },

  fileBubbleContent: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 140 },
  fileName: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: '#FFFFFF', flex: 1 },
  ownFileName: { color: '#000' },
});

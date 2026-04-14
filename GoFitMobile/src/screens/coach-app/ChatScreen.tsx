import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Alert, AppState,
  Modal, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Send, MessageCircle, Paperclip, Camera, ImageIcon,
  FileText, Mic, MicOff, X, Play, Pause, File,
} from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatService, type Message } from '@/services/chat';
import { supabase } from '@/config/supabase';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';

const PRIMARY_GREEN = '#B4F04E';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type ListItem = { type: 'date'; dateKey: string; label: string } | { type: 'message'; message: Message };

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { user, userType } = useAuthStore();
  const { messages, loadingMessages, loadMessages, sendMessage, addRealtimeMessage, activeConversation } = useChatStore();
  const [conversationMeta, setConversationMeta] = useState<{ client_id: string; coach_id: string } | null>(null);
  const [fetchedPeerAvatarRaw, setFetchedPeerAvatarRaw] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastConversationIdRef = useRef<string | null>(null);

  const conversationId = route.params?.conversationId;
  const recipientIdParam = route.params?.recipientId as string | undefined;
  const recipientPictureParam = route.params?.recipientPictureUrl as string | null | undefined;
  const recipientName = route.params?.recipientName
    || activeConversation?.other_user_name
    || (userType === 'coach' ? t('chat.fallbackClient') : t('chat.fallbackCoach'));

  const peerClientUserId =
    userType === 'coach'
      ? (recipientIdParam ?? activeConversation?.client_id ?? conversationMeta?.client_id ?? null)
      : null;
  const peerCoachProfileId =
    userType === 'client'
      ? (activeConversation?.coach_id ?? conversationMeta?.coach_id ?? null)
      : null;

  useEffect(() => {
    if (!conversationId) {
      setConversationMeta(null);
      return;
    }
    if (activeConversation?.client_id && activeConversation?.coach_id) {
      setConversationMeta(null);
      return;
    }
    setConversationMeta(null);
    let cancelled = false;
    supabase
      .from('conversations')
      .select('client_id, coach_id')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.client_id && data?.coach_id) {
          setConversationMeta({ client_id: data.client_id, coach_id: data.coach_id });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, activeConversation?.client_id, activeConversation?.coach_id]);

  useEffect(() => {
    setFetchedPeerAvatarRaw(null);
  }, [conversationId]);

  const rawPeerPicture =
    recipientPictureParam ?? activeConversation?.other_user_picture ?? null;
  const hasResolvedPeerPicture = Boolean(resolvePublicAvatarUrl(rawPeerPicture));

  useEffect(() => {
    if (hasResolvedPeerPicture) {
      setFetchedPeerAvatarRaw(null);
      return;
    }
    let cancelled = false;
    if (userType === 'coach' && peerClientUserId) {
      chatService.getUserProfilePictureUrl(peerClientUserId).then((url) => {
        if (!cancelled) setFetchedPeerAvatarRaw(url);
      });
    } else if (userType === 'client' && peerCoachProfileId) {
      chatService.getCoachProfilePictureUrl(peerCoachProfileId).then((url) => {
        if (!cancelled) setFetchedPeerAvatarRaw(url);
      });
    } else {
      setFetchedPeerAvatarRaw(null);
    }
    return () => {
      cancelled = true;
    };
  }, [hasResolvedPeerPicture, userType, peerClientUserId, peerCoachProfileId]);

  const headerAvatarUri = resolvePublicAvatarUrl(rawPeerPicture ?? fetchedPeerAvatarRaw ?? null);

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

  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      const firstOpenOfThisConversation = lastConversationIdRef.current !== conversationId;
      lastConversationIdRef.current = conversationId;
      loadMessages(conversationId, { silent: !firstOpenOfThisConversation });
      if (user?.id) chatService.markAsRead(conversationId, user.id);
    }, [conversationId, user?.id, loadMessages])
  );

  useEffect(() => {
    if (!conversationId) return;
    const channel = chatService.subscribeToMessages(conversationId, (msg) => {
      addRealtimeMessage(msg);
      if (user?.id && msg.sender_id !== user.id) {
        chatService.markAsRead(conversationId, user.id);
      }
    });
    return () => { channel.unsubscribe(); };
  }, [conversationId, user?.id, addRealtimeMessage]);

  useEffect(() => {
    if (!conversationId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadMessages(conversationId, { silent: true });
      }
    });
    return () => sub.remove();
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadMessages(conversationId, { silent: true });
      }
    }, 8000);
    return () => clearInterval(id);
  }, [conversationId, loadMessages]);

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

  const uriToBytes = async (uri: string): Promise<Uint8Array> => {
    try {
      const b64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch {
      const res = await fetch(uri);
      if (!res.ok) throw new Error('fetch failed');
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    }
  };

  /** Storage RLS requires first path segment = auth user id (see setup_coach_storage.sql). */
  const uploadMedia = async (uri: string, filename: string): Promise<string | null> => {
    if (!user?.id || !conversationId) return null;
    try {
      const safeName = filename.replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_') || `file_${Date.now()}`;
      const path = `${user.id}/${conversationId}/${Date.now()}_${safeName}`;
      const ext = safeName.split('.').pop() || 'bin';
      const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
        pdf: 'application/pdf', doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const contentType = contentTypeMap[ext.toLowerCase()] || 'application/octet-stream';

      const bytes = await uriToBytes(uri);

      const { error } = await supabase.storage
        .from('chat-media')
        .upload(path, bytes, { contentType, upsert: false });

      if (error) throw error;

      const { data: signed, error: signErr } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(path, 60 * 60 * 24 * 30);

      if (!signErr && signed?.signedUrl) return signed.signedUrl;

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
    const url = await uploadMedia(asset.uri, filename);
    if (url && conversationId && user?.id) {
      await sendMessage(conversationId, user.id, t('chat.photoMessage'), 'image', url);
    } else {
      Alert.alert(t('common.error'), t('chat.uploadFailed'));
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
    const url = await uploadMedia(asset.uri, filename);
    if (url && conversationId && user?.id) {
      await sendMessage(conversationId, user.id, t('chat.photoMessage'), 'image', url);
    } else {
      Alert.alert(t('common.error'), t('chat.uploadFailed'));
    }
    setSending(false);
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const filename = asset.name || `file_${Date.now()}`;
      setSending(true);
      const url = await uploadMedia(asset.uri, filename);
      if (url && conversationId && user?.id) {
        await sendMessage(conversationId, user.id, filename, 'file', url);
      } else {
        Alert.alert(t('common.error'), t('chat.uploadFailed'));
      }
    } catch (e) {
      console.error('Document pick/upload failed:', e);
      Alert.alert(t('common.error'), t('chat.uploadFailed'));
    } finally {
      setSending(false);
    }
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
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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
        const url = await uploadMedia(uri, filename);
        if (url) {
          const durationLabel = formatDuration(recordingDuration);
          await sendMessage(conversationId, user.id, `🎤 ${durationLabel}`, 'voice', url);
        } else {
          Alert.alert(t('common.error'), t('chat.uploadFailed'));
        }
      } else {
        Alert.alert(t('common.error'), t('chat.uploadFailed'));
      }
    } catch (err) {
      console.error('Send recording failed:', err);
      Alert.alert(t('common.error'), t('chat.uploadFailed'));
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
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLightboxUri(msg.media_url!);
          }}
        >
          <Image
            source={{ uri: msg.media_url }}
            style={styles.imageMessage}
            contentFit="cover"
            transition={200}
          />
          {msg.content && msg.content !== t('chat.photoMessage') && (
            <Text style={[styles.messageText, own && styles.ownMessageText, { marginTop: 6 }, !own && { color: colors.text }]}>
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
          <Text style={[styles.voiceDuration, own && styles.ownVoiceDuration, !own && { color: colors.textLight }]}>
            {msg.content?.replace('🎤 ', '') || '0:00'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (msg.type === 'file' && msg.media_url) {
      return (
        <TouchableOpacity style={styles.fileBubbleContent} activeOpacity={0.7}>
          <File size={20} color={own ? '#000' : PRIMARY_GREEN} />
          <Text style={[styles.fileName, own && styles.ownFileName, !own && { color: colors.text }]} numberOfLines={2}>
            {msg.content || 'File'}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[styles.messageText, own && styles.ownMessageText, !own && { color: colors.text }]}>{msg.content}</Text>
    );
  };

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={[styles.dateSeparatorText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>{item.label}</Text>
        </View>
      );
    }
    const msg = item.message;
    const own = isOwnMessage(msg);
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.messageBubbleWrapper, own && styles.messageBubbleWrapperOwn]}>
        <View style={[styles.messageBubble, own ? styles.ownBubble : [styles.otherBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]]}>
          {renderMediaContent(msg, own)}
          <Text style={[styles.messageTime, own && styles.ownMessageTime, !own && { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>{time}</Text>
        </View>
      </View>
    );
  }, [messages, playingId, t, isDark, colors]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={48} color="rgba(180,240,78,0.3)" />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('chat.sendFirstMessage')}</Text>
    </View>
  );

  const peerInitial = (recipientName?.trim()?.[0] || '?').toUpperCase();

  const renderChatHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        {headerAvatarUri ? (
          <Image source={{ uri: headerAvatarUri }} style={styles.headerAvatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: isDark ? 'rgba(180,240,78,0.18)' : 'rgba(180,240,78,0.22)' }]}>
            <Text style={[styles.headerAvatarInitial, { color: PRIMARY_GREEN }]}>{peerInitial}</Text>
          </View>
        )}
        <Text style={[styles.peerTitle, { color: colors.text }]} numberOfLines={1}>
          {recipientName}
        </Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loadingMessages && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
        <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        {renderChatHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      {renderChatHeader()}

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
          <View style={[styles.attachMenu, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)' }]}>
            <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(180,240,78,0.15)' }]}>
                <Camera size={20} color={PRIMARY_GREEN} />
              </View>
              <Text style={[styles.attachLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{t('chat.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(100,149,237,0.15)' }]}>
                <ImageIcon size={20} color="#6495ED" />
              </View>
              <Text style={[styles.attachLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{t('chat.gallery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
              <View style={[styles.attachIconCircle, { backgroundColor: 'rgba(255,165,0,0.15)' }]}>
                <FileText size={20} color="#FFA500" />
              </View>
              <Text style={[styles.attachLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{t('chat.document')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording ? (
          <View style={[styles.recordingBar, { paddingBottom: insets.bottom + 8, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
            <TouchableOpacity onPress={cancelRecording} style={styles.recordCancelBtn}>
              <X size={20} color="#FF4444" />
            </TouchableOpacity>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingTime, { color: colors.text }]}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity onPress={stopAndSendRecording} style={styles.recordSendBtn}>
              <Send size={18} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachMenu(!showAttachMenu)}
            >
              <Paperclip size={20} color={showAttachMenu ? PRIMARY_GREEN : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')} />
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', color: colors.text }]}
              value={input}
              onChangeText={(text) => { setInput(text); if (showAttachMenu) setShowAttachMenu(false); }}
              placeholder={t('chat.typeMessage')}
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
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
                style={[styles.micButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                onPress={startRecording}
              >
                <Mic size={20} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable style={styles.lightboxRoot} onPress={() => setLightboxUri(null)}>
          <View style={styles.lightboxImageWrap} pointerEvents="box-none">
            {lightboxUri ? (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                contentFit="contain"
                transition={200}
                pointerEvents="none"
              />
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.lightboxClose, { top: insets.top + 12 }]}
            onPress={() => setLightboxUri(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <View style={styles.lightboxCloseCircle}>
              <X size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  backButton: { padding: 8, width: 40 },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    gap: 10,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: { fontFamily: 'Barlow_700Bold', fontSize: 16 },
  peerTitle: {
    flexShrink: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
  },
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

  lightboxRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  lightboxImageWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 1,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.78,
  },
  lightboxClose: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  lightboxCloseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

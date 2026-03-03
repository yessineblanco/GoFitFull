import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatService, type Message } from '@/services/chat';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

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
  const flatListRef = useRef<FlatList>(null);

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

      if (user?.id) {
        chatService.markAsRead(conversationId, user.id);
      }

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

  const isOwnMessage = (msg: Message) => msg.sender_id === user?.id;

  const renderItem = ({ item }: { item: ListItem }) => {
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
          <Text style={[styles.messageText, own && styles.ownMessageText]}>{msg.content}</Text>
          <Text style={[styles.messageTime, own && styles.ownMessageTime]}>{time}</Text>
        </View>
      </View>
    );
  };

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

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send size={18} color={input.trim() && !sending ? '#000000' : 'rgba(0,0,0,0.3)'} />
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.5)',
  },
});

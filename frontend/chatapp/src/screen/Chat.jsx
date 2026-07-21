import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

// Helpers
function avatarColor(name = '') {
  const palette = [
    '#7C3AED', '#6D28D9', '#5B21B6',
    '#4F46E5', '#7C3AED', '#8B5CF6',
    '#A855F7', '#9333EA', '#6366F1',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name = '') {
  return name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── WebSocket URL ───────────────────────────────────────────────────────────
// Android emulator: 10.0.2.2 → host machine
// Change to your real server IP when testing on a physical device
const WS_BASE = 'ws://localhost:8000';

export default function Chat({ route, navigation }) {
  const { otherUser } = route.params;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);   // [{id, text, sender_id, timestamp}]
  const [currentUser, setCurrentUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  const ws = useRef(null);
  const listRef = useRef(null);

  // ── 1. Load current user from storage ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('userInfo').then(info => {
      if (info) setCurrentUser(JSON.parse(info));
    });
  }, []);

  // ── 2. Load message history + open WebSocket when currentUser is ready ──────
  useEffect(() => {
    if (!currentUser) return;

    // Deterministic room ID: sort user IDs so both users join the same room
    const roomId = [currentUser.id, otherUser.id].sort((a, b) => a - b).join('_');

    // Load chat history from REST API
    const loadHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await api.get(`/api/messages/?with=${otherUser.id}`, {
          headers: { Authorization: `Token ${token}` },
        });
        // API returns oldest-first; we store as newest-first for inverted FlatList
        const history = res.data.map(m => ({
          id: String(m.id),
          text: m.text,
          sender_id: m.sender_id,
          sent: m.sender_id === currentUser.id,
          timestamp: m.timestamp,
        })).reverse();
        console.log("Chat History", history)
        setMessages(history);
      } catch (e) {
        console.log('History load error:', e);
      }
    };

    loadHistory();

    // Open WebSocket connection
    const socket = new WebSocket(`${WS_BASE}/ws/chat/${roomId}/`);

    socket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected to room:', roomId);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const incoming = {
        id: String(data.id),
        text: data.text,
        sender_id: data.sender_id,
        sent: data.sender_id === currentUser.id,
        timestamp: data.timestamp,
      };
      // Prepend to list (inverted FlatList shows newest first)
      setMessages(prev => {
        // Avoid duplicates: if we already have this id (optimistic), replace it
        const exists = prev.find(m => m.id === incoming.id);
        if (exists) return prev;
        return [incoming, ...prev];
      });
    };

    socket.onerror = (e) => console.log('WebSocket error:', e.message);
    socket.onclose = () => {
      setConnected(false);
      console.log('WebSocket closed');
    };

    ws.current = socket;

    // Cleanup on unmount or user change
    return () => {
      socket.close();
    };
  }, [currentUser]);

  // ── 3. Send message via WebSocket 
  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sending || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    setSending(true);

    ws.current.send(JSON.stringify({
      text: trimmed,
      sender_id: currentUser.id,
      receiver_id: otherUser.id,
    }));

    setMessage('');
    setSending(false);
  };

  const avColor = avatarColor(otherUser?.name || '');
  const ini = initials(otherUser?.name || '');

  // ── Render a single message bubble
  const renderMsg = ({ item }) => (
    <View style={[styles.row, item.sent && styles.rowSent]}>
      {!item.sent && (
        <View style={[styles.bubbleAvatar, { backgroundColor: avColor }]}>
          <Text style={styles.bubbleAvatarText}>{ini}</Text>
        </View>
      )}
      <View style={styles.bubbleWrap}>
        <View style={[styles.bubble, item.sent ? styles.bubbleSent : styles.bubbleReceived]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
        </View>
        <Text style={[styles.timeText, item.sent && styles.timeTextSent]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header  */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={[styles.headerAvatar, { backgroundColor: avColor }]}>
          <Text style={styles.headerAvatarText}>{ini}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUser?.name}</Text>
          <Text style={[styles.headerStatus, { color: connected ? '#10B981' : '#6B7280' }]}>
            {connected ? '● Online' : '● Connecting…'}
          </Text>
        </View>
      </View>

      {/* ── Message List  */}
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        renderItem={renderMsg}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyAvatar, { backgroundColor: avColor }]}>
              <Text style={styles.emptyAvatarText}>{ini}</Text>
            </View>
            <Text style={styles.emptyName}>{otherUser?.name}</Text>
            <Text style={styles.emptyHint}>Send a message to start the conversation!</Text>
          </View>
        }
      />

      {/* ── Input Bar  */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor="#4B5563"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A1A4A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED44',
    marginRight: 2,
  },
  backIcon: {
    color: '#A78BFA',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff22',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  rowSent: {
    flexDirection: 'row-reverse',
  },
  bubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 18,
  },
  bubbleAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  bubbleWrap: {
    maxWidth: '72%',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleReceived: {
    backgroundColor: '#1E1E3A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  timeText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  timeTextSent: {
    textAlign: 'right',
    marginRight: 4,
    marginLeft: 0,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffffff22',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 28,
  },
  emptyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 120,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

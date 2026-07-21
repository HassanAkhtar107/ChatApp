import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

// Generate a consistent gradient-like avatar colour from a name
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

// Initials from name (up to 2 chars)
function initials(name = '') {
  return name
    .trim()
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Home({ navigation }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── Load logged-in user info once ─────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('userInfo').then(info => {
      if (info) setUser(JSON.parse(info));
    });
  }, []);

  // ── Send FCM Token to Backend ─────────────────────────────────────────────
  useEffect(() => {
    const sendFcmToken = async () => {
      try {
        const authToken = await AsyncStorage.getItem('authToken');
        const fcmToken = await AsyncStorage.getItem('fcmToken');
        if (authToken && fcmToken) {
          await api.post('/api/update-fcm-token/', { token: fcmToken }, {
            headers: { Authorization: `Token ${authToken}` },
          });
          console.log("FCM token sent to backend");
        }
      } catch (err) {
        console.log("Error sending FCM token to backend:", err);
      }
    };
    sendFcmToken();
  }, []);

  // ── Fetch registered users from backend ───────────────────────────────────
  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await api.get('/api/users/', {
        headers: { Authorization: `Token ${token}` },
      });
      setUsers(res.data);
      setFiltered(res.data);
    } catch (err) {
      setError('Could not load users. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      q ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        : users
    );
  }, [search, users]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userInfo');
    navigation.replace('Login');
  };

  // ── Navigate to Chat ───────────────────────────────────────────────────────
  const openChat = (otherUser) => {
    navigation.navigate('Chat', { otherUser });
  };

  // ── Render a single user card ──────────────────────────────────────────────
  const renderUser = ({ item, index }) => {
    const bg = avatarColor(item.name);
    const ini = initials(item.name);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.82}
        onPress={() => openChat(item)}
      >
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={styles.avatarText}>{ini}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        </View>

        <View style={styles.chatIconWrap}>
          <Text style={styles.chatIcon}>💬</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.selfAvatar, { backgroundColor: avatarColor(user?.name || 'U') }]}>
            <Text style={styles.selfAvatarText}>{initials(user?.name || 'U')}</Text>
          </View>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting} numberOfLines={1}>
              {user?.name || 'User'} 👋
            </Text>
            <Text style={styles.subGreeting}>ChatApp</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Section Title ───────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>People</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor="#4B5563"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading people…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchUsers()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsers(true)}
              tintColor="#7C3AED"
              colors={['#7C3AED']}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🧑‍🤝‍🧑</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term.' : 'No other users have signed up yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  selfAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ffffff22',
  },
  selfAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  greetingBlock: { flex: 1 },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    backgroundColor: '#2A1A4A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7C3AED55',
  },
  logoutText: {
    color: '#A78BFA',
    fontWeight: '600',
    fontSize: 13,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: '#7C3AED33',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#7C3AED55',
  },
  countText: {
    color: '#A78BFA',
    fontWeight: '700',
    fontSize: 13,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  clearBtn: { padding: 4 },
  clearIcon: { color: '#6B7280', fontSize: 14, fontWeight: '700' },

  // List
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  separator: {
    height: 1,
    backgroundColor: '#1E1E3A',
    marginLeft: 74,
  },

  // User card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  chatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  chatIcon: {
    fontSize: 17,
  },

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 14,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
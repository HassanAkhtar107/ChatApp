import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/login/', { email, password });
      await AsyncStorage.setItem('authToken', res.data.token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
      navigation.replace('Home');
    } catch (err) {
      const data = err.response?.data;
      Alert.alert('Login Failed', data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>💬</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue chatting</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={v => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                secureTextEntry
              />
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1E1E3A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.5, borderColor: '#7C3AED44',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
  },
  logoText: { fontSize: 36 },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9CA3AF' },
  form: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#D1D5DB', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#2A2A4A',
    paddingHorizontal: 14, height: 52,
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 4 },
  btn: {
    backgroundColor: '#7C3AED', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#7C3AED', fontSize: 14, fontWeight: '700' },
});

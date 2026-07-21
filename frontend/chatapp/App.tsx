import React, { useState, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet, PermissionsAndroid, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screen/login';
import SignupScreen from './src/screen/signup';
import HomeScreen from './src/screen/Home';
import ChatScreen from './src/screen/Chat';
import { getMessaging, getToken, registerDeviceForRemoteMessages } from '@react-native-firebase/messaging';


const Stack = createNativeStackNavigator();

export default function App() {
  async function gettoken() {
    try {
      const messaging = getMessaging();
      await registerDeviceForRemoteMessages(messaging);
      const token = await getToken(messaging);
      console.log("FCM Token: ", token);
      await AsyncStorage.setItem('fcmToken', token);
    } catch (error) {
      console.log("Error getting token: ", error);
    }
  }

  async function requestUserPermission() {
    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        gettoken()
      } else {
        Alert.alert("Notification permission denied")
      }
    } catch (error) {
      Alert.alert("Error requesting notification permission", `${error}`)
    }
  }
  useEffect(() => {
    requestUserPermission();
  }, []);

  const [initialRoute, setInitialRoute] = useState<
    'Login' | 'Home' | null
  >(null);

  useEffect(() => {
    AsyncStorage.getItem('authToken')
      .then(token => setInitialRoute(token ? 'Home' : 'Login'))
      .catch(() => setInitialRoute('Login')); // always resolve — never stay on spinner
  }, []);

  // Show splash only while we check the stored token
  if (initialRoute === null) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

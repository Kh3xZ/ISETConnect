import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ToastProvider } from './src/components/Toast';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { colors } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';

function Root() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'signup'>('login');


  useEffect(() => {
    if (user) setScreen('login');
  }, [user]);


  useEffect(() => {
    if (user || screen !== 'signup') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen('login');
      return true;
    });
    return () => sub.remove();
  }, [user, screen]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (user) return <HomeScreen  />;
  if (screen === 'signup') return <SignupScreen onSignIn={() => setScreen('login')} />;
  return <LoginScreen onSignUp={() => setScreen('signup')} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ToastProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

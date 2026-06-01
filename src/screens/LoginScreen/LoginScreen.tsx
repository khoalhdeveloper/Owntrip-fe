import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import AuthModal from './components/AuthModal';
import { styles } from './styles/login.styles';
import { authService } from '@/services/authService';
import { decodeJWT } from '@/utils/jwtUtils';

const loginBg = require('@/assets/images/login-bg.png');
const logo = require('@/assets/images/logo.png');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const loginCalled = useRef(false);
  const router = useRouter();
  const isExpoGo = Constants.appOwnership === 'expo';
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'owntrip',
  });

  const webClientId = '1077908035428-qea7lvnkopbd3o7jspukhs919jhaqct5.apps.googleusercontent.com';
  const androidClientId =
    '1077908035428-skkb4uncp5k6stgonoa3oba16oich6ga.apps.googleusercontent.com';
  const effectiveAndroidClientId = isExpoGo ? webClientId : androidClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    redirectUri,
    webClientId,
    androidClientId: effectiveAndroidClientId,
    iosClientId: webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success' && !loginCalled.current) {
      loginCalled.current = true;
      const idToken = response.params?.id_token ?? response.authentication?.idToken;

      if (idToken) {
        loginWithBackend(idToken);
      } else {
        loginCalled.current = false;
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập Google thất bại',
          text2: 'Không nhận được mã xác thực từ Google.',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const loginWithBackend = async (idToken: string) => {
    try {
      const res: any = await authService.googleLogin(idToken);
      console.log('GOOGLE LOGIN SUCCESS:', res);

      if (res?.token) {
        await AsyncStorage.setItem('token', res.token);
        if (res.userId) {
          await AsyncStorage.setItem('userId', res.userId);
        }
        console.log('TOKEN & USERID SAVED');
        // Phân quyền: chuyển hướng theo role
        const decoded = decodeJWT(res.token);
        if (decoded?.role === 'hotel_owner') {
          router.replace('/hotel-management' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }
    } catch (error) {
      console.log('Google login error:', error);
      loginCalled.current = false;
      Toast.show({
        type: 'error',
        text1: 'Google Login Failed',
        text2: 'Không thể đăng nhập bằng Google.',
      });
    }
  };

  // ===== HANDLERS =====
  const handleGoogleLogin = () => {
    promptAsync();
  };

  const handleLoginSuccess = async (data: any) => {
    console.log('Email login success:', data);
    const token = data?.token;
    const userId = data?.userId;
    if (token) {
      await AsyncStorage.setItem('token', token);
      if (userId) {
        await AsyncStorage.setItem('userId', userId);
      }
      console.log('TOKEN & USERID SAVED');
      // Phân quyền: chuyển hướng theo role
      const decoded = decodeJWT(token);
      if (decoded?.role === 'hotel_owner') {
        router.replace('/hotel-management' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground source={loginBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />

        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.bottomContainer}>
          {/* Nút Google — gọi promptAsync */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
            disabled={!request}
          >
            <FontAwesome name="google" size={20} color="#4285F4" />
            <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
          </TouchableOpacity>

          {/* Nút Email — mở AuthModal */}
          <TouchableOpacity
            style={[styles.button, styles.emailButton]}
            onPress={() => setShowAuthModal(true)}
            activeOpacity={0.8}
          >
            <FontAwesome name="envelope" size={18} color="#FFFFFF" />
            <Text style={styles.emailText}>Đăng nhập bằng Email</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onGoogleLogin={handleGoogleLogin}
      />
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '@/utils/jwtUtils';
import CustomSplashScreen from '@/components/CustomSplashScreen';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {

    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
    const authCheck = checkAuth();

    Promise.all([minDelay, authCheck]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        const decoded = decodeJWT(token);
        if (decoded?.role) {
          setUserRole(decoded.role);
        }
      }
    } catch {
      setIsLoggedIn(false);
    }
  };

  if (isLoading) {
    return <CustomSplashScreen />;
  }

  if (isLoggedIn) {
    if (userRole === 'hotel_owner') {
      return <Redirect href={'/hotel-management' as any} />;
    }
    return <Redirect href={'/(tabs)' as any} />;
  }

  return <Redirect href={'/(auth)/login' as any} />;
}

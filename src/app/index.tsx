import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '@/utils/jwtUtils';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    checkAuth();
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A7CFF" />
      </View>
    );
  }

  if (isLoggedIn) {
    if (userRole === 'hotel_owner') {
      return <Redirect href={'/hotel-management' as any} />;
    }
    return <Redirect href={'/(tabs)' as any} />;
  }

  return <Redirect href={'/(auth)/login' as any} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
});

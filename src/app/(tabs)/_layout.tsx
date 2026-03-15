import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/navigation/CustomTabBar';
import DraggableChatbot from '@/components/DraggableChatbot';
import { ChatbotSettingProvider } from '@/context/ChatbotSettingContext';

export default function TabsLayout() {
  return (
    <ChatbotSettingProvider>
      <View style={styles.container}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Khám phá' }} />
          <Tabs.Screen name="trips" options={{ title: 'Lịch trình' }} />
          <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
          <Tabs.Screen name="store" options={{ title: 'Cửa hàng' }} />
          <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
        </Tabs>

        {/* DraggableChatbot đọc setting từ Context */}
        <DraggableChatbot />
      </View>
    </ChatbotSettingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

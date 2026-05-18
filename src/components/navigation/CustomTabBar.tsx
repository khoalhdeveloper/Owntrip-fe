import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface TabConfig {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  isCenter?: boolean;
}

const TABS: TabConfig[] = [
  { name: 'index', label: 'Khám phá', icon: 'home', color: '#4A7CFF' },
  { name: 'trips', label: 'Lịch trình', icon: 'map', color: '#4A7CFF' },
  { name: 'checkin', label: 'Check-in', icon: 'map-pin', color: '#48BB78', isCenter: true },
  { name: 'store', label: 'Cửa hàng', icon: 'shopping-bag', color: '#4A7CFF' },
  { name: 'profile', label: 'Cá nhân', icon: 'user', color: '#4A7CFF' },
];

const INACTIVE_COLOR = '#A0AEC0';

function TabItem({
  tab,
  isFocused,
  onPress,
  onLongPress,
}: {
  tab: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isFocused, scaleAnim]);

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const iconColor = isFocused ? tab.color : INACTIVE_COLOR;

  // ===== CENTER TAB (Check-in) — nổi bật =====
  if (tab.isCenter) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.centerTabWrapper}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={isFocused ? ['#48BB78', '#38A169'] : ['#E2E8F0', '#CBD5E0']}
            style={styles.centerButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={tab.icon} size={26} color={isFocused ? '#FFFFFF' : '#718096'} />
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.label, { color: isFocused ? tab.color : INACTIVE_COLOR }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }

  // ===== REGULAR TABS =====
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
        <Feather name={tab.icon} size={22} color={iconColor} />
        {isFocused && <View style={[styles.activeDot, { backgroundColor: tab.color }]} />}
      </Animated.View>
      <Text style={[styles.label, { color: iconColor, fontWeight: isFocused ? '600' : '400' }]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              tab={tab}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  centerTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#48BB78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
});

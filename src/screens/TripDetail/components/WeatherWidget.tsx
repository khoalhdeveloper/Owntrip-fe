import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { weatherService, WeatherForecast } from '../../../services/weatherService';

interface WeatherWidgetProps {
  destination: string;
}

// Map OpenWeather icon code to MaterialCommunityIcons name and beautiful colors
const getWeatherIconInfo = (iconCode: string): { name: any, color: string } => {
  const iconMap: Record<string, { name: any, color: string }> = {
    '01d': { name: 'weather-sunny', color: '#F59E0B' }, // Vàng cam tươi
    '01n': { name: 'weather-night', color: '#6366F1' }, // Tím đêm
    '02d': { name: 'weather-partly-cloudy', color: '#FBBF24' }, // Vàng + mây
    '02n': { name: 'weather-night-partly-cloudy', color: '#818CF8' },
    '03d': { name: 'weather-cloudy', color: '#9CA3AF' }, // Xám mây
    '03n': { name: 'weather-cloudy', color: '#9CA3AF' },
    '04d': { name: 'weather-cloudy', color: '#6B7280' }, // Xám đậm
    '04n': { name: 'weather-cloudy', color: '#6B7280' },
    '09d': { name: 'weather-pouring', color: '#3B82F6' }, // Xanh biển mưa lớn
    '09n': { name: 'weather-pouring', color: '#3B82F6' },
    '10d': { name: 'weather-rainy', color: '#60A5FA' }, // Xanh nhạt mưa vừa
    '10n': { name: 'weather-rainy', color: '#60A5FA' },
    '11d': { name: 'weather-lightning', color: '#F59E0B' }, // Vàng sét
    '11n': { name: 'weather-lightning', color: '#F59E0B' },
    '13d': { name: 'weather-snowy', color: '#93C5FD' }, // Xanh tuyết
    '13n': { name: 'weather-snowy', color: '#93C5FD' },
    '50d': { name: 'weather-fog', color: '#9CA3AF' },
    '50n': { name: 'weather-fog', color: '#9CA3AF' },
  };
  return iconMap[iconCode] || { name: 'weather-cloudy', color: '#9CA3AF' };
};

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string>('');

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await weatherService.getWeatherForecast(destination);
        
        if (res.success && res.forecast) {
          setForecasts(res.forecast);
          setCityName(res.city || destination);
        } else {
          setError(res.message || 'Không thể lấy dữ liệu thời tiết');
        }
      } catch (err: any) {
        setError('Lỗi khi kết nối đến máy chủ thời tiết');
      } finally {
        setLoading(false);
      }
    };

    if (destination) {
      fetchWeather();
    }
  }, [destination]);

  if (loading) {
    return (
      <View style={styles.containerLoading}>
        <ActivityIndicator size="small" color="#10B981" />
        <Text style={styles.loadingText}>Đang tải dự báo thời tiết...</Text>
      </View>
    );
  }

  if (error || forecasts.length === 0) {
    return null; // Ẩn widget nếu không có dữ liệu hoặc lỗi
  }

  const mainIconInfo = getWeatherIconInfo(forecasts[0]?.weather[0]?.icon || '01d');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dự báo thời tiết</Text>
          <Text style={styles.subtitle}>{cityName}</Text>
        </View>
        <View style={styles.mainIconContainer}>
          <MaterialCommunityIcons name={mainIconInfo.name} size={48} color={mainIconInfo.color} />
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {forecasts.map((item, index) => {
          const date = new Date(item.dt_txt);
          const dayStr = `${date.getDate()}/${date.getMonth() + 1}`;
          const iconCode = item.weather[0]?.icon || '01d';
          const iconInfo = getWeatherIconInfo(iconCode);
          const temp = Math.round(item.main.temp);
          const desc = item.weather[0]?.description;

          return (
            <View key={index} style={styles.item}>
              <Text style={styles.date}>{dayStr}</Text>
              <MaterialCommunityIcons name={iconInfo.name} size={36} color={iconInfo.color} style={styles.icon} />
              <Text style={styles.temp}>{temp}°</Text>
              <Text style={styles.desc} numberOfLines={1}>{desc}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerLoading: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  mainIconContainer: {
    marginRight: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  list: {
    gap: 12,
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  icon: {
    marginVertical: 4,
  },
  temp: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  desc: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 4,
    maxWidth: 80,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  }
});

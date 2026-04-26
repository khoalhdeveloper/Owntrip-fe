import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { tripService } from '@/services/tripService';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';

const { height } = Dimensions.get('window');

export default function InstantPlanScreen() {
  const router = useRouter();
  const handlePlanTrip = () => {
    router.push('/create-trip');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Decorative Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />
      
      {/* Background Patterns */}
      <View style={styles.gridPattern}>
        {[...Array(10)].map((_, i) => (
          <View key={i} style={styles.gridRow}>
            {[...Array(6)].map((_, j) => (
              <View key={j} style={styles.gridDot} />
            ))}
          </View>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <View style={styles.aiBadgeContainer}>
            <Feather name="star" size={12} color="#FFF" />
            <Text style={styles.aiBadgeText}>CÔNG NGHỆ AI</Text>
          </View>
          <Text style={styles.mainTitle}>Dự định của bạn là gì?</Text>
          <Text style={styles.subTitle}>Khởi tạo hành trình trong mơ của bạn chỉ với một chạm</Text>
        </View>

        {/* Plan your trip card */}
        <TouchableOpacity 
          style={styles.cardContainer} 
          activeOpacity={0.85}
          onPress={handlePlanTrip}
        >
          <LinearGradient
            colors={['#005CB8', '#0084FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardGlow_1} />
            <View style={styles.glassInner} />
            <View style={styles.cardContent}>
              <View style={styles.textSection}>
                <View style={styles.featuredRow}>
                  <Text style={styles.cardTitle}>Lên kế hoạch</Text>
                  <View style={styles.newTag}><Text style={styles.newTagText}>PRO</Text></View>
                </View>
                <Text style={styles.cardDescription}>
                  Tự động sắp xếp lịch trình tối ưu dựa trên sở thích cá nhân.
                </Text>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.iconContainerMain}>
                  <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/854/854878.png' }} 
                    style={styles.cardIconLarge}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Create travel guideline card */}
        <TouchableOpacity style={[styles.cardContainer, { marginTop: 30 }]} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00A3FF', '#62C2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardGlow_2} />
            <View style={styles.glassInner} />
            <View style={styles.cardContent}>
              <View style={styles.textSection}>
                <Text style={styles.cardTitle}>Cẩm nang du lịch</Text>
                <Text style={styles.cardDescription}>
                   Viết hướng dẫn bỏ túi và chia sẻ khoảnh khắc đẹp.
                </Text>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.iconContainerMain}>
                   <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2666/2666505.png' }} 
                    style={styles.cardIconLarge}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Back Button */}
      <View style={styles.footer}>
        <BlurView intensity={80} tint="light" style={styles.blurWrapper}>
          <TouchableOpacity 
            style={styles.bottomBackButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <View style={styles.backIconCircle}>
              <Feather name="arrow-left" size={18} color="#005CB8" />
            </View>
            <Text style={styles.bottomBackButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 100,
    paddingHorizontal: 20,
    opacity: 0.1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0084FF',
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 132, 255, 0.05)',
  },
  bgCircle2: {
    position: 'absolute',
    top: height * 0.3,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 132, 255, 0.03)',
  },
  bgCircle3: {
    position: 'absolute',
    bottom: -150,
    right: -50,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(0, 132, 255, 0.04)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  aiBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 132, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 132, 255, 0.15)',
  },
  aiBadgeText: {
    color: '#005CB8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  subTitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
    maxWidth: '80%',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  blurWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 132, 255, 0.1)',
  },
  bottomBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBackButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#005CB8',
    letterSpacing: 0.5,
  },
  cardContainer: {
    width: '100%',
    borderRadius: 36,
  },
  cardGradient: {
    borderRadius: 36,
    padding: 28,
    height: 180,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow_1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#005CB8',
    opacity: 0.2,
    borderRadius: 36,
    transform: [{ scale: 1.1 }],
  },
  cardGlow_2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0084FF',
    opacity: 0.2,
    borderRadius: 36,
    transform: [{ scale: 1.1 }],
  },
  glassInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSection: {
    flex: 1,
    paddingRight: 10,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  newTag: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newTagText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  cardRight: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    fontWeight: '600',
  },
  iconContainerMain: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardIconLarge: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  StatusBar,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LuxurySplashScreen() {
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const ring1Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const lineSize = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      // 1. Fade in Background & Logo
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // 2. Animate decorative rings
      Animated.parallel([
        Animated.spring(ring1Scale, {
          toValue: 1,
          tension: 20,
          useNativeDriver: true,
        }),
        Animated.spring(ring2Scale, {
          toValue: 1.2,
          tension: 15,
          useNativeDriver: true,
        }),
      ]),
      // 3. Slide up text & draw the line
      Animated.parallel([
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(lineSize, {
          toValue: 60,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false, // Width animation not supported on native driver
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Premium Soft Background Gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F0F4FF', '#D9E5FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Blur Circles (Glassmorphism effect) */}
      <Animated.View style={[styles.bgCircle1, { transform: [{ scale: ring1Scale }] }]} />
      <Animated.View style={[styles.bgCircle2, { transform: [{ scale: ring2Scale }] }]} />

      <View style={styles.content}>
        {/* Logo Section with Glowing Ring */}
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.circularCard}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          {/* Subtle outer glow ring */}
          <View style={styles.pulseRing} />
        </Animated.View>

        {/* Text Content */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUp }], alignItems: 'center' }}>
          <Text style={styles.brandName}>OwnTrip</Text>

          <Animated.View style={[styles.line, { width: lineSize }]} />

          <Text style={styles.tagline}>EXPLORE THE WORLD YOUR WAY</Text>
        </Animated.View>
      </View>

      {/* Bottom Branding Section */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerVersion}>VERSION 2.0</Text>
        <View style={styles.loadingBarContainer}>
          <View style={styles.loadingBarActive} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 124, 255, 0.05)',
    top: -width * 0.4,
    right: -width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 999,
    backgroundColor: 'rgba(100, 180, 255, 0.04)',
    bottom: height * 0.1,
    left: -width * 0.2,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularCard: {
    width: 160,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    zIndex: 2,
  },
  logo: {
    width: '150%',
    height: '150%',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 124, 255, 0.1)',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 1.5,
  },
  line: {
    height: 4,
    backgroundColor: '#4A7CFF',
    borderRadius: 2,
    marginVertical: 15,
  },
  tagline: {
    fontSize: 12,
    color: '#7C86A2',
    letterSpacing: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  footerVersion: {
    fontSize: 10,
    color: '#A0AEC0',
    letterSpacing: 2,
    marginBottom: 10,
  },
  loadingBarContainer: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(74, 124, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingBarActive: {
    width: '40%',
    height: '100%',
    backgroundColor: '#4A7CFF',
  },
});
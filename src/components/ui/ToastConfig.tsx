import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ToastProps {
  text1?: string;
  text2?: string;
}

const SuccessToast = ({ text1, text2 }: ToastProps) => (
  <View style={[styles.container, styles.successContainer]}>
    <View style={[styles.iconCircle, { backgroundColor: 'rgba(72, 187, 120, 0.15)' }]}>
      <Feather name="check-circle" size={22} color="#48BB78" />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  </View>
);

const ErrorToast = ({ text1, text2 }: ToastProps) => (
  <View style={[styles.container, styles.errorContainer]}>
    <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 101, 101, 0.15)' }]}>
      <Feather name="x-circle" size={22} color="#F56565" />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  </View>
);

const InfoToast = ({ text1, text2 }: ToastProps) => (
  <View style={[styles.container, styles.infoContainer]}>
    <View style={[styles.iconCircle, { backgroundColor: 'rgba(74, 124, 255, 0.15)' }]}>
      <Feather name="info" size={22} color="#4A7CFF" />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  </View>
);

export const toastConfig = {
  success: ({ text1, text2 }: any) => <SuccessToast text1={text1} text2={text2} />,
  error: ({ text1, text2 }: any) => <ErrorToast text1={text1} text2={text2} />,
  info: ({ text1, text2 }: any) => <InfoToast text1={text1} text2={text2} />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#48BB78',
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#F56565',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#4A7CFF',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B4A',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
});

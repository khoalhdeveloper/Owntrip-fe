import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  // Logo — to và nằm giữa trên theo mẫu
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 500,
    height: 500,
  },

  // Nút đăng nhập ở dưới cùng
  bottomContainer: {
    paddingHorizontal: 28,
    paddingBottom: 150,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 14,
  },

  // Google — nền trắng
  googleButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },

  // Email — nền xanh đậm
  emailButton: {
    backgroundColor: '#1A3C5E',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

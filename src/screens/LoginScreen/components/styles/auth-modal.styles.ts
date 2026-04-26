import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#1A2B4A',
  },

  // ===== HEADER (Ảnh du lịch) =====
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'flex-end',
    minHeight: 280,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 24,
    zIndex: 10,
  },
  headerTextContainer: {
    marginTop: 'auto',
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // ===== WHITE CARD =====
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    padding: 24,
    paddingBottom: 40,
  },

  // ===== TAB SWITCHER =====
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 26,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#A0AEC0',
  },
  tabTextActive: {
    color: '#1A2B4A',
    fontWeight: '700',
  },

  // ===== FORM =====
  form: {
    gap: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FAFBFC',
  },
  inputIcon: {
    width: 28,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
    marginLeft: 12,
  },
  eyeButton: {
    padding: 6,
  },

  // ===== OPTIONS ROW =====
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
  },
  optionText: {
    fontSize: 13,
    color: '#A0AEC0',
  },
  forgotText: {
    fontSize: 13,
    color: '#4A7CFF',
    fontWeight: '600',
  },

  // ===== SUBMIT BUTTON =====
  submitButton: {
    backgroundColor: '#4A7CFF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ===== DIVIDER =====
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8ECF0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#A0AEC0',
  },

  // ===== SOCIAL BUTTON =====
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    gap: 10,
    backgroundColor: '#FAFBFC',
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
});

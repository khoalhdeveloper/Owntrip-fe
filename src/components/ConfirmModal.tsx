import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#4A7CFF';

/**
 * Icon presets for common scenarios
 */
type IconPreset = 'info' | 'success' | 'warning' | 'error' | 'delete' | 'question';

const ICON_MAP: Record<IconPreset, { name: string; color: string; bg: string }> = {
  info: { name: 'info', color: BRAND, bg: '#EBF5FF' },
  success: { name: 'check-circle', color: '#10B981', bg: '#ECFDF5' },
  warning: { name: 'alert-triangle', color: '#F59E0B', bg: '#FFFBEB' },
  error: { name: 'x-circle', color: '#EF4444', bg: '#FEF2F2' },
  delete: { name: 'trash-2', color: '#EF4444', bg: '#FEF2F2' },
  question: { name: 'help-circle', color: BRAND, bg: '#EBF5FF' },
};

export interface ConfirmModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ConfirmModalProps {
  visible: boolean;
  /** Title – bold heading */
  title: string;
  /** Message – body text */
  message?: string;
  /** Icon preset or custom Feather icon name */
  icon?: IconPreset | string;
  /** Custom icon color (overrides preset) */
  iconColor?: string;
  /** Buttons (max 2 recommended). Defaults to single "OK" button */
  buttons?: ConfirmModalButton[];
  /** Called when modal is dismissed (backdrop tap / hardware back) */
  onDismiss?: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  icon = 'info',
  iconColor,
  buttons,
  onDismiss,
}: ConfirmModalProps) {
  // Resolve icon
  const preset = ICON_MAP[icon as IconPreset];
  const resolvedIcon = preset?.name ?? icon;
  const resolvedColor = iconColor ?? preset?.color ?? BRAND;
  const resolvedBg = preset?.bg ?? '#EBF5FF';

  // Default button
  const resolvedButtons: ConfirmModalButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'default', onPress: onDismiss }];

  const handlePress = (btn: ConfirmModalButton) => {
    if (btn.style === 'destructive') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    btn.onPress?.();
  };

  const handleBackdropPress = () => {
    // If there's a cancel button, trigger it; otherwise call onDismiss
    const cancelBtn = resolvedButtons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      cancelBtn.onPress?.();
    } else {
      onDismiss?.();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleBackdropPress}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: resolvedBg }]}>
            <Feather name={resolvedIcon as any} size={28} color={resolvedColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Buttons */}
          <View style={[styles.buttonRow, resolvedButtons.length === 1 && styles.buttonRowSingle]}>
            {resolvedButtons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={`btn-${i}`}
                  style={[
                    styles.button,
                    resolvedButtons.length > 1 && { flex: 1 },
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                    isPrimary && !isCancel && styles.buttonPrimary,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                      isPrimary && !isCancel && styles.buttonTextPrimary,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: BRAND,
  },
  buttonCancel: {
    backgroundColor: '#F3F4F6',
  },
  buttonDestructive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#6B7280',
  },
  buttonTextDestructive: {
    color: '#EF4444',
  },
});

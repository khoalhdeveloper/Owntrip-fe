import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CheckinToolbarProps {
  onTakePhoto: () => void;
  onSave: () => void;
  onShare: () => void;
  canSave: boolean;
  bottomOffset?: number;
}

export const CheckinToolbar: React.FC<CheckinToolbarProps> = ({
  onTakePhoto,
  onSave,
  onShare,
  canSave,
  bottomOffset = 0,
}) => {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <TouchableOpacity style={styles.button} onPress={onTakePhoto}>
        <Feather name="camera" size={18} color="#fff" />
        <Text style={styles.buttonText}>Chụp ảnh</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.saveButton, !canSave && styles.disabledButton]}
        onPress={onSave}
        disabled={!canSave}
      >
        <Feather name="download" size={18} color="#fff" />
        <Text style={styles.buttonText}>Lưu</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.shareButton, !canSave && styles.disabledButton]}
        onPress={onShare}
        disabled={!canSave}
      >
        <Feather name="share-2" size={18} color="#fff" />
        <Text style={styles.buttonText}>Chia sẻ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    zIndex: 20,
    elevation: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 25,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  shareButton: {
    backgroundColor: '#9b59b6',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    flexShrink: 1,
  },
});

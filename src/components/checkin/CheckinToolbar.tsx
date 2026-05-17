import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CheckinToolbarProps {
  onTakePhoto: () => void;
  onSave: () => void;
  onShare: () => void;
  canSave: boolean;
}

export const CheckinToolbar: React.FC<CheckinToolbarProps> = ({
  onTakePhoto,
  onSave,
  onShare,
  canSave,
}) => {
  return (
    <View style={styles.container}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
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
    fontSize: 13,
  },
});

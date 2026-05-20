import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const BRAND = '#4A7CFF';

interface NotesModalProps {
  visible: boolean;
  initialNotes: string[];
  onClose: () => void;
  onSave: (notes: string[]) => void;
}

export default function NotesModal({ visible, initialNotes, onClose, onSave }: NotesModalProps) {
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setNotes(initialNotes && initialNotes.length > 0 ? [...initialNotes] : ['']);
    }
  }, [visible, initialNotes]);

  const updateNote = (text: string, index: number) => {
    const newNotes = [...notes];
    newNotes[index] = text;
    setNotes(newNotes);
  };

  const removeNote = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newNotes = notes.filter((_, i) => i !== index);
    if (newNotes.length === 0) newNotes.push('');
    setNotes(newNotes);
  };

  const addNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotes([...notes, '']);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const validNotes = notes.filter(n => n.trim().length > 0);
    onSave(validNotes);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ghi chú chuyến đi</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Thêm các ghi chú nhắc nhở cho chuyến đi của bạn</Text>
          
          {notes.map((note, idx) => (
            <View key={idx} style={styles.noteInputRow}>
              <View style={styles.bulletPoint} />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={(text) => updateNote(text, idx)}
                placeholder="Nhập ghi chú..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <TouchableOpacity onPress={() => removeNote(idx)} style={styles.removeBtn}>
                <Feather name="trash-2" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addNote}>
            <Feather name="plus" size={16} color={BRAND} />
            <Text style={styles.addBtnText}>Thêm ghi chú</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Lưu ghi chú</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND,
    marginTop: 8,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 24,
  },
  removeBtn: { padding: 4, marginLeft: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    marginTop: 4,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: BRAND },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

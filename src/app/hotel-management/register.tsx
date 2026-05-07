import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, StatusBar, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { hotelRequestService } from '@/services/hotelRequestService';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djm9x06oh/image/upload';
const UPLOAD_PRESET = 'owntrip';

const uploadToCloudinary = async (uri: string): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'request.jpg' } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url || null;
  } catch { return null; }
};

export default function HotelOwnerRegistrationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hotelName, setHotelName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      const urls: string[] = [];
      for (const asset of result.assets) {
        const url = await uploadToCloudinary(asset.uri);
        if (url) urls.push(url);
      }
      setImages([...images, ...urls]);
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!hotelName.trim() || !address.trim() || !city.trim() || !phone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      const result = await hotelRequestService.submitRequest({
        hotelName: hotelName.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        description: description.trim(),
        images
      });

      if (result.success) {
        Alert.alert(
          'Thành công',
          'Đơn đăng ký của bạn đã được gửi. Admin sẽ duyệt trong thời gian sớm nhất.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#005CB8', '#007AFF']} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Feather name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Đăng ký chủ khách sạn</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Thông tin khách sạn</Text>
            
            <View style={s.field}>
              <Text style={s.label}>Tên khách sạn *</Text>
              <TextInput 
                style={s.input} 
                value={hotelName} 
                onChangeText={setHotelName} 
                placeholder="Nhập tên khách sạn" 
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Số điện thoại liên hệ *</Text>
              <TextInput 
                style={s.input} 
                value={phone} 
                onChangeText={setPhone} 
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Địa chỉ *</Text>
              <TextInput 
                style={s.input} 
                value={address} 
                onChangeText={setAddress} 
                placeholder="Số nhà, tên đường..." 
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Thành phố *</Text>
              <TextInput 
                style={s.input} 
                value={city} 
                onChangeText={setCity} 
                placeholder="VD: Đà Nẵng" 
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Mô tả</Text>
              <TextInput 
                style={[s.input, s.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Mô tả ngắn gọn về khách sạn của bạn..." 
                multiline 
                numberOfLines={4} 
                textAlignVertical="top" 
              />
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Hình ảnh & Giấy tờ (nếu có)</Text>
            <View style={s.imageGrid}>
              {images.map((uri, i) => (
                <View key={i} style={s.imgWrap}>
                  <Image source={{ uri }} style={s.imgThumb} />
                  <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(i)}>
                    <Feather name="x" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.imgAddBtn} onPress={pickImages} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <>
                    <Feather name="camera" size={22} color="#007AFF" />
                    <Text style={s.imgAddText}>Thêm ảnh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[s.submitBtn, loading && s.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.submitBtnText}>Gửi đơn đăng ký</Text>
            )}
          </TouchableOpacity>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  content: { flex: 1, padding: 20 },
  section: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A202C' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgWrap: { width: 90, height: 70, borderRadius: 10, overflow: 'hidden' },
  imgThumb: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  imgRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  imgAddBtn: { width: 90, height: 70, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imgAddText: { fontSize: 10, color: '#007AFF', fontWeight: '600', marginTop: 2 },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

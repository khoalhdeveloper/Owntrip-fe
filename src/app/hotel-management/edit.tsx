import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, StatusBar, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { hotelManagementService, IHotelManage, IRoomType } from '@/services/hotelManagementService';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djm9x06oh/image/upload';
const UPLOAD_PRESET = 'owntrip';

const uploadToCloudinary = async (uri: string): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'hotel.jpg' } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url || null;
  } catch { return null; }
};

export default function HotelEditScreen() {
  const router = useRouter();
  const { hotelId } = useLocalSearchParams<{ hotelId?: string }>();
  const isEditing = !!hotelId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'rooms'>('info');

  const [name, setName] = useState('');
  const [starRating, setStarRating] = useState('5');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [rooms, setRooms] = useState<IRoomType[]>([]);
  const [editingRoomIdx, setEditingRoomIdx] = useState<number | null>(null);

  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomPrice, setRoomPrice] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('2');
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [roomAmenities, setRoomAmenities] = useState('');

  useEffect(() => { if (isEditing) loadHotelData(); }, [hotelId]);

  const loadHotelData = async () => {
    setLoading(true);
    try {
      const allHotels = await hotelManagementService.getMyHotels();
      const hotel = allHotels.find(h => h.hotelId === hotelId);
      if (hotel) {
        setName(hotel.name || '');
        setStarRating(String(hotel.starRating || 5));
        setFullAddress(hotel.address?.fullAddress || '');
        setCity(hotel.address?.city || '');
        setLat(String(hotel.address?.coordinates?.lat || ''));
        setLng(String(hotel.address?.coordinates?.lng || ''));
        setDescription(hotel.description || '');
        setImages(hotel.images || []);
        setAmenitiesText((hotel.amenities || []).join(', '));
        setTagsText((hotel.tags || []).join(', '));
        setRooms(hotel.rooms || []);
      }
    } catch { Alert.alert('Lỗi', 'Không thể tải thông tin khách sạn'); }
    finally { setLoading(false); }
  };

  const pickImages = async (setter: (imgs: string[]) => void, current: string[]) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const urls: string[] = [];
      for (const asset of result.assets) {
        const url = await uploadToCloudinary(asset.uri);
        if (url) urls.push(url);
      }
      if (urls.length > 0) setter([...current, ...urls]);
    }
  };

  const removeImage = (setter: (imgs: string[]) => void, current: string[], idx: number) => {
    setter(current.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim() || !fullAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Tên khách sạn và địa chỉ là bắt buộc'); return;
    }
    setSaving(true);
    try {
      const hotelData: any = {
        name: name.trim(), starRating: Number(starRating),
        address: { fullAddress: fullAddress.trim(), city: city.trim(), coordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 } },
        images, description: description.trim(),
        amenities: amenitiesText.split(',').map(s => s.trim()).filter(Boolean),
        tags: tagsText.split(',').map(s => s.trim()).filter(Boolean), rooms,
      };
      if (isEditing) {
        await hotelManagementService.updateHotel(hotelId!, hotelData);
        Toast.show({ type: 'success', text1: '✅ Thành công', text2: 'Đã cập nhật khách sạn!' });
      } else {
        await hotelManagementService.createHotel(hotelData);
        Toast.show({ type: 'success', text1: '✅ Thành công', text2: 'Đã tạo khách sạn mới!' });
      }
      router.back();
    } catch (error: any) { Toast.show({ type: 'error', text1: 'Lỗi', text2: error?.message || 'Đã có lỗi xảy ra' }); }
    finally { setSaving(false); }
  };

  const resetRoomForm = () => { setRoomName(''); setRoomDesc(''); setRoomPrice(''); setRoomCapacity('2'); setRoomImages([]); setRoomAmenities(''); setEditingRoomIdx(null); };

  const openEditRoom = (idx: number) => {
    const r = rooms[idx];
    setRoomName(r.name); setRoomDesc(r.description || ''); setRoomPrice(String(r.basePrice || r.price || 0));
    setRoomCapacity(String(r.capacity || 2)); setRoomImages(r.images || []); setRoomAmenities((r.amenities || []).join(', ')); setEditingRoomIdx(idx);
  };

  const handleSaveRoom = () => {
    if (!roomName.trim() || !roomPrice.trim()) { Alert.alert('Thiếu thông tin', 'Tên phòng và giá là bắt buộc'); return; }
    const newRoom: IRoomType = {
      roomTypeId: editingRoomIdx !== null ? rooms[editingRoomIdx].roomTypeId : `room_${Date.now()}`,
      name: roomName.trim(), description: roomDesc.trim(), basePrice: Number(roomPrice),
      capacity: Number(roomCapacity) || 2, images: roomImages,
      amenities: roomAmenities.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (editingRoomIdx !== null) {
      const u = [...rooms]; u[editingRoomIdx] = newRoom; setRooms(u);
      Toast.show({ type: 'success', text1: 'Cập nhật thành công', text2: `Đã sửa phòng "${roomName.trim()}"` });
    } else {
      setRooms([...rooms, newRoom]);
      Toast.show({ type: 'success', text1: 'Thêm thành công', text2: `Đã thêm phòng "${roomName.trim()}"` });
    }
    resetRoomForm();
  };

  const handleDeleteRoom = (idx: number) => {
    Alert.alert('Xóa loại phòng', `Bạn có chắc muốn xóa "${rooms[idx].name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => {
        const deletedName = rooms[idx].name;
        setRooms(rooms.filter((_, i) => i !== idx));
        Toast.show({ type: 'success', text1: 'Xóa thành công', text2: `Đã xóa phòng "${deletedName}"` });
      }},
    ]);
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /></View>;

  const renderImageGrid = (imgs: string[], setter: (i: string[]) => void, onAdd: () => void) => (
    <View style={s.imageGrid}>
      {imgs.map((uri, i) => (
        <View key={i} style={s.imgWrap}>
          <Image source={{ uri }} style={s.imgThumb} />
          <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(setter, imgs, i)}>
            <Feather name="x" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.imgAddBtn} onPress={onAdd}>
        <Feather name="camera" size={22} color="#007AFF" />
        <Text style={s.imgAddText}>Thêm ảnh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#005CB8', '#007AFF']} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Feather name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{isEditing ? 'Chỉnh sửa khách sạn' : 'Thêm khách sạn mới'}</Text>
            <TouchableOpacity onPress={handleSave} style={s.saveBtn} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="check" size={22} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={s.tabs}>
        {(['info', 'rooms'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Feather name={tab === 'info' ? 'info' : 'layers'} size={16} color={activeTab === tab ? '#007AFF' : '#718096'} />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'info' ? 'Thông tin' : `Phòng (${rooms.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'info' ? (
            <>
              <View style={s.section}>
                <Text style={s.sectionTitle}>Thông tin cơ bản</Text>
                <View style={s.field}><Text style={s.label}>Tên khách sạn *</Text>
                  <TextInput style={s.input} value={name} onChangeText={setName} placeholder="VD: Novotel Danang" /></View>
                <View style={s.field}><Text style={s.label}>Số sao</Text>
                  <View style={s.starRow}>{[1,2,3,4,5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setStarRating(String(n))}>
                      <MaterialIcons name="star" size={32} color={n <= Number(starRating) ? '#FFB300' : '#E2E8F0'} />
                    </TouchableOpacity>
                  ))}</View></View>
                <View style={s.field}><Text style={s.label}>Mô tả</Text>
                  <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="Mô tả chi tiết..." multiline numberOfLines={4} textAlignVertical="top" /></View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Địa chỉ</Text>
                <View style={s.field}><Text style={s.label}>Địa chỉ đầy đủ *</Text>
                  <TextInput style={s.input} value={fullAddress} onChangeText={setFullAddress} placeholder="36 Bạch Đằng, Đà Nẵng" /></View>
                <View style={s.field}><Text style={s.label}>Thành phố</Text>
                  <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="Da Nang" /></View>
                <View style={s.rowFields}>
                  <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Latitude</Text>
                    <TextInput style={s.input} value={lat} onChangeText={setLat} placeholder="16.0772" keyboardType="decimal-pad" /></View>
                  <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Longitude</Text>
                    <TextInput style={s.input} value={lng} onChangeText={setLng} placeholder="108.2241" keyboardType="decimal-pad" /></View>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Hình ảnh khách sạn</Text>
                {renderImageGrid(images, setImages, () => pickImages(setImages, images))}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Tiện ích & Tags</Text>
                <View style={s.field}><Text style={s.label}>Tiện ích (phân cách dấu phẩy)</Text>
                  <TextInput style={s.input} value={amenitiesText} onChangeText={setAmenitiesText} placeholder="Hồ bơi, Wifi, Spa" /></View>
                <View style={s.field}><Text style={s.label}>Tags (phân cách dấu phẩy)</Text>
                  <TextInput style={s.input} value={tagsText} onChangeText={setTagsText} placeholder="Bán chạy nhất, Sang trọng" /></View>
              </View>
            </>
          ) : (
            <>
              <View style={s.section}>
                <Text style={s.sectionTitle}>{editingRoomIdx !== null ? '✏️ Sửa loại phòng' : '➕ Thêm loại phòng'}</Text>
                <View style={s.field}><Text style={s.label}>Tên phòng *</Text>
                  <TextInput style={s.input} value={roomName} onChangeText={setRoomName} placeholder="Phòng Deluxe View Sông" /></View>
                <View style={s.field}><Text style={s.label}>Mô tả phòng</Text>
                  <TextInput style={[s.input, s.textArea]} value={roomDesc} onChangeText={setRoomDesc} placeholder="Mô tả..." multiline numberOfLines={3} textAlignVertical="top" /></View>
                <View style={s.rowFields}>
                  <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Giá/đêm (VNĐ) *</Text>
                    <TextInput style={s.input} value={roomPrice} onChangeText={setRoomPrice} placeholder="2800000" keyboardType="number-pad" /></View>
                  <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Sức chứa</Text>
                    <TextInput style={s.input} value={roomCapacity} onChangeText={setRoomCapacity} placeholder="2" keyboardType="number-pad" /></View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Ảnh phòng</Text>
                  {renderImageGrid(roomImages, setRoomImages, () => pickImages(setRoomImages, roomImages))}
                </View>

                <View style={s.field}><Text style={s.label}>Tiện nghi phòng (dấu phẩy)</Text>
                  <TextInput style={s.input} value={roomAmenities} onChangeText={setRoomAmenities} placeholder="Điều hòa, Tivi, Minibar" /></View>

                <View style={s.roomActions}>
                  {editingRoomIdx !== null && (
                    <TouchableOpacity style={s.cancelRoomBtn} onPress={resetRoomForm}><Text style={s.cancelRoomText}>Hủy</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.addRoomBtn} onPress={handleSaveRoom}>
                    <Feather name={editingRoomIdx !== null ? 'check' : 'plus'} size={16} color="#FFF" />
                    <Text style={s.addRoomText}>{editingRoomIdx !== null ? 'Cập nhật phòng' : 'Thêm phòng'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {rooms.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Danh sách phòng ({rooms.length})</Text>
                  {rooms.map((room, idx) => (
                    <View key={room.roomTypeId || idx} style={s.roomCard}>
                      {room.images?.[0] && <Image source={{ uri: room.images[0] }} style={s.roomCardImage} />}
                      <View style={s.roomCardInfo}>
                        <Text style={s.roomCardName}>{room.name}</Text>
                        <Text style={s.roomCardPrice}>{(room.basePrice || room.price || 0).toLocaleString('vi-VN')}đ/đêm</Text>
                        <View style={s.roomCardMeta}>
                          <Feather name="users" size={12} color="#718096" />
                          <Text style={s.roomCardMetaText}>{room.capacity} khách</Text>
                        </View>
                      </View>
                      <View style={s.roomCardActions}>
                        <TouchableOpacity onPress={() => openEditRoom(idx)} style={s.roomActionBtn}><Feather name="edit-2" size={16} color="#3182CE" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteRoom(idx)} style={s.roomActionBtn}><Feather name="trash-2" size={16} color="#E53E3E" /></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  saveBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#718096', fontWeight: '600' },
  tabTextActive: { color: '#007AFF' },
  content: { flex: 1, padding: 20 },
  section: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A202C', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A202C' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12 },
  starRow: { flexDirection: 'row', gap: 4 },
  // Image Grid
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgWrap: { width: 90, height: 70, borderRadius: 10, overflow: 'hidden' },
  imgThumb: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  imgRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  imgAddBtn: { width: 90, height: 70, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imgAddText: { fontSize: 10, color: '#007AFF', fontWeight: '600', marginTop: 2 },
  // Room Actions
  roomActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelRoomBtn: { flex: 1, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelRoomText: { fontSize: 14, fontWeight: '600', color: '#718096' },
  addRoomBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 12 },
  addRoomText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Room Cards
  roomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EDF2F7' },
  roomCardImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#E2E8F0', marginRight: 12 },
  roomCardInfo: { flex: 1 },
  roomCardName: { fontSize: 14, fontWeight: '700', color: '#1A202C', marginBottom: 2 },
  roomCardPrice: { fontSize: 13, fontWeight: '700', color: '#007AFF', marginBottom: 4 },
  roomCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomCardMetaText: { fontSize: 11, color: '#718096' },
  roomCardActions: { gap: 8 },
  roomActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDF2F7' },
});

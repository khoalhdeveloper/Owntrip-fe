import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { tripService } from '@/services/tripService';
import { useConfirm } from '@/components/ConfirmProvider';

import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

const VN_PROVINCES = [
  "An Giang", "Ba Ria - Vung Tau", "Bac Giang", "Bac Kan", "Bac Lieu", "Bac Ninh", "Ben Tre", 
  "Binh Dinh", "Binh Duong", "Binh Phuoc", "Binh Thuan", "Ca Mau", "Can Tho", "Cao Bang", 
  "Da Nang", "Dak Lak", "Dak Nong", "Dien Bien", "Dong Nai", "Dong Thap", "Gia Lai", 
  "Ha Giang", "Ha Nam", "Ha Noi", "Ha Tinh", "Hai Duong", "Hai Phong", "Hau Giang", 
  "Hoa Binh", "Hung Yen", "Khanh Hoa", "Kien Giang", "Kon Tum", "Lai Chau", "Lam Dong", 
  "Lang Son", "Lao Cai", "Long An", "Nam Dinh", "Nghe An", "Ninh Binh", "Ninh Thuan", 
  "Phu Tho", "Phu Yen", "Quang Bình", "Quang Nam", "Quang Ngai", "Quang Ninh", "Quang Tri", 
  "Soc Trang", "Son La", "Tay Ninh", "Thai Binh", "Thai Nguyen", "Thanh Hoa", "Thua Thien Hue", 
  "Tien Giang", "TP. Ho Chi Minh", "Tra Vinh", "Tuyen Quang", "Vinh Long", "Vinh Phuc", "Yen Bai"
];

const removeAccents = (str: string) => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export default function CreateTripScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { alert: showAlert } = useConfirm();
  
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 2), // +2 days
    description: '',
  });

  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleDestinationChange = (text: string) => {
    setFormData({ ...formData, destination: text });
    if (text.length > 0) {
      const normalizedText = removeAccents(text.toLowerCase());
      
      const filtered = VN_PROVINCES.filter(p => {
        const normalizedP = removeAccents(p.toLowerCase());
        return normalizedP.includes(normalizedText);
      }).sort((a, b) => {
        const normA = removeAccents(a.toLowerCase());
        const normB = removeAccents(b.toLowerCase());
        
        // Ưu tiên bắt đầu bằng chữ đó
        const aStarts = normA.startsWith(normalizedText);
        const bStarts = normB.startsWith(normalizedText);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Ưu tiên bắt đầu của một từ trong tên (VD: gõ "T" thì "Vũng Tàu" lên trước "Hà Tĩnh")
        const aWordStarts = normA.includes(" " + normalizedText);
        const bWordStarts = normB.includes(" " + normalizedText);
        
        if (aWordStarts && !bWordStarts) return -1;
        if (!aWordStarts && bWordStarts) return 1;

        return a.localeCompare(b, 'vi');
      });

      setSuggestions(filtered.slice(0, 8)); // Giới hạn 8 gợi ý cho gọn
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (province: string) => {
    setFormData({ ...formData, destination: province });
    setShowSuggestions(false);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.destination) {
      showAlert("Thiếu thông tin", "Vui lòng nhập tiêu đề và điểm đến.", "warning");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        startDate: formData.startDate.toISOString().split('T')[0],
        endDate: formData.endDate.toISOString().split('T')[0],
      };
      
      const result = await tripService.createTrip(payload);
      if (result) {
        await showAlert(
          "Tuyệt vời! ✈️",
          "Kế hoạch hành trình của bạn đã được tạo thành công.",
          "success"
        );
        router.replace('/(tabs)/trips');
      }
    } catch (error) {
      showAlert("Lỗi", "Không thể tạo chuyến đi. Vui lòng kiểm tra lại kết nối.", "error");
    } finally {
      setLoading(false);
    }
  };

  const onStartChange = (event: any, selectedDate?: Date) => {
    setShowStart(false);
    if (selectedDate) {
      setFormData({ ...formData, startDate: selectedDate });
    }
  };

  const onEndChange = (event: any, selectedDate?: Date) => {
    setShowEnd(false);
    if (selectedDate) {
      setFormData({ ...formData, endDate: selectedDate });
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Decorative Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.headerBG}>
        <LinearGradient
          colors={['#005CB8', '#007AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Feather name="settings" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Hành trình mới</Text>
          <Text style={styles.headerSubTitle}>Lên kế hoạch cho hành trình tiếp theo của bạn</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Chi tiết chuyến đi</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên chuyến đi</Text>
            <View style={styles.inputWrapper}>
              <Feather name="map" size={18} color="#A0AEC0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Khám phá Hà Nội"
                placeholderTextColor="#A0AEC0"
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Điểm đến</Text>
            <View style={{ zIndex: 1000 }}>
              <View style={styles.inputWrapper}>
                <Feather name="navigation" size={18} color="#A0AEC0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Thành phố, địa điểm..."
                  placeholderTextColor="#A0AEC0"
                  value={formData.destination}
                  onChangeText={handleDestinationChange}
                />
              </View>
              
              {showSuggestions && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {suggestions.map((province, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectSuggestion(province)}
                      >
                        <Feather name="map-pin" size={14} color="#007AFF" style={{ marginRight: 10 }} />
                        <Text style={styles.suggestionText}>{province}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>Ngày đi</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                onPress={() => setShowStart(true)}
              >
                <Feather name="calendar" size={18} color="#005CB8" style={styles.inputIcon} />
                <Text style={styles.dateText}>
                  {formData.startDate.toLocaleDateString('vi-VN')}
                </Text>
              </TouchableOpacity>
              {showStart && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={onStartChange}
                />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Ngày về</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                onPress={() => setShowEnd(true)}
              >
                <Feather name="calendar" size={18} color="#005CB8" style={styles.inputIcon} />
                <Text style={styles.dateText}>
                  {formData.endDate.toLocaleDateString('vi-VN')}
                </Text>
              </TouchableOpacity>
              {showEnd && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={onEndChange}
                  minimumDate={formData.startDate}
                />
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mô tả (Tùy chọn)</Text>
            <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12, height: 100 }]}>
              <Feather name="align-left" size={18} color="#A0AEC0" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                placeholder="Ghi chú cho chuyến đi này..."
                placeholderTextColor="#A0AEC0"
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleCreate}
          disabled={loading}
        >
          <LinearGradient
            colors={['#005CB8', '#0084FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitText}>Tạo hành trình ngay</Text>
                <Feather name="arrow-right" size={20} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  bgCircle2: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  headerBG: {
    height: 240,
    paddingTop: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubTitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -50,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 15,
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#718096',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 9999,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  suggestionText: {
    fontSize: 15,
    color: '#2D3748',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
  },
  submitButton: {
    width: '100%',
    height: 64,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

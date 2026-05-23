import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useConfirm } from '@/components/ConfirmProvider';
import { partnerService, IOwnerRegistration } from '@/services/partnerService';

const { width } = Dimensions.get('window');

const PROPERTY_TYPES = [
  { id: 'hotel', label: 'Khách sạn', icon: 'hotel' },
  { id: 'homestay', label: 'Homestay', icon: 'home' },
  { id: 'apartment', label: 'Căn hộ', icon: 'building' },
];

const AMENITIES_LIST = [
  'Wifi', 'Máy lạnh', 'TV', 'Tủ lạnh', 'Máy giặt', 'Hồ bơi', 'Bãi đậu xe', 'Lễ tân 24h', 'Thang máy', 'Gym'
];

export default function HotelOwnerRegistrationScreen() {
  const router = useRouter();
  const { alert: showAlert } = useConfirm();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form State
  const [registrationData, setRegistrationData] = useState<IOwnerRegistration>({
    legalDocuments: {
      businessLicense: '',
      securityCertificate: '',
      pcccCertificate: '',
      identityCardFront: '',
      identityCardBack: '',
      leaseContract: '',
    },
    propertyInfo: {
      name: '',
      address: '',
      city: '',
      coordinates: { lat: 0, lng: 0 },
      type: 'hotel',
    },
    phone: '',
    images: [],
    amenities: [],
    businessPolicies: {
      cancellationPolicy: 'Hoàn tiền 100% nếu hủy trước 24h',
      childPolicy: 'Trẻ em dưới 6 tuổi miễn phí',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      extraCosts: '',
    },
    description: '',
  });

  const pickImage = async (field: string, isLegalDoc: boolean = true) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadToCloudinary(uri, field, isLegalDoc);
    }
  };

  const uploadToCloudinary = async (uri: string, field: string, isLegalDoc: boolean) => {
    try {
      setUploading(field);
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('upload_preset', 'owntrip');

      const response = await fetch('https://api.cloudinary.com/v1_1/djm9x06oh/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.secure_url) {
        if (isLegalDoc) {
          setRegistrationData(prev => ({
            ...prev,
            legalDocuments: { ...prev.legalDocuments, [field]: data.secure_url }
          }));
        } else {
          setRegistrationData(prev => ({
            ...prev,
            images: [...prev.images, data.secure_url]
          }));
        }
      } else {
        showAlert("Lỗi", "Không thể upload ảnh. Vui lòng thử lại.", "error");
      }
    } catch (error) {
      showAlert("Lỗi", "Lỗi kết nối khi upload ảnh.", "error");
    } finally {
      setUploading(null);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const toggleAmenity = (amenity: string) => {
    setRegistrationData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!registrationData.legalDocuments.businessLicense || !registrationData.legalDocuments.identityCardFront || !registrationData.legalDocuments.identityCardBack) {
      showAlert("Thiếu hồ sơ", "Vui lòng tải lên đầy đủ giấy phép kinh doanh và CCCD (cả 2 mặt).", "warning");
      return;
    }
    if (!registrationData.propertyInfo.name || !registrationData.propertyInfo.address || !registrationData.phone) {
      showAlert("Thiếu thông tin", "Vui lòng nhập tên, địa chỉ và số điện thoại liên hệ.", "warning");
      return;
    }

    try {
      setLoading(true);
      await partnerService.registerHotelOwner(registrationData);
      await showAlert("Thành công! 🎉", "Hồ sơ của bạn đã được gửi và đang chờ duyệt. Chúng tôi sẽ phản hồi sớm nhất có thể.", "success");
      router.replace('/(tabs)/profile');
    } catch (error) {
      showAlert("Lỗi", "Đã có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại sau.", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepWrapper}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            {currentStep > step ? (
              <Feather name="check" size={16} color="#FFF" />
            ) : (
              <Text style={[styles.stepText, currentStep >= step && styles.stepTextActive]}>{step}</Text>
            )}
          </View>
          {step < 4 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Hồ sơ pháp lý</Text>
      <Text style={styles.stepDesc}>Chứng minh cơ sở hoạt động hợp pháp</Text>

      <View style={styles.uploadGrid}>
        {[
          { id: 'businessLicense', label: 'GP Đăng ký kinh doanh', icon: 'file-text' },
          { id: 'securityCertificate', label: 'CN An ninh trật tự', icon: 'shield' },
          { id: 'pcccCertificate', label: 'CN PCCC', icon: 'fire' },
          { id: 'identityCardFront', label: 'CCCD (Mặt trước)', icon: 'user' },
          { id: 'identityCardBack', label: 'CCCD (Mặt sau)', icon: 'user' },
        ].map((doc) => (
          <TouchableOpacity 
            key={doc.id} 
            style={styles.uploadCard} 
            onPress={() => pickImage(doc.id)}
            disabled={!!uploading}
          >
            {registrationData.legalDocuments[doc.id as keyof typeof registrationData.legalDocuments] ? (
              <Image 
                source={{ uri: registrationData.legalDocuments[doc.id as keyof typeof registrationData.legalDocuments] }} 
                style={styles.uploadedImg} 
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                {uploading === doc.id ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <>
                    <View style={styles.uploadIconCircle}>
                      {doc.id === 'pcccCertificate' ? <FontAwesome5 name="fire" size={24} color="#007AFF" /> : <Feather name={doc.icon as any} size={24} color="#007AFF" />}
                    </View>
                    <Text style={styles.uploadLabel}>{doc.label}</Text>
                  </>
                )}
              </View>
            )}
            {registrationData.legalDocuments[doc.id as keyof typeof registrationData.legalDocuments] && (
               <View style={styles.editBadge}>
                 <Feather name="edit-2" size={12} color="#FFF" />
               </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {registrationData.propertyInfo.type !== 'hotel' && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.inputLabel}>Hợp đồng thuê nhà / Sổ đỏ (Đối với Homestay/Apartment)</Text>
          <TouchableOpacity 
            style={[styles.uploadCard, { width: '100%', height: 120 }]} 
            onPress={() => pickImage('leaseContract')}
          >
             {registrationData.legalDocuments.leaseContract ? (
              <Image source={{ uri: registrationData.legalDocuments.leaseContract }} style={styles.uploadedImg} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                 <Feather name="file-plus" size={24} color="#007AFF" />
                 <Text style={styles.uploadLabel}>Tải lên tài liệu</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Thông tin cơ sở</Text>
      <Text style={styles.stepDesc}>Cung cấp thông tin vị trí và tên cơ sở</Text>

      <View style={styles.typeRow}>
        {PROPERTY_TYPES.map(type => (
          <TouchableOpacity 
            key={type.id} 
            style={[styles.typeBtn, registrationData.propertyInfo.type === type.id && styles.typeBtnActive]}
            onPress={() => setRegistrationData(prev => ({ ...prev, propertyInfo: { ...prev.propertyInfo, type: type.id as any } }))}
          >
            <FontAwesome5 name={type.icon} size={20} color={registrationData.propertyInfo.type === type.id ? '#FFF' : '#718096'} />
            <Text style={[styles.typeBtnText, registrationData.propertyInfo.type === type.id && styles.typeBtnTextActive]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tên cơ sở chính xác</Text>
        <View style={styles.inputWrapper}>
          <Feather name="home" size={18} color="#A0AEC0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Grand Hotel"
            value={registrationData.propertyInfo.name}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, propertyInfo: { ...prev.propertyInfo, name: t } }))}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Địa chỉ đầy đủ</Text>
        <View style={styles.inputWrapper}>
          <Feather name="map-pin" size={18} color="#A0AEC0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Số nhà, tên đường, phường/xã..."
            value={registrationData.propertyInfo.address}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, propertyInfo: { ...prev.propertyInfo, address: t } }))}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Thành phố</Text>
        <View style={styles.inputWrapper}>
          <Feather name="navigation" size={18} color="#A0AEC0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Đà Nẵng"
            value={registrationData.propertyInfo.city}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, propertyInfo: { ...prev.propertyInfo, city: t } }))}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
        <View style={styles.inputWrapper}>
          <Feather name="phone" size={18} color="#A0AEC0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại dùng để hỗ trợ..."
            keyboardType="phone-pad"
            value={registrationData.phone}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, phone: t }))}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.mapBtn}>
        <Feather name="map" size={18} color="#007AFF" />
        <Text style={styles.mapBtnText}>Xác minh vị trí trên Google Maps</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Hình ảnh & Tiện nghi</Text>
      <Text style={styles.stepDesc}>Tải lên 10-15 ảnh và chọn tiện nghi có sẵn</Text>

      <Text style={styles.inputLabel}>Hình ảnh (Mặt tiền, Sảnh, Phòng ngủ...)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
        <TouchableOpacity style={styles.addImageBtn} onPress={() => pickImage('property', false)}>
          <Feather name="plus" size={32} color="#007AFF" />
        </TouchableOpacity>
        {registrationData.images.map((img, idx) => (
          <View key={idx} style={styles.imageItem}>
            <Image source={{ uri: img }} style={styles.propertyImg} />
            <TouchableOpacity 
              style={styles.removeImgBtn}
              onPress={() => setRegistrationData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
            >
              <Feather name="x" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.inputLabel, { marginTop: 20 }]}>Tiện nghi cơ sở</Text>
      <View style={styles.amenitiesGrid}>
        {AMENITIES_LIST.map((item) => (
          <TouchableOpacity 
            key={item} 
            style={[styles.amenityTag, registrationData.amenities.includes(item) && styles.amenityTagActive]}
            onPress={() => toggleAmenity(item)}
          >
            <Text style={[styles.amenityText, registrationData.amenities.includes(item) && styles.amenityTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.inputGroup, { marginTop: 20 }]}>
        <Text style={styles.inputLabel}>Mô tả chung</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Giới thiệu đôi nét về cơ sở của bạn..."
          multiline
          numberOfLines={4}
          value={registrationData.description}
          onChangeText={(t) => setRegistrationData(prev => ({ ...prev, description: t }))}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Chính sách kinh doanh</Text>
      <Text style={styles.stepDesc}>Thiết lập quy định cho khách hàng</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Chính sách hủy phòng</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={registrationData.businessPolicies.cancellationPolicy}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, businessPolicies: { ...prev.businessPolicies, cancellationPolicy: t } }))}
          />
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.inputLabel}>Giờ nhận phòng</Text>
          <View style={styles.inputWrapper}>
             <Feather name="clock" size={18} color="#A0AEC0" style={styles.inputIcon} />
             <TextInput
                style={styles.input}
                value={registrationData.businessPolicies.checkInTime}
                onChangeText={(t) => setRegistrationData(prev => ({ ...prev, businessPolicies: { ...prev.businessPolicies, checkInTime: t } }))}
             />
          </View>
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Giờ trả phòng</Text>
          <View style={styles.inputWrapper}>
             <Feather name="clock" size={18} color="#A0AEC0" style={styles.inputIcon} />
             <TextInput
                style={styles.input}
                value={registrationData.businessPolicies.checkOutTime}
                onChangeText={(t) => setRegistrationData(prev => ({ ...prev, businessPolicies: { ...prev.businessPolicies, checkOutTime: t } }))}
             />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Chính sách trẻ em</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={registrationData.businessPolicies.childPolicy}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, businessPolicies: { ...prev.businessPolicies, childPolicy: t } }))}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Chi phí phụ khác (nếu có)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Phí dọn dẹp, phí đưa đón..."
            value={registrationData.businessPolicies.extraCosts}
            onChangeText={(t) => setRegistrationData(prev => ({ ...prev, businessPolicies: { ...prev.businessPolicies, extraCosts: t } }))}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Feather name="info" size={18} color="#005CB8" />
        <Text style={styles.infoBoxText}>Bằng cách nhấn gửi, bạn đồng ý với các điều khoản và chính sách đối tác của Owntrip.</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.headerBG}>
        <LinearGradient
          colors={['#005CB8', '#007AFF']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hợp tác với Owntrip</Text>
          <View style={{ width: 44 }} />
        </View>
        {renderStepIndicator()}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </View>

        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>Quay lại</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.nextBtn, currentStep === 1 && { width: '100%' }]} 
            onPress={currentStep === 4 ? handleSubmit : nextStep}
            disabled={loading}
          >
            <LinearGradient
              colors={['#005CB8', '#0084FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>{currentStep === 4 ? 'Gửi hồ sơ' : 'Tiếp theo'}</Text>
                  <Feather name="arrow-right" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBG: {
    height: 180,
    paddingTop: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepCircleActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
  },
  stepTextActive: {
    color: '#007AFF',
  },
  stepLine: {
    width: width * 0.12,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    marginTop: -30,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  stepContent: {
    minHeight: 300,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A2B4A',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 24,
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  uploadCard: {
    width: (width - 103) / 2,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
    textAlign: 'center',
  },
  uploadedImg: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#718096',
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A5568',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
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
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#EBF8FF',
    marginTop: 10,
  },
  mapBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  imagesScroll: {
    flexDirection: 'row',
    marginTop: 10,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
  },
  propertyImg: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  amenityTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityTagActive: {
    backgroundColor: '#EBF8FF',
    borderColor: '#007AFF',
  },
  amenityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  amenityTextActive: {
    color: '#007AFF',
  },
  textArea: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    height: 120,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    fontSize: 16,
    color: '#2D3748',
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 12,
    gap: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#005CB8',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#718096',
  },
  nextBtn: {
    flex: 2,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});

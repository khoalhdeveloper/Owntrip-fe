import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ImageBackground,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { FontAwesome, MaterialIcons, Feather } from '@expo/vector-icons';
import { authService } from '@/services/authService';

import { styles } from './styles/auth-modal.styles';
import { toastConfig } from '@/components/ui/ToastConfig';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: (data: any) => void;
  onGoogleLogin: () => void;
}

type TabType = 'login' | 'register';

export default function AuthModal({
  visible,
  onClose,
  onLoginSuccess,
  onGoogleLogin,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setShowPassword(false);
  };

  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng nhập email và mật khẩu' });
      return;
    }
    setLoading(true);
    try {
      const result = await authService.login(email.trim(), password);
      console.log('=== LOGIN RESULT ===', JSON.stringify(result));
      // Navigate trước, đóng modal sau — tránh flash login screen
      onLoginSuccess(result);
      resetForm();
      onClose();
    } catch (error: any) {
      console.log('=== LOGIN ERROR ===', JSON.stringify(error?.response?.data));
      const msg = error?.response?.data?.message || 'Email hoặc mật khẩu không đúng';
      Toast.show({ type: 'error', text1: 'Đăng nhập thất bại', text2: msg });
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }
    setLoading(true);
    try {
      await authService.register(email.trim(), password, displayName.trim());
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đăng ký thành công! Hãy đăng nhập.',
      });
      // Giữ email, chỉ xóa password + name, chuyển sang tab Login
      setPassword('');
      setDisplayName('');
      setActiveTab('login');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Đăng ký thất bại';
      Toast.show({ type: 'error', text1: 'Đăng ký thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          {/* Header ảnh du lịch */}
          <ImageBackground
            source={require('@/assets/images/nguoidulich.jpg')}
            style={styles.header}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay} />
            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {activeTab === 'login'
                  ? 'Chào mừng quay lại với\nOwnTrip'
                  : 'Tạo tài khoản\ncủa bạn'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {activeTab === 'login'
                  ? 'Đăng nhập để tiếp tục hành trình'
                  : 'Đăng ký để tận hưởng trải nghiệm tốt nhất'}
              </Text>
            </View>
          </ImageBackground>

          {/* White Card */}
          <KeyboardAvoidingView
            style={styles.cardWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.card}
              contentContainerStyle={styles.cardContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Tab Switcher */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'login' && styles.tabActive]}
                  onPress={() => handleTabSwitch('login')}
                >
                  <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'register' && styles.tabActive]}
                  onPress={() => handleTabSwitch('register')}
                >
                  <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                    Đăng ký
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Tên — chỉ hiện khi đăng ký */}
                {activeTab === 'register' && (
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={20} color="#A0AEC0" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Họ và tên"
                      placeholderTextColor="#A0AEC0"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                {/* Email */}
                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="mail-outline"
                    size={20}
                    color="#A0AEC0"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Địa chỉ Email"
                    placeholderTextColor="#A0AEC0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color="#A0AEC0"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#A0AEC0" />
                  </TouchableOpacity>
                </View>

                {/* Remember me + Forget Password */}
                {activeTab === 'login' && (
                  <View style={styles.optionsRow}>
                    <Text style={styles.optionText}>Ghi nhớ tôi</Text>
                    <TouchableOpacity>
                      <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={activeTab === 'login' ? handleLogin : handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>
                      {activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    setTimeout(onGoogleLogin, 300);
                  }}
                >
                  <FontAwesome name="google" size={20} color="#4285F4" />
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
      <Toast config={toastConfig} />
    </Modal>
  );
}

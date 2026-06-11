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

type TabType = 'login' | 'register' | 'verify_email_otp' | 'forgot_password_email' | 'forgot_password_otp';

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
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setOtp('');
    setNewPassword('');
    setShowPassword(false);
  };

  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleBack = () => {
    if (activeTab === 'forgot_password_otp') {
      setActiveTab('forgot_password_email');
    } else if (activeTab === 'forgot_password_email') {
      setActiveTab('login');
    } else if (activeTab === 'verify_email_otp') {
      setActiveTab('login');
    } else {
      onClose();
    }
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
      if (msg.includes('xác thực email')) {
        Toast.show({ type: 'error', text1: 'Chưa xác thực', text2: msg });
        setActiveTab('verify_email_otp');
      } else {
        Toast.show({ type: 'error', text1: 'Đăng nhập thất bại', text2: msg });
      }
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
        text2: 'Đăng ký thành công! Hãy xác nhận mã OTP.',
      });
      // Giữ email, chỉ xóa password + name, chuyển sang tab verify
      setPassword('');
      setDisplayName('');
      setActiveTab('verify_email_otp');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Đăng ký thất bại';
      Toast.show({ type: 'error', text1: 'Đăng ký thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email.trim() || !otp.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng nhập mã OTP' });
      return;
    }
    setLoading(true);
    try {
      await authService.verifyEmail(email.trim(), otp.trim());
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Xác thực thành công. Vui lòng đăng nhập.' });
      setOtp('');
      setActiveTab('login');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Xác thực thất bại';
      Toast.show({ type: 'error', text1: 'Thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerifyOTP = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.resendOTP(email.trim());
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã gửi lại mã OTP. Vui lòng kiểm tra email.' });
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gửi lại mã OTP thất bại';
      Toast.show({ type: 'error', text1: 'Thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng nhập email' });
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPasswordSendOTP(email.trim());
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Mã OTP đã được gửi đến email của bạn' });
      setActiveTab('forgot_password_otp');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gửi OTP thất bại';
      Toast.show({ type: 'error', text1: 'Thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPasswordReset(email.trim(), otp.trim(), newPassword);
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đặt lại mật khẩu thành công. Hãy đăng nhập.' });
      setActiveTab('login');
      resetForm();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Đặt lại mật khẩu thất bại';
      Toast.show({ type: 'error', text1: 'Thất bại', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderTitle = () => {
    if (activeTab === 'login') return 'Chào mừng quay lại với\nOwnTrip';
    if (activeTab === 'register') return 'Tạo tài khoản\ncủa bạn';
    if (activeTab === 'verify_email_otp') return 'Xác thực tài khoản';
    if (activeTab === 'forgot_password_email') return 'Khôi phục mật khẩu';
    if (activeTab === 'forgot_password_otp') return 'Tạo mật khẩu mới';
    return '';
  };

  const renderHeaderSubtitle = () => {
    if (activeTab === 'login') return 'Đăng nhập để tiếp tục hành trình';
    if (activeTab === 'register') return 'Đăng ký để tận hưởng trải nghiệm tốt nhất';
    if (activeTab === 'verify_email_otp') return 'Nhập mã OTP vừa được gửi đến email của bạn';
    if (activeTab === 'forgot_password_email') return 'Nhập email để nhận mã xác nhận OTP';
    if (activeTab === 'forgot_password_otp') return 'Nhập mã OTP và mật khẩu mới của bạn';
    return '';
  };

  const isForgotPassword = activeTab === 'forgot_password_email' || activeTab === 'forgot_password_otp';
  const isVerifyEmail = activeTab === 'verify_email_otp';

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
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{renderHeaderTitle()}</Text>
              <Text style={styles.headerSubtitle}>{renderHeaderSubtitle()}</Text>
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
              {!isForgotPassword && !isVerifyEmail && (
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
              )}

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

                {/* Email - Hiện ở đăng ký, đăng nhập, forgot_email */}
                {(activeTab !== 'forgot_password_otp' && activeTab !== 'verify_email_otp') && (
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
                )}

                {/* OTP - Chỉ hiện ở forgot_otp hoặc verify_email_otp */}
                {(activeTab === 'forgot_password_otp' || activeTab === 'verify_email_otp') && (
                  <View style={styles.inputContainer}>
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color="#A0AEC0"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mã OTP (6 số)"
                      placeholderTextColor="#A0AEC0"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                )}

                {/* Password - Đăng ký, đăng nhập */}
                {(activeTab === 'login' || activeTab === 'register') && (
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
                )}

                {/* New Password - Chỉ hiện ở forgot_otp */}
                {activeTab === 'forgot_password_otp' && (
                  <View style={styles.inputContainer}>
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color="#A0AEC0"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Mật khẩu mới"
                      placeholderTextColor="#A0AEC0"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#A0AEC0" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Remember me + Forget Password */}
                {activeTab === 'login' && (
                  <View style={styles.optionsRow}>
                    <Text style={styles.optionText}>Ghi nhớ tôi</Text>
                    <TouchableOpacity onPress={() => setActiveTab('forgot_password_email')}>
                      <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Resend OTP */}
                {activeTab === 'verify_email_otp' && (
                  <View style={[styles.optionsRow, { justifyContent: 'center', marginBottom: 15 }]}>
                    <TouchableOpacity onPress={handleResendVerifyOTP} disabled={loading}>
                      <Text style={[styles.forgotText, { color: '#4285F4' }]}>Gửi lại mã xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={
                    activeTab === 'login' ? handleLogin :
                    activeTab === 'register' ? handleRegister :
                    activeTab === 'verify_email_otp' ? handleVerifyEmail :
                    activeTab === 'forgot_password_email' ? handleSendOTP :
                    handleResetPassword
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>
                      {activeTab === 'login' ? 'Đăng nhập' : 
                       activeTab === 'register' ? 'Đăng ký' :
                       activeTab === 'verify_email_otp' ? 'Xác nhận' :
                       activeTab === 'forgot_password_email' ? 'Gửi mã OTP' :
                       'Xác nhận đặt lại'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider & Google - hide in forgot password */}
                {!isForgotPassword && !isVerifyEmail && (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
                      <View style={styles.dividerLine} />
                    </View>

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
                  </>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
      <Toast config={toastConfig} />
    </Modal>
  );
}

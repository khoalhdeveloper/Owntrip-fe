import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export const shareImage = async (
  viewShotRef: React.RefObject<any>
): Promise<string | null> => {
  if (!viewShotRef.current) {
    Alert.alert('Lỗi', 'Không tìm thấy vùng ảnh để chia sẻ.');
    return null;
  }

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Lỗi', 'Tính năng chia sẻ không khả dụng trên thiết bị này.');
      return null;
    }

    // Capture the preview
    const uri = await captureRef(viewShotRef, {
      format: 'png',
      quality: 1,
    });

    await Sharing.shareAsync(uri);
    return uri;
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Lỗi', 'Không thể chia sẻ ảnh. Vui lòng thử lại.');
    return null;
  }
};

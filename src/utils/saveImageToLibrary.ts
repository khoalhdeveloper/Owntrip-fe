import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

export const saveImageToLibrary = async (
  viewShotRef: React.RefObject<any>
): Promise<string | null> => {
  if (!viewShotRef.current) {
    Alert.alert('Lỗi', 'Không tìm thấy vùng ảnh cần lưu.');
    return null;
  }

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền lưu ảnh vào thư viện của bạn.');
      return null;
    }

    const uri = await captureRef(viewShotRef, {
      format: 'jpg',
      quality: 0.8,
    });

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(uri);
    await MediaLibrary.createAlbumAsync('OwnTrip Booth', asset, false);

    Alert.alert('Thành công', 'Ảnh đã được lưu vào thư viện của bạn!');
    return uri;
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert('Lỗi', 'Không thể lưu ảnh. Vui lòng thử lại.');
    return null;
  }
};

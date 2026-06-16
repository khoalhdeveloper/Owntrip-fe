import { CheckinErrorCode } from '../types/checkin.type';

export const CHECKIN_ERROR_MESSAGES: Record<CheckinErrorCode, string> = {
  outside_checkin_radius: 'Bạn đang ở ngoài bán kính check-in 1km.',
  already_checked_in: 'Bạn đã check-in địa điểm này rồi.',
  invalid_coordinates: 'Không lấy được tọa độ hợp lệ.',
  missing_place_id: 'Thiếu thông tin địa điểm.',
  invalid_place: 'Địa điểm không tồn tại hoặc chưa bật check-in.',
  invalid_place_location: 'Vị trí của địa điểm không hợp lệ.',
  checkin_rate_limited: 'Bạn thử check-in quá nhiều lần. Vui lòng thử lại sau.',
  verify_checkin_failed: 'Xác thực check-in thất bại. Vui lòng thử lại.',
};

export const getCheckinErrorMessage = (errorCode: string): string => {
  return CHECKIN_ERROR_MESSAGES[errorCode as CheckinErrorCode] || 'Đã xảy ra lỗi không xác định khi check-in.';
};

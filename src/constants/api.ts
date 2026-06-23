export const API_CONFIG = {
  BASE_URL: 'https://owntrip.vercel.app', // Production URL


  TIMEOUT: 15000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/users/login',
    REGISTER: '/api/users/register',
    GOOGLE_LOGIN: '/api/users/login/google',
    LOGOUT: '/api/users/logout',
    REFRESH_TOKEN: '/api/users/refresh-token',
    VERIFY_EMAIL: '/api/users/verifyEmail',
    RESEND_OTP: '/api/users/resendOTP',
    FORGOT_PASSWORD_SEND_OTP: '/api/users/forgot-password/send-otp',
    FORGOT_PASSWORD_RESET: '/api/users/forgot-password/reset',
  },
  USERS: {
    PROFILE: '/api/users/me',
    UPDATE: '/api/users/update',
    MY_PROFILE: (id: string) => `/api/users/myProfile/${id}`,
    UPDATE_PROFILE: (id: string) => `/api/users/updateProfile/${id}`,
    PAY_WITH_POINTS: '/api/users/pay-with-points',
    VNPAY_CREATE: '/api/users/vnpay/create',
    TOP_UP: '/api/users/top-up',
    TEST_TOP_UP: '/api/users/test-topup',
    REGISTER_OWNER: '/api/hotel-requests',
  },
  TRIPS: {
    LIST: '/api/trips',
    PUBLISHED: '/api/trips/published',
    MARKETPLACE: '/api/trips/marketplace',
    MY_TRIPS: '/api/trips/my',
    DETAIL: (id: string) => `/api/trips/${id}`,
    CREATE: '/api/trips',
    UPDATE: (id: string) => `/api/trips/${id}`,
    DELETE: (id: string) => `/api/trips/${id}`,
    DESTINATIONS: (id: string) => `/api/trips/${id}/destinations`,
    PUBLISH: (id: string) => `/api/trips/${id}/publish`,
  },
  PLACES: {
    SEARCH: '/api/places/search',
    NEARBY: '/api/places/nearby',
    TEXT_SEARCH: '/api/places/text',
    ADDRESS_SEARCH: '/api/places/address',
    PHOTO: '/api/places/photo',
    GET_TOP: '/api/places/gettopplaces',
  },
  PLANS: {
    ADD_PLACE: (dayId: string) => `/api/plans/day/${dayId}/place`,
    REMOVE_PLACE: (dayId: string, placeId: string) => `/api/plans/day/${dayId}/place/${placeId}`,
    REORDER: (dayId: string) => `/api/plans/day/${dayId}/reorder`,
  },
  CHATBOT: {
    CHAT: '/api/chatbot/chat',
  },
  NOTIFICATIONS: {
    GET_ALL: '/api/notifications',
    MARK_AS_READ: (id: string) => `/api/notifications/${id}/read`,
  },
  HOTELS: {
    LIST: '/api/hotels',
    DETAIL: (id: string) => `/api/hotels/${id}/page`,
    REVIEW: '/api/hotels/review',
    CREATE: '/api/hotels/create',
  },
  BOOKINGS: {
    CHECK_AVAILABILITY: '/api/bookings/check-availability',
    CREATE: '/api/bookings/create',
    MY_BOOKINGS: '/api/bookings/my-bookings',
    DETAIL: (id: string) => `/api/bookings/${id}`,
    CANCEL: (id: string) => `/api/bookings/${id}/cancel`,
    HOTEL_BOOKINGS: (hotelId: string) => `/api/bookings/hotel/${hotelId}`,
    HOTEL_TRANSACTIONS: (hotelId: string) => `/api/bookings/hotel/${hotelId}/transactions`,
  },
  INVENTORY: {
    GET: '/api/inventory',
    DASHBOARD: '/api/inventory/dashboard',
    BULK_CREATE: '/api/inventory/bulk-create',
    UPDATE: (id: string) => `/api/inventory/${id}`,
    BULK_PRICE_UPDATE: '/api/inventory/bulk-price-update',
    DELETE: '/api/inventory',
  },
  PAYMENT: {
    CREATE_BOOKING_PAYMENT: '/api/payment/create-booking-payment',
    CREATE_PAYMENT_LINK: '/api/payment/create-payment-link',
    STATUS: (bookingId: string) => `/api/payment/status/${bookingId}`,
    CANCEL: (orderCode: string) => `/api/payment/${orderCode}/cancel`,
    INFO: (orderCode: string) => `/api/payment/${orderCode}`,
  },
  WITHDRAWALS: {
    CREATE: '/api/withdrawals',
    MY: '/api/withdrawals/my',
    ADMIN: '/api/withdrawals/admin',
    ADMIN_REVIEW: (id: string) => `/api/withdrawals/admin/${id}`,
  },
  AVT_ITEMS: {
    LIST: '/api/avatar-items',
    SHOP: '/api/avatar-items/shop',
    GET: (id: string) => `/api/avatar-items/${id}`,
  },
  CHECKINS: {
    CREATE: '/api/checkins',
    MY: '/api/checkins/my',
    NEARBY: '/api/checkins/nearby',
    VERIFY: '/api/checkins/verify',
    MY_PLACES: '/api/checkins/my/places',
    FAVORITE: (id: string) => `/api/checkins/${id}/favorite`,
    DELETE: (id: string) => `/api/checkins/${id}`,
  },
  FRAMES: {
    LIST: '/api/frames', // Public — lấy danh sách frame đang active
    MY_UNLOCKED: '/api/frames/my-unlocked',
  },
  MISSIONS: {
    LIST: '/api/missions',
    MY_PROGRESS: '/api/missions/my-progress',
    CLAIM_REWARD: (id: string) => `/api/missions/${id}/claim-reward`,
  },
  AI: {
    REARRANGE: '/api/ai/rearrange',
    AUTO_GENERATE: '/api/ai/auto-generate',
    ITINERARY_SCORE: '/api/ai/itinerary-score',
  },
};


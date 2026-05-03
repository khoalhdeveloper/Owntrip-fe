export const API_CONFIG = {
  BASE_URL:'http://10.0.2.2:3000',
  TIMEOUT: 15000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/users/login',
    REGISTER: '/api/users/register',
    GOOGLE_LOGIN: '/api/users/login/google',
    LOGOUT: '/api/users/logout',
    REFRESH_TOKEN: '/api/users/refresh-token',
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
  },
  TRIPS: {
    LIST: '/api/trips',
    PUBLISHED: '/api/trips/published',
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
    PHOTO: '/api/places/photo',
  },
  PLANS: {
    ADD_PLACE: (dayId: string) => `/api/plans/day/${dayId}/place`,
    REMOVE_PLACE: (dayId: string, placeId: string) => `/api/plans/day/${dayId}/place/${placeId}`,
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
};

export type CheckinFrame = {
  _id?: string; // MongoDB ID từ API
  id: string; // Local id (dùng cho FlatList key, 'no-frame' cho item mặc định)
  name: string;
  imageUrl: string | null; // URL Cloudinary hoặc null nếu không có khung
  type: 'none' | 'classic' | 'modern' | 'film';
  layoutType?: 'single' | 'filmstrip-4';
  slotsCount?: number;
  isActive?: boolean;
  order?: number;
  province?: string;
  destinationTags?: string[];
  category?: string;
  isDefault?: boolean;
  unlockCondition?: string | Record<string, unknown>;
  isUnlocked?: boolean;
};

export type CheckinMemory = {
  id: string;
  title: string;
  date: string;
  imageUri: string;
  isFavorite: boolean;
};

export type CameraFilter = {
  id: string;
  name: string;
  type: 'retro' | 'neon' | 'classic' | 'bw';
};

// --- Nearby Places ---
export type NearbyPlace = {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  images: string[];
  distanceMeters: number;
};

// --- Verify Check-in ---
export type CheckinVerifyPayload = {
  placeId: string;
  latitude: number;
  longitude: number;
  imageUri?: string;
  title?: string;
  date?: string;
};

export type CheckinRecord = {
  _id: string;
  placeId: string;
  userLocation: { latitude: number; longitude: number };
  distanceMeters: number;
  source: string;
  checkedInAt: string;
};

export type CheckinReward = {
  type: 'checkin_frame' | 'points' | string;
  frameId?: string;
  pointsAmount?: number;
  granted: boolean;
};

export type MissionProgressItem = {
  checkedPlaceId: string;
  checkedAt: string;
};

export type CheckinVerifyResponse = {
  success: boolean;
  code?: CheckinErrorCode | string;
  message?: string;
  checkin?: CheckinRecord;
  place?: any;
  distanceMeters?: number;
  missionProgress?: MissionProgressItem[];
  rewards?: CheckinReward[];
  details?: any;
};

// --- Error codes ---
export type CheckinErrorCode =
  | 'invalid_coordinates'
  | 'missing_place_id'
  | 'invalid_place'
  | 'invalid_place_location'
  | 'outside_checkin_radius'
  | 'already_checked_in'
  | 'checkin_rate_limited'
  | 'verify_checkin_failed';

// --- Checked-in place (for Profile) ---
export type CheckedInPlace = {
  checkin: CheckinRecord;
  place: any;
  distanceMeters: number;
  checkedInAt: string;
};

// --- Check-in mode tabs ---
export type CheckinMode = 'memories' | 'visited' | 'nearby' | 'missions';

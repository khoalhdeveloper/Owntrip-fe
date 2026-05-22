export type CheckinFrame = {
  _id?: string;          // MongoDB ID từ API
  id: string;            // Local id (dùng cho FlatList key, 'no-frame' cho item mặc định)
  name: string;
  imageUrl: string | null; // URL Cloudinary hoặc null nếu không có khung
  type: 'none' | 'classic' | 'modern' | 'film';
  layoutType?: 'single' | 'filmstrip-4';
  slotsCount?: number;
  isActive?: boolean;
  order?: number;
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

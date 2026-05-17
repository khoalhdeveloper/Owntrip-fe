export type CheckinFrame = {
  id: string;
  name: string;
  image: any;
  type: 'none' | 'classic' | 'modern' | 'film';
  layoutType?: 'single' | 'filmstrip-4';
  slotsCount?: number;
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

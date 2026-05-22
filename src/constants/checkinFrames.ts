import { CameraFilter, CheckinMemory } from '../types/checkin.type';

// CHECKIN_FRAMES đã được chuyển sang API — xem src/hooks/useFrames.ts

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: 'retro', name: 'Retro', type: 'retro' },
  { id: 'neon', name: 'Neon', type: 'neon' },
  { id: 'classic', name: 'Classic', type: 'classic' },
  { id: 'bw', name: 'B&W', type: 'bw' },
];

export const MOCK_CHECKIN_MEMORIES: CheckinMemory[] = [
  {
    id: '1',
    title: 'Hà Giang Đông Bắc',
    date: '15/05/2026',
    imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Phú Quốc Sunset',
    date: '10/05/2026',
    imageUri: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'Đà Lạt Sương Mù',
    date: '01/05/2026',
    imageUri: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500',
    isFavorite: true,
  },
];

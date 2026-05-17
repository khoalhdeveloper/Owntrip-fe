import { CheckinFrame, CameraFilter, CheckinMemory } from '../types/checkin.type';

export const CHECKIN_FRAMES: CheckinFrame[] = [
  {
    id: 'no-frame',
    name: 'Không khung',
    image: null,
    type: 'none',
  },
  {
    id: 'classic-frame',
    name: 'Classic Frame',
    image: require('../../assets/frames/frame-1.png'),
    type: 'classic',
  },
  {
    id: 'modern-frame',
    name: 'Modern Frame',
    image: require('../../assets/frames/frame-2.png'),
    type: 'modern',
  },
  {
    id: 'film-strip-frame',
    name: 'Film Strip',
    image: require('../../assets/frames/frame-2.png'), // Fallback to frame-2.png for now
    type: 'film',
  },
  {
    id: 'hcm-4cut-frame',
    name: 'TP.HCM 4-Cut',
    image: require('../../assets/frames/Screenshot 2026-05-17 232828.png'),
    type: 'film',
    layoutType: 'filmstrip-4',
    slotsCount: 4,
  },
];

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

export type Mission = {
  _id: string;
  title?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  requiredPlaceIds: string[];
  reward?: any;
  isActive?: boolean;
};

export type MissionProgress = {
  mission: Mission;
  progress: any;
  checkedPlaceIds: string[];
  requiredCount: number;
  checkedCount: number;
  isCompleted: boolean;
  rewardGranted: boolean;
  reward: any | null;
};

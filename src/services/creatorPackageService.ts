import axiosClient from './axiosClient';

export interface CreatorPackage {
  _id: string;
  name: string;
  durationInMonths: number;
  price: number;
  description: string;
  isActive: boolean;
}

export const getActiveCreatorPackages = async (): Promise<CreatorPackage[]> => {
  const response: any = await axiosClient.get('/api/creator-packages');
  return Array.isArray(response) ? response : (response?.data || response || []);
};

export const subscribeToCreatorPackage = async (packageId: string): Promise<{ checkoutUrl: string; bookingId: string }> => {
  const response: any = await axiosClient.post('/api/creator-packages/subscribe', { packageId });
  return response?.data || response;
};

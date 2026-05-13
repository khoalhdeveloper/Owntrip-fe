import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface ILegalDocuments {
  businessLicense: string;
  securityCertificate: string;
  pcccCertificate: string;
  identityCard: string;
  leaseContract?: string; // For Homestay/Apartment
}

export interface IPropertyInfo {
  name: string;
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'hotel' | 'homestay' | 'apartment';
}

export interface IBusinessPolicy {
  cancellationPolicy: string;
  childPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  extraCosts?: string;
}

export interface IOwnerRegistration {
  legalDocuments: ILegalDocuments;
  propertyInfo: IPropertyInfo;
  images: string[];
  amenities: string[];
  businessPolicies: IBusinessPolicy;
  description: string;
}

export const partnerService = {
  /**
   * Đăng ký trở thành Hotel Owner
   */
  registerHotelOwner: async (data: IOwnerRegistration): Promise<any> => {
    try {
      const response = await axiosClient.post(ENDPOINTS.USERS.REGISTER_OWNER, data);
      return response.data || response;
    } catch (error) {
      console.error('Error registering hotel owner:', error);
      throw error;
    }
  },
};

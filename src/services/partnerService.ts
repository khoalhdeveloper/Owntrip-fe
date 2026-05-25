import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface ILegalDocuments {
  businessLicense: string;
  securityCertificate: string;
  pcccCertificate: string;
  identityCardFront: string;
  identityCardBack: string;
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
  phone: string;
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
      // Flatten the data for the backend
      const payload = {
        hotelName: data.propertyInfo.name,
        address: data.propertyInfo.address,
        city: data.propertyInfo.city,
        phone: data.phone,
        description: data.description,
        images: data.images,
        legalDocuments: data.legalDocuments,
        amenities: data.amenities,
        businessPolicies: data.businessPolicies,
      };
      
      const response = await axiosClient.post(ENDPOINTS.USERS.REGISTER_OWNER, payload);
      return response.data || response;
    } catch (error) {
      console.error('Error registering hotel owner:', error);
      throw error;
    }
  },
};

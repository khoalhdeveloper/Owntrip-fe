import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface Trip {
  _id: string;
  userId: string;
  title: string;
  destination: string;
  province: string;
  provinceImage?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  description?: string;
  isPublished: boolean;
  budget?: number;
  createdAt?: string;
  updatedAt?: string;
  accommodation?: {
    hotelId: string;
    roomTypeId: string;
    hotelName: string;
    hotelImage?: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
  };
}

export interface TripDay {
  dayId: string;
  day: number;
  date: string;
  places: DestinationPlace[];
}

export interface AddPlaceBody {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  totalReviews?: number;
  photo?: string;
  mapUrl?: string;
}

export interface TripsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  trips: Trip[];
}

export interface TripDetailResponse {
  success: boolean;
  trip: Trip;
  days: TripDay[];
}

export interface DestinationPlace {
  _id: string;
  dayId: string;
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  totalReviews?: number;
  types?: string[];
  photo?: string;
  mapUrl?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Destination {
  dayId: string;
  day: number;
  date: string;
  place: DestinationPlace;
}

export interface DestinationsResponse {
  success: boolean;
  trip: { _id: string; title: string; destination: string };
  totalDestinations: number;
  destinations: Destination[];
}

export const tripService = {
  getPublishedTrips: async (page: number = 1, limit: number = 20): Promise<Trip[]> => {
    try {
      const url = `${ENDPOINTS.TRIPS.PUBLISHED}?page=${page}&limit=${limit}`;
      const response = await axiosClient.get<any, TripsResponse>(url);
      
      return response?.trips ?? [];
    } catch (error) {
      console.error('Error fetching published trips:', error);
      return [];
    }
  },

  getTripById: async (id: string): Promise<TripDetailResponse | null> => {
    try {
      const url = ENDPOINTS.TRIPS.DETAIL(id);
      const response = await axiosClient.get<any, TripDetailResponse>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching trip ${id}:`, error);
      return null;
    }
  },
  
  createTrip: async (tripData: any) => {
    try {
      const response = await axiosClient.post(ENDPOINTS.TRIPS.CREATE, tripData);
      return response;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  },

  getMyTrips: async (): Promise<Trip[]> => {
    try {
      const response = await axiosClient.get<any, TripsResponse>(ENDPOINTS.TRIPS.MY_TRIPS);
      return response?.trips ?? [];
    } catch (error) {
      console.error('Error fetching my trips:', error);
      return [];
    }
  },

  getDestinations: async (tripId: string): Promise<Destination[]> => {
    try {
      const url = ENDPOINTS.TRIPS.DESTINATIONS(tripId);
      const response = await axiosClient.get<any, DestinationsResponse>(url);
      return response?.destinations ?? [];
    } catch (error) {
      console.error(`Error fetching destinations for trip ${tripId}:`, error);
      return [];
    }
  },

  addPlaceToDay: async (dayId: string, placeData: AddPlaceBody): Promise<any> => {
    try {
      const url = ENDPOINTS.PLANS.ADD_PLACE(dayId);
      const response = await axiosClient.post(url, placeData);
      return response;
    } catch (error) {
      console.error(`Error adding place to day ${dayId}:`, error);
      throw error;
    }
  },

  removePlaceFromDay: async (dayId: string, placeId: string): Promise<any> => {
    try {
      const url = ENDPOINTS.PLANS.REMOVE_PLACE(dayId, placeId);
      const response = await axiosClient.delete(url);
      return response;
    } catch (error) {
      console.error(`Error removing place from day ${dayId}:`, error);
      throw error;
    }
  },

  updateTrip: async (tripId: string, data: {
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    isPublished?: boolean;
    budget?: number;
    accommodation?: any;
  }): Promise<Trip | null> => {
    try {
      const url = ENDPOINTS.TRIPS.UPDATE(tripId);
      const response = await axiosClient.patch<any, any>(url, data);
      return response?.trip ?? response ?? null;
    } catch (error) {
      console.error(`Error updating trip ${tripId}:`, error);
      throw error;
    }
  },

  deleteTrip: async (tripId: string): Promise<any> => {
    try {
      const url = ENDPOINTS.TRIPS.DELETE(tripId);
      const response = await axiosClient.delete(url);
      return response;
    } catch (error) {
      console.error(`Error deleting trip ${tripId}:`, error);
      throw error;
    }
  },

  publishTrip: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosClient.patch<any, any>(ENDPOINTS.TRIPS.PUBLISH(id), {
        isPublished: true
      });
      return response?.success ?? false;
    } catch (error) {
      console.error(`Error publishing trip ${id}:`, error);
      return false;
    }
  },
};

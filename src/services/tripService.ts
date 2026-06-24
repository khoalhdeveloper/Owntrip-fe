import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface TripBudget {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
}

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
  notes?: string[];
  members?: string[];
  budget?: TripBudget;
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
  isForSale?: boolean;
  isPurchasedClone?: boolean;
  price?: number;
  isTrusted?: boolean;
  averageRating?: number;
  soldCount?: number;
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
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
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
  reviews?: ItineraryReview[];
}

export interface ItineraryReview {
  _id: string;
  userId: string | { displayName?: string; image?: string };
  targetId: string;
  targetType: 'itinerary';
  rating: number;
  comment: string;
  createdAt?: string;
}

export interface PurchaseTripResult {
  success: boolean;
  tripId?: string;
  message?: string;
  paymentUrl?: string;
  orderCode?: number;
  paymentRequired?: boolean;
  alreadyOwned?: boolean;
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
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
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

  getMarketplaceTrips: async (page: number = 1, limit: number = 20, sort?: string): Promise<Trip[]> => {
    try {
      let url = `${ENDPOINTS.TRIPS.MARKETPLACE}?page=${page}&limit=${limit}`;
      if (sort) {
        url += `&sort=${sort}`;
      }
      const response = await axiosClient.get<any, TripsResponse>(url);

      return response?.trips ?? [];
    } catch (error) {
      console.error('Error fetching marketplace trips:', error);
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

  reorderPlaces: async (dayId: string, placeIds: string[]): Promise<any> => {
    try {
      const url = ENDPOINTS.PLANS.REORDER(dayId);
      const response = await axiosClient.patch(url, { placeIds });
      return response;
    } catch (error) {
      console.error(`Error reordering places for day ${dayId}:`, error);
      throw error;
    }
  },

  reorderPlacesInDay: async (dayId: string, orderedPlaceIds: string[]): Promise<any> => {
    try {
      // Endpoint is /api/plans/reorder
      const url = '/api/plans/reorder';
      const response = await axiosClient.patch(url, { dayId, orderedPlaceIds });
      return response;
    } catch (error) {
      console.error(`Error reordering places in day ${dayId}:`, error);
      throw error;
    }
  },

  updateTrip: async (tripId: string, data: {
    title?: string;
    destination?: string;
    provinceImage?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    isPublished?: boolean;
    budget?: number | TripBudget;
    accommodation?: any;
    notes?: string[];
    members?: string[];
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
        isPublished: true,
      });
      return response?.success ?? false;
    } catch (error) {
      console.error(`Error publishing trip ${id}:`, error);
      return false;
    }
  },

  publishToMarketplace: async (tripId: string, price: number): Promise<boolean> => {
    try {
      const url = `/api/trips/${tripId}/marketplace`;
      const response = await axiosClient.patch<any, any>(url, { price });
      return response?.success ?? false;
    } catch (error) {
      console.error(`Error publishing to marketplace for trip ${tripId}:`, error);
      return false;
    }
  },

  getTripPreview: async (tripId: string): Promise<TripDetailResponse | null> => {
    try {
      const url = `/api/trips/marketplace/${tripId}/preview`;
      const response = await axiosClient.get<any, TripDetailResponse>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching trip preview ${tripId}:`, error);
      return null;
    }
  },

  purchaseTrip: async (tripId: string): Promise<PurchaseTripResult | null> => {
    try {
      const url = `/api/trips/marketplace/${tripId}/purchase`;
      const response = await axiosClient.post<any, any>(url);
      if (!response) return null;

      return {
        ...response,
        tripId: response.tripId ?? response.newTripId ?? response.clonedTripId,
        paymentUrl: response.paymentUrl ?? response.checkoutUrl,
        paymentRequired: response.paymentRequired ?? Boolean(response.paymentUrl ?? response.checkoutUrl),
        alreadyOwned: response.alreadyOwned,
      };
    } catch (error) {
      console.error(`Error purchasing trip ${tripId}:`, error);
      return null;
    }
  },

  getTripSalesStats: async (tripId: string): Promise<{ success: boolean; totalSales: number; totalRevenue: number } | null> => {
    try {
      const url = `/api/trips/${tripId}/sales-stats`;
      const response = await axiosClient.get<any, any>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching sales stats for trip ${tripId}:`, error);
      return null;
    }
  },

  getMyItineraryReview: async (tripId: string): Promise<{ success: boolean; data?: ItineraryReview | null; message?: string } | null> => {
    try {
      const url = `/api/trips/${tripId}/my-review`;
      const response = await axiosClient.get<any, any>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching my itinerary review for trip ${tripId}:`, error);
      return null;
    }
  },

  submitItineraryReview: async (
    tripId: string,
    payload: { rating: number; comment: string }
  ): Promise<{ success: boolean; message?: string; data?: ItineraryReview } | null> => {
    try {
      const url = `/api/trips/${tripId}/review`;
      const response = await axiosClient.post<any, any>(url, payload);
      return response;
    } catch (error) {
      console.error(`Error submitting itinerary review for trip ${tripId}:`, error);
      return null;
    }
  },

  deleteItineraryReview: async (
    tripId: string
  ): Promise<{ success: boolean; message?: string } | null> => {
    try {
      const url = `/api/trips/${tripId}/review`;
      const response = await axiosClient.delete<any, any>(url);
      return response;
    } catch (error) {
      console.error(`Error deleting itinerary review for trip ${tripId}:`, error);
      return null;
    }
  },

  getTripExpenses: async (tripId: string): Promise<any> => {
    try {
      const url = ENDPOINTS.TRIPS.EXPENSES(tripId);
      const response = await axiosClient.get(url);
      return response;
    } catch (error) {
      console.error(`Error fetching expenses for trip ${tripId}:`, error);
      return null;
    }
  },

  addTripExpense: async (tripId: string, payload: any): Promise<any> => {
    try {
      const url = ENDPOINTS.TRIPS.EXPENSES(tripId);
      const response = await axiosClient.post(url, payload);
      return response;
    } catch (error) {
      console.error(`Error adding expense for trip ${tripId}:`, error);
      return null;
    }
  },

  deleteTripExpense: async (tripId: string, expenseId: string): Promise<any> => {
    try {
      const url = ENDPOINTS.TRIPS.EXPENSE_DETAIL(tripId, expenseId);
      const response = await axiosClient.delete(url);
      return response;
    } catch (error) {
      console.error(`Error deleting expense ${expenseId} for trip ${tripId}:`, error);
      return null;
    }
  },

  enableTripSharing: async (tripId: string): Promise<{ success: boolean; shareToken?: string; message?: string }> => {
    try {
      const url = ENDPOINTS.TRIPS.SHARE(tripId);
      const response = await axiosClient.post<any, any>(url);
      return response;
    } catch (error) {
      console.error(`Error enabling sharing for trip ${tripId}:`, error);
      return { success: false, message: 'Lỗi chia sẻ chuyến đi' };
    }
  },

  getSharedTrip: async (shareToken: string): Promise<TripDetailResponse | null> => {
    try {
      const url = ENDPOINTS.TRIPS.GET_SHARED(shareToken);
      const response = await axiosClient.get<any, TripDetailResponse>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching shared trip with token ${shareToken}:`, error);
      return null;
    }
  },
};

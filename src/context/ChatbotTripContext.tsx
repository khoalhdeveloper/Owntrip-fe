import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Trip, TripDay } from '@/services/tripService';

export type ChatbotTripContextValue = {
  tripId: string;
  title: string;
  destination?: string;
  province?: string;
  startDate?: string;
  endDate?: string;
  days: {
    day: number;
    date: string;
    places: {
      id: string;
      name: string;
      address?: string;
      order: number;
      timeOfDay?: string;
    }[];
  }[];
};

type ChatbotTripContextState = {
  tripContext: ChatbotTripContextValue | null;
  setTripContext: (trip: Trip, days: TripDay[]) => void;
  clearTripContext: (tripId?: string) => void;
};

const ChatbotTripContext = createContext<ChatbotTripContextState | undefined>(undefined);

export function buildChatbotTripContext(trip: Trip, days: TripDay[]): ChatbotTripContextValue {
  return {
    tripId: trip._id,
    title: trip.title,
    destination: trip.destination,
    province: trip.province,
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: days.map((day) => ({
      day: day.day,
      date: day.date,
      places: [...(day.places || [])]
        .sort((a, b) => a.order - b.order)
        .map((place) => ({
          id: place._id,
          name: place.name,
          address: place.address,
          order: place.order,
          timeOfDay: place.timeOfDay,
        })),
    })),
  };
}

export function ChatbotTripContextProvider({ children }: { children: React.ReactNode }) {
  const [tripContext, setTripContextState] = useState<ChatbotTripContextValue | null>(null);
  const setTripContext = useCallback((trip: Trip, days: TripDay[]) => {
    setTripContextState(buildChatbotTripContext(trip, days));
  }, []);
  const clearTripContext = useCallback((tripId?: string) => {
    setTripContextState((current) => {
      if (!tripId || current?.tripId === tripId) return null;
      return current;
    });
  }, []);

  const value = useMemo<ChatbotTripContextState>(
    () => ({
      tripContext,
      setTripContext,
      clearTripContext,
    }),
    [clearTripContext, setTripContext, tripContext],
  );

  return <ChatbotTripContext.Provider value={value}>{children}</ChatbotTripContext.Provider>;
}

export function useChatbotTripContext() {
  const context = useContext(ChatbotTripContext);
  if (!context) {
    throw new Error('useChatbotTripContext must be used inside ChatbotTripContextProvider');
  }
  return context;
}

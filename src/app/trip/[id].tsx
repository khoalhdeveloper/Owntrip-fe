import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TripDetailScreen from '@/screens/TripDetail/TripDetailScreen';

export default function TripDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TripDetailScreen tripId={id} />;
}

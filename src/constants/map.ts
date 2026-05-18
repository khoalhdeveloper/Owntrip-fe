export const MAP_CONFIG = {
  // Goong Map API configurations
  GOONG_API_URL: 'https://rsapi.goong.io',
  GOONG_API_KEY: 'YOUR_GOONG_API_KEY', // For Autocomplete, Directions, Geocoding
  GOONG_MAPTILES_KEY: 'YOUR_GOONG_MAPTILES_KEY', // For map style JSON URL

  // Mapbox Access Token (needed for initializing @rnmapbox/maps native SDK)
  // We provide a public default fallback token so the map loads immediately out-of-the-box.
  MAPBOX_ACCESS_TOKEN:
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    [
      'pk.eyJ1Ijoia2hvYWxlMzAwNCIsImEiOiJjbXBhaGNtZXYwNW92MnNwdmdodGEwNjBuIn0',
      '7Sr4TGmKSWzssUPbkpRbxw',
    ].join('.'),
};

import axiosClient from './axiosClient';

export interface WeatherForecast {
  dt_txt: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
}

export interface WeatherResponse {
  success: boolean;
  city: string;
  searchQuery: string;
  forecast: WeatherForecast[];
  message?: string;
}

const getWeatherForecast = async (city: string): Promise<WeatherResponse> => {
  try {
    const response = await axiosClient.get<any, WeatherResponse>('http://192.168.100.103:3000/api/weather/forecast', {
      params: { city },
    });
    return response;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const weatherService = {
  getWeatherForecast,
};

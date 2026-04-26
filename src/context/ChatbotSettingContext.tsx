import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ai_button_enabled';

interface ChatbotSettingContextType {
  aiButtonEnabled: boolean;
  setAiButtonEnabled: (val: boolean) => void;
}

const ChatbotSettingContext = createContext<ChatbotSettingContextType>({
  aiButtonEnabled: true,
  setAiButtonEnabled: () => {},
});

export const ChatbotSettingProvider = ({ children }: { children: React.ReactNode }) => {
  const [aiButtonEnabled, setAiButtonEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) setAiButtonEnabledState(val === 'true');
    });
  }, []);

  const setAiButtonEnabled = async (val: boolean) => {
    setAiButtonEnabledState(val);
    await AsyncStorage.setItem(STORAGE_KEY, String(val));
  };

  return (
    <ChatbotSettingContext.Provider value={{ aiButtonEnabled, setAiButtonEnabled }}>
      {children}
    </ChatbotSettingContext.Provider>
  );
};

export const useChatbotSetting = () => useContext(ChatbotSettingContext);

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { chatbotService } from '../services/chatbotService';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

export default function ChatbotModal({ visible, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: Date.now().toString(), sender: 'bot', text: 'Chào bạn! Tôi là chatbot tư vấn du lịch Việt Nam, rất vui được hỗ trợ bạn.\n\nBạn đang quan tâm đến địa điểm nào hay cần lịch trình, món ăn ra sao? Hãy cho tôi biết nhé!' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Tự động cuộn xuống khi có tin nhắn mới
    if (visible) {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [messages, visible]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const respText = await chatbotService.sendMessage(userMessage.text);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: respText
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Lỗi rồi, bạn thử lại sau nhen!'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
      setMessages([{
          id: Date.now().toString(), sender: 'bot', text: 'Chào bạn! Tôi là chatbot tư vấn du lịch Việt Nam, rất vui được hỗ trợ bạn.\n\nBạn đang quan tâm đến địa điểm nào hay cần lịch trình, món ăn ra sao? Hãy cho tôi biết nhé!'
      }]);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botIconContainer}>
                <Feather name="message-circle" size={20} color="#FFF" />
              </View>
              <Text style={styles.headerTitle}>OwnTrip AI</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={clearChat} style={styles.actionBtn}>
                <Feather name="trash-2" size={20} color="#718096" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
                <Feather name="x" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.messageBubble, 
                  item.sender === 'user' ? styles.userBubble : styles.botBubble
                ]}
              >
                <Text style={[
                  styles.messageText, 
                  item.sender === 'user' ? styles.userMessageText : styles.botMessageText
                ]}>
                  {item.text}
                </Text>
              </View>
            ))}
            
            {isTyping && (
              <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
                <TypingIndicator />
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#A0AEC0"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled
              ]} 
              onPress={handleSend}
              disabled={!inputText.trim() || isTyping}
            >
              <Feather name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    backgroundColor: '#FAFBFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A7CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2B4A',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A7CFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  typingBubble: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: 70,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 32,
    height: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A0AEC0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  botMessageText: {
    color: '#2D3748',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: '#1A2B4A',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A7CFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
    elevation: 0,
  },
});

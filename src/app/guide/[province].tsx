import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

type TabType = 'overview' | 'explore' | 'journal';

export default function GuideScreen() {
  const router = useRouter();
  const { province } = useLocalSearchParams<{ province: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Use a nice placeholder image for Vietnam destinations
  const heroImage = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1000&auto=format&fit=crop';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Hero Image Header */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: heroImage }} style={styles.heroImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.2)']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.headerTop}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="image" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="download" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Content Card overlapping the image */}
      <View style={styles.contentContainer}>
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Hướng dẫn {province}</Text>
          
          <View style={styles.actionRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>A</Text>
            </View>
            <TouchableOpacity style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Xem trước</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Chia sẻ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={20} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                Tổng quan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
              onPress={() => setActiveTab('explore')}
            >
              <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>
                Khám phá
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'journal' && styles.activeTab]}
              onPress={() => setActiveTab('journal')}
            >
              <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>
                Nhật ký
              </Text>
            </TouchableOpacity>
            <View style={styles.tabMenuIcon}>
              <Feather name="menu" size={20} color="#4A5568" />
            </View>
          </View>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && (
            <View style={styles.tabPane}>
              <Text style={styles.promptText}>
                Hãy cho độc giả biết bạn biết {province} như thế nào (ví dụ: &quot;Đã sống ở {province}&quot;, &quot;Đã thăm {province} trong một tuần vào năm 2023&quot;, &quot;Người du lịch đam mê qua 5 châu lục&quot;)
              </Text>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="chevron-down" size={20} color="#1A2B4A" />
                  <Text style={styles.sectionTitle}>Mẹo chung</Text>
                  <View style={{ flex: 1 }} />
                  <Feather name="more-horizontal" size={20} color="#A0AEC0" />
                </View>
                <TextInput
                  style={styles.textArea}
                  placeholder="Viết hoặc dán ghi chú chung tại đây, ví dụ như cách di chuyển, nhắc nhở và mẹo địa phương"
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="chevron-down" size={20} color="#1A2B4A" />
                  <Text style={styles.sectionTitle}>Ngày 1</Text>
                  <View style={{ flex: 1 }} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Hành trình</Text>
                    <Feather name="chevron-down" size={14} color="#4A5568" />
                  </View>
                  <Feather name="more-horizontal" size={20} color="#A0AEC0" style={{ marginLeft: 12 }} />
                </View>
                
                <View style={styles.dayActions}>
                  <Text style={styles.addSubtitle}>Thêm tiêu đề phụ</Text>
                  <TouchableOpacity style={styles.optimizeRouteBtn}>
                    <Feather name="map" size={14} color="#005CB8" />
                    <Text style={styles.optimizeRouteText}>Tối ưu lộ trình</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.addLocationInput}>
                  <Feather name="map-pin" size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Thêm địa điểm"
                    placeholderTextColor="#A0AEC0"
                  />
                  <TouchableOpacity style={styles.copyBtn}>
                    <Feather name="copy" size={16} color="#4A5568" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.listBtn}>
                    <Feather name="list" size={16} color="#4A5568" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="chevron-down" size={20} color="#1A2B4A" />
                  <Text style={styles.sectionTitle}>Địa điểm tham quan</Text>
                  <View style={{ flex: 1 }} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Danh sách</Text>
                  </View>
                  <Feather name="more-horizontal" size={20} color="#A0AEC0" style={{ marginLeft: 12 }} />
                </View>
              </View>

            </View>
          )}

          {activeTab === 'explore' && (
            <View style={styles.emptyState}>
              <Feather name="compass" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>Khám phá các địa điểm nổi bật</Text>
            </View>
          )}

          {activeTab === 'journal' && (
            <View style={styles.emptyState}>
              <Feather name="book-open" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>Ghi lại kỷ niệm của bạn</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#A855F7', marginBottom: 12 }]}>
          <Feather name="edit-2" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#1A2B4A', marginBottom: 12 }]}>
          <Feather name="map" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#1A2B4A' }]}>
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Ensure you import LinearGradient and SafeAreaView properly at the top of the file.
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  heroContainer: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginTop: -40,
    backgroundColor: '#F7FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  guideCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  guideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2B4A',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  previewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
    marginRight: 12,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2B4A',
  },
  shareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A2B4A',
    marginRight: 12,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  tabMenuIcon: {
    marginLeft: 'auto',
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  tabPane: {
    padding: 20,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 32,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2B4A',
    marginLeft: 12,
  },
  textArea: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
    minHeight: 60,
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginRight: 4,
  },
  dayActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  optimizeRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optimizeRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#005CB8',
    marginLeft: 6,
  },
  addLocationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A2B4A',
  },
  copyBtn: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  listBtn: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});

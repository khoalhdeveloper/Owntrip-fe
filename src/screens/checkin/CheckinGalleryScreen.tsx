import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { CheckinMemory, CheckinMode } from '../../types/checkin.type';
import { sessionCache } from './FrameSelectScreen';
import { checkinService } from '../../services/checkinService';
import { NearbyPlacesList } from './components/NearbyPlacesList';
import { MissionProgressList } from './components/MissionProgressList';
import { VisitedPlacesList } from './components/VisitedPlacesList';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // Two-column grid with padding

export const CheckinGalleryScreen = () => {
  const [mode, setMode] = useState<CheckinMode>('memories');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');
  const [memories, setMemories] = useState<CheckinMemory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const data = await checkinService.getMyMemories();
      setMemories(data);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, []),
  );

  const toggleFavorite = async (id: string) => {
    const success = await checkinService.toggleFavorite(id);
    if (success) {
      setMemories((prev) =>
        prev.map((mem) => (mem.id === id ? { ...mem, isFavorite: !mem.isFavorite } : mem)),
      );
    }
  };

  const filteredMemories = memories.filter((mem) => {
    // Chỉ hiện kỷ niệm có ảnh hợp lệ
    const hasImage = mem.imageUri && mem.imageUri.trim() !== '' && !mem.imageUri.includes('undefined') && !mem.imageUri.includes('null');
    if (!hasImage) return false;

    const matchesSearch = mem.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'favorites') {
      return mem.isFavorite;
    }
    return true;
  });

  // Use first item as a full-width header card when on 'All' tab
  const showLargeHeader = activeTab === 'all' && filteredMemories.length > 0;
  const listData = showLargeHeader ? filteredMemories.slice(1) : filteredMemories;

  const renderLargeHeader = () => {
    if (!showLargeHeader) return null;
    const item = filteredMemories[0];

    return (
      <TouchableOpacity
        style={styles.fullWidthCard}
        onPress={() =>
          router.push({
            pathname: '/checkin/result',
            params: {
              id: item.id,
              finalImageUri: item.imageUri,
              title: item.title,
              fromGallery: 'true',
              isFavorite: item.isFavorite ? 'true' : 'false',
            },
          })
        }
      >
        <Image source={{ uri: item.imageUri }} style={styles.fullWidthImage} resizeMode="cover" />
        <TouchableOpacity style={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
          <FontAwesome
            name={item.isFavorite ? 'heart' : 'heart-o'}
            size={18}
            color={item.isFavorite ? '#e74c3c' : '#fff'}
          />
        </TouchableOpacity>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMemoryItem = ({ item }: { item: CheckinMemory }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/checkin/result',
            params: {
              id: item.id,
              finalImageUri: item.imageUri,
              title: item.title,
              fromGallery: 'true',
              isFavorite: item.isFavorite ? 'true' : 'false',
            },
          })
        }
      >
        <Image source={{ uri: item.imageUri }} style={styles.cardImage} resizeMode="cover" />
        <TouchableOpacity style={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
          <FontAwesome
            name={item.isFavorite ? 'heart' : 'heart-o'}
            size={18}
            color={item.isFavorite ? '#e74c3c' : '#fff'}
          />
        </TouchableOpacity>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check-in</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              sessionCache.userImageUris = [null, null, null, null];
              sessionCache.activeSlotIndex = 0;
              sessionCache.selectedFrame = null;
              sessionCache.defaultTitle = undefined;
              router.push('/checkin/frame');
            }}
            style={styles.headerIconBtn}
          >
            <Feather name="plus-circle" size={22} color="#2F80ED" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.headerIconBtn}>
            <Feather name="home" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Tabs */}
      <View style={styles.modeTabContainer}>
        {(['memories', 'visited', 'nearby', 'missions'] as const).map((tabMode) => {
          const isActive = mode === tabMode;
          const iconName =
            tabMode === 'memories'
              ? 'image'
              : tabMode === 'visited'
              ? 'check-circle'
              : tabMode === 'nearby'
              ? 'map-pin'
              : 'target';

          return (
            <TouchableOpacity
              key={tabMode}
              style={[styles.modeTabBtn, isActive && styles.activeModeTabBtn]}
              onPress={() => setMode(tabMode)}
              activeOpacity={0.85}
            >
              <Feather
                name={iconName}
                size={14}
                color={isActive ? '#2F80ED' : '#8A97AA'}
                style={styles.modeTabIcon}
              />
              <Text style={[styles.modeTabText, isActive && styles.activeModeTabText]}>
                {tabMode === 'memories'
                  ? 'Kỷ niệm'
                  : tabMode === 'visited'
                  ? 'Đã đi'
                  : tabMode === 'nearby'
                  ? 'Gần đây'
                  : 'Nhiệm vụ'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'memories' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm kỷ niệm..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabContainer}>
            {(['all', 'recent', 'favorites'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'all' ? 'Tất cả' : tab === 'recent' ? 'Gần đây' : 'Yêu thích'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Grid List */}
          {loading && listData.length === 0 ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#2F80ED" />
            </View>
          ) : (
            <FlatList
              data={listData}
              renderItem={renderMemoryItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              ListHeaderComponent={renderLargeHeader}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                !showLargeHeader ? (
                  <View style={styles.emptyContainer}>
                    <Feather name="image" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Chưa có ảnh kỷ niệm nào</Text>
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {mode === 'visited' && <VisitedPlacesList />}

      {mode === 'nearby' && <NearbyPlacesList />}

      {mode === 'missions' && <MissionProgressList />}

      {/* Floating Action Button */}
      {mode === 'memories' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            sessionCache.userImageUris = [null, null, null, null];
            sessionCache.activeSlotIndex = 0;
            sessionCache.selectedFrame = null;
            sessionCache.defaultTitle = undefined;
            router.push('/checkin/frame');
          }}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.fabText}>Tạo check-in</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    marginLeft: 14,
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A253C', // Deep navy
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  activeTabButton: {
    backgroundColor: '#2F80ED', // Primary blue
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  fullWidthCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fullWidthImage: {
    width: '100%',
    height: 200,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: CARD_WIDTH,
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartInactive: {},
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A253C',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 11,
    color: '#718096',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#718096',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    right: 16,
    backgroundColor: '#2F80ED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  modeTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FA',
    padding: 5,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2EAF3',
  },
  modeTabBtn: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 10,
  },
  activeModeTabBtn: {
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#1A253C',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modeTabIcon: {
    marginRight: 5,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B8AA0',
  },
  activeModeTabText: {
    color: '#2F80ED',
    fontWeight: '800',
  },
});

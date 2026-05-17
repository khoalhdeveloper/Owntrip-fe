import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { MOCK_CHECKIN_MEMORIES } from '../../constants/checkinFrames';
import { CheckinMemory } from '../../types/checkin.type';
import { sessionCache } from './FrameSelectScreen';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // Two-column grid with padding

export const CheckinGalleryScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');
  const [memories, setMemories] = useState<CheckinMemory[]>(MOCK_CHECKIN_MEMORIES);

  const toggleFavorite = (id: string) => {
    setMemories(prev =>
      prev.map(mem => (mem.id === id ? { ...mem, isFavorite: !mem.isFavorite } : mem))
    );
  };

  const filteredMemories = memories.filter(mem => {
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
            params: { finalImageUri: item.imageUri, title: item.title, fromGallery: 'true' },
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
            params: { finalImageUri: item.imageUri, title: item.title, fromGallery: 'true' },
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
        <Text style={styles.headerTitle}>Kỷ niệm Check-in</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              sessionCache.userImageUris = [null, null, null, null];
              sessionCache.activeSlotIndex = 0;
              sessionCache.selectedFrame = null;
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
        {(['all', 'recent', 'favorites'] as const).map(tab => (
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
      <FlatList
        data={listData}
        renderItem={renderMemoryItem}
        keyExtractor={item => item.id}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          sessionCache.userImageUris = [null, null, null, null];
          sessionCache.activeSlotIndex = 0;
          sessionCache.selectedFrame = null;
          router.push('/checkin/frame');
        }}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.fabText}>Tạo check-in</Text>
      </TouchableOpacity>
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
});

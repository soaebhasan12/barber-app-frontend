import * as Location from 'expo-location';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, FlatList, ActivityIndicator, TextInput
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { shopAPI, serviceAPI } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [shops, setShops]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [allShops, setAllShops]     = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      // GPS permission maango
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      let lat = 28.8543;  // default Delhi
      let lng = 77.0924;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }

      const res = await shopAPI.getNearby(lat, lng);
      setShops(res.data.data);
      setAllShops(res.data.data);
    } catch (err) {
      console.log('fetchShops error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    if (category === 'men')    return '#4A90E2';
    if (category === 'women')  return '#E91E8C';
    return COLORS.accent;
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) return setShops(allShops);
    setShops(allShops.filter(s =>
      s.name.toLowerCase().includes(text.toLowerCase()) ||
      s.address.toLowerCase().includes(text.toLowerCase())
    ));
  };

  const ShopCard = ({ shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ShopDetail', { shop })}
    >
      {/* Shop Image Placeholder */}
      <View style={[styles.shopImage, { backgroundColor: getCategoryColor(shop.category) + '30' }]}>
        <Text style={styles.shopEmoji}>
          {shop.category === 'men' ? '💈' : shop.category === 'women' ? '💅' : '✂️'}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(shop.category) }]}>
          <Text style={styles.categoryText}>{shop.category.toUpperCase()}</Text>
        </View>
      </View>

      {/* Shop Info */}
      <View style={styles.shopInfo}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{shop.rating > 0 ? shop.rating : 'New'}</Text>
          </View>
        </View>

        <Text style={styles.shopAddress} numberOfLines={1}>{shop.address}</Text>

        <View style={styles.shopFooter}>
          <View style={[styles.statusDot, { backgroundColor: shop.acceptingBookings ? COLORS.success : COLORS.error }]} />
          <Text style={[styles.statusText, { color: shop.acceptingBookings ? COLORS.success : COLORS.error }]}>
            {shop.acceptingBookings ? 'Available' : 'Busy'}
          </Text>
          <Text style={styles.reviewCount}>{shop.totalReviews} reviews</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search barber, salon..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Men', 'Women', 'Unisex', 'Nearby'].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterPill, f === 'All' && styles.filterPillActive]}>
              <Text style={[styles.filterText, f === 'All' && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby Shops */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Shops</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
          ) : shops.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✂️</Text>
              <Text style={styles.emptyText}>No shops found nearby</Text>
              <Text style={styles.emptySubtext}>Try expanding your search area</Text>
            </View>
          ) : (
            shops.map((shop) => <ShopCard key={shop._id} shop={shop} />)
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: SPACING.lg,
    paddingTop:     SPACING.xl + 20,
    paddingBottom:  SPACING.md,
  },
  greeting: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  userName: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  notifIcon: { fontSize: 18 },

  searchBar: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginVertical:  SPACING.md,
    borderRadius:   RADIUS.md,
    paddingHorizontal: SPACING.md,
    height:         50,
    borderWidth:    1,
    borderColor:    COLORS.border,
    gap:            SPACING.sm,
  },
  searchIcon:        { fontSize: 16 },
  searchPlaceholder: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md },

  filterScroll: { paddingLeft: SPACING.lg, marginBottom: SPACING.md },
  filterPill:   {
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    borderRadius:      RADIUS.full,
    borderWidth:       1,
    borderColor:       COLORS.border,
    marginRight:       SPACING.sm,
    backgroundColor:   COLORS.card,
  },
  filterPillActive:  { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText:        { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  filterTextActive:  { color: COLORS.white, fontWeight: '600' },

  section:       { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle:  { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  seeAll:        { fontSize: FONTS.sizes.sm, color: COLORS.accent, fontWeight: '600' },

  shopCard: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
    ...SHADOWS.small,
  },
  shopImage: {
    height:         140,
    alignItems:     'center',
    justifyContent: 'center',
  },
  shopEmoji:     { fontSize: 48 },
  categoryBadge: {
    position:     'absolute',
    top:          SPACING.sm,
    right:        SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   3,
    borderRadius:  RADIUS.full,
  },
  categoryText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  shopInfo:   { padding: SPACING.md },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shopName:   { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, flex: 1 },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star:       { color: COLORS.warning, fontSize: 14 },
  rating:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },

  shopAddress: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  shopFooter:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  reviewCount: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginLeft: 'auto' },

  emptyState:   { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji:   { fontSize: 48, marginBottom: SPACING.md },
  emptyText:    { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 },
});

export default HomeScreen;
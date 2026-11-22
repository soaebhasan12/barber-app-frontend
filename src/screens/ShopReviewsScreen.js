import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { reviewAPI, getApiError } from '../services/api';
import { titleCase } from '../utils/text';

const PAGE_SIZE = 10;

const Stars = ({ value, size = 13 }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={size} color={i <= value ? COLORS.warning : COLORS.border} />
    ))}
  </View>
);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const ShopReviewsScreen = ({ route, navigation }) => {
  const { shopId, shopName, rating, totalReviews } = route.params;
  const [reviews, setReviews]       = useState([]);
  const [breakdown, setBreakdown]   = useState(null);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const busyRef = useRef(false); // double fetch rokne ke liye

  const load = async (pageNum = 1) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      setFetchError(null);
      if (pageNum > 1) setLoadingMore(true);
      const res = await reviewAPI.getByShop(shopId, { page: pageNum, limit: PAGE_SIZE });
      const data = res.data.data || [];
      setReviews(prev => {
        if (pageNum === 1) return data;
        const seen = new Set(prev.map(r => r._id));
        return [...prev, ...data.filter(r => !seen.has(r._id))];
      });
      if (pageNum === 1) setBreakdown(res.data.summary?.breakdown || null);
      setPage(pageNum);
      setHasMore(!!res.data.hasMore);
    } catch (err) {
      console.log('load reviews error:', err);
      setFetchError(titleCase(getApiError(err, 'Could not load reviews.').message));
    } finally {
      busyRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const total = breakdown ? Object.values(breakdown).reduce((a, b) => a + b, 0) : totalReviews;

  const header = (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLeft}>
        <Text style={styles.bigRating}>{rating > 0 ? rating : 'New'}</Text>
        <Stars value={Math.round(rating || 0)} size={14} />
        <Text style={styles.totalText}>{total} Reviews</Text>
      </View>
      {breakdown && (
        <View style={styles.bars}>
          {[5, 4, 3, 2, 1].map(s => (
            <View key={s} style={styles.barRow}>
              <Text style={styles.barLabel}>{s}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${total ? Math.round((breakdown[s] / total) * 100) : 0}%` }]} />
              </View>
              <Text style={styles.barCount}>{breakdown[s]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    const name = item.userId?.name || 'Customer'; // deleted account ka userId null aata hai
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <Stars value={item.rating} />
        </View>
        {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Customer Reviews</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{shopName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: SPACING.xl }} />
      ) : fetchError && reviews.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Couldn't Load Reviews</Text>
          <Text style={styles.emptySub}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(1); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListHeaderComponent={reviews.length > 0 ? header : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No Reviews Yet</Text>
              <Text style={styles.emptySub}>Be The First To Review After Your Visit</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.md }} /> : null}
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1); }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.xl + 20, paddingBottom: SPACING.md },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  backIcon:  { color: COLORS.textPrimary, fontSize: 20, fontWeight: '600' },
  headerTitle: { textAlign: 'center', color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  headerSub:   { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  list:      { padding: SPACING.lg, paddingBottom: 100 },

  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  summaryLeft: { alignItems: 'center', paddingRight: SPACING.md, marginRight: SPACING.md, borderRightWidth: 1, borderRightColor: COLORS.border },
  bigRating:   { fontSize: 36, fontWeight: '700', color: COLORS.textPrimary },
  totalText:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 4 },
  bars:        { flex: 1 },
  barRow:      { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  barLabel:    { width: 14, color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  barTrack:    { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginHorizontal: SPACING.xs, overflow: 'hidden' },
  barFill:     { height: 6, borderRadius: 3, backgroundColor: COLORS.warning },
  barCount:    { width: 26, textAlign: 'right', color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  card:      { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: COLORS.white, fontWeight: '700' },
  name:      { color: COLORS.textPrimary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  date:      { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  comment:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: SPACING.sm, lineHeight: 19 },

  emptyText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '600', marginTop: SPACING.md },
  emptySub:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.lg },
  retryBtn:  { marginTop: SPACING.md, backgroundColor: COLORS.accent, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },
});

export default ShopReviewsScreen;
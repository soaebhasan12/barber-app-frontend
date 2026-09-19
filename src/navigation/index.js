import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS } from '../constants/theme';

// Screens — abhi placeholder, baad mein replace karenge
import LoginScreen          from '../screens/LoginScreen';
import HomeScreen           from '../screens/HomeScreen';
import BookingScreen        from '../screens/BookingScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import ShopDetailScreen     from '../screens/ShopDetailScreen';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerBookingsScreen  from '../screens/owner/OwnerBookingsScreen';
import OwnerShopScreen      from '../screens/owner/OwnerShopScreen';
import AdminShopsScreen     from '../screens/admin/AdminShopsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const TabIcon = ({ name, label, focused }) => (
  <View style={tabIconStyles.container}>
    <View style={[tabIconStyles.wrap, focused && tabIconStyles.wrapActive]}>
      <Ionicons name={name} size={20} color={focused ? COLORS.accent : COLORS.textMuted} />
    </View>
    <Text style={[tabIconStyles.label, focused && tabIconStyles.labelActive]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const tabIconStyles = {
  container:  { alignItems: 'center', justifyContent: 'center', width: 64 },
  wrap:       { width: 40, height: 30, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  wrapActive: { backgroundColor: COLORS.accent + '20' },
  label:      { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
  labelActive:{ color: COLORS.accent },
};



const UserTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 12,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 72,
        paddingTop: 18,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      // tabBarShowLabel: true,
      // tabBarLabelStyle: {
      //   fontSize: 11,
      //   fontWeight: '600',
      //   marginTop: 2,
      // },
      tabBarShowLabel: false,
      tabBarItemStyle: { flex: 1, height: 64 },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textMuted,
    }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'cut' : 'cut-outline'} label="Home" focused={focused} /> }} />
      <Tab.Screen name="Bookings" component={BookingScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} label="Bookings" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
};

const OwnerTabs = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 12,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 72,
        paddingTop: 18,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      tabBarShowLabel: false,
      tabBarItemStyle: { flex: 1, height: 64 },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textMuted,
    }}>
      <Tab.Screen name="OwnerDashboard" component={OwnerDashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} label="Dashboard" focused={focused} /> }} />
      <Tab.Screen name="OwnerBookings" component={OwnerBookingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} label="Bookings" focused={focused} /> }} />
      <Tab.Screen name="OwnerShop" component={OwnerShopScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'storefront' : 'storefront-outline'} label="Shop" focused={focused} /> }} />
      {user?.isAdmin && (
        <Tab.Screen name="AdminShops" component={AdminShopsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} label="Admin" focused={focused} /> }} />
      )}
      <Tab.Screen name="OwnerProfile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="cut" size={40} color={COLORS.accent} />
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user
          ? <Stack.Screen name="Login" component={LoginScreen} />
          : <>
              <Stack.Screen name="Main" component={user.role === 'owner' ? OwnerTabs : UserTabs} />
              <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
            </>
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
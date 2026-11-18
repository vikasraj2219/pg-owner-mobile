import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  ChevronDown,
  Bell,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Receipt,
  Building2,
  Sparkles,
  BedDouble,
  Users,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useProperties } from '../../src/context/PropertyContext';
import { useDashboard } from '../../src/hooks/useDashboard';
import { PropertySwitcherModal } from '../../src/components/PropertySwitcherModal';
import { AddPropertyModal } from '../../src/components/AddPropertyModal';
import { TenantsDirectoryModal } from '../../src/components/TenantsDirectoryModal';
import { formatINR } from '../../src/utils/currency';
import { formatSafeMonthYear, calculateDaysRemaining } from '../../src/utils/date';
import { DashboardSkeleton } from '../../src/components/Skeleton';

export default function PulseScreen() {
  const router = useRouter();
  const { organization, subscription } = useAuth();
  const {
    properties,
    selectedProperty,
    selectedPropertyId,
    setSelectedPropertyId,
    isLoading: isPropertiesLoading,
    refetchProperties,
  } = useProperties();

  const { stats, isLoading: isDashboardLoading, refetch } = useDashboard(selectedPropertyId);

  const [initialSkeletonActive, setInitialSkeletonActive] = useState(true);
  const splashDismissedRef = useRef(false);

  // Instagram-style smooth splash transition: dismiss native splash once initial layout is ready
  const handleLayout = useCallback(() => {
    if (!splashDismissedRef.current) {
      splashDismissedRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Keep skeleton visible for 750ms so user clearly sees the smooth loading pulse on open/reopen
    const timer = setTimeout(() => {
      setInitialSkeletonActive(false);
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  const showSkeleton =
    initialSkeletonActive || (!stats && (isDashboardLoading || isPropertiesLoading));

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.all([refetch(), refetchProperties ? refetchProperties() : Promise.resolve()]);
    } catch {
      // Ignore
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, refetchProperties]);

  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showTenantsModal, setShowTenantsModal] = useState(false);

  // Dynamic month & year display
  const currentMonthYear = useMemo(() => {
    return formatSafeMonthYear();
  }, []);

  // Dynamic trial remaining days (accurately counts down each calendar day)
  const trialDaysLeft = useMemo(() => {
    if (!subscription?.trialEndsAt) return 14;
    return calculateDaysRemaining(subscription.trialEndsAt);
  }, [subscription]);

  const activePropertyName =
    selectedPropertyId === 'all'
      ? 'All Properties'
      : selectedProperty?.name || organization?.name || 'Property-1';
  const overdueCount = stats?.overdueCount ?? 0;
  const overdueAmountPaise = stats?.overdueAmountPaise ?? 0;

  // Consolidated bed inventory counts
  const consolidatedStats = useMemo(() => {
    if (selectedPropertyId !== 'all') return selectedProperty?.stats;
    return {
      totalRooms: properties.reduce((sum, p) => sum + (p.stats?.totalRooms || 0), 0),
      totalBeds: properties.reduce((sum, p) => sum + (p.stats?.totalBeds || 0), 0),
      occupiedBeds: properties.reduce((sum, p) => sum + (p.stats?.occupiedBeds || 0), 0),
      availableBeds: properties.reduce((sum, p) => sum + (p.stats?.availableBeds || 0), 0),
      occupancyRate: 0,
    };
  }, [selectedPropertyId, selectedProperty, properties]);

  const activePropertyStats = consolidatedStats;
  const displayTotalBeds =
    stats?.totalBeds && stats.totalBeds > 0 ? stats.totalBeds : activePropertyStats?.totalBeds || 0;
  const displayOccupiedBeds =
    stats?.occupiedBeds !== undefined && (stats?.totalBeds || 0) > 0
      ? stats.occupiedBeds
      : activePropertyStats?.occupiedBeds || 0;

  // Comparison rate vs previous period (dynamic)
  const collectionChangeText = useMemo(() => {
    if (stats?.collectionRate && stats.collectionRate > 0) {
      return `${stats.collectionRate}% collected`;
    }
    return '12% vs last month';
  }, [stats?.collectionRate]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#FAF5EB' }}
      edges={['top']}
      onLayout={handleLayout}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor="#4F5330"
              colors={['#4F5330']}
            />
          }
        >
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              {/* Top Property Selector and Notification Bell */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowPropertyPicker(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#0C192B',
                      flex: 1,
                      marginRight: 8,
                    }}
                    numberOfLines={1}
                  >
                    {activePropertyName}
                  </Text>
                  <ChevronDown size={18} color="#0C192B" strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                  onPress={() => router.push('/(tabs)/dues')}
                >
                  <Bell size={20} color="#0C192B" strokeWidth={2.2} />
                  {overdueCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 9,
                        height: 9,
                        borderRadius: 4.5,
                        backgroundColor: '#BE123C',
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Month & Trial Pill Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0C192B' }}>
                  {currentMonthYear}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/subscription' as any)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: '#F59E0B',
                    backgroundColor: '#FEF3C7',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={12} color="#B45309" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>
                    {trialDaysLeft} days trial left
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hero Card: Total Collections (Tap to view dues & collections) */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/dues')}
                style={{
                  backgroundColor: '#4F5330',
                  borderRadius: 24,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#4F5330',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#D5DAC2' }}>
                    Total Collections
                  </Text>
                  {/* Decorative 3-bar indicator */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    <View
                      style={{ width: 4, height: 16, backgroundColor: '#8A906E', borderRadius: 2 }}
                    />
                    <View
                      style={{ width: 4, height: 26, backgroundColor: '#8A906E', borderRadius: 2 }}
                    />
                    <View
                      style={{ width: 4, height: 20, backgroundColor: '#8A906E', borderRadius: 2 }}
                    />
                  </View>
                </View>

                {/* Amount figure */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: -0.5,
                    marginVertical: 4,
                  }}
                >
                  {formatINR(stats?.collectedThisMonthPaise ?? 0)}
                </Text>

                {/* Subtext with growth/progress indicator */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#A8D5BA', marginTop: 2 }}>
                  ↑ {collectionChangeText}
                </Text>
              </TouchableOpacity>

              {/* Two-Column Stats: Occupied Beds & Active Tenants */}
              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 18 }}>
                {/* Occupied Beds Card */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => router.push('/(tabs)/matrix')}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 22,
                    padding: 16,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <BedDouble size={24} color="#19D3E6" strokeWidth={2.3} />
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '800',
                      color: '#0C192B',
                      marginTop: 10,
                      marginBottom: 2,
                    }}
                  >
                    {displayOccupiedBeds}/{displayTotalBeds}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
                    Occupied Beds
                  </Text>
                </TouchableOpacity>

                {/* Active Tenants Card */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => router.push('/(tabs)/tenants' as any)}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFDF8',
                    borderWidth: 1,
                    borderColor: '#E5DDCD',
                    borderRadius: 22,
                    padding: 16,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Users size={24} color="#19D3E6" strokeWidth={2.3} />
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '800',
                      color: '#0C192B',
                      marginTop: 10,
                      marginBottom: 2,
                    }}
                  >
                    {displayOccupiedBeds}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#657080' }}>
                    Active Tenants
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Property Performance Section */}
              <View style={{ marginBottom: 18 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0C192B' }}>
                    Property Performance
                  </Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPropertyPicker(true)}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C192B' }}>
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                {properties.length === 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowAddProperty(true)}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 20,
                      padding: 16,
                      alignItems: 'center',
                    }}
                  >
                    <Building2 size={28} color="#4F5330" />
                    <Text
                      style={{ fontSize: 15, fontWeight: '700', color: '#0C192B', marginTop: 8 }}
                    >
                      No properties found
                    </Text>
                    <Text style={{ fontSize: 12, color: '#657080', marginTop: 2 }}>
                      Tap here to add your first PG property
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 12 }}>
                    {properties.slice(0, 4).map(prop => {
                      const pTotal = prop.stats?.totalBeds || 0;
                      const pOccupied = prop.stats?.occupiedBeds || 0;
                      const pVacant = Math.max(0, pTotal - pOccupied);
                      const pRooms = prop.stats?.totalRooms || 0;
                      const pRate =
                        pTotal > 0
                          ? Math.round((pOccupied / pTotal) * 100)
                          : prop.stats?.occupancyRate || 0;
                      const location =
                        prop.city ||
                        prop.address ||
                        (prop.type === 'girls' ? 'Girls PG' : 'Boys PG');
                      const isSelected = selectedPropertyId === prop._id;

                      return (
                        <TouchableOpacity
                          key={prop._id}
                          activeOpacity={0.85}
                          onPress={() => {
                            void setSelectedPropertyId(prop._id);
                          }}
                          style={{
                            backgroundColor: '#FFFDF8',
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                            borderRadius: 22,
                            padding: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          {/* Top Row: Icon, Name, Active Pill, Occupancy */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                flex: 1,
                                marginRight: 10,
                              }}
                            >
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  backgroundColor: isSelected ? '#19D3E6' : '#FAF5EB',
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Building2
                                  size={22}
                                  color={isSelected ? '#0C192B' : '#4F5330'}
                                  strokeWidth={2.2}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}
                                    numberOfLines={1}
                                  >
                                    {prop.name}
                                  </Text>
                                  {isSelected && (
                                    <View
                                      style={{
                                        backgroundColor: '#F0FDF4',
                                        borderWidth: 1,
                                        borderColor: '#BBF7D0',
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        borderRadius: 9999,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 10,
                                          fontWeight: '800',
                                          color: '#15803D',
                                        }}
                                      >
                                        Selected
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '500',
                                    color: '#657080',
                                    marginTop: 2,
                                  }}
                                  numberOfLines={1}
                                >
                                  {location}
                                </Text>
                              </View>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0C192B' }}>
                                {pRate}%
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#657080' }}>
                                Occupancy
                              </Text>
                            </View>
                          </View>

                          {/* Progress bar */}
                          <View
                            style={{
                              width: '100%',
                              height: 6,
                              backgroundColor: '#EAE3D3',
                              borderRadius: 9999,
                              marginTop: 12,
                              marginBottom: 12,
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.min(100, Math.max(0, pRate))}%`,
                                height: '100%',
                                backgroundColor: isSelected ? '#19D3E6' : '#4F5330',
                                borderRadius: 9999,
                              }}
                            />
                          </View>

                          {/* Mini Stat Pills Row */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#FAF5EB',
                              borderRadius: 12,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                              Rooms:{' '}
                              <Text style={{ fontWeight: '800', color: '#0C192B' }}>{pRooms}</Text>
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                              Occupied:{' '}
                              <Text style={{ fontWeight: '800', color: '#15803D' }}>
                                {pOccupied}
                              </Text>
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080' }}>
                              Vacant:{' '}
                              <Text style={{ fontWeight: '800', color: '#0284C7' }}>{pVacant}</Text>
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Quick Actions Section */}
              <View style={{ marginBottom: 18 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: '800', color: '#0C192B', marginBottom: 12 }}
                >
                  Quick Actions
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Check-in */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/tenants/add' as any)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 20,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#D1F4F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <UserPlus size={20} color="#0799AA" strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                      Check-in
                    </Text>
                  </TouchableOpacity>

                  {/* Dues */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/(tabs)/dues')}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 20,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#FEF3C7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Receipt size={20} color="#854D0E" strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>Dues</Text>
                  </TouchableOpacity>

                  {/* Property */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowPropertyPicker(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 20,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#EAE8DF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Building2 size={20} color="#4F5330" strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C192B' }}>
                      Property
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Overdue / Status Banner */}
              {overdueCount > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/dues')}
                  style={{
                    backgroundColor: '#FDF2F4',
                    borderWidth: 1,
                    borderColor: '#FECDD3',
                    borderRadius: 20,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FCE7EC',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <AlertCircle size={22} color="#BE123C" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#991B1B' }}>
                      {overdueCount} tenant{overdueCount === 1 ? '' : 's'} overdue &gt; 5d
                    </Text>
                    <Text
                      style={{ fontSize: 12, fontWeight: '600', color: '#BE123C', marginTop: 2 }}
                    >
                      {formatINR(overdueAmountPaise)} pending collection
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/dues')}
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                    borderRadius: 20,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <CheckCircle2 size={22} color="#0A6C50" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>
                      All rents collected on time
                    </Text>
                    <Text
                      style={{ fontSize: 12, fontWeight: '500', color: '#047857', marginTop: 2 }}
                    >
                      Zero overdue accounts pending
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/matrix')}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#4F5330',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#4F5330',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Property Switcher Modal */}
      <PropertySwitcherModal
        visible={showPropertyPicker}
        onClose={() => setShowPropertyPicker(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => {
          void setSelectedPropertyId(id);
          setShowPropertyPicker(false);
        }}
        onOpenAddProperty={() => {
          setShowPropertyPicker(false);
          setShowAddProperty(true);
        }}
      />

      {/* Add Property Modal */}
      <AddPropertyModal
        visible={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onSuccess={id => {
          void setSelectedPropertyId(id);
          setShowAddProperty(false);
        }}
      />

      {/* Tenants Directory Modal */}
      <TenantsDirectoryModal
        visible={showTenantsModal}
        onClose={() => setShowTenantsModal(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onCheckoutTenant={id => router.push(`/checkout/${id}`)}
      />
    </SafeAreaView>
  );
}

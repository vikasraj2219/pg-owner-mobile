import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { LucideIcon, Home, LayoutGrid, Users, Wallet, PlusCircle } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';

export default function TabsLayout() {
  useEffect(() => {
    // Safety fallback: if screen layout takes unusually long, ensure splash is dismissed
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const renderTabIcon = (IconComponent: LucideIcon, focused: boolean) => {
    return (
      <IconComponent
        color={focused ? '#0891B2' : '#8C95A0'}
        size={22}
        strokeWidth={focused ? 2.5 : 1.9}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0891B2',
        tabBarInactiveTintColor: '#8C95A0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5DDCD',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 66,
          elevation: 6,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon(Home, focused),
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrix',
          tabBarIcon: ({ focused }) => renderTabIcon(LayoutGrid, focused),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Tenants',
          tabBarIcon: ({ focused }) => renderTabIcon(Users, focused),
        }}
      />
      <Tabs.Screen
        name="dues"
        options={{
          title: 'Dues',
          tabBarIcon: ({ focused }) => renderTabIcon(Wallet, focused),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => renderTabIcon(PlusCircle, focused),
        }}
      />
    </Tabs>
  );
}

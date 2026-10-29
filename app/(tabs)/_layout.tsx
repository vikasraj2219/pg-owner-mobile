import React from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Activity, LayoutGrid, Menu } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0A6C50',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color }) => <Activity color={color} size={22} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrix',
          tabBarIcon: ({ color }) => <LayoutGrid color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="dues"
        options={{
          title: 'Dues',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color,
                  lineHeight: 22,
                }}
              >
                ₹
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Menu color={color} size={22} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}

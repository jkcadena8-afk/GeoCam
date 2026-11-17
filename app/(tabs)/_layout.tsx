import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import { useSync } from '@/hooks/useSync';

/**
 * Navegación por pestañas.
 * Los datos viven en SQLite (db/), se leen con hooks reactivos.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Aqui y no en una pestana: las pestanas se montan al visitarlas y la
  // sincronizacion debe correr desde que se abre la app
  useSync();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        freezeOnBlur: false,
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
      }}>
      <Tabs.Screen
        name="geocam"
        options={{
          title: 'GeoCam',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fotos"
        options={{
          title: 'Fotos',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'map.fill', android: 'map', web: 'map' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
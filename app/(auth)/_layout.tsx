import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoProProvider } from '@/contexts/GoProContext';
import { WSProvider } from '@/contexts/WSContext';

export default function TabLayout() {
  return (
    <GoProProvider>
    <WSProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'black' },
        tabBarActiveTintColor: 'purple',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: false,
        tabBarIconStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
          margin: 0,
          height: 50,
          width: 50,
        }
      }}>
        <Tabs.Screen
          name="fish"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="fish-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="exchange"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="verify"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkmark-circle-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      </GestureHandlerRootView>
      </WSProvider>
    </GoProProvider>
  );
}

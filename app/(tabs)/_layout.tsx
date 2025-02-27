import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '../../constants/Colors';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="fish"
        options={{
          title: 'Fish',
          tabBarIcon: ({ color }) => <TabBarIcon name="fish" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color }) => <TabBarIcon name="exchange" color={color} />,
        }}
      />
    </Tabs>
  );
}

import { FontAwesome5 } from '@expo/vector-icons';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome5>['name'];
  color: string;
}) {
  return <FontAwesome5 size={28} style={{ marginBottom: -3 }} {...props} />;
}

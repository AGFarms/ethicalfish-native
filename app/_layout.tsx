import { Slot, Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext'
import 'react-native-get-random-values'
import { SplashScreen } from 'expo-router'
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {

  return (
    <SafeAreaProvider>
    <AuthProvider>
      <View style={{backgroundColor: 'black', flex: 1}}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </View>
    </AuthProvider>
    </SafeAreaProvider>
  )
}

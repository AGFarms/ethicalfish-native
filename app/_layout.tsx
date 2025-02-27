import { Slot, Stack } from 'expo-router'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import 'react-native-get-random-values'
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/(auth)/(tabs)/fish')
    }
  }, [isAuthenticated])

  return <Slot />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={{backgroundColor: 'black', flex: 1}}>
          <AuthWrapper />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthIndex() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EthicalFish {user?.email}</Text>
      <Text style={styles.subtitle}>Your sustainable fishing companion</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center'
  }
})

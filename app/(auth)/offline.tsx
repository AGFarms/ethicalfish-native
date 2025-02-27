import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function OfflineScreen() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.text}>You are currently offline</Text>
        <Text style={styles.subtext}>Please check your internet connection</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  }
});

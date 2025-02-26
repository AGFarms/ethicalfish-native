import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, magic } = useAuth();

  const handleLogin = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      await signIn(email);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <magic.Relayer/>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete='email'
        editable={!isLoading}
      />
      <Button 
        title={isLoading ? "Loading..." : "Login with Magic"} 
        onPress={handleLogin}
        disabled={isLoading || !email}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    color: 'white',
  },
}); 
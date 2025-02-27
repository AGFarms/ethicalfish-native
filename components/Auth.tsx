import { View, TextInput, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const { signInWithOTP, verifyOTP, magic, user, signOut, isLoading: authLoading } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const update = (async () => {
      setIsLoggedIn(await magic.user.isLoggedIn());
    })
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [magic]);

  const handleSendOTP = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      await signInWithOTP(email);
      setShowOtpInput(true);
    } catch (error) {
      console.error('Send OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;
    setIsLoading(true);
    try {
      await verifyOTP(otp);
    } catch (error) {
      console.error('Verify OTP error:', error);
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <magic.Relayer />
        {authLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          !showOtpInput ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={[styles.button, (isLoading || !email) && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading || !email}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Sending..." : "Send OTP"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.text}>Enter the code sent to {email}</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#666"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.button, (isLoading || !otp) && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || !otp}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )
        )}
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
    backgroundColor: 'black',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
    width: '100%',
    color: 'white',
    fontSize: 16,
  },
  text: {
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  }
}); 
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const { signInWithOTP, verifyOTP, magic } = useAuth();

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
        {!showOtpInput ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />
            <Button
              title={isLoading ? "Sending..." : "Send OTP"}
              onPress={handleSendOTP}
              disabled={isLoading || !email}
            />
          </>
        ) : (
          <>
            <Text style={styles.text}>Enter the code sent to {email}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />
            <Button
              title={isLoading ? "Verifying..." : "Verify OTP"}
              onPress={handleVerifyOTP}
              disabled={isLoading || !otp}
            />
          </>
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
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    width: '100%',
    color: 'white',
  },
  text: {
    color: 'white',
    marginBottom: 20,
  }
}); 
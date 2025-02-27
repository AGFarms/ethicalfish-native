import { useAuth } from '@/contexts/AuthContext';
import { View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity } from 'react-native'
import { useState } from 'react'

export default function Auth() {
  const { signInWithOTP, verifyOTP, magic } = useAuth();
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  async function handleSignIn() {
    await signInWithOTP(email)
    setOtpSent(true)
  }

  async function handleVerifyOTP() {
    await verifyOTP(otp)
  }

  return (
    <View style={styles.container}>
      {!otpSent ? (
        <>
          <magic.Relayer />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete='email'
            autoFocus={true}
            inputMode='email'
          />
          <Pressable 
            style={styles.button}
            onPress={handleSignIn}
          >
            <Text style={styles.buttonText}>Send OTP</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter OTP"
            keyboardType="number-pad"
          />
          <Pressable 
            style={styles.button}
            onPress={handleVerifyOTP}
          >
            <Text style={styles.buttonText}>Verify OTP</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
}) 
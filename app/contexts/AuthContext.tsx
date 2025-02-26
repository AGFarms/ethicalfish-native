// @ts-nocheck
import { createContext, useContext, useEffect, useState } from 'react';
import { Magic } from '@magic-sdk/react-native-expo';
import { FlowExtension } from '@magic-ext/flow';
import { useRouter, useSegments } from 'expo-router';
import * as fcl from '@onflow/fcl';
import flowJSON from '../../flow/ethicalfish/flow.json';
import { authz } from '@/lib/authz';

fcl.config({
    "accessNode.api": "https://rest-testnet.onflow.org",
    "flow.network": "testnet"
}).load({
    flowJSON: flowJSON
})

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<any>;
  signOut: () => Promise<void>;
  magic: InstanceType<typeof Magic>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [magic] = useState(() => new Magic(process.env.EXPO_PUBLIC_MAGIC_PUBLIC_KEY!, {
    extensions: [new FlowExtension({ network: 'testnet', rpcUrl: 'https://rest-testnet.onflow.org' })]
  }));
  const router = useRouter();
  const segments = useSegments();
  const [loginHandle, setLoginHandle] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  const checkUser = async () => {
    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      setIsAuthenticated(isLoggedIn);
      if (isLoggedIn) {
        const userData = await magic.user.getMetadata();
        setUser(userData);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOTP = async (email: string) => {
    try {
      const handle = magic.auth.loginWithEmailOTP({ 
        email, 
        showUI: false 
      });

      setLoginHandle(handle);
      
      handle.on('email-otp-sent', () => {
        console.log('OTP sent successfully');
      });

      handle.on('error', (error) => {
        console.error('OTP error:', error);
        throw error;
      });

    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const verifyOTP = async (otp: string) => {
    try {
      console.log('Starting OTP verification process...');
      
      if (!loginHandle) {
        console.error('No active login handle found');
        throw new Error('No active login session');
      }
      
      console.log('Emitting verify-email-otp event with OTP:', otp);
      loginHandle.emit('verify-email-otp', otp);
      
      console.log('Waiting for OTP verification result...');
      const result = await new Promise((resolve, reject) => {
        loginHandle.on('done', (res) => {
          console.log('OTP verification successful');
          resolve(res);
        });
        loginHandle.on('invalid-email-otp', () => {
          console.error('Invalid OTP provided');
          reject(new Error('Invalid OTP'));
        });
      });

      console.log('OTP verified successfully, creating child wallet...');
      let txid = await fcl.mutate({
        cadence: `
          transaction {
            prepare(signer: &Account) {
              signer.createChildAccount()
            }
          }
        `,
        payer: authz(
            "0x2950c37fbc229852", 
            "0", 
            "2cfbe81e1b4fec4b0af9b54f466b535416a971d0324b24549cb3de88be1ca6b2"
        ),
        authorizations: [magic.flow.authorization],
        proposer: magic.flow.authorization
      });

      console.log('Child wallet creation transaction submitted with ID:', txid);
      console.log('Updating user authentication state...');
      await checkUser();
      
      console.log('OTP verification process completed successfully');
      return result;
    } catch (error) {
      console.error('Error during OTP verification process:', error.stack);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      console.log('Calling magic.user.logout()...');
      await magic.user.logout();
      console.log('Successfully logged out from Magic');
      console.log('Setting authentication state to false...');
      setIsAuthenticated(false);
      console.log('Clearing user data...');
      setUser(null);
      console.log('Sign out process completed successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoading, 
      isAuthenticated, 
      user, 
      signInWithOTP, 
      verifyOTP, 
      signOut, 
      magic 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 
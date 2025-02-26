import { createContext, useContext, useEffect, useState } from 'react';
import { Magic } from '@magic-sdk/react-native-expo';
import { FlowExtension } from '@magic-ext/flow';
import { useRouter, useSegments } from 'expo-router';

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  magic: any | null;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [magic] = useState(() => new Magic(process.env.EXPO_PUBLIC_MAGIC_PUBLIC_KEY!, {
    extensions: [new FlowExtension({ network: 'testnet', rpcUrl: 'https://rpc.ankr.com/flow/testnet' })]
  }));
  const router = useRouter();
  const segments = useSegments();

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

  const signIn = async (email: string) => {
    try {
      if (!magic) {
        console.log('Magic instance is not ready yet');
        return;
      }
      
      console.log(`Attempting to sign in user with email: ${email}`);
      console.log('Waiting for modal to be ready...');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay to let modal initialize
      
      console.log('Calling Magic auth loginWithEmailOTP...');
      await magic.auth.loginWithEmailOTP({ email, showUI: true });
  
      console.log('Magic auth login successful');
      console.log('Checking user status...');
      await checkUser();
      console.log('User check complete - sign in successful');
    } catch (error) {
      console.log('Error during sign in:', error);
      throw error;
    }
  };
  
  const signOut = async () => {
    try {
      await magic.user.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, signIn, signOut, magic }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 
import { createContext, useContext, useEffect, useState } from 'react';
import { Magic } from '@magic-sdk/react-native-expo';
import { FlowExtension } from '@magic-ext/flow';
import * as fcl from '@onflow/fcl';
import flowJSON from '@/flow/ethicalfish/flow.json';
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
  const [loginHandle, setLoginHandle] = useState<any>(null);

  useEffect(() => {
    (async () => {
      console.log('Checking user login status...');
      checkUser();
    })();
  }, []);

  const magic = new Magic("pk_live_AB20FDF21CDEE189", {
    extensions: [new FlowExtension({ network: 'testnet', rpcUrl: 'https://rest-testnet.onflow.org' })]
  });

  const checkUser = async () => {
    setIsLoading(true);

    const data = magic.user.getInfo();
    data.on('done', (user) => {
      console.log('Got User Data', user);
      setUser(user);
      setIsAuthenticated(true);
      setIsLoading(false);
    });

    data.on('error', (error) => {
      console.error('Error getting user data:', error);
      setIsLoading(false);
    });
  };

  const signInWithOTP = async (email: string) => {
    try {
      console.log('Starting sign in with OTP process...', email);

      const handle = magic.auth.loginWithEmailOTP({ 
        email, 
        showUI: false,
      });

      setLoginHandle(handle);

      handle.on('done', (e) => {
        console.log('done handle', e);
      });
      
      handle.on('email-otp-sent', () => {
        console.log('OTP sent successfully');
      });

      handle.on('error', (error) => {
        console.error('OTP error:', error.stack);
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

      loginHandle.on('done', (e: any) => {
        console.log('done loginHandle', e);
      });      
      console.log('OTP verification process completed successfully');
    } catch (error) {
      throw error;
    } finally {
      checkUser();
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      let result = magic.user.logout();

      result.on('done', (e) => {
        console.log('done signOut', e);
      });

      result.on('error', (error) => {
        console.error('Error during sign out:', error);
        throw error;
      });

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
      magic: magic as any
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 
import { createContext, useContext, useEffect, useState } from 'react';
import { Magic } from '@magic-sdk/react-native-expo';
import { FlowExtension } from '@magic-ext/flow';
import { useRouter, useSegments } from 'expo-router';
import * as fcl from '@onflow/fcl';

// Configure FCL
fcl.config()
  .put("accessNode.api", "https://rest-testnet.onflow.org")
  .put("discovery.wallet", "https://fcl-discovery.onflow.org/testnet/authn")
  .put("app.detail.title", "Your App Name")
  .put("app.detail.icon", "https://yourapp.com/icon.png");

const createUserWallet = async (parentAddress: string, parentPrivateKey: string) => {
  const transactionId = await fcl.mutate({
    cadence: `
      import FlowToken from 0x7e60df042a9c0868
      import FungibleToken from 0x9a0766d93b6608b7
      
      transaction {
        prepare(signer: AuthAccount) {
          let newAccount = AuthAccount(payer: signer)
          
          // Fund the new account with some FLOW
          let vault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Flow token vault reference")
            
          let newVault <- vault.withdraw(amount: 0.001) // Min amount for account creation
          
          let newWallet <- newAccount.storage.save<@FlowToken.Vault>(<-newVault, to: /storage/flowTokenVault)
          newAccount.link<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver, target: /storage/flowTokenVault)
          newAccount.link<&FlowToken.Vault{FungibleToken.Balance}>(/public/flowTokenBalance, target: /storage/flowTokenVault)
        }
      }
    `,
    args: [],
    payer: fcl.authz,
    proposer: fcl.authz,
    authorizations: [fcl.authz],
    limit: 999
  });

  return fcl.tx(transactionId).onceSealed();
};

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<any>;
  signOut: () => Promise<void>;
  magic: any | null;
  userWallet: string | null;
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
  const [loginHandle, setLoginHandle] = useState<any>(null);
  const [userWallet, setUserWallet] = useState<string | null>(null);

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
      if (!loginHandle) throw new Error('No active login session');
      
      loginHandle.emit('verify-email-otp', otp);
      
      const result = await new Promise((resolve, reject) => {
        loginHandle.on('done', resolve);
        loginHandle.on('invalid-email-otp', () => {
          reject(new Error('Invalid OTP'));
        });
      });

      await checkUser();

      // Create Flow wallet for new user
      if (!userWallet) {
        try {
          const parentWalletAddress = process.env.EXPO_PUBLIC_FLOW_PARENT_WALLET_ADDRESS!;
          const parentWalletPrivateKey = process.env.EXPO_PUBLIC_FLOW_PARENT_WALLET_KEY!;
          
          const walletResult = await createUserWallet(
            parentWalletAddress, 
            parentWalletPrivateKey
          );
          
          setUserWallet(walletResult.events[0].data.address);
          
          // Store wallet address in user metadata
          await magic.user.updateMetadata({
            flowWalletAddress: walletResult.events[0].data.address
          });
          
        } catch (error) {
          console.error('Error creating Flow wallet:', error);
          // Continue with auth flow even if wallet creation fails
        }
      }

      return result;
    } catch (error) {
      console.error('Error verifying OTP:', error);
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
    <AuthContext.Provider value={{ 
      isLoading, 
      isAuthenticated, 
      user, 
      signInWithOTP, 
      verifyOTP, 
      signOut, 
      magic,
      userWallet 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 
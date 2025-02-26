export const PARENT_WALLET_ADDRESS = process.env.EXPO_PUBLIC_PARENT_WALLET_ADDRESS;
export const PARENT_WALLET_PRIVATE_KEY = process.env.EXPO_PUBLIC_PARENT_WALLET_PRIVATE_KEY;

if (!PARENT_WALLET_ADDRESS || !PARENT_WALLET_PRIVATE_KEY) {
  throw new Error('Parent wallet address or private key is not set');
}

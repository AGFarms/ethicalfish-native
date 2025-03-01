import * as FileSystem from 'expo-file-system';

export async function setupAssets() {
  const assetsDirectory = FileSystem.documentDirectory + 'assets/';
  
  // Create assets directory if it doesn't exist
  try {
    const info = await FileSystem.getInfoAsync(assetsDirectory);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(assetsDirectory, { intermediates: true });
    }
    
    // Copy assets from the bundle to the filesystem
    // You'll need to adjust these paths based on where your assets are bundled
    await FileSystem.copyAsync({
      from: require('../assets/geofence.wasm'),
      to: assetsDirectory + 'geofence.wasm'
    });
    await FileSystem.copyAsync({
      from: require('../assets/geofence_0001.zkey'),
      to: assetsDirectory + 'geofence_0001.zkey'
    });
    await FileSystem.copyAsync({
      from: require('../assets/geofence_verification_key.json'),
      to: assetsDirectory + 'geofence_verification_key.json'
    });
  } catch (error) {
    console.error('Error setting up assets:', error);
    throw error;
  }
} 
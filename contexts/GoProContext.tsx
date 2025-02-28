import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';
import { Buffer } from 'buffer';

const GOPRO_SERVICE_UUID = '0000fea6-0000-1000-8000-00805f9b34fb';
const WIFI_AP_SSID_PREFIX = 'GP50059988';
const WIFI_CTRL_CHARACTERISTIC_UUID = 'b5f90072-aa8d-11e3-9046-0002a5d5c51b';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectionStates {
  bluetooth: ConnectionStatus;
  wifi: ConnectionStatus;
}

interface Location {
  latitude: number | null;
  longitude: number | null;
}

interface GoProContextType {
  streamUrl: string;
  device: Device | null;
  status: string;
  isLoading: boolean;
  connectionStates: ConnectionStates;
  location: Location;
  connectToGoPro: () => Promise<void>;
  handleReconnect: () => Promise<void>;
  resetConnection: () => Promise<void>;
}

const GoProContext = createContext<GoProContextType | undefined>(undefined);

export function GoProProvider({ children }: { children: React.ReactNode }) {
  console.log('[GoProProvider] Initializing provider');
  
  const [bleManager, setBleManager] = useState(() => {
    console.log('[GoProProvider] Creating new BleManager instance');
    return new BleManager();
  });
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [device, setDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionStates, setConnectionStates] = useState<ConnectionStates>({
    bluetooth: 'disconnected',
    wifi: 'disconnected'
  });
  const [location, setLocation] = useState<Location>({ latitude: null, longitude: null });

  function recreateBleManager() {
    console.log('[recreateBleManager] Destroying existing BleManager');
    if (bleManager) {
      bleManager.destroy();
    }
    console.log('[recreateBleManager] Creating new BleManager instance');
    setBleManager(new BleManager());
  }

  async function requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  async function connectToGoProWifi() {
    console.log('[connectToGoProWifi] Starting WiFi connection');
    try {
      setConnectionStates(prev => ({ ...prev, wifi: 'connecting' }));
      setStatus('Connecting to GoPro WiFi...');
      
      console.log('[connectToGoProWifi] Attempting to connect to GoPro WiFi network');
      await WifiManager.connectToProtectedSSID(
        'GP50059988',
        'ZVV-2MP-2wW',
        false,
        false
      );

      console.log('[connectToGoProWifi] Connected to WiFi, starting stream');
      let responseStartStream = await fetch('http://10.5.5.9:8080/gopro/camera/stream/start?port=8556');
      setStatus('Connected! Starting stream...');
      setStreamUrl('udp://@:8556');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, wifi: 'connected' }));
      console.log('[connectToGoProWifi] Stream started successfully');
    } catch (error) {
      console.error('[connectToGoProWifi] Error:', error);
      setStatus('WiFi connection failed');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, wifi: 'disconnected' }));
    }
  }

  async function connectToGoPro() {
    console.log('[connectToGoPro] Starting GoPro connection process');
    try {
      const btState = await bleManager.state();
      console.log('[connectToGoPro] Current Bluetooth state:', btState);
      if (btState !== 'PoweredOn') {
        console.log('[connectToGoPro] Bluetooth not ready, recreating manager');
        recreateBleManager();
        throw new Error(`Bluetooth is not ready: ${btState}`);
      }

      setConnectionStates(prev => ({ ...prev, bluetooth: 'connecting' }));
      setIsLoading(true);
      
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        console.log('[connectToGoPro] Permission denied');
        throw new Error('Bluetooth permission denied');
      }

      console.log('[connectToGoPro] Starting device scan');
      bleManager.startDeviceScan(
        [GOPRO_SERVICE_UUID],
        { allowDuplicates: false, scanMode: 2 },
        async (error: Error | null, scannedDevice: Device | null) => {
          if (error) {
            console.error('[connectToGoPro] Scan error:', error);
            setStatus('Scan error');
            setIsLoading(false);
            setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
            return;
          }
          if (scannedDevice) {
            console.log('[connectToGoPro] Device found:', scannedDevice.id);
            try {
              console.log('[connectToGoPro] Cancelling existing connection');
              scannedDevice.cancelConnection();
              bleManager.stopDeviceScan();
              
              console.log('[connectToGoPro] Connecting to device');
              const connectedDevice = await scannedDevice.connect();
              setDevice(connectedDevice as Device);
              
              console.log('[connectToGoPro] Discovering services and characteristics');
              const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
              
              console.log('[connectToGoPro] Sending AP mode command');
              const switchToAPCommand = Buffer.from([0x03, 0x17, 0x01, 0x01]).toString('base64');
              await discoveredDevice.writeCharacteristicWithResponseForService(
                GOPRO_SERVICE_UUID,
                WIFI_CTRL_CHARACTERISTIC_UUID,
                switchToAPCommand
              );

              setConnectionStates(prev => ({ ...prev, bluetooth: 'connected' }));
              console.log('[connectToGoPro] Bluetooth connected, initiating WiFi connection');
              await connectToGoProWifi();
            } catch (error) {
              console.error('[connectToGoPro] Connection error:', error);
              setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
              setIsLoading(false);
              setDevice(null);
            }
          }
        }
      );
    } catch (error) {
      console.error('[connectToGoPro] Error:', error);
      setStatus('Connection failed');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
    }
  }

  async function handleReconnect() {
    console.log('[handleReconnect] Starting reconnection process');
    setDevice(null);
    setStreamUrl('');
    setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected', wifi: 'disconnected' }));
    recreateBleManager();
    await connectToGoPro();
  }

  async function deleteAllPhotos() {
    try {
      console.log('[deleteAllPhotos] Deleting all media');
      const response = await fetch('http://10.5.5.9/gp/gpControl/command/storage/delete/all');
      if (!response.ok) {
        throw new Error('Failed to delete media');
      }
      console.log('[deleteAllPhotos] All media deleted successfully');
    } catch (error) {
      console.error('[deleteAllPhotos] Error:', error);
    }
  }

  async function fetchGPSData() {
    console.log('[fetchGPSData] Starting GPS fetch via photo');
    try {
      console.log('[fetchGPSData] Attempting to switch to photo mode');
      const switchToPhotoResponse = await fetch('http://10.5.5.9/gp/gpControl/command/mode?p=1');
      if (!switchToPhotoResponse.ok) {
        console.error('[fetchGPSData] Failed to switch to photo mode:', switchToPhotoResponse.status);
        throw new Error('Failed to switch to photo mode');
      }
      console.log('[fetchGPSData] Successfully switched to photo mode');
      
      console.log('[fetchGPSData] Taking photo...');
      const captureResponse = await fetch('http://10.5.5.9/gp/gpControl/command/shutter?p=1');
      if (!captureResponse.ok) {
        console.error('[fetchGPSData] Failed to take photo:', captureResponse.status);
        throw new Error('Failed to take photo');
      }
      console.log('[fetchGPSData] Photo captured successfully');
      
      console.log('[fetchGPSData] Waiting for photo processing...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('[fetchGPSData] Fetching media list');
      const mediaListResponse = await fetch('http://10.5.5.9/gp/gpControl/command/medialist');
      const mediaList = await mediaListResponse.json();
      console.log('[fetchGPSData] Media list retrieved:', mediaList);
      
      if (mediaList.media && mediaList.media[0] && mediaList.media[0].fs) {
        const lastMedia = mediaList.media[0].fs[0];
        console.log('[fetchGPSData] Found last media item:', lastMedia);
        
        console.log('[fetchGPSData] Fetching metadata for media:', lastMedia.n);
        const metadataResponse = await fetch(`http://10.5.5.9/gp/gpControl/media/meta?p=${lastMedia.n}`);
        const metadata = await metadataResponse.json();
        console.log('[fetchGPSData] Retrieved metadata:', metadata);
        
        if (metadata.gps && metadata.gps.latitude && metadata.gps.longitude) {
          console.log('[fetchGPSData] Valid GPS data found:', {
            latitude: metadata.gps.latitude,
            longitude: metadata.gps.longitude
          });
          
          setLocation({
            latitude: metadata.gps.latitude,
            longitude: metadata.gps.longitude
          });
        } else {
          console.log('[fetchGPSData] No valid GPS data in metadata');
        }
      } else {
        console.log('[fetchGPSData] No media found in list');
      }

      console.log('[fetchGPSData] Cleaning up - deleting all photos');
      await deleteAllPhotos();
      console.log('[fetchGPSData] Cleanup complete');

    } catch (error) {
      console.error('[fetchGPSData] Error during GPS fetch:', error);
      console.log('[fetchGPSData] Attempting cleanup after error');
      await deleteAllPhotos();
      console.log('[fetchGPSData] Error cleanup complete');
    }
  }

  useEffect(() => {
    console.log('[useEffect GPS] Setting up GPS polling');
    let interval: NodeJS.Timeout;
    if (connectionStates.wifi === 'connected') {
      interval = setInterval(fetchGPSData, 5000);
    }
    return () => {
      if (interval) {
        console.log('[useEffect GPS] Cleaning up GPS polling');
        clearInterval(interval);
      }
    };
  }, [connectionStates.wifi]);

  useEffect(() => {
    console.log('[useEffect Init] Initializing component');
    let mounted = true;

    function cleanup() {
      console.log('[useEffect Init] Cleaning up component');
      bleManager.stopDeviceScan();
      if (device) {
        device.cancelConnection();
      }
      bleManager.destroy();
    }

    if (mounted) {
      console.log('[useEffect Init] Component mounted, connecting to GoPro');
      connectToGoPro();
    }

    return () => {
      console.log('[useEffect Init] Component unmounting');
      mounted = false;
      cleanup();
    };
  }, []);

  async function resetConnection() {
    try {
      setStatus('Resetting connections...');
      setIsLoading(true);
      
      // Create new manager first
      const newBleManager = new BleManager();
      
      // Stop scanning and disconnect using old manager
      bleManager.stopDeviceScan();
      if (device) {
        await device.cancelConnection();
      }
      
      // Reset states
      setDevice(null);
      setStreamUrl('');
      setConnectionStates({
        bluetooth: 'disconnected',
        wifi: 'disconnected'
      });
      
      // Disconnect WiFi if on Android
      try {
        if (Platform.OS === 'android') {
          await WifiManager.disconnect();
        }
      } catch (error) {
        console.error('[resetConnection] WiFi disconnect error:', error);
      }
      
      // Destroy old manager only after new one is created
      bleManager.destroy();
      setBleManager(newBleManager);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start fresh connection using new manager
      await connectToGoPro();
      
    } catch (error) {
      console.error('[resetConnection] Error:', error);
      setStatus('Reset failed');
      setIsLoading(false);
      setConnectionStates({
        bluetooth: 'disconnected',
        wifi: 'disconnected'
      });
    }
  }

  const value = {
    streamUrl,
    device,
    status,
    isLoading,
    connectionStates,
    location,
    connectToGoPro,
    handleReconnect,
    resetConnection,
  };

  return <GoProContext.Provider value={value}>{children}</GoProContext.Provider>;
}

export function useGoPro() {
  console.log('[useGoPro] Getting context');
  const context = useContext(GoProContext);
  if (context === undefined) {
    console.error('[useGoPro] Context undefined - hook used outside provider');
    throw new Error('useGoPro must be used within a GoProProvider');
  }
  return context;
}
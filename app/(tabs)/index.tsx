import React, { useState, useEffect } from 'react';
import { View, Alert, Platform, PermissionsAndroid, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';
import {VLCPlayer} from 'react-native-vlc-media-player';
import { Buffer } from 'buffer';

const GOPRO_SERVICE_UUID = '0000fea6-0000-1000-8000-00805f9b34fb';
const WIFI_AP_SSID_PREFIX = 'GP50059988';
const WIFI_CTRL_CHARACTERISTIC_UUID = 'b5f90072-aa8d-11e3-9046-0002a5d5c51b';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectionStates {
  bluetooth: ConnectionStatus;
  wifi: ConnectionStatus;
}

interface GoProCharacteristic {
  value: string;
}

interface WifiNetwork {
  SSID: string;
}

interface GoProStatus {
  settings: {
    62: number; // Bitrate (1200000)
    64: number; // Video resolution mode
    167: number; // Current video mode
  };
  status: {
    2: number; // System busy (0=idle, 1=busy)
    8: number; // Encoding status (0=stopped, 1=running)
    10: number; // Camera ready (0=ready)
    31: number; // SD card status
    33: number; // Battery level
    39: number; // WiFi status
    89: number; // Current battery percentage
  };
}

export default function App() {
  const [bleManager, setBleManager] = useState(() => new BleManager());
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [device, setDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionStates, setConnectionStates] = useState<ConnectionStates>({
    bluetooth: 'disconnected',
    wifi: 'disconnected'
  });
  const [location, setLocation] = useState({ latitude: null, longitude: null });

  function recreateBleManager() {
    console.log('Recreating BLE manager');
    if (bleManager) {
      bleManager.destroy();
    }
    setBleManager(new BleManager());
  }

  async function requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      console.log('Permission results:', granted);
      return (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }
  
  function getStatusColor(status: ConnectionStatus) {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FFC107';
      case 'disconnected':
        return '#F44336';
    }
  };

  async function handleReconnect() {
    console.log('Reconnecting...');
    setDevice(null);
    setStreamUrl('');
    setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected', wifi: 'disconnected' }));
    recreateBleManager();
    await connectToGoPro();
  }

  async function connectToGoPro() {
    try {
      const btState = await bleManager.state();
      console.log('Bluetooth state:', btState);
      if (btState !== 'PoweredOn') {
        recreateBleManager();
        throw new Error(`Bluetooth is not ready: ${btState}`);
      }

      setConnectionStates(prev => ({ ...prev, bluetooth: 'connecting' }));
      console.log('Starting GoPro connection process...');
      setIsLoading(true);
      setStatus('Requesting Bluetooth permissions...');
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        console.log('Bluetooth permission denied');
        throw new Error('Bluetooth permission denied');
      }
      
      console.log('Starting BLE scan for GoPro...');
      setStatus('Scanning for GoPro...');
      bleManager.startDeviceScan(
        [GOPRO_SERVICE_UUID],
        { 
          allowDuplicates: false,
          scanMode: 2,
        },
        async (error: Error | null, scannedDevice: Device | null) => {
          if (error) {
            console.error('Detailed scan error:', JSON.stringify(error, null, 2));
            setStatus('Scan error');
            setIsLoading(false);
            setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
            return;
          }
          if (scannedDevice) {
            try {
              console.log('GoPro device found:', scannedDevice.id);
              scannedDevice.cancelConnection();
              bleManager.stopDeviceScan();
              setStatus('GoPro found, connecting...');
              const connectedDevice = await scannedDevice.connect();
              console.log('Connected to GoPro via BLE');
              setDevice(connectedDevice as Device);
              setStatus('Discovering services...');
              const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
              console.log('Services discovered');
              
              setStatus('Enabling WiFi...');
              console.log('Sending WiFi enable command...');
              console.log(discoveredDevice);
              const switchToAPCommand = Buffer.from([0x03, 0x17, 0x01, 0x01]).toString('base64');
              
              await discoveredDevice.writeCharacteristicWithResponseForService(
                GOPRO_SERVICE_UUID,
                WIFI_CTRL_CHARACTERISTIC_UUID,
                switchToAPCommand
              );
              console.log('WiFi enable command sent');

              setConnectionStates(prev => ({ ...prev, bluetooth: 'connected' }));
              await connectToGoProWifi();
            } catch (error) {
              setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
              setIsLoading(false);
              setDevice(null);
              console.error(error);
            }
          }
        }
      );
      console.log('BLE scan stopped');
      setIsLoading(false)
    } catch (error) {
      console.error('GoPro connection error:', error);
      if (error instanceof Error && error.message.includes('destroyed')) {
        console.log('BleManager was destroyed, retrying...');
        recreateBleManager();
        await connectToGoPro();
        return;
      }
      Alert.alert('Error', 'Failed to connect to GoPro via Bluetooth');
      setStatus('Connection failed');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, bluetooth: 'disconnected' }));
    }
  };

  async function connectToGoProWifi() {
    try {
      setConnectionStates(prev => ({ ...prev, wifi: 'connecting' }));
      console.log('Starting WiFi connection process...');
      setStatus('Scanning WiFi networks...');
      setStatus('Connecting to GoPro WiFi...');
      await WifiManager.connectToProtectedSSID(
        'GP50059988',
        'ZVV-2MP-2wW',
        false,
        false
      );

      console.log('WiFi connected, setting up stream');
      let responseStartStream = await fetch('http://10.5.5.9:8080/gopro/camera/stream/start?port=8556');
      console.log(responseStartStream);
      setStatus('Connected! Starting stream...');
      setStreamUrl('udp://@:8556');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, wifi: 'connected' }));

    } catch (error) {
      console.error('WiFi connection error:', error);
      Alert.alert('Error', 'Failed to connect to GoPro WiFi');
      setStatus('WiFi connection failed');
      setIsLoading(false);
      setConnectionStates(prev => ({ ...prev, wifi: 'disconnected' }));
    }
  };

  async function fetchGPSData() {
    try {
      const response = await fetch('http://10.5.5.9/gp/gpControl/status');
      const data = await response.json();
      if (data.status && data.status['33']) {  // Check if GPS data exists
        setLocation({
          latitude: data.status['33'],
          longitude: data.status['34']
        });
      }
    } catch (error) {
      console.error('Error fetching GPS data:', error);
    }
  }

  useEffect(() => {
    console.log('App mounted, starting connection process');
    let mounted = true;

    function cleanup() {
      console.log('Cleaning up BLE');
      bleManager.stopDeviceScan();
      if (device) {
        device.cancelConnection();
      }
      bleManager.destroy();
    }

    if (mounted) {
      connectToGoPro();
    }

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    console.log('connectionStates.wifi', connectionStates.wifi);
    if (connectionStates.wifi === 'connected') {
      interval = setInterval(fetchGPSData, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStates.wifi]);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={styles.gpsContainer}>
        <Text style={styles.gpsText}>
          {location.latitude !== null ? 
            `Lat: ${location.latitude}\nLong: ${location.longitude}` : 
            'GPS: Waiting...'
          }
        </Text>
      </View>

      <View style={{ 
        position: 'absolute', 
        top: 40, 
        right: 20, 
        alignItems: 'flex-end',
        zIndex: 1000
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            backgroundColor: getStatusColor(connectionStates.bluetooth),
            marginRight: 8 
          }} />
          <Text style={{ color: 'white' }}>Bluetooth: {connectionStates.bluetooth}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            backgroundColor: getStatusColor(connectionStates.wifi),
            marginRight: 8 
          }} />
          <Text style={{ color: 'white' }}>WiFi: {connectionStates.wifi}</Text>
        </View>

        {(connectionStates.bluetooth === 'disconnected' || connectionStates.wifi === 'disconnected') && (
          <TouchableOpacity 
            onPress={handleReconnect}
            style={styles.reconnectButton}
            activeOpacity={0.7}
          >
            <Text style={styles.reconnectText}>Reconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {!device && !isLoading && (
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{ marginTop: 10, color: 'white' }}>{status}</Text>
        </View>
      )}
      {isLoading && (
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{ marginTop: 10, color: 'white' }}>{status}</Text>
        </View>
      )}
      {streamUrl && (
        <VLCPlayer
          style={{ flex: 1, width: '100%', height: '100%' }}
          source={{ 
            uri: streamUrl,
            initOptions: [
              '--network-caching=150',
              '--live-caching=150',
              '--clock-jitter=0',
              '--clock-synchro=0',
            ]
          }}
          autoplay={true}
          onError={(e) => {
            console.error('VLC Error:', JSON.stringify(e, null, 2));
            setStatus('Stream error - attempting to reconnect...');
            handleReconnect();
          }}
          onPlaying={() => {
            console.log('Stream playing');
            setStatus('Stream connected');
          }}
          onBuffering={(event) => {
            console.log('Stream buffering', event);
            setStatus('Buffering stream...');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gpsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4
  },
  gpsText: {
    color: 'white',
    fontFamily: 'monospace',
  },
  reconnectButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  reconnectText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
import React, { useState, useEffect } from 'react';
import { View, Alert, Platform, PermissionsAndroid, ActivityIndicator, Text } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import WifiManager from 'react-native-wifi-reborn';
import {VLCPlayer} from 'react-native-vlc-media-player';
import { Buffer } from 'buffer';

const GOPRO_SERVICE_UUID = '0000fea6-0000-1000-8000-00805f9b34fb';
const WIFI_AP_SSID_PREFIX = 'GP50059988';
const WIFI_CTRL_CHARACTERISTIC_UUID = 'b5f90072-aa8d-11e3-9046-0002a5d5c51b';

export default function App() {
  const [bleManager] = useState(() => new BleManager());
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [device, setDevice] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
  
      return (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  };
  

  const connectToGoPro = async () => {
    try {
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
        { allowDuplicates: false },
        async (error, scannedDevice) => {
          console.log('BLE scan callback called');
          console.log(scannedDevice);
          if (error) {
            console.error('BLE scan error:', error);
            setStatus('Scan error');
            setIsLoading(false);
            return;
          }
          if (scannedDevice) {
            try {
              console.log('GoPro device found:', scannedDevice.id);
              bleManager.stopDeviceScan();
              setStatus('GoPro found, connecting...');
              const connectedDevice = await scannedDevice.connect();
              console.log('Connected to GoPro via BLE');
              setDevice(connectedDevice);
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

              await connectToGoProWifi();
            } catch (error) {
              console.error(error);
            }
          }
        }
      );
      console.log('BLE scan stopped');
    } catch (error) {
      console.error('GoPro connection error:', error);
      Alert.alert('Error', 'Failed to connect to GoPro via Bluetooth');
      setStatus('Connection failed');
      setIsLoading(false);
    }
  };

  const connectToGoProWifi = async () => {
    try {
      console.log('Starting WiFi connection process...');
      setStatus('Scanning WiFi networks...');
      const networks = await WifiManager.loadWifiList();
      console.log('Available networks:', networks.length);
      const goProNetwork = networks.find(network => 
        network.SSID.startsWith(WIFI_AP_SSID_PREFIX)
      );

      if (!goProNetwork) {
        console.log('No GoPro network found');
        throw new Error('GoPro WiFi network not found');
      }

      console.log('Found GoPro network:', goProNetwork.SSID);
      setStatus('Connecting to GoPro WiFi...');
      await WifiManager.connectToProtectedSSID(
        'GP50059988',
        'jJ6-KQk-Cqn',
        false,
        false
      );

      console.log('WiFi connected, setting up stream');
      setStatus('Connected! Starting stream...');
      setStreamUrl('udp://@10.5.5.9:8554');
      setIsLoading(false);
    } catch (error) {
      console.error('WiFi connection error:', error);
      Alert.alert('Error', 'Failed to connect to GoPro WiFi');
      setStatus('WiFi connection failed');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('App mounted, starting connection process');
    connectToGoPro();
    return () => {
      console.log('App unmounting, destroying BLE manager');
      bleManager.destroy();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {isLoading && (
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{ marginTop: 10, color: 'white' }}>{status}</Text>
        </View>
      )}
      {streamUrl && (
        <VLCPlayer
          style={{ flex: 1, width: '100%', height: '100%' }}
          source={{ uri: streamUrl }}
          autoplay={true}
        />
      )}
    </View>
  );
}
import React from 'react';
import { View, Text, StyleSheet, Animated, PanResponderInstance, Dimensions, TouchableOpacity } from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import { useGoPro } from '../../contexts/GoProContext';

interface GoProModalProps {
  isVisible: boolean;
  onClose: () => void;
  translateY: Animated.Value;
  panResponder: PanResponderInstance;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function GoProModal({ isVisible, onClose, translateY, panResponder }: GoProModalProps) {
  const { 
    streamUrl, 
    connectionStates, 
    status, 
    isLoading, 
    location,
    resetConnection 
  } = useGoPro();

  if (!isVisible) return null;

  const getStatusColor = (status: 'connected' | 'connecting' | 'disconnected') => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FFC107';
      case 'disconnected':
        return '#F44336';
    }
  };

  return (
    <Animated.View 
      style={[
        styles.modal,
        { transform: [{ translateY }] }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.modalHandle} />
      
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(connectionStates.bluetooth) }]} />
            <Text style={styles.statusText}>Bluetooth: {connectionStates.bluetooth}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(connectionStates.wifi) }]} />
            <Text style={styles.statusText}>WiFi: {connectionStates.wifi}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetConnection}
          disabled={isLoading}
        >
          <Text style={styles.resetButtonText}>Reset Connection</Text>
        </TouchableOpacity>
      </View>

      {location.latitude && location.longitude && (
        <View style={styles.gpsContainer}>
          <Text style={styles.gpsText}>
            Lat: {location.latitude}
            {'\n'}
            Long: {location.longitude}
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.statusMessageContainer}>
          <Text style={styles.statusMessage}>{status}</Text>
        </View>
      )}

      {streamUrl && (
        <View style={styles.streamContainer}>
          <VLCPlayer
            style={styles.stream}
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
              console.error('VLC Error:', e);
            }}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    zIndex: 3000,
    elevation: 3000,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
  },
  gpsContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
  },
  gpsText: {
    color: 'white',
    fontFamily: 'monospace',
  },
  statusMessageContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  statusMessage: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  streamContainer: {
    flex: 1,
    marginTop: 20,
  },
  stream: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#FF4444',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 
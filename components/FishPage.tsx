import React, { useRef, useState, useEffect } from 'react';
import { View, Button, StyleSheet, TouchableWithoutFeedback, Animated, PanResponder, Dimensions, Text, Image, ScrollView, Keyboard, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import GoProModal from '../components/cardModals/GoProModal';
import InfoModal from '../components/cardModals/InfoModal';
import MapModal from '../components/cardModals/MapModal';
import { VLCPlayer } from 'react-native-vlc-media-player';
import { useGoPro } from '../contexts/GoProContext';
import { useWS } from '../contexts/WSContext';
import * as fcl from "@onflow/fcl";
import * as Location from 'expo-location';
import { generateZkp } from '../utils/generateZkp';
import { verifyZkp } from '../utils/verifyZkp';
import * as FileSystem from 'react-native-fs';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type CarouselRenderItem = {
  item: string;
  index: number;
};

export default function FishPage() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [frames, setFrames] = useState<string[]>([]);
  const frameProcessorRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [bumpFrame, setBumpFrame] = useState<string | null>(null);
  const [heroFrame, setHeroFrame] = useState<string | null>(null);
  const [releaseStartFrame, setReleaseStartFrame] = useState<number | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [isGoProModalVisible, setIsGoProModalVisible] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const goProTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const infoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const mapTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const { streamUrl, connectionStates } = useGoPro();
  const { sendImage } = useWS();

  const createModalPanResponder = (translateY: Animated.Value, setVisible: (visible: boolean) => void) => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SCREEN_HEIGHT * 0.2) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });

  const goProPanResponder = useRef(createModalPanResponder(goProTranslateY, setIsGoProModalVisible)).current;
  const infoPanResponder = useRef(createModalPanResponder(infoTranslateY, setIsInfoModalVisible)).current;
  const mapPanResponder = useRef(createModalPanResponder(mapTranslateY, setIsMapModalVisible)).current;

  const device = isFrontCamera ? frontDevice : backDevice;
  
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    return () => {
      if (frameProcessorRef.current) {
        clearInterval(frameProcessorRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let frameInterval: NodeJS.Timeout;
    
    if (isModalVisible && frames.length > 0 && isHolding) {
      frameInterval = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      }, 1000/7); // 7 FPS to match capture rate
    }

    return () => {
      if (frameInterval) {
        clearInterval(frameInterval);
      }
    };
  }, [isModalVisible, frames.length, isHolding]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Handle keyboard show if needed
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Handle keyboard hide if needed
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  if (!device) return <View style={styles.container} />;

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      setIsFrontCamera(!isFrontCamera);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const openModal = () => {
    setIsModalVisible(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
    Keyboard.dismiss();
    setCurrentFrameIndex(0);
    setFrames([]);
    setBumpFrame(null);
    setHeroFrame(null);
    setReleaseStartFrame(null);
  };

  const captureFrame = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto();
        setFrames(prev => [...prev, photo.path]);
        
        // Send image for processing
        let response = await sendImage(photo.path);
        console.log('Inference Results:', response);
        
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    }
  };

  const generateAndVerifyZkp = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Convert coordinates to the format expected by the circuit (multiply by 1e6 to handle decimals)
      const input = {
        latitude: Math.round(location.coords.latitude * 1e6),
        longitude: Math.round(location.coords.longitude * 1e6),
        geofenceCenterLat: Math.round(location.coords.latitude * 1e6), // Using same location as center for this example
        geofenceCenterLon: Math.round(location.coords.longitude * 1e6)
      };

      // Save input to file
      const inputPath = `${FileSystem.DocumentDirectoryPath}/input.json`;
      await FileSystem.writeFile(inputPath, JSON.stringify(input, null, 2));

      // Generate and verify ZKP
      const { proof, publicSignals, verificationKey } = await generateZkp(
        input.latitude,
        input.longitude
      );

      const verified = await verifyZkp(proof);

      console.log('ZKP Generated and Verified Successfully');
      return true;
    } catch (error) {
      console.error('Error in ZKP process:', error);
      Alert.alert('Error', 'Failed to verify location.');
      return false;
    }
  };

  const startRecording = async () => {
    // Verify location before starting recording
    const verified = await generateAndVerifyZkp();
    if (!verified) {
      Alert.alert('Location Verification Failed', 'Unable to start recording.');
      return;
    }

    setFrames([]);
    setIsRecording(true);
    frameProcessorRef.current = setInterval(captureFrame, 1000/7); // 7 FPS
  };

  const stopRecording = async () => {
    if (frameProcessorRef.current) {
      clearInterval(frameProcessorRef.current);
      frameProcessorRef.current = null;
    }
    setIsRecording(false);

    if (frames.length > 0) {
      setVideoPath(null);
      openModal();
    }
  };

  const handleSubmit = async () => {
    if (frames.length > 0 && bumpFrame && heroFrame && releaseStartFrame !== null) {
      try {
        // Get the release frames starting from releaseStartFrame
        const releaseFrames = frames.slice(releaseStartFrame);
        
        // Create simple hashes (in production you'd want a proper hashing function)
        const timestamp = Date.now().toString();
        const bumpHash = `hash_${bumpFrame}_${timestamp}`;
        const heroHash = `hash_${heroFrame}_${timestamp}`;
        const releaseHashes = releaseFrames.map((frame, i) => 
          `hash_release_${i}_${timestamp}`
        );

        // Prepare transaction arguments
        const transactionArgs = [
          bumpFrame,          // bump
          bumpHash,          // bumpHash
          heroFrame,         // hero
          heroHash,         // heroHash
          releaseFrames,    // release array
          releaseHashes,    // releaseHashes array
        ];

        // Execute the transaction
        const txId = await fcl.mutate({
          cadence: `
            import UnverifiedFishScan from 0x2950c37fbc229852

            transaction(
              bump: String,
              bumpHash: String,
              hero: String,
              heroHash: String,
              release: [String],
              releaseHashes: [String]
            ) {
              let recipient: &{UnverifiedFishScan.CollectionPublic}

              prepare(acct: AuthAccount) {
                if acct.borrow<&UnverifiedFishScan.Collection>(from: /storage/NFTCollection) == nil {
                  let collection <- UnverifiedFishScan.createEmptyCollection()
                  acct.save(<-collection, to: /storage/NFTCollection)
                  acct.link<&{UnverifiedFishScan.CollectionPublic}>(
                    /public/NFTCollection,
                    target: /storage/NFTCollection
                  )
                }

                self.recipient = acct.getCapability(/public/NFTCollection)
                  .borrow<&{UnverifiedFishScan.CollectionPublic}>()
                  ?? panic("Could not borrow recipient's collection")
              }

              execute {
                let newNFT <- UnverifiedFishScan.mintNFT(
                  bump: bump,
                  bumpHash: bumpHash,
                  hero: hero,
                  heroHash: heroHash,
                  release: release,
                  releaseHashes: releaseHashes
                )

                self.recipient.deposit(token: <-newNFT)
              }
            }
          `,
          args: (arg, t) => [
            arg(bumpFrame, t.String),
            arg(bumpHash, t.String),
            arg(heroFrame, t.String),
            arg(heroHash, t.String),
            arg(releaseFrames, t.Array(t.String)),
            arg(releaseHashes, t.Array(t.String))
          ],
          payer: fcl.authz,
          proposer: fcl.authz,
          authorizations: [fcl.authz],
          limit: 999
        });

        console.log('Transaction ID:', txId);
        
        // Wait for transaction to be sealed
        const txStatus = await fcl.tx(txId).onceSealed();
        console.log('Transaction sealed:', txStatus);

        // Close modal and reset states
        closeModal();
        setBumpFrame(null);
        setHeroFrame(null);
        setReleaseStartFrame(null);

        // Show success message
        Alert.alert('Success', 'NFT minted successfully!');

      } catch (error) {
        console.error('Error minting NFT:', error);
        Alert.alert('Error', 'Failed to mint NFT. Please try again.');
      }
    } else {
      Alert.alert(
        'Incomplete Selection',
        'Please select a bump frame, hero frame, and release start frame before submitting.'
      );
    }
  };
  
  const renderCarouselItem = ({ item: framePath, index }: CarouselRenderItem) => (
    <View style={styles.carouselItem}>
      <Image
        source={{ uri: `file://${framePath}` }}
        style={styles.carouselImage}
        resizeMode="contain"
      />
    </View>
  );

  const handleSetBump = () => {
    if (bumpFrame === frames[currentFrameIndex]) {
      setBumpFrame(null);
    } else {
      setBumpFrame(frames[currentFrameIndex]);
    }
  };

  const handleSetHero = () => {
    if (heroFrame === frames[currentFrameIndex]) {
      setHeroFrame(null);
    } else {
      setHeroFrame(frames[currentFrameIndex]);
    }
  };

  const handleSetReleaseStart = () => {
    if (releaseStartFrame === currentFrameIndex) {
      setReleaseStartFrame(null);
    } else {
      setReleaseStartFrame(currentFrameIndex);
    }
  };

  const openGoProModal = () => {
    setIsGoProModalVisible(true);
    Animated.spring(goProTranslateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const openInfoModal = () => {
    setIsInfoModalVisible(true);
    Animated.spring(infoTranslateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const openMapModal = () => {
    setIsMapModalVisible(true);
    Animated.spring(mapTranslateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const closeGoProModal = () => {
    Animated.timing(goProTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsGoProModalVisible(false));
  };

  const closeInfoModal = () => {
    Animated.timing(infoTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsInfoModalVisible(false));
  };

  const closeMapModal = () => {
    Animated.timing(mapTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsMapModalVisible(false));
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={StyleSheet.absoluteFill}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            video={true}
            photo={true}
            audio={true}
          />
        </View>
      </TouchableWithoutFeedback>

      {!isModalVisible && (
        <TouchableOpacity 
          style={styles.goProCard} 
          onPress={openGoProModal}
        >
          {streamUrl && connectionStates.wifi === 'connected' ? (
            <View style={styles.goProPreview}>
              <VLCPlayer
                style={styles.previewStream}
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
              />
              <Text style={styles.goProText}>Go Pro</Text>
            </View>
          ) : (
            <Text style={styles.goProText}>Go Pro</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.leftCard} onPress={openInfoModal}>
        <Text style={styles.leftCardText}>Info</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mapCard} onPress={openMapModal}>
        <Text style={styles.leftCardText}>Map</Text>
      </TouchableOpacity>

      <View style={styles.metadataContainer}>
        <TouchableOpacity 
          style={[styles.metadataCircle, showWeather && styles.metadataActive]} 
          onPress={() => setShowWeather(!showWeather)}
        >
          <Text style={styles.metadataText}>🌤️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.metadataCircle, showTime && styles.metadataActive]} 
          onPress={() => setShowTime(!showTime)}
        >
          <Text style={styles.metadataText}>⏰</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.metadataCircle, showLocation && styles.metadataActive]} 
          onPress={() => setShowLocation(!showLocation)}
        >
          <Text style={styles.metadataText}>📍</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.buttonContainer, { gap: 10 }]}>
        <TouchableOpacity
          style={{
            backgroundColor: isRecording ? '#FF4444' : '#4A90E2',
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 25,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            {isRecording ? 'STOP FISHSCAN' : 'START FISHSCAN'}
          </Text>
        </TouchableOpacity>
      </View>

      {isModalVisible && (
        <Animated.View 
          style={[
            styles.modal,]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalContent}>
              <Animated.View style={styles.imageContainer}>
                <TouchableWithoutFeedback
                  onPressIn={() => setIsHolding(true)}
                  onPressOut={() => setIsHolding(false)}
                >
                  <Animated.View>
                    <Animated.View style={[
                      styles.imageWrapper,
                      bumpFrame === frames[currentFrameIndex] && styles.bumpBorder,
                      heroFrame === frames[currentFrameIndex] && styles.heroBorder,
                      releaseStartFrame !== null && currentFrameIndex >= releaseStartFrame && styles.releaseBorder,
                    ]}>
                      <Animated.Image
                        source={{ uri: `file://${frames[currentFrameIndex]}` }}
                        style={[
                          styles.previewImage
                        ]}
                        resizeMode="contain"
                      />
                      {bumpFrame === frames[currentFrameIndex] && (
                        <View style={[styles.frameLabel, styles.bumpLabel]}>
                          <Text style={styles.labelText}>BUMP</Text>
                        </View>
                      )}
                      {heroFrame === frames[currentFrameIndex] && (
                        <View style={[styles.frameLabel, styles.heroLabel]}>
                          <Text style={styles.labelText}>HERO</Text>
                        </View>
                      )}
                      {releaseStartFrame !== null && currentFrameIndex >= releaseStartFrame && (
                        <View style={[styles.frameLabel, styles.releaseLabel]}>
                          <Text style={styles.labelText}>RELEASE</Text>
                        </View>
                      )}
                      <Text style={styles.frameCounter}>
                        Frame: {currentFrameIndex + 1} / {frames.length}
                      </Text>
                    </Animated.View>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </Animated.View>
            <View style={styles.frameControls}>
              <Button 
                title="◀" 
                onPress={() => setCurrentFrameIndex(prev => Math.max(0, prev - 1))}
              />
              <Button 
                title="▶" 
                onPress={() => setCurrentFrameIndex(prev => Math.min(frames.length - 1, prev + 1))}
              />
            </View>
            <View style={styles.frameActions}>
              <Button
                title={`Set Bump ${bumpFrame ? '✓' : ''}`}
                onPress={handleSetBump}
                color={bumpFrame ? 'green' : undefined}
              />
              <Button
                title={`Set Hero ${heroFrame ? '✓' : ''}`}
                onPress={handleSetHero}
                color={heroFrame ? 'green' : undefined}
              />
              <Button
                title={`Set Release Start ${releaseStartFrame !== null ? '✓' : ''}`}
                onPress={handleSetReleaseStart}
                color={releaseStartFrame !== null ? 'green' : undefined}
              />
            </View>
            <View style={styles.buttonGroup}>
              <Button title="Submit" onPress={handleSubmit} />
              <Button title="Cancel" onPress={closeModal} color="gray" />
            </View>
          </View>
        </Animated.View>
      )}

      <GoProModal
        isVisible={isGoProModalVisible}
        onClose={closeGoProModal}
        translateY={goProTranslateY}
        panResponder={goProPanResponder}
      />
      <InfoModal
        isVisible={isInfoModalVisible}
        onClose={closeInfoModal}
        translateY={infoTranslateY}
        panResponder={infoPanResponder}
      />
      <MapModal
        isVisible={isMapModalVisible}
        onClose={closeMapModal}
        translateY={mapTranslateY}
        panResponder={mapPanResponder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',

  },
  imageWrapper: {
    position: 'relative',
    borderWidth: 4,
    borderColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bumpBorder: {
    borderColor: '#2196F3', // Blue
  },
  heroBorder: {
    borderColor: '#FFD700', // Gold
  },
  releaseBorder: {
    borderColor: '#9C27B0', // Purple
  },
  frameLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  bumpLabel: {
    backgroundColor: '#2196F3',
  },
  heroLabel: {
    backgroundColor: '#FFD700',
  },
  releaseLabel: {
    backgroundColor: '#9C27B0',
  },
  labelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.5,
  },
  colorText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 4,
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  carouselContainer: {
    flex: 1,
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: '90%',
    height: '90%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    margin: 5,
  },
  paginationDotActive: {
    backgroundColor: '#000',
  },
  frameCounter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    padding: 5,
    borderRadius: 5,
  },
  frameControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 10,
  },
  frameActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    gap: 10,
  },
  goProCard: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 200,
    height: 120,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    overflow: 'hidden',
  },

  goProPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewStream: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  goProText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    zIndex: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  leftCard: {
    position: 'absolute',
    top: 40,
    right: 240,
    width: 140,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#FFF',
  },

  leftCardText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },

  mapCard: {
    position: 'absolute',
    top: 130,
    right: 240,
    width: 140,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#FFF',
  },

  metadataContainer: {
    position: 'absolute',
    top: 340,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },

  metadataCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  metadataActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
  },

  metadataText: {
    fontSize: 24,
  },
});
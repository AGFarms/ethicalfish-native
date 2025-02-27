import React, { useRef, useState, useEffect } from 'react';
import { View, Button, StyleSheet, TouchableWithoutFeedback, Animated, PanResponder, Dimensions, Text, Image, ScrollView, Keyboard } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Carousel, { CarouselProps } from 'react-native-snap-carousel';
import { PinchGestureHandler} from 'react-native-gesture-handler';

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
  const [gifPath, setGifPath] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [bumpFrame, setBumpFrame] = useState<string | null>(null);
  const [heroFrame, setHeroFrame] = useState<string | null>(null);
  const [releaseStartFrame, setReleaseStartFrame] = useState<number | null>(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SCREEN_HEIGHT * 0.2) {
          closeModal();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    }
  };

  const startRecording = async () => {
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
    if (frames.length > 0) {
      const submission = {
        bump: bumpFrame,
        hero: heroFrame,
        release: releaseStartFrame !== null ? frames.slice(releaseStartFrame) : null,
      };
      console.log('Submitting frames:', submission);
      closeModal();
      // Reset states
      setBumpFrame(null);
      setHeroFrame(null);
      setReleaseStartFrame(null);
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
    setBumpFrame(frames[currentFrameIndex]);
  };

  const handleSetHero = () => {
    setHeroFrame(frames[currentFrameIndex]);
  };

  const handleSetReleaseStart = () => {
    setReleaseStartFrame(currentFrameIndex);
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
      <View style={[styles.buttonContainer, { gap: 10 }]}>
        <Button 
          title={isRecording ? "Finish Submission Scan" : "Start Submission Scan"} 
          onPress={isRecording ? stopRecording : startRecording}
        />
      </View>

      {isModalVisible && (
        <Animated.View 
          style={[
            styles.modal,
            { transform: [{ translateY }] }
          ]}
          {...panResponder.panHandlers}
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
});
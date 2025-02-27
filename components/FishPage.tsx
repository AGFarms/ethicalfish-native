import React, { useRef, useState } from 'react';
import { View, Button, StyleSheet, TouchableWithoutFeedback, Animated, PanResponder, Dimensions, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MODAL_WIDTH = SCREEN_WIDTH * 0.8;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function FishPage() {
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission()
  const lastTapRef = useRef<number>(0);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward drag
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SCREEN_HEIGHT * 0.2) {
          // Close modal if dragged down more than 20% of screen height
          closeModal();
        } else {
          // Snap back to top
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const device = isFrontCamera ? frontDevice : backDevice;
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
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      try {
        await cameraRef.current.startRecording({
          onRecordingFinished: (video) => {
            console.log('Recording finished', video);
            setVideoPath(video.path);
            setIsRecording(false);
            openModal();
          },
          onRecordingError: (error) => {
            console.error('Recording failed', error);
            setIsRecording(false);
          },
        });
      } catch (error) {
        console.error('Failed to start recording', error);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    try {
      await cameraRef.current?.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const handleSubmit = async () => {
    if (videoPath) {
      // TODO: Handle video submission
      console.log('Submitting video:', videoPath);
      closeModal();
      setVideoPath(null);
    }
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
            audio={true}
          />
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.buttonContainer}>
        <Button 
          title={isRecording ? "Stop Recording" : "Start Recording"} 
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
            {videoPath && (
              <>
                <Text style={styles.modalText}>Video recorded!</Text>
                <Button title="Submit Video" onPress={handleSubmit} />
                <Button title="Cancel" onPress={closeModal} color="gray" />
              </>
            )}
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
    alignItems: 'center',
    gap: 20,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
});
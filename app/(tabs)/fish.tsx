import React, { useRef, useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

const FishRecognitionApp = () => {
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);

  if (!device) return <View style={styles.container} />;

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      // Logic to record video
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      <Button title="Start Recording" onPress={startRecording} disabled={isRecording} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FishRecognitionApp; 
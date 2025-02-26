import React from 'react';
import { View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

interface FishDetectorProps {
  cameraRef: React.RefObject<Camera>;
}

export const FishDetector: React.FC<FishDetectorProps> = ({ cameraRef }) => {
  return <View />;
}; 
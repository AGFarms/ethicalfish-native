import React from 'react';
import { View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

interface FocusAgentProps {
  cameraRef: React.RefObject<Camera>;
}

export const FocusAgent: React.FC<FocusAgentProps> = ({ cameraRef }) => {
  return <View />;
}; 
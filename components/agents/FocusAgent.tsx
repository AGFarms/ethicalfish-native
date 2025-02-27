import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera } from 'react-native-vision-camera';

interface FocusAgentProps {
  cameraRef: React.RefObject<Camera>;
  onFocus: () => void;
}

const FocusAgent: React.FC<FocusAgentProps> = ({ cameraRef, onFocus }) => {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const checkFocus = async () => {
      if (!cameraRef.current) return;

      try {
        // Simple check if camera is ready
        const isActive = await Camera.getAvailableCameraDevices().length > 0;
        setIsFocused(isActive);
        if (isActive) {
          onFocus();
        }
      } catch (error) {
        console.error('Focus check error:', error);
      }
    };

    const interval = setInterval(checkFocus, 500);
    return () => clearInterval(interval);
  }, [cameraRef, onFocus]);

  return (
    <View style={styles.overlay}>
      {isFocused && <Text style={styles.focusText}>Focus Locked</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusText: {
    color: 'green',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default FocusAgent;
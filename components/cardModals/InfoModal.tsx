import React from 'react';
import { View, Text, Button, StyleSheet, Animated } from 'react-native';
import { Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface InfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  translateY: Animated.Value;
  panResponder: any;
}

export default function InfoModal({ isVisible, onClose, translateY, panResponder }: InfoModalProps) {
  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.modal,
        { transform: [{ translateY }] }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.modalHandle} />
      <View style={styles.modalContent}>
        <Text style={styles.title}>Information</Text>
        {/* Add your Info content here */}
        <Button title="Close" onPress={onClose} color="gray" />
      </View>
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
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    zIndex: 2000,
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
}); 
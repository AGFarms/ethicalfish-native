import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { generateZkp } from '../utils/generateZkp'; // ZKP generation function
import { verifyZkp } from '../utils/verifyZkp'; // ZKP verification function

interface Location {
  latitude: number;
  longitude: number;
}

const GeofenceComponent = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [insideGeofence, setInsideGeofence] = useState<boolean | null>(null);

  const geofenceRadius = 500; // Radius in meters
  const geofenceCenter = { latitude: 40.748817, longitude: -73.985428 }; // Example: Times Square, New York

  // Initialize location tracking
  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        setLocation(position.coords);
        checkGeofence(position.coords);
      },
      error => {
        console.error(error);
        Alert.alert('Location Error', error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    const watchId = Geolocation.watchPosition(
      position => {
        setLocation(position.coords);
        checkGeofence(position.coords);
      },
      error => console.error(error),
      { enableHighAccuracy: true, distanceFilter: 10 } // Update when moved 10 meters
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  const checkGeofence = (currentLocation: Location) => {
    if (currentLocation) {
      const distance = calculateDistance(
        geofenceCenter.latitude,
        geofenceCenter.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      const isInside = distance < geofenceRadius;
      setInsideGeofence(isInside);
      
      // Generate and verify ZKP if inside the geofence
      if (isInside) {
        generateAndVerifyZkp(currentLocation);
      }
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const generateAndVerifyZkp = async (currentLocation: Location) => {
    try {
      const proof = await generateZkp(currentLocation.latitude, currentLocation.longitude);
      const verificationResult = await verifyZkp(proof);
      console.log('ZKP Verification Result:', verificationResult);
    } catch (error) {
      console.error('ZKP Generation or Verification failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.locationText}>
        Current Location: {location ? `${location.latitude}, ${location.longitude}` : 'Loading...'}
      </Text>
      <View
        style={[
          styles.geofenceIndicator,
          { backgroundColor: insideGeofence ? 'green' : 'red' },
        ]}
      />
      <Text style={styles.status}>
        You are {insideGeofence ? 'inside' : 'outside'} the geofence
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  locationText: {
    fontSize: 18,
    marginBottom: 20,
  },
  geofenceIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 20,
  },
  status: {
    marginTop: 20,
    fontSize: 18,
  },
});

export default GeofenceComponent;

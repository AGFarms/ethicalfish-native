import * as snarkjs from 'snarkjs';
import * as FileSystem from 'expo-file-system';

// Use FileSystem.documentDirectory or bundledAssets to reference files
const assetsDirectory = FileSystem.documentDirectory + 'assets/';
const wasmPath = assetsDirectory + 'geofence.wasm';
const zkeyPath = assetsDirectory + 'geofence_0001.zkey';
const verificationKeyPath = assetsDirectory + 'geofence_verification_key.json';

export const generateZkp = async (latitude: number, longitude: number) => {
  try {
    // Prepare inputs for the Circom circuit
    const input = {
      latitude,
      longitude,
      geofenceCenterLat: 40.748817, // Center of geofence (latitude of the center point)
      geofenceCenterLon: -73.985428, // Longitude of the center point
      geofenceRadius: 500, // Radius in meters
    };

    // Run Groth16 fullProve using the prepared input, wasm file, and zkey file
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

    console.log("Proof: ");
    console.log(JSON.stringify(proof, null, 1));

    // Load verification key
    const verificationKey = JSON.parse(await FileSystem.readAsStringAsync(verificationKeyPath));

    // Verify the proof
    const res = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);

    if (res === true) {
      console.log("Verification OK");
    } else {
      console.log("Invalid proof");
    }

    return { proof, publicSignals, verificationKey };
  } catch (error) {
    console.error('Error generating ZKP:', error);
    throw new Error('ZKP Generation failed');
  }
};

import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native";
import { useState, useRef } from "react";
import ConfettiCannon from 'react-native-confetti-cannon';

interface FishNFT {
  id: string;
  name: string;
  rarity: string;
  value: number;
  imageUrl: string;
}

// Mock data - replace with your actual NFT fetching logic
const mockFishNFTs: FishNFT[] = [
  {
    id: '1',
    name: 'Tuna',
    rarity: 'Legendary',
    value: 0.5,
    imageUrl: require('@/assets/images/EthicalFishLogo-green.png')
  },
  {
    id: '2',
    name: 'Bass',
    rarity: 'Epic',
    value: 0.3,
    imageUrl: require('@/assets/images/EthicalFishLogo-green.png')
  },
  {
    id: '3', 
    name: 'Trout',
    rarity: 'Rare',
    value: 0.2,
    imageUrl: require('@/assets/images/EthicalFishLogo-green.png')
  },
  {
    id: '4',
    name: 'Salmon',
    rarity: 'Uncommon',
    value: 0.15,
    imageUrl: require('@/assets/images/EthicalFishLogo-green.png')
  },
  {
    id: '5',
    name: 'Carp',
    rarity: 'Common',
    value: 0.1,
    imageUrl: require('@/assets/images/EthicalFishLogo-green.png')
  }
];

export default function ExchangePage() {
  const [selectedFish, setSelectedFish] = useState<FishNFT | null>(null);
  const [availableFish, setAvailableFish] = useState<FishNFT[]>(mockFishNFTs);
  const confettiRef = useRef<any>(null);

  const handleClaim = (fish: FishNFT) => {
    confettiRef.current?.start();
    setAvailableFish(prev => prev.filter(f => f.id !== fish.id));
    if (selectedFish?.id === fish.id) {
      setSelectedFish(null);
    }
    console.log(`Claiming ${fish.value} FISH for ${fish.name}`);
  };

  return (
    <View
      style={styles.container}
    >
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{x: -10, y: 0}}
        autoStart={false}
        fadeOut={true}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Fish Exchange</Text>
        <Text style={styles.subtitle}>Trade your caught fish for crypto!</Text>
      </View>

      <ScrollView style={styles.nftList}>
        {availableFish.map((fish) => (
          <TouchableOpacity
            key={fish.id}
            style={[
              styles.fishCard,
              selectedFish?.id === fish.id && styles.selectedCard
            ]}
            onPress={() => setSelectedFish(fish)}
          >
            <Image
              source={require('@/assets/images/EthicalFishLogo-green.png')}
              style={styles.fishImage}
            />
            <View style={styles.fishInfo}>
              <Text style={styles.fishName}>{fish.name}</Text>
              <Text style={styles.fishRarity}>{fish.rarity}</Text>
              <Text style={styles.fishValue}>{fish.value} FISH</Text>
            </View>
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => handleClaim(fish)}
            >
              <Text style={styles.claimButtonText}>Claim</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedFish && (
        <View style={styles.selectedFishDetails}>
          <Text style={styles.detailsTitle}>Selected Fish Details</Text>
          <Text style={styles.detailsText}>
            Trading {selectedFish.name} will earn you {selectedFish.value} FISH
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
  },
  nftList: {
    flex: 1,
  },
  fishCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedCard: {
    borderColor: '#fdbb2d',
    borderWidth: 2,
  },
  fishImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  fishInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fishName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fishRarity: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  fishValue: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: 'bold',
    marginTop: 4,
  },
  claimButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedFishDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 15,
    marginTop: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 16,
    color: '#666',
  },
});
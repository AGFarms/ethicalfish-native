import React, { useState, useMemo, useEffect } from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Image } from 'react-native'
import TinderCard from 'react-tinder-card'
import { MaterialIcons } from '@expo/vector-icons'

const { width, height } = Dimensions.get('window')

interface Card {
  id: number
  imageUrl: string
}

const generateImageUrl = (id: number) => `https://targetwalleye.com/wp-content/uploads/2021/06/c5c6973c-1e3e-4a52-ab6f-af9224c4ee67.jpg`

const generateCards = (startId: number, count: number): Card[] => {
  return Array(count).fill(0).map((_, index) => ({
    id: startId + index,
    imageUrl: generateImageUrl(startId + index)
  }))
}

export default function VerifyPage() {
  const [nextId, setNextId] = useState(1)
  const [cards, setCards] = useState(() => generateCards(nextId, 5))
  const [currentCards, setCurrentCards] = useState(cards)
  const [lastDirection, setLastDirection] = useState<string | undefined>()
  const alreadyRemoved = useMemo<number[]>(() => [], [])
  const childRefs = useMemo(() => {
    return Array(cards.length).fill(0).map(() => React.createRef())
  }, [cards.length])

  useEffect(() => {
    if (currentCards.length < 2) {
      const newCards = generateCards(nextId + 5, 5)
      setNextId(nextId + 5)
      setCards(prev => [...prev, ...newCards])
      setCurrentCards(prev => [...prev, ...newCards])
    }
  }, [currentCards.length, nextId])

  const swiped = (direction: string, idToDelete: number) => {
    console.log(`Card swiped ${direction} with ID: ${idToDelete}`)
    setLastDirection(direction)
    alreadyRemoved.push(idToDelete)
  }

  const outOfFrame = (id: number) => {
    setCurrentCards(prev => prev.filter(card => card.id !== id))
  }

  const resetCards = () => {
    setNextId(1)
    const newCards = generateCards(1, 5)
    setCards(newCards)
    setCurrentCards(newCards)
    alreadyRemoved.length = 0
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {currentCards.map((card, index) => (
          <TinderCard
            key={card.id}
            preventSwipe={['up', 'down']}
            flickOnSwipe={true}
            swipeRequirementType="position"
            swipeThreshold={0.3}
            onSwipe={(dir) => swiped(dir, card.id)}
            onCardLeftScreen={() => outOfFrame(card.id)}
          >
            <View 
              style={[
                styles.card,
                {
                  transform: [{ translateY: index * 4 }],
                  zIndex: currentCards.length - index
                }
              ]}
            >
              <View style={styles.cardBackground} />
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>
          </TinderCard>
        ))}
      </View>
      <View style={styles.swipeDirections}>
        <View style={styles.swipeOption}>
          <MaterialIcons name="arrow-back" size={24} color="#FF3B30" />
          <Text style={[styles.swipeText, { color: '#FF3B30' }]}>Reject</Text>
        </View>
        <View style={styles.swipeOption}>
          <MaterialIcons name="arrow-forward" size={24} color="#34C759" />
          <Text style={[styles.swipeText, { color: '#34C759' }]}>Approve</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={resetCards}
      >
        <Text style={styles.resetText}>Reset</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingTop: 45,
  },
  card: {
    position: 'absolute',
    flex: 1,
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  cardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'green',
    opacity: 0.2,
  },
  cardImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 20,
    transform: [{ rotate: '90deg' }],
  },
  resetButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  resetText: {
    color: '#FFF',
    fontSize: 16,
  },
  swipeDirections: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  swipeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  swipeText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '600',
  },
})
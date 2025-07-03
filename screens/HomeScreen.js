import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  const handleTrackPress = () => {
    if (!trackingNumber.trim()) {
      alert('Bitte eine Swiss Post Sendungsnummer eingeben');
      return;
    }
    
    // Nur noch Tracking-Nummer übergeben - Swiss Post ist immer der Carrier
    navigation.navigate('Detail', { 
      trackingNumber: trackingNumber.trim()
    });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.mainScrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Image 
                source={require('../assets/icon.png')} 
                style={[styles.appIcon, { width: 76, height: 76}]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Swiss Post Tracker</Text>
            <Text style={styles.subtitle}>
              Verfolge deine Swiss Post Pakete in Echtzeit
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📮 Swiss Post Sendung verfolgen</Text>
              <Text style={styles.cardSubtitle}>
                Gib deine Swiss Post Sendungsnummer ein und erhalte aktuelle Tracking-Informationen direkt vom Schweizer Post-Service.
              </Text>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail" 
                    size={20} 
                    color="#6B7280" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Swiss Post Sendungsnummer..."
                    placeholderTextColor="#9CA3AF"
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  {trackingNumber.length > 0 && (
                    <TouchableOpacity onPress={() => setTrackingNumber('')}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Swiss Post Info Box */}
              <View style={styles.swissPostInfo}>
                <View style={styles.swissPostHeader}>
                  <Ionicons name="information-circle" size={20} color="#6366F1" />
                  <Text style={styles.swissPostInfoTitle}>Swiss Post Format</Text>
                </View>
                <Text style={styles.swissPostInfoText}>
                  Unterstützte Formate: 99.xx.xxxxxx.xxxxxxxx oder andere Swiss Post Nummern
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isPressed && styles.buttonPressed]}
                onPress={handleTrackPress}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons 
                    name="search" 
                    size={20} 
                    color="#fff" 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.primaryButtonText}>
                    Swiss Post verfolgen
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  Powered by Swiss Post Scraper
                </Text>
                <View style={styles.dividerLine} />
              </View>
              
              {/* Benefits */}
              <View style={styles.benefits}>
                <View style={styles.benefit}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.benefitText}>Direkt von Swiss Post</Text>
                </View>
                <View style={styles.benefit}>
                  <Ionicons name="flash" size={16} color="#F59E0B" />
                  <Text style={styles.benefitText}>Echtzeit Updates</Text>
                </View>
                <View style={styles.benefit}>
                  <Ionicons name="lock-closed" size={16} color="#6366F1" />
                  <Text style={styles.benefitText}>Sicher & Privat</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Ionicons name="mail" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Swiss Post</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="time" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Live Tracking</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="location" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Präzise Daten</Text>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  swissPostInfo: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  swissPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  swissPostInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  swissPostInfoText: {
    fontSize: 12,
    color: '#6366F1',
    lineHeight: 16,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  benefits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  feature: {
    alignItems: 'center',
    opacity: 0.9,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
});
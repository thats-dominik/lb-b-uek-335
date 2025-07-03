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
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isPressed, setIsPressed] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [showCarrierPicker, setShowCarrierPicker] = useState(false);

  // Verfügbare Carrier
  const carriers = [
    { code: null, name: '🤖 Automatisch erkennen', icon: 'scan' },
    { code: 'dhl', name: 'DHL', icon: 'cube' },
    { code: 'ups', name: 'UPS', icon: 'airplane' },
    { code: 'fedex', name: 'FedEx', icon: 'flash' },
    { code: 'swisspost', name: 'Swiss Post', icon: 'mail' },
    { code: 'chinapost', name: 'China Post', icon: 'location' },
    { code: 'tnt', name: 'TNT', icon: 'rocket' },
    { code: 'deutschepost', name: 'Deutsche Post', icon: 'send' },
    { code: 'hermes', name: 'Hermes', icon: 'car' },
    { code: 'dpd', name: 'DPD', icon: 'business' }
  ];

  const handleTrackPress = () => {
    if (!trackingNumber.trim()) {
      alert('Bitte eine Sendungsnummer eingeben');
      return;
    }
    
    // Sendungsnummer UND optional gewählten Carrier übergeben
    const params = { 
      trackingNumber: trackingNumber.trim(),
      ...(selectedCarrier && { manualCarrier: selectedCarrier })
    };
    
    navigation.navigate('Detail', params);
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
            <View style={styles.iconWrapper}>
              <Ionicons name="cube" size={48} color="#fff" />
            </View>
            <Text style={styles.title}>TrackIt</Text>
            <Text style={styles.subtitle}>
              Verfolge deine Pakete automatisch
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 Sendung verfolgen</Text>
              <Text style={styles.cardSubtitle}>
                Gib eine Sendungsnummer ein. Optional kannst du den Paketdienst auswählen für genauere Ergebnisse.
              </Text>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="search" 
                    size={20} 
                    color="#6B7280" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Sendungsnummer eingeben..."
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

              {/* Carrier Picker */}
              <View style={styles.carrierContainer}>
                <Text style={styles.carrierLabel}>Paketdienst (optional):</Text>
                <TouchableOpacity
                  style={styles.carrierSelector}
                  onPress={() => setShowCarrierPicker(!showCarrierPicker)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={selectedCarrier ? carriers.find(c => c.code === selectedCarrier)?.icon || 'cube' : 'scan'} 
                    size={20} 
                    color="#6366F1" 
                  />
                  <Text style={styles.carrierSelectorText}>
                    {selectedCarrier 
                      ? carriers.find(c => c.code === selectedCarrier)?.name || 'Unbekannt'
                      : '🤖 Automatisch erkennen'
                    }
                  </Text>
                  <Ionicons 
                    name={showCarrierPicker ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6366F1" 
                  />
                </TouchableOpacity>

                {/* Carrier Options */}
                {showCarrierPicker && (
                  <View style={styles.carrierOptions}>
                    <ScrollView 
                      style={styles.carrierScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      {carriers.map((carrier) => (
                        <TouchableOpacity
                          key={carrier.code || 'auto'}
                          style={[
                            styles.carrierOption,
                            selectedCarrier === carrier.code && styles.carrierOptionSelected
                          ]}
                          onPress={() => {
                            setSelectedCarrier(carrier.code);
                            setShowCarrierPicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={carrier.icon} 
                            size={18} 
                            color={selectedCarrier === carrier.code ? "#6366F1" : "#6B7280"} 
                          />
                          <Text style={[
                            styles.carrierOptionText,
                            selectedCarrier === carrier.code && styles.carrierOptionTextSelected
                          ]}>
                            {carrier.name}
                          </Text>
                          {selectedCarrier === carrier.code && (
                            <Ionicons name="checkmark" size={16} color="#6366F1" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
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
                    name={selectedCarrier ? "search" : "scan"} 
                    size={20} 
                    color="#fff" 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.primaryButtonText}>
                    {selectedCarrier ? "Direkt verfolgen" : "Automatisch verfolgen"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {selectedCarrier ? "Manuell ausgewählt" : "Mit Auto-Erkennung"}
                </Text>
                <View style={styles.dividerLine} />
              </View>
              </View>
            </View>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons name="scan" size={24} color="rgba(255,255,255,0.8)" />
                <Text style={styles.featureText}>Auto-Erkennung</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="time" size={24} color="rgba(255,255,255,0.8)" />
                <Text style={styles.featureText}>Echtzeit Updates</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="globe" size={24} color="rgba(255,255,255,0.8)" />
                <Text style={styles.featureText}>Weltweit verfügbar</Text>
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
  iconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 15,
    marginBottom: 20,
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
  scrollContainer: {
    flex: 1,
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
  carrierContainer: {
    marginBottom: 20,
  },
  carrierLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
  },
  carrierSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  carrierSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 12,
  },
  carrierOptions: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  carrierScrollView: {
    maxHeight: 200,
  },
  carrierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  carrierOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  carrierOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12,
  },
  carrierOptionTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
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
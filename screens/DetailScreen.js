import React, { useState, useEffect } from 'react';
import { calculateDeliveryEstimate, getCurrentUserLocation, calculateDeliveryEstimateDemo } from '../components/EstimateDelivery';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ✅ NUR NOCH SWISS POST SCRAPER API
const fetchSwissPostData = async (trackingNumber) => {
  try {
    const response = await fetch(`http://10.73.4.33:3001/track?tracking=${trackingNumber}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: Swiss Post Scraper nicht erreichbar`);
    const data = await response.json();

    if (!data.timeline || !Array.isArray(data.timeline)) throw new Error('Keine Tracking-Daten für diese Sendungsnummer gefunden');

    // deliveryEstimate übernehmen
    return {
      state: '2',
      ischeck: '1',
      data: data.timeline.map(item => ({
        ftime: `${item.date} ${item.time}`,
        context: `【${item.location}】${item.desc}`
      })),
      deliveryEstimate: data.deliveryEstimate // <- NEU!
    };
  } catch (error) {
    throw new Error(`Swiss Post Tracking fehlgeschlagen: ${error.message}`);
  }
};

export default function DetailScreen({ navigation, route }) {
  const { trackingNumber } = route.params; // Nur noch trackingNumber, kein manualCarrier
  const [isLoading, setIsLoading] = useState(true);
  const [packageData, setPackageData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState(null);

  // Erweiterte Demo-Funktion mit konkretem Datum/Uhrzeit
  const calculateDeliveryEstimateWithDateTime = (packageLocation, userCoordinates) => {
    console.log('🚚 Demo calculation with date/time...');
    
    // Vereinfachte Distanzberechnung (Demo)
    const distance = Math.sqrt(
      Math.pow(userCoordinates.latitude - 47.3769, 2) + 
      Math.pow(userCoordinates.longitude - 8.5417, 2)
    ) * 111; // Grober Umrechnungsfaktor
    
    // Realistische Lieferzeit basierend auf verschiedenen Faktoren
    let deliveryHours;
    const currentHour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    
    // Swiss Post spezifische Schätzung basierend auf Standort
    if (packageLocation.toLowerCase().includes('zürich') || 
        packageLocation.toLowerCase().includes('zurich')) {
      // Lokal in Zürich - sehr schnell
      deliveryHours = isWeekend ? 4 : (currentHour > 16 ? 18 : 2);
    } else if (packageLocation.toLowerCase().includes('basel') || 
               packageLocation.toLowerCase().includes('bern') ||
               packageLocation.toLowerCase().includes('winterthur')) {
      // Schweizer Städte - schnell
      deliveryHours = isWeekend ? 8 : (currentHour > 14 ? 24 : 4);
    } else if (packageLocation.toLowerCase().includes('sortierzentrum') || 
               packageLocation.toLowerCase().includes('bearbeitung')) {
      // Im Sortierzentrum - mittel
      deliveryHours = isWeekend ? 24 : (currentHour > 12 ? 36 : 8);
    } else {
      // Standard Swiss Post
      deliveryHours = isWeekend ? 24 : (currentHour > 15 ? 30 : 12);
    }
    
    // Zufällige Variation für Realismus (+/- 20%)
    const variation = 0.8 + (Math.random() * 0.4);
    deliveryHours = Math.round(deliveryHours * variation);
    
    // Berechne Ankunftsdatum und -zeit
    const deliveryDate = new Date();
    deliveryDate.setHours(deliveryDate.getHours() + deliveryHours);
    
    // Swiss Post Zustellzeiten (8-18 Uhr, Mo-Sa)
    if (deliveryDate.getHours() < 8) {
      deliveryDate.setHours(8 + Math.floor(Math.random() * 4)); // 8-12 Uhr
    } else if (deliveryDate.getHours() > 18) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      deliveryDate.setHours(8 + Math.floor(Math.random() * 6)); // 8-14 Uhr nächster Tag
    }
    
    // Sonntag vermeiden
    if (deliveryDate.getDay() === 0) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      deliveryDate.setHours(9 + Math.floor(Math.random() * 5)); // 9-14 Uhr Montag
    }
    
    // Formatiere das Ergebnis
    const formatter = new Intl.DateTimeFormat('de-CH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const formattedDate = formatter.format(deliveryDate);
    const isToday = deliveryDate.toDateString() === new Date().toDateString();
    const isTomorrow = deliveryDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
    
    let timePrefix = '';
    if (isToday) {
      timePrefix = 'Heute, ';
    } else if (isTomorrow) {
      timePrefix = 'Morgen, ';
    }
    
    return {
      fullText: `${timePrefix}${formattedDate}`,
      distance: distance.toFixed(1),
      hours: deliveryHours,
      confidence: packageLocation !== 'Unbekannt' ? 'hoch' : 'niedrig'
    };
  };

  const handleDeliveryEstimate = async () => {
    try {
      setIsCalculatingEstimate(true);
      setEstimateError(null);
      setDeliveryEstimate(null);
      
      console.log('🚚 Starting delivery estimate calculation...');
      
      // 1. Aktuellen Paket-Standort aus packageData extrahieren
      const packageLocation = packageData?.currentLocation || 'Unbekannt';
      
      if (!packageLocation || packageLocation === 'Unbekannt') {
        throw new Error('Paket-Standort ist nicht verfügbar');
      }
      
      console.log('📦 Package location:', packageLocation);
      
      // 2. User GPS-Standort abrufen
      const userCoordinates = await getCurrentUserLocation();
      
      // 3. Lieferzeit berechnen mit formatiertem Datum/Uhrzeit
      const estimate = calculateDeliveryEstimateWithDateTime(packageLocation, userCoordinates);
      
      setDeliveryEstimate(estimate);
      console.log('✅ Delivery estimate calculated:', estimate);
      
    } catch (error) {
      console.error('❌ Delivery estimate failed:', error);
      setEstimateError(error.message);
    } finally {
      setIsCalculatingEstimate(false);
    }
  };

  // ✅ VEREINFACHTE TRACKING-FUNKTION - NUR SWISS POST
const trackShipment = async () => {
  try {
    setError(null);
    setIsLoading(true);

    const trackingInfo = await fetchSwissPostData(trackingNumber);

    const processedData = {
      trackingNumber: trackingNumber,
      carrier: 'Swiss Post',
      carrierCode: 'swisspost',
      status: getStatusFromState(trackingInfo.state),
      statusText: getStatusText(trackingInfo.state),
      isCheck: trackingInfo.ischeck === '1',
      timeline: trackingInfo.data ? trackingInfo.data.map((item, index) => ({
        date: item.ftime,
        location: extractLocation(item.context),
        status: getTimelineStatus(item.context, index === 0),
        description: item.context,
        icon: getTimelineIcon(item.context, index === 0),
        isActive: index === 0
      })).reverse() : [],
      currentLocation: trackingInfo.data && trackingInfo.data.length > 0 ?
        extractLocation(trackingInfo.data[0].context) : null,
      confidence: 5,
      lastUpdate: new Date().toISOString(),
      isManualCarrier: false,
      deliveryEstimate: trackingInfo.deliveryEstimate || null, // NEU
    };

    setPackageData(processedData);

  } catch (error) {
    setError(error.message);
    setPackageData({
      trackingNumber: trackingNumber,
      status: 'error',
      statusText: 'Fehler beim Laden',
      error: error.message
    });
  } finally {
    setIsLoading(false);
  }
};

  // Hilfsfunktionen für Datenverarbeitung
  const extractLocation = (context) => {
    const patterns = [
      /【(.+?)】/, // Chinesischer Stil: 【Shanghai】
      /\[(.+?)\]/, // Eckige Klammern: [Berlin]
      /^(.+?)[,:]/, // Vor Komma/Doppelpunkt
      /(\w+(?:\s+\w+)*(?:\s+(?:Sortierzentrum|Depot|Center|Hub|Station|Zustellung)))/i, // Depot-Namen
    ];
    
    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match && match[1].length > 1) {
        return match[1].trim();
      }
    }
    
    return 'Unbekannt';
  };

  const getStatusFromState = (state) => {
    switch (String(state)) {
      case '0': return 'pending';        // Auf dem Transport
      case '1': return 'picked_up';      // Abgeholt
      case '2': return 'in_transit';     // Unterwegs/Problematisch
      case '3': return 'delivered';      // Zugestellt
      case '4': return 'returned';       // Zurückgesendet
      case '5': return 'delivering';     // Wird zugestellt
      case '6': return 'pickup_ready';   // Bereit zur Abholung
      default: return 'unknown';
    }
  };

  const getStatusText = (state) => {
    switch (String(state)) {
      case '0': return 'Auf dem Transport';
      case '1': return 'Abgeholt';
      case '2': return 'Unterwegs';
      case '3': return 'Zugestellt';
      case '4': return 'Zurückgesendet';
      case '5': return 'Wird zugestellt';
      case '6': return 'Bereit zur Abholung';
      default: return 'Status unbekannt';
    }
  };

  // ✅ SWISS POST SPEZIFISCHE STATUS-ERKENNUNG
  const getTimelineStatus = (context, isLatest) => {
    const lowerContext = context.toLowerCase();
    
    // Swiss Post spezifische Begriffe
    if (lowerContext.includes('zugestellt') || lowerContext.includes('abgeholt durch empfänger')) return 'Zugestellt';
    if (lowerContext.includes('verlad in zustellfahrzeug')) return 'Wird zugestellt';
    if (lowerContext.includes('bearbeitung in') || lowerContext.includes('sortierzentrum')) return 'In Bearbeitung';
    if (lowerContext.includes('annahme') || lowerContext.includes('einlieferung')) return 'Angenommen';
    if (lowerContext.includes('transport') || lowerContext.includes('unterwegs')) return 'Unterwegs';
    
    return isLatest ? 'Aktuell' : 'Verarbeitet';
  };

  // ✅ SWISS POST SPEZIFISCHE ICONS
  const getTimelineIcon = (context, isLatest) => {
    const lowerContext = context.toLowerCase();
    
    if (lowerContext.includes('zugestellt') || lowerContext.includes('abgeholt')) return 'checkmark-circle';
    if (lowerContext.includes('verlad in zustellfahrzeug')) return 'car';
    if (lowerContext.includes('bearbeitung') || lowerContext.includes('sortierung')) return 'git-network';
    if (lowerContext.includes('annahme') || lowerContext.includes('einlieferung')) return 'cube';
    if (lowerContext.includes('transport')) return 'airplane';
    
    return isLatest ? 'radio-button-on' : 'radio-button-off';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return '#10B981';
      case 'in_transit':
      case 'delivering': return '#F59E0B';
      case 'pending':
      case 'picked_up': return '#6366F1';
      case 'returned':
      case 'error': return '#EF4444';
      case 'pickup_ready': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'in_transit':
      case 'delivering': return 'car';
      case 'pending': return 'time';
      case 'picked_up': return 'cube';
      case 'returned': return 'return-up-back';
      case 'pickup_ready': return 'storefront';
      case 'error': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  // Auto-start beim Laden der Komponente
  useEffect(() => {
    trackShipment();
  }, [trackingNumber]);

  const onRefresh = () => {
    setRefreshing(true);
    trackShipment().finally(() => {
      setRefreshing(false);
    });
  };

  // Loading State
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIcon}>
              <Ionicons name="mail" size={48} color="#fff" />
            </View>
            <Text style={styles.loadingText}>
              Lade Swiss Post Daten...
            </Text>
            <Text style={styles.loadingSubtext}>{trackingNumber}</Text>
            <Text style={styles.loadingCarrier}>
              📦 Swiss Post
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swiss Post Tracking</Text>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Tracking-Fehler</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <Text style={styles.errorDetails}>
            Sendungsnummer: {trackingNumber}
            {'\n'}Carrier: Swiss Post
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={trackShipment}
          >
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backToHomeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToHomeButtonText}>Neue Suche</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Success State
  if (packageData && packageData.status !== 'error') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swiss Post Tracking</Text>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={{ opacity: 1 }}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusIcon, { backgroundColor: getStatusColor(packageData.status) }]}>
                  <Ionicons 
                    name={getStatusIcon(packageData.status)} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusText}>{packageData.statusText}</Text>
                  <Text style={styles.trackingNumberText}>#{packageData.trackingNumber}</Text>
                  <View style={styles.carrierContainer}>
                    <Text style={styles.carrierText}>{packageData.carrier}</Text>
                    <View style={styles.confidenceBadge}>
                      <Ionicons name="checkmark" size={12} color="#10B981" />
                      <Text style={styles.confidenceText}>Swiss Post</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {packageData.currentLocation && packageData.currentLocation !== 'Unbekannt' && (
                <View style={styles.locationInfo}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.locationText}>
                    Aktueller Standort: {packageData.currentLocation}
                  </Text>
                </View>
              )}

              <View style={styles.verificationInfo}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.verificationText}>Swiss Post verifiziert</Text>
              </View>
            </View>

            {/* Timeline */}
            {packageData.timeline && packageData.timeline.length > 0 && (
              <View style={styles.timelineCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="list-outline" size={24} color="#6366F1" />
                  <Text style={styles.cardTitle}>Sendungsverlauf ({packageData.timeline.length} Ereignisse)</Text>
                </View>
                {packageData.timeline.map((item, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineIcon,
                        { backgroundColor: item.isActive ? getStatusColor(packageData.status) : '#E5E7EB' }
                      ]}>
                        <Ionicons 
                          name={item.icon} 
                          size={16} 
                          color={item.isActive ? '#fff' : '#6B7280'} 
                        />
                      </View>
                      {index < packageData.timeline.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStatus}>{item.status}</Text>
                      <Text style={styles.timelineDescription}>{item.description}</Text>
                      <View style={styles.timelineDetails}>
                        <Text style={styles.timelineDate}>{item.date}</Text>
                        {item.location && item.location !== 'Unbekannt' && (
                          <Text style={styles.timelineLocation}>📍 {item.location}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          <View style={styles.estimateCard}>
            <View style={styles.estimateHeader}>
              <Ionicons name="time-outline" size={24} color="#6366F1" />
              <Text style={styles.cardTitle}>Voraussichtliche Zustellung</Text>
            </View>
            <View style={styles.estimateContent}>
              {packageData.deliveryEstimate ? (
                <View style={styles.estimateResult}>
                  <View style={styles.estimateResultHeader}>
                    <Ionicons name="calendar-outline" size={24} color="#10B981" />
                    <Text style={styles.estimateResultTitle}>Ankunft laut Swiss Post</Text>
                  </View>
                  <Text style={styles.estimateResultDate}>{packageData.deliveryEstimate}</Text>
                </View>
              ) : (
                <Text style={styles.estimateDescription}>Kein Zustell-Datum verfügbar.</Text>
              )}
              <Text style={styles.estimateDisclaimer}>
                * Datum direkt von der Swiss Post Website übernommen.
              </Text>
            </View>
          </View>

            {/* Swiss Post Info Card */}
            <View style={styles.detectionCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle-outline" size={24} color="#6366F1" />
                <Text style={styles.detectionTitle}>Swiss Post Details</Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Paketdienst:</Text>
                <Text style={styles.detectionValue}>{packageData.carrier}</Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Datenquelle:</Text>
                <Text style={styles.detectionValue}>🔧 Eigener Scraper</Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Verifiziert:</Text>
                <Text style={styles.detectionValue}>✅ Ja</Text>
              </View>
              <Text style={styles.detectionFooter}>
                Letztes Update: {new Date(packageData.lastUpdate).toLocaleString('de-DE')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unbekannter Zustand</Text>
        <Text style={styles.errorSubtext}>Bitte versuchen Sie es erneut.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={trackShipment}>
          <Text style={styles.retryButtonText}>Neu laden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  loadingCarrier: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  trackingNumberText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  carrierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  carrierText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  timelineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timelineLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Estimate Card Styles
  estimateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  estimateContent: {
    marginTop: 0,
  },
  estimateDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  estimateButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  estimateButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  estimateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  estimateResult: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  estimateResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  estimateResultTitle: {
    fontSize: 16,
    color: '#065F46',
    fontWeight: '700',
    marginLeft: 8,
  },
  estimateResultDate: {
    fontSize: 18,
    color: '#047857',
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  estimateResultDetails: {
    gap: 8,
  },
  estimateDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimateDetailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 8,
  },
  estimateError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  estimateErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  estimateDisclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
  detectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  detectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detectionValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detectionFooter: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToHomeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToHomeButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
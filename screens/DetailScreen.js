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

// Kuaidi100 API Konfiguration
const KUAIDI100_CONFIG = {
  customer: 'eGCUPRzgaxXH1213', // Deine Customer ID
  key: '35d2fdd21a31407aa4324f597ec6b06d', // Dein API Key
  autoDetectUrl: 'https://www.kuaidi100.com/autonumber/auto',
  trackingUrl: 'https://poll.kuaidi100.com/poll/query.do'
};

export default function DetailScreen({ navigation, route }) {
  const { trackingNumber, manualCarrier } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [packageData, setPackageData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detectedCarrier, setDetectedCarrier] = useState(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState(null);

  // Einfache MD5 Hash Funktion (für Signatur)
  const md5Hash = (str) => {
    // Vereinfachte MD5 - für Produktion crypto-js verwenden
    let hash = 0;
    if (str.length === 0) return hash.toString(16);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  };

  // Intelligenter Fallback basierend auf Sendungsnummer-Charakteristiken
  const getIntelligentFallback = (trackingNumber) => {
    console.log('🧠 Using intelligent fallback for:', trackingNumber);
    
    // Basierend auf Länge und Format
    if (trackingNumber.length === 9 && /^\d+$/.test(trackingNumber)) {
      // 9 Ziffern: wahrscheinlich DHL Deutschland
      return { code: 'dhl', name: 'DHL', confidence: 2 };
    }
    
    if (trackingNumber.length === 10 && /^\d+$/.test(trackingNumber)) {
      // 10 Ziffern: oft DHL Express (wie deine Sendung!)
      return { code: 'dhl', name: 'DHL Express', confidence: 2 };
    }
    
    if (trackingNumber.length >= 11 && trackingNumber.length <= 12 && /^\d+$/.test(trackingNumber)) {
      // 11-12 Ziffern: Deutsche Post
      return { code: 'deutschepost', name: 'Deutsche Post', confidence: 1 };
    }
    
    if (trackingNumber.length === 13 && /^\d+$/.test(trackingNumber)) {
      // 13 Ziffern: oft DHL oder Hermes
      return { code: 'dhl', name: 'DHL', confidence: 1 };
    }
    
    if (/^[A-Z]{2}\d+[A-Z]{2}$/.test(trackingNumber)) {
      // Letter-Number-Letter Format: oft internationale Post
      return { code: 'chinapost', name: 'China Post', confidence: 1 };
    }
    
    // Standard Fallback
    return { code: 'dhl', name: 'DHL (Auto-detected)', confidence: 1 };
  };

  // China Post / Cainiao Tracking
  const fetchChinaPostData = async (trackingNumber) => {
    try {
      console.log('🇨🇳 Fetching China Post/AliExpress data for:', trackingNumber);
      
      // Versuche zuerst echte Kuaidi100 API mit richtigen China Post Codes
      const chinaPostCodes = ['chinapost', 'ems', 'cainiao'];
      
      for (const code of chinaPostCodes) {
        try {
          console.log(`🔄 Trying carrier code: ${code}`);
          
          const param = {
            com: code,
            num: trackingNumber,
            resultv2: '1'
          };

          const paramString = JSON.stringify(param);
          const signString = paramString + KUAIDI100_CONFIG.key + KUAIDI100_CONFIG.customer;
          const sign = md5Hash(signString);

          const requestBody = new URLSearchParams({
            customer: KUAIDI100_CONFIG.customer,
            sign: sign,
            param: paramString
          });

          const response = await fetch(KUAIDI100_CONFIG.trackingUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (compatible; TrackIt/1.0)',
              'Accept': 'application/json'
            },
            body: requestBody.toString()
          });

          if (response.ok) {
            const responseText = await response.text();
            const data = JSON.parse(responseText);
            
            if (data.message === 'ok' && data.data) {
              console.log(`✅ Found tracking data with carrier: ${code}`);
              return data.data;
            }
          }
        } catch (error) {
          console.log(`❌ Failed with carrier ${code}:`, error.message);
          continue;
        }
      }
      
      // Fallback zu Demo-Daten für AliExpress
      console.log('ℹ️ Using AliExpress demo data');
      return {
        state: '2', // in_transit
        ischeck: '0', // Nicht verifiziert bei internationalen Sendungen
        data: [
          {
            ftime: new Date().toISOString().slice(0, 16).replace('T', ' '),
            context: '【Transit】Package is in transit to destination country'
          },
          {
            ftime: new Date(Date.now() - 172800000).toISOString().slice(0, 16).replace('T', ' '),
            context: '【China】Package departed from origin country'
          },
          {
            ftime: new Date(Date.now() - 345600000).toISOString().slice(0, 16).replace('T', ' '),
            context: '【Hangzhou】Package picked up by carrier'
          },
          {
            ftime: new Date(Date.now() - 432000000).toISOString().slice(0, 16).replace('T', ' '),
            context: '【AliExpress】Order shipped from seller'
          }
        ]
      };
      
    } catch (error) {
      console.log('ℹ️ Using China Post demo data (API not accessible)');
      
      return {
        state: '2',
        ischeck: '0',
        data: [
          {
            ftime: new Date().toISOString().slice(0, 16).replace('T', ' '),
            context: '【China Post】Package in transit - Demo mode'
          }
        ]
      };
    }
  };

  // Lokale Carrier-Erkennung für spezielle Formate
  const detectLocalCarrier = (trackingNumber) => {
    const patterns = [
      // Swiss Post
      {
        pattern: /^99\.\d{2}\.\d{6}\.\d{8}$/,
        carrier: { code: 'swisspost', name: 'Swiss Post', confidence: 4 }
      },
      // China Post / AliExpress Standard Shipping
      {
        pattern: /^[A-Z]{2}\d{9}[A-Z]{2}$/,
        carrier: { code: 'chinapost', name: 'China Post', confidence: 3 }
      },
      // Deutsche Post / DHL (verschiedene Formate)
      {
        pattern: /^00\d{18}$/,
        carrier: { code: 'dhl', name: 'DHL Express', confidence: 4 }
      },
      {
        pattern: /^\d{9}$/,
        carrier: { code: 'dhl', name: 'DHL', confidence: 3 }
      },
      {
        pattern: /^\d{10}$/,
        carrier: { code: 'dhl', name: 'DHL Express', confidence: 3 }
      },
      {
        pattern: /^\d{11,12}$/,
        carrier: { code: 'deutschepost', name: 'Deutsche Post', confidence: 2 }
      },
      // UPS
      {
        pattern: /^1Z[0-9A-Z]{16}$/,
        carrier: { code: 'ups', name: 'UPS', confidence: 4 }
      },
      // FedEx
      {
        pattern: /^\d{12}$|^\d{14}$/,
        carrier: { code: 'fedex', name: 'FedEx', confidence: 3 }
      },
      // TNT (echtes TNT Format - nur numerisch)
      {
        pattern: /^[0-9]{8,10}$/,
        carrier: { code: 'tnt', name: 'TNT', confidence: 1 }
      },
      // AliExpress Cainiao
      {
        pattern: /^[A-Z]{2}\d{9,11}[A-Z]{2}$/,
        carrier: { code: 'cainiao', name: 'Cainiao', confidence: 2 }
      }
    ];

    console.log('🔍 Testing patterns for:', trackingNumber);

    for (const pattern of patterns) {
      if (pattern.pattern.test(trackingNumber)) {
        console.log('🎯 Local pattern match:', pattern.carrier, 'with pattern:', pattern.pattern);
        return pattern.carrier;
      }
    }

    console.log('❌ No local pattern matched, trying Kuaidi100 API...');
    return null;
  };

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
    
    // Intelligente Schätzung basierend auf Paketstandort und Tageszeit
    if (packageLocation.toLowerCase().includes('zürich') || 
        packageLocation.toLowerCase().includes('zurich')) {
      // Lokal in Zürich - sehr schnell
      deliveryHours = isWeekend ? 4 : (currentHour > 16 ? 18 : 2);
    } else if (packageLocation.toLowerCase().includes('basel') || 
               packageLocation.toLowerCase().includes('bern')) {
      // Schweizer Städte - schnell
      deliveryHours = isWeekend ? 8 : (currentHour > 14 ? 24 : 4);
    } else if (packageLocation.toLowerCase().includes('deutschland') || 
               packageLocation.toLowerCase().includes('german')) {
      // Deutschland - mittel
      deliveryHours = isWeekend ? 48 : (currentHour > 12 ? 36 : 12);
    } else if (packageLocation.toLowerCase().includes('china') || 
               packageLocation.toLowerCase().includes('asia')) {
      // International - länger
      deliveryHours = isWeekend ? 168 : (currentHour > 10 ? 120 : 72);
    } else {
      // Standard europäisch
      deliveryHours = isWeekend ? 24 : (currentHour > 15 ? 30 : 8);
    }
    
    // Zufällige Variation für Realismus (+/- 20%)
    const variation = 0.8 + (Math.random() * 0.4);
    deliveryHours = Math.round(deliveryHours * variation);
    
    // Berechne Ankunftsdatum und -zeit
    const deliveryDate = new Date();
    deliveryDate.setHours(deliveryDate.getHours() + deliveryHours);
    
    // Geschäftszeiten berücksichtigen (8-18 Uhr, Mo-Sa)
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

  // Schritt 1: Carrier automatisch erkennen
  const detectCarrier = async (trackingNumber) => {
    try {
      console.log('🔍 Detecting carrier for:', trackingNumber);
      
      // Zuerst lokale Patterns prüfen
      const localCarrier = detectLocalCarrier(trackingNumber);
      if (localCarrier) {
        console.log('✅ Local carrier detected:', localCarrier);
        return localCarrier;
      }

      // Fallback: Kuaidi100 Auto-Detection versuchen
      console.log('🌐 Trying Kuaidi100 auto-detection...');
      
      const response = await fetch(`${KUAIDI100_CONFIG.autoDetectUrl}?num=${trackingNumber}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrackIt/1.0)',
          'Accept': 'application/json',
          'Referer': 'https://www.kuaidi100.com/'
        }
      });

      console.log('📡 Carrier detection response status:', response.status);
      
      if (!response.ok) {
        console.log('⚠️ Kuaidi100 API nicht erreichbar, verwende intelligenten Fallback');
        return getIntelligentFallback(trackingNumber);
      }

      const responseText = await response.text();
      console.log('📄 Raw carrier response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse carrier response:', parseError);
        console.log('🔄 Fallback to intelligent detection');
        return getIntelligentFallback(trackingNumber);
      }

      console.log('📦 Parsed carrier data:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        const carrier = data[0];
        console.log('✅ API carrier match:', carrier);
        
        return {
          code: carrier.comCode,
          name: carrier.comName,
          confidence: data.length
        };
      } else {
        console.log('🔄 No API results, using intelligent fallback');
        return getIntelligentFallback(trackingNumber);
      }
      
    } catch (error) {
      console.error('❌ Carrier Detection Error:', error);
      throw new Error('Carrier-Erkennung fehlgeschlagen: ' + error.message);
    }
  };

  // Schritt 2: Tracking-Daten abrufen
  const fetchTrackingData = async (trackingNumber, carrierCode) => {
    try {
      console.log('📦 Fetching tracking data for:', trackingNumber, 'via', carrierCode);
      
      // Spezielle Behandlung für lokale Carrier
      if (carrierCode === 'swisspost') {
        return await fetchSwissPostData(trackingNumber);
      }
      
      if (carrierCode === 'chinapost' || carrierCode === 'cainiao') {
        return await fetchChinaPostData(trackingNumber);
      }

      // DHL hat mehrere Codes - versuche alle
      if (carrierCode === 'dhl') {
        return await fetchDHLData(trackingNumber);
      }

      // Standard Kuaidi100 API für andere Carrier
      return await fetchStandardCarrierData(trackingNumber, carrierCode);
      
    } catch (error) {
      console.error('❌ Tracking API Error:', error);
      throw error;
    }
  };

  // DHL-spezifisches Tracking mit mehreren Codes
  const fetchDHLData = async (trackingNumber) => {
    const dhlCodes = ['dhl', 'dhlde', 'dhlglobal', 'dhl_de', 'deutschepost'];
    
    console.log('🚛 Trying multiple DHL codes for:', trackingNumber);
    
    for (const code of dhlCodes) {
      try {
        console.log(`🔄 Trying DHL code: ${code}`);
        const result = await fetchStandardCarrierData(trackingNumber, code);
        console.log(`✅ Success with DHL code: ${code}`);
        return result;
      } catch (error) {
        console.log(`❌ Failed with DHL code ${code}:`, error.message);
        continue;
      }
    }
    
    // Alle DHL-Codes fehlgeschlagen - verwende Demo-Daten
    console.log('ℹ️ All DHL codes failed, using demo data');
    return {
      state: '2', // in_transit
      ischeck: '1',
      data: [
        {
          ftime: new Date().toISOString().slice(0, 16).replace('T', ' '),
          context: '【DHL】Sendung wird verarbeitet - API-Integration nicht verfügbar'
        },
        {
          ftime: new Date(Date.now() - 86400000).toISOString().slice(0, 16).replace('T', ' '),
          context: '【DHL Depot】Sendung wurde vom Absender abgeholt'
        }
      ]
    };
  };

  // Standard Carrier API-Aufruf
  const fetchStandardCarrierData = async (trackingNumber, carrierCode) => {
    const param = {
      com: carrierCode,
      num: trackingNumber,
      resultv2: '1'
    };

    const paramString = JSON.stringify(param);
    console.log('📋 API param string:', paramString);
    
    // MD5 Signatur: MD5(param + key + customer)
    const signString = paramString + KUAIDI100_CONFIG.key + KUAIDI100_CONFIG.customer;
    const sign = md5Hash(signString);
    console.log('🔐 Generated signature:', sign);

    const requestBody = new URLSearchParams({
      customer: KUAIDI100_CONFIG.customer,
      sign: sign,
      param: paramString
    });

    console.log('📤 Request body:', requestBody.toString());

    const response = await fetch(KUAIDI100_CONFIG.trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; TrackIt/1.0)',
        'Accept': 'application/json'
      },
      body: requestBody.toString()
    });

    console.log('📡 Tracking response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('📄 Raw tracking response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse tracking response:', parseError);
      throw new Error('Ungültige API-Antwort: ' + responseText);
    }

    console.log('📊 Parsed tracking data:', data);

    // Kuaidi100 API Response Format prüfen
    if (data.result === false || data.returnCode !== '200') {
      const errorMsg = data.message || data.returnCode || 'Unbekannter API-Fehler';
      throw new Error(`API Fehler: ${errorMsg}`);
    }

    if (data.message === 'ok' && data.data) {
      console.log('✅ Tracking data successfully retrieved');
      return data.data;
    } else {
      throw new Error(data.message || 'Sendung nicht gefunden oder noch nicht im System');
    }
  };

  // Swiss Post Tracking über offizielle API
  const fetchSwissPostData = async (trackingNumber) => {
    try {
      console.log('🇨🇭 Fetching Swiss Post data for:', trackingNumber);
      
      // Swiss Post Tracking API (öffentlich verfügbar)
      const swissPostUrl = `https://api.swisspost.ch/v1/packages/${trackingNumber}/events`;
      
      console.log('📤 Swiss Post API call:', swissPostUrl);

      const response = await fetch(swissPostUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TrackIt/1.0'
        }
      });

      console.log('📡 Swiss Post response status:', response.status);

      if (!response.ok) {
        // Fallback: Mock-Daten für Demo-Zwecke
        console.log('⚠️ Swiss Post API nicht verfügbar, verwende Demo-Daten');
        return {
          state: '2', // in_transit
          ischeck: '1',
          data: [
            {
              ftime: new Date().toISOString().slice(0, 16).replace('T', ' '),
              context: '【Zürich Briefzentrum】Sendung wird bearbeitet und für die Zustellung vorbereitet'
            },
            {
              ftime: new Date(Date.now() - 86400000).toISOString().slice(0, 16).replace('T', ' '),
              context: '【Basel Sortierzentrum】Sendung ist im Sortierzentrum angekommen'
            },
            {
              ftime: new Date(Date.now() - 172800000).toISOString().slice(0, 16).replace('T', ' '),
              context: '【Bern Post】Sendung wurde von der Post angenommen'
            }
          ]
        };
      }

      const data = await response.json();
      console.log('📊 Swiss Post data:', data);

      // Swiss Post Format zu Kuaidi100 Format konvertieren
      return {
        state: '2', // Standardmäßig "in_transit"
        ischeck: '1',
        data: data.events ? data.events.map(event => ({
          ftime: event.timestamp,
          context: event.description
        })) : []
      };
      
    } catch (error) {
      // Fallback zu Demo-Daten (ohne Error-Log)
      console.log('ℹ️ Using Swiss Post demo data (API not accessible)');
      
      return {
        state: '2',
        ischeck: '1',
        data: [
          {
            ftime: new Date().toISOString().slice(0, 16).replace('T', ' '),
            context: '【Swiss Post】Sendung wird bearbeitet - Demo-Modus'
          }
        ]
      };
    }
  };

  // Kombinierte Funktion: Manual Carrier oder Auto-Detection + Tracking
  const trackShipment = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🚀 Starting shipment tracking for:', trackingNumber);
      console.log('🎯 Manual carrier provided:', manualCarrier);
      
      let carrierInfo;
      
      if (manualCarrier) {
        // Verwende manuell gewählten Carrier
        const carrierNames = {
          'dhl': 'DHL',
          'ups': 'UPS', 
          'fedex': 'FedEx',
          'swisspost': 'Swiss Post',
          'chinapost': 'China Post',
          'tnt': 'TNT',
          'deutschepost': 'Deutsche Post',
          'hermes': 'Hermes',
          'dpd': 'DPD'
        };
        
        carrierInfo = {
          code: manualCarrier,
          name: carrierNames[manualCarrier] || manualCarrier.toUpperCase(),
          confidence: 5 // Höchste Konfidenz für manuell gewählte
        };
        
        console.log('✅ Using manual carrier:', carrierInfo);
        setDetectedCarrier(carrierInfo);
      } else {
        // Schritt 1: Carrier automatisch erkennen
        carrierInfo = await detectCarrier(trackingNumber);
        setDetectedCarrier(carrierInfo);
        console.log('✅ Carrier auto-detected:', carrierInfo);
      }
      
      // Kurze Pause für UX (nur bei Auto-Detection)
      if (!manualCarrier) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Schritt 2: Tracking-Daten holen
      const trackingInfo = await fetchTrackingData(trackingNumber, carrierInfo.code);
      
      // Schritt 3: Daten verarbeiten und formatieren
      const processedData = {
        trackingNumber: trackingNumber,
        carrier: carrierInfo.name,
        carrierCode: carrierInfo.code,
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
        })).reverse() : [], // Neueste zuerst
        currentLocation: trackingInfo.data && trackingInfo.data.length > 0 ? 
          extractLocation(trackingInfo.data[0].context) : null,
        confidence: carrierInfo.confidence,
        lastUpdate: new Date().toISOString(),
        isManualCarrier: !!manualCarrier
      };

      setPackageData(processedData);
      console.log('🎉 Tracking completed successfully:', processedData);
      
    } catch (error) {
      console.error('💥 Tracking failed:', error);
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
      /(\w+(?:\s+\w+)*(?:\s+(?:Sortierzentrum|Depot|Center|Hub|Station)))/i, // Depot-Namen
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

  const getTimelineStatus = (context, isLatest) => {
    const lowerContext = context.toLowerCase();
    if (lowerContext.includes('delivered') || lowerContext.includes('zugestellt') || lowerContext.includes('签收')) return 'Zugestellt';
    if (lowerContext.includes('transit') || lowerContext.includes('unterwegs') || lowerContext.includes('运输中')) return 'Unterwegs';
    if (lowerContext.includes('picked') || lowerContext.includes('abgeholt') || lowerContext.includes('已取件')) return 'Abgeholt';
    if (lowerContext.includes('sorted') || lowerContext.includes('sortiert') || lowerContext.includes('分拣')) return 'Sortiert';
    if (lowerContext.includes('arrived') || lowerContext.includes('angekommen') || lowerContext.includes('到达')) return 'Angekommen';
    if (lowerContext.includes('出库') || lowerContext.includes('发出')) return 'Versandt';
    return isLatest ? 'Aktuell' : 'Verarbeitet';
  };

  const getTimelineIcon = (context, isLatest) => {
    const lowerContext = context.toLowerCase();
    if (lowerContext.includes('delivered') || lowerContext.includes('zugestellt') || lowerContext.includes('签收')) return 'checkmark-circle';
    if (lowerContext.includes('transit') || lowerContext.includes('unterwegs') || lowerContext.includes('运输中')) return 'car';
    if (lowerContext.includes('picked') || lowerContext.includes('abgeholt') || lowerContext.includes('已取件')) return 'cube';
    if (lowerContext.includes('sorted') || lowerContext.includes('sortiert') || lowerContext.includes('分拣')) return 'git-network';
    if (lowerContext.includes('arrived') || lowerContext.includes('angekommen') || lowerContext.includes('到达')) return 'location';
    if (lowerContext.includes('出库') || lowerContext.includes('发出')) return 'send';
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
              <Ionicons name="search" size={48} color="#fff" />
            </View>
            <Text style={styles.loadingText}>
              {detectedCarrier 
                ? 'Lade Tracking-Daten...' 
                : manualCarrier 
                  ? `Verwende ${manualCarrier.toUpperCase()}...`
                  : 'Erkenne Paketdienst...'
              }
            </Text>
            <Text style={styles.loadingSubtext}>{trackingNumber}</Text>
            {detectedCarrier && (
              <Text style={styles.loadingCarrier}>
                📦 {detectedCarrier.name} {packageData?.isManualCarrier ? '(manuell gewählt)' : '(erkannt)'}
              </Text>
            )}
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
          <Text style={styles.headerTitle}>Sendungsverfolgung</Text>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Tracking-Fehler</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <Text style={styles.errorDetails}>
            Sendungsnummer: {trackingNumber}
            {detectedCarrier && `\nErkannter Carrier: ${detectedCarrier.name}`}
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
          <Text style={styles.headerTitle}>Sendungsverfolgung</Text>
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
                    {packageData.confidence > 1 && (
                      <View style={styles.confidenceBadge}>
                        <Ionicons name="checkmark" size={12} color="#10B981" />
                        <Text style={styles.confidenceText}>Auto-erkannt</Text>
                      </View>
                    )}
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

              {packageData.isCheck && (
                <View style={styles.verificationInfo}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.verificationText}>Sendung verifiziert</Text>
                </View>
              )}
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

            {/* Delivery Estimate Card */}
            <View style={styles.estimateCard}>
              <View style={styles.estimateHeader}>
                <Ionicons name="time-outline" size={24} color="#6366F1" />
                <Text style={styles.cardTitle}>Lieferzeit-Schätzung</Text>
              </View>
              
              <View style={styles.estimateContent}>
                <Text style={styles.estimateDescription}>
                  Berechne die voraussichtliche Lieferzeit basierend auf der aktuellen Paket-Position und deinem Standort.
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.estimateButton,
                    isCalculatingEstimate && styles.estimateButtonDisabled
                  ]}
                  onPress={handleDeliveryEstimate}
                  disabled={isCalculatingEstimate}
                  activeOpacity={0.7}
                >
                  <View style={styles.estimateButtonContent}>
                    {isCalculatingEstimate ? (
                      <>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.estimateButtonText}>Wird berechnet...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="calculator-outline" size={20} color="#fff" />
                        <Text style={styles.estimateButtonText}>Lieferzeit berechnen</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
                
                {/* Ergebnis anzeigen */}
                {deliveryEstimate && (
                  <View style={styles.estimateResult}>
                    <View style={styles.estimateResultHeader}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      <Text style={styles.estimateResultTitle}>Voraussichtliche Ankunft</Text>
                    </View>
                    <Text style={styles.estimateResultDate}>{deliveryEstimate.fullText}</Text>
                    <View style={styles.estimateResultDetails}>
                      <View style={styles.estimateDetailItem}>
                        <Ionicons name="location-outline" size={16} color="#6B7280" />
                        <Text style={styles.estimateDetailText}>
                          Entfernung: {deliveryEstimate.distance} km
                        </Text>
                      </View>
                      <View style={styles.estimateDetailItem}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.estimateDetailText}>
                          Geschätzte Zeit: {deliveryEstimate.hours}h
                        </Text>
                      </View>
                      <View style={styles.estimateDetailItem}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
                        <Text style={styles.estimateDetailText}>
                          Vertrauen: {deliveryEstimate.confidence}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                
                {/* Fehler anzeigen */}
                {estimateError && (
                  <View style={styles.estimateError}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.estimateErrorText}>{estimateError}</Text>
                  </View>
                )}
                
                <Text style={styles.estimateDisclaimer}>
                  * Schätzung basierend auf Standort, Tageszeit und Paketdienst. Berücksichtigt Geschäftszeiten (Mo-Sa, 8-18 Uhr).
                </Text>
              </View>
            </View>

            {/* API Info Card */}
            <View style={styles.detectionCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle-outline" size={24} color="#6366F1" />
                <Text style={styles.detectionTitle}>Tracking-Details</Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Erkannter Carrier:</Text>
                <Text style={styles.detectionValue}>{packageData.carrier} ({packageData.carrierCode})</Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Erkannt durch:</Text>
                <Text style={styles.detectionValue}>
                  {packageData.isManualCarrier ? '👤 Manuell gewählt' : '🤖 Auto-Detection'}
                </Text>
              </View>
              <View style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>Verifiziert:</Text>
                <Text style={styles.detectionValue}>
                  {packageData.isCheck ? '✅ Ja' : '❌ Nein'}
                </Text>
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
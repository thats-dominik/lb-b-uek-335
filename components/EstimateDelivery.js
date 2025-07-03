// EstimateDelivery.js - Separate Lieferzeit-Schätzung
import * as Location from 'expo-location';

// OpenCage Geocoder API (kostenlos bis 2500 Requests/Tag)
const OPENCAGE_API_KEY = '61d83e9588c043a8bba5abcafd8e945b'; // Ersetz mit deinem API Key
const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

/**
 * Hauptfunktion zur Berechnung der Lieferzeit-Schätzung
 * @param {string} packageLocation - Standort des Pakets (z.B. "Verteilzentrum Zürich")
 * @param {Object} userCoordinates - { latitude: number, longitude: number }
 * @returns {Promise<string>} - Formatierte Lieferzeit-Schätzung
 */
export const calculateDeliveryEstimate = async (packageLocation, userCoordinates) => {
  try {
    console.log('🚚 Calculating delivery estimate...');
    console.log('📦 Package location:', packageLocation);
    console.log('📍 User coordinates:', userCoordinates);

    // 1. Paket-Standort in Koordinaten umwandeln
    const packageCoordinates = await geocodeLocation(packageLocation);
    
    if (!packageCoordinates) {
      throw new Error('Paket-Standort konnte nicht gefunden werden');
    }

    console.log('📍 Package coordinates:', packageCoordinates);

    // 2. Distanz berechnen (Haversine-Formel)
    const distanceKm = calculateDistance(
      packageCoordinates.latitude,
      packageCoordinates.longitude,
      userCoordinates.latitude,
      userCoordinates.longitude
    );

    console.log('📏 Distance:', distanceKm, 'km');

    // 3. Zeitschätzung basierend auf Distanz und Zustelllogik
    const estimatedMinutes = calculateDeliveryTime(distanceKm);

    // 4. Formatierte Ausgabe
    const formattedTime = formatDeliveryTime(estimatedMinutes);
    
    console.log('⏰ Estimated delivery time:', formattedTime);
    return formattedTime;

  } catch (error) {
    console.error('❌ Delivery estimate failed:', error);
    throw new Error(`Schätzung fehlgeschlagen: ${error.message}`);
  }
};

/**
 * Geocoding: Standort-String in Koordinaten umwandeln
 * @param {string} locationString - Standort als Text
 * @returns {Promise<Object|null>} - { latitude, longitude } oder null
 */
const geocodeLocation = async (locationString) => {
  try {
    // Zuerst lokale bekannte Standorte prüfen (schneller + zuverlässiger)
    const knownLocation = getKnownLocation(locationString);
    if (knownLocation) {
      console.log('✅ Found in known locations');
      return knownLocation;
    }

    // Fallback zur OpenCage API
    console.log('🌐 Using OpenCage Geocoding API...');
    
    const encodedLocation = encodeURIComponent(locationString);
    const url = `${OPENCAGE_BASE_URL}?q=${encodedLocation}&key=${OPENCAGE_API_KEY}&limit=1&no_annotations=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng
      };
    }
    
    return null;

  } catch (error) {
    console.error('❌ Geocoding failed:', error);
    
    // Fallback: Versuche bekannte Standorte mit Teilstring-Matching
    return getKnownLocationFuzzy(locationString);
  }
};

/**
 * Bekannte Standorte (Offline-Fallback für häufige Depot-Standorte)
 */
const getKnownLocation = (locationString) => {
  const knownLocations = {
    // Schweiz
    'zürich': { latitude: 47.3769, longitude: 8.5417 },
    'basel': { latitude: 47.5596, longitude: 7.5886 },
    'bern': { latitude: 46.9481, longitude: 7.4474 },
    'genf': { latitude: 46.2044, longitude: 6.1432 },
    'winterthur': { latitude: 47.4996, longitude: 8.7273 },
    'luzern': { latitude: 47.0502, longitude: 8.3093 },
    
    // Deutschland
    'frankfurt': { latitude: 50.1109, longitude: 8.6821 },
    'münchen': { latitude: 48.1351, longitude: 11.5820 },
    'hamburg': { latitude: 53.5511, longitude: 9.9937 },
    'berlin': { latitude: 52.5200, longitude: 13.4050 },
    'köln': { latitude: 50.9375, longitude: 6.9603 },
    'stuttgart': { latitude: 48.7758, longitude: 9.1829 },
    
    // Österreich
    'wien': { latitude: 48.2082, longitude: 16.3738 },
    'salzburg': { latitude: 47.8095, longitude: 13.0550 },
    'innsbruck': { latitude: 47.2692, longitude: 11.4041 },
    
    // Weitere Europa
    'paris': { latitude: 48.8566, longitude: 2.3522 },
    'amsterdam': { latitude: 52.3702, longitude: 4.8951 },
    'mailand': { latitude: 45.4642, longitude: 9.1900 },
    
    // Verteilzentren (häufige Begriffe)
    'verteilzentrum zürich': { latitude: 47.3769, longitude: 8.5417 },
    'depot basel': { latitude: 47.5596, longitude: 7.5886 },
    'sortierzentrum frankfurt': { latitude: 50.1109, longitude: 8.6821 },
    'dhl depot münchen': { latitude: 48.1351, longitude: 11.5820 },
  };

  const searchKey = locationString.toLowerCase().trim();
  return knownLocations[searchKey] || null;
};

/**
 * Fuzzy Matching für bekannte Standorte (wenn exakter Match fehlschlägt)
 */
const getKnownLocationFuzzy = (locationString) => {
  const searchLower = locationString.toLowerCase();
  
  // Wichtige Städte-Keywords
  const cityKeywords = {
    'zürich': { latitude: 47.3769, longitude: 8.5417 },
    'basel': { latitude: 47.5596, longitude: 7.5886 },
    'bern': { latitude: 46.9481, longitude: 7.4474 },
    'frankfurt': { latitude: 50.1109, longitude: 8.6821 },
    'münchen': { latitude: 48.1351, longitude: 11.5820 },
    'hamburg': { latitude: 53.5511, longitude: 9.9937 },
    'berlin': { latitude: 52.5200, longitude: 13.4050 },
    'wien': { latitude: 48.2082, longitude: 16.3738 },
    'paris': { latitude: 48.8566, longitude: 2.3522 }
  };
  
  for (const [city, coords] of Object.entries(cityKeywords)) {
    if (searchLower.includes(city)) {
      console.log(`✅ Fuzzy match found: ${city}`);
      return coords;
    }
  }
  
  return null;
};

/**
 * Haversine-Formel zur Distanzberechnung zwischen zwei Koordinaten
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1  
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distanz in Kilometern
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Erdradius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Auf 2 Dezimalstellen runden
};

/**
 * Grad zu Radiant konvertieren
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Zustellzeit basierend auf Distanz und realistischen Faktoren berechnen
 * @param {number} distanceKm - Distanz in Kilometern
 * @returns {number} - Geschätzte Zeit in Minuten
 */
const calculateDeliveryTime = (distanceKm) => {
  let estimatedMinutes = 0;
  
  // Basis-Geschwindigkeit je nach Distanz
  if (distanceKm < 5) {
    // Stadtbereich: Stopps, Ampeln, niedrige Geschwindigkeit
    estimatedMinutes = distanceKm * (60 / 25); // 25 km/h
  } else if (distanceKm < 20) {
    // Stadtrand/Regional: gemischter Verkehr  
    estimatedMinutes = distanceKm * (60 / 40); // 40 km/h
  } else if (distanceKm < 100) {
    // Überlandfahrt: Hauptstraßen, weniger Stopps
    estimatedMinutes = distanceKm * (60 / 55); // 55 km/h
  } else {
    // Fernstrecke: Autobahn-Anteil
    estimatedMinutes = distanceKm * (60 / 70); // 70 km/h
  }
  
  // Zusätzliche realistische Faktoren
  
  // Grundzeit für Sortierung/Bearbeitung (15-45 min)
  const processingTime = Math.min(45, Math.max(15, distanceKm * 0.5));
  estimatedMinutes += processingTime;
  
  // Zusätzliche Stopps bei längeren Routen
  if (distanceKm > 10) {
    const additionalStops = Math.floor(distanceKm / 20) * 10; // 10 min pro 20km
    estimatedMinutes += additionalStops;
  }
  
  // Tageszeit berücksichtigen (vereinfacht)
  const currentHour = new Date().getHours();
  if (currentHour >= 7 && currentHour <= 9 || currentHour >= 17 && currentHour <= 19) {
    // Rush Hour: +20% Zeit
    estimatedMinutes *= 1.2;
  }
  
  // Minimum 30 Minuten, Maximum 8 Stunden
  estimatedMinutes = Math.max(30, Math.min(estimatedMinutes, 480));
  
  return Math.round(estimatedMinutes);
};

/**
 * Minuten in benutzerfreundliches Format umwandeln
 * @param {number} minutes - Zeit in Minuten
 * @returns {string} - Formatierte Zeit-Angabe
 */
const formatDeliveryTime = (minutes) => {
  if (minutes < 60) {
    return `Voraussichtliche Lieferzeit: ${minutes} Minuten`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `Voraussichtliche Lieferzeit: ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  }
  
  return `Voraussichtliche Lieferzeit: ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} ${remainingMinutes} Minuten`;
};

/**
 * Hilfsfunktion: Aktuellen GPS-Standort des Users abrufen
 * @returns {Promise<Object>} - { latitude, longitude }
 */
export const getCurrentUserLocation = async () => {
  try {
    console.log('📍 Getting current user location...');
    
    // Permission prüfen
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        throw new Error('GPS-Berechtigung wurde verweigert');
      }
    }
    
    // Aktuelle Position abrufen
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000, // 10 Sekunden Timeout
    });
    
    const userCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    
    console.log('✅ User location obtained:', userCoords);
    return userCoords;
    
  } catch (error) {
    console.error('❌ Failed to get user location:', error);
    
    // Fallback zu Zürich HB als Beispiel-Standort
    const fallbackLocation = {
      latitude: 47.3769,
      longitude: 8.5417
    };
    
    console.log('📍 Using fallback location (Zürich):', fallbackLocation);
    return fallbackLocation;
  }
};

/**
 * Demo-Funktion für Tests (ohne echte APIs)
 * @param {string} packageLocation 
 * @param {Object} userCoordinates 
 * @returns {string}
 */
export const calculateDeliveryEstimateDemo = (packageLocation, userCoordinates) => {
  try {
    console.log('🚚 Demo calculation...');
    
    // Verwende bekannte Standorte für Demo
    const packageCoords = getKnownLocation(packageLocation) || { latitude: 47.5596, longitude: 7.5886 }; // Basel als Fallback
    
    const distanceKm = calculateDistance(
      packageCoords.latitude,
      packageCoords.longitude,
      userCoordinates.latitude,
      userCoordinates.longitude
    );
    
    const estimatedMinutes = calculateDeliveryTime(distanceKm);
    
    return formatDeliveryTime(estimatedMinutes) + ` (${distanceKm} km Entfernung)`;
    
  } catch (error) {
    return 'Schätzung nicht verfügbar';
  }
};
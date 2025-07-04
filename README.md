# TrackIt – Swiss Post Paketverfolgung

> **🔗 Demo:**  
> 👉 [Zur HOMEPAGE](https://thats-dominik.github.io/lb-b-uek-335-demo-site/) 👈

TrackIt ist eine mobile App (React Native mit Expo), mit der du den Status deiner Swiss Post Sendungen verfolgen kannst. Die App kommuniziert mit einem eigenen Express/Puppeteer-Server, der als Scraper die Tracking-Daten von der offiziellen Swiss Post Seite abruft.

---

## 📱 Features

- **Einfache Eingabe:** Trackingnummer eingeben & automatisch erkennen lassen.
- **Detailansicht:** Timeline mit Swiss Post Sendungsverlauf in Echtzeit.
- **Saubere Mobile UI:** Optimiert für iOS und Android mit modernem Design.

---

## 🔧 Installation & Setup

### 1. Repository klonen

```sh
git clone <dein-repo-link>
cd trackit
```

---

### 2. Alle Abhängigkeiten installieren

**A) Node.js-Server (Express & Puppeteer)**

Installiere im Hauptverzeichnis (wo `server.mjs` liegt) folgende Pakete:
```sh
npm install express puppeteer
```
Falls du schon eine `package.json` hast oder weitere Pakete brauchst, führe zusätzlich aus:
```sh
npm install
```

**B) Expo-CLI installieren (falls noch nicht global installiert):**
```sh
npm install -g expo-cli
```

---

### 3. Express/Puppeteer-Server starten

```sh
node server.mjs
```
- Der Server lauscht (in deinem Code typischerweise) auf Port `3001`.
- **Wichtig:** Der Server muss laufen, solange du die App benutzt!

---

### 4. **IP-Adresse eintragen – GANZ WICHTIG!**

Damit die App mit deinem Scraper-Server sprechen kann, **musst du im Code an einer bestimmten Stelle DEINE EIGENE LOKALE IP-Adresse eintragen**.  
**NICHT `localhost` verwenden!**  
Nur so findet dein Handy im WLAN den Server!

#### **So gehst du vor:**

1. **Finde deine lokale IP-Adresse**  
   - Mac: Im Terminal `ifconfig | grep inet`  
   - Windows: `ipconfig`  
   - Beispiel: `10.73.4.28` (wie im Beispielcode unten)

2. **Öffne die Datei:**
   ```
   screens/DetailScreen.js
   ```

3. **Suche die folgende Zeile (oder ähnlich):**
   ```js
   const response = await fetch(`http://(((HIER-IP-ÄNDERN))):3001/track?tracking=${trackingNumber}`);
   ```

4. **Trage deine echte IP ein:**
   ```js
   // Beispiel:
   const response = await fetch(`http://10.73.4.28:3001/track?tracking=${trackingNumber}`);
   ```

**Ohne diese Anpassung kann die App KEINE Verbindung zum Server aufbauen!**

---

### 5. App starten

```sh
expo start
```
- Im Browser öffnet sich die Expo-Developer-Page.
- Scanne den QR-Code mit der [Expo Go App](https://expo.dev/client) auf deinem Handy (beide Geräte müssen im selben WLAN sein).

---

### 6. Bedienung

- Trackingnummer im Home-Screen eingeben.
- Detailansicht zeigt Status und Timeline an.

---

## 💻 Projektstruktur (wichtigste Dateien)

```
trackit/
├── components/
├── screens/
│   ├── DetailScreen.js      # HIER MUSS DIE IP ANGEPASST WERDEN!
│   └── HomeScreen.js
├── server.mjs               # Node.js-Server (Express + Puppeteer)
├── scrape.mjs               # Scraper-Logik
├── App.js
├── app.json
├── package.json
└── ...
```

---

## 🗃️ Wichtige Hinweise für die Abgabe

- **`node_modules` NICHT hochladen** (steht in `.gitignore`)
- **Alle nötigen Quellcodes, Ressourcen und dieses README müssen enthalten sein**
- **Installationsanleitung** (siehe oben) ist vollständig
- **IP-Anpassung ist im README erklärt**
- **Code Conventions sind eingehalten**: Methodenlänge, englische Namen, camelCase/PascalCase, Linter verwendbar

# Firext System

A real-time fire extinguisher monitoring system with physical weight sensing and web-based management.

## 🎯 Overview

**Firext System** combines hardware sensors with a modern web interface to monitor fire extinguisher status across multiple locations. The system uses a single shared weighing scale that can weigh any dock, with real-time weight updates and manual save functionality.

## 🏗️ System Architecture

```
┌─────────────────────┐
│  Physical Scale     │ → Broadcasts weight to Firebase
│  (ESP32 + HX711)    │   (Real-time, every 0.5 seconds)
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Firebase RTDB      │ → Central data storage
│  /weightSensor/     │   - Live weight readings
│  /docks/            │   - Dock information
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Web Dashboard      │ → Select dock, view weight, save manually
│  (Next.js + React)  │   - Real-time updates
└─────────────────────┘
```

## 🚀 Features

### Hardware
- **Single Shared Scale** - One ESP32 + HX711 scale serves all docks
- **Real-time Weight Broadcasting** - Updates every 0.5 seconds
- **Visual Indicators** - RGB LEDs show weight status while weighing:
  - 🔴 Red: Weight ≤ 3.2 kg (Low - check for leaks)
  - 🟡 Yellow: Weight 3.2-4.2 kg (Medium)
  - 🟢 Green: Weight > 4.2 kg (Good)
- **WiFi Connectivity** - WiFiManager for easy setup

### Web Interface
- **User-Managed Docks** - Create/delete docks as needed (no hardcoded limit)
- **Real-time Weight Display** - Live weight updates when dock is selected
- **Manual Save Button** - Save weight when you're ready (3-second cooldown)
- **Click-to-Select** - Click dock card to start weighing
- **Click-to-Deselect** - Click again to stop weighing
- **Weight Status Indicators** - Color-coded status on each dock card
- **Expiration Tracking** - Monitor and alert for expiring extinguishers
- **Search & Filter** - Quickly find specific docks
- **Responsive Design** - Works on desktop, tablet, and mobile

## 📋 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Hooks
- **Real-time Data**: Firebase Realtime Database
- **Icons**: Lucide React

### Backend
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth (optional)
- **Hosting**: Vercel

### Hardware
- **Microcontroller**: ESP32
- **Load Cell Amplifier**: HX711
- **Load Cell**: 5-10kg capacity
- **LEDs**: RGB status indicators
- **Libraries**: 
  - Firebase ESP32 Client
  - HX711
  - WiFiManager

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Realtime Database enabled
- ESP32 development board
- Arduino IDE with ESP32 board support

### Web Application Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Masayukki/firext-monitor-system
   cd firext-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

### Hardware Setup

1. **Install Arduino libraries**
   - Firebase ESP32 Client (by Mobizt)
   - HX711 (by Bogdan Necula)
   - WiFiManager (by tzapu)

2. **Wire components**
   ```
   ESP32          HX711
   ─────────────────────
   3.3V     →     VCC
   GND      →     GND
   GPIO 26  →     DT
   GPIO 18  →     SCK
   
   ESP32          LEDs
   ─────────────────────
   GPIO 13  →     Red LED
   GPIO 5   →     Yellow LED
   GPIO 4   →     Green LED
   
   Load Cell      HX711
   ─────────────────────
   Red      →     E+
   Black    →     E-
   White    →     A+
   Green    →     A-
   ```

3. **Update sketch credentials**
   
   Edit `sketch/DockInit/DockInit.ino`:
   ```cpp
   #define API_KEY "your_firebase_api_key"
   #define DATABASE_URL "https://your-project-default-rtdb.firebaseio.com/"
   #define DATABASE_SECRET "your_database_secret"
   ```

4. **Upload to ESP32**
   - Select board: ESP32 Dev Module
   - Select correct COM port
   - Click Upload

5. **Calibrate scale**
   - Place known weight on scale
   - Adjust `CALIBRATION_FACTOR` in code
   - Re-upload

## 📖 Usage

### Creating Docks

1. Open the web dashboard
2. Click **"Add"** button
3. Enter dock name and location
4. Click **"Add Dock"**

### Weighing Process

1. **Select a dock** - Click any dock card (turns blue with "LIVE" badge)
2. **Place extinguisher** on the physical scale
3. **Watch weight update** in real-time
4. **Click "Save Weight"** button when ready
5. **Wait for confirmation** - "Saved!" message appears
6. **Remove extinguisher** and select next dock

### Managing Docks

- **Search**: Type in search bar to filter docks
- **Delete**: Hover over dock card and click trash icon
- **Deselect**: Click selected dock again to stop weighing
- **View Status**: Color dot shows weight status (Green/Yellow/Red)

## 🎨 Database Structure

```json
{
  "docks": {
    "dock_abc123": {
      "id": "dock_abc123",
      "name": "Dock A-1",
      "location": "Building A - Floor 1",
      "weight": 4.2,
      "created_at": 1705234567890,
      "updated_at": 1705234567890,
      "expires_at": 1736770567890,
      "last_manual_save": 1705234567890
    }
  },
  "weightSensor": {
    "scale1": {
      "weight": 4.2,
      "timestamp": 1705234567890,
      "status": "ready",
      "isWeighing": true
    }
  }
}
```

## 🔧 Configuration

### Weight Thresholds

Adjust in `sketch/DockInit/DockInit.ino`:
```cpp
const float THRESH_LOW = 3.2;   // Red LED threshold
const float THRESH_MID = 4.1;   // Yellow LED threshold
```

### Update Frequency

Adjust in `sketch/DockInit/DockInit.ino`:
```cpp
#define WEIGHT_SENSOR_UPDATE_INTERVAL 500  // milliseconds
```

### Save Cooldown

Adjust in `src/hooks/useWeighingStation.js`:
```javascript
setTimeout(() => {
  setCanSave(true);
  setIsListeningToWeight(true);
}, 5000);  // 5 seconds
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Connect to Vercel**
   - Import project from GitHub
   - Add environment variables
   - Deploy

3. **Auto-deployment**
   - Future pushes to `main` auto-deploy

## 🐛 Troubleshooting

### Weight not updating on website
- Check ESP32 Serial Monitor for errors
- Verify Firebase credentials in sketch
- Check `/weightSensor/scale1/weight` in Firebase Console
- Ensure dock is selected (blue highlight)

### LEDs not turning on/off
- Check wiring connections
- Verify `isWeighing` flag in Firebase Console
- Check ESP32 Serial Monitor for status messages
- Ensure dock is selected on website

### Save button disabled
- Check if weight > 0
- Wait for 3-second cooldown to complete
- Verify dock is selected

### Firebase permission errors
- Update Firebase Realtime Database rules
- Enable authentication if required

## 📊 Firebase Security Rules

Development (open access):
```json
{
  "rules": {
    "docks": {
      ".read": true,
      ".write": true
    },
    "weightSensor": {
      ".read": true,
      ".write": true
    }
  }
}
```

Production (authenticated):
```json
{
  "rules": {
    "docks": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "weightSensor": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Firebase for real-time database
- shadcn/ui for beautiful components
- HX711 library maintainers
- WiFiManager library

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

**Built with ❤️ for fire safety**
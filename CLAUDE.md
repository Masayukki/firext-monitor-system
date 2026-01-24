# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firext-system is a fire extinguisher monitoring system built with Next.js that tracks and manages fire extinguisher locations, weights, and expiration dates. It combines hardware sensors with a web interface for comprehensive fire safety management.

## Tech Stack

- **Framework**: Next.js 15.1.6 (App Router)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with tailwindcss-animate
- **Database**: Firebase Realtime Database
- **Authentication**: Custom auth via auth-context (localStorage-based)
- **Forms**: react-hook-form
- **Notifications**: Sonner toast library

## Essential Commands

```bash
# Development
npm run dev        # Start development server on http://localhost:3000

# Production
npm run build      # Build for production
npm run start      # Start production server

# Code Quality
npm run lint       # Run Next.js linting
```

## Project Architecture

### Core Directory Structure

- `/src/app/` - Next.js App Router pages and layouts
  - `/page.js` - Dashboard showing all docks with status monitoring
  - `/configure/page.js` - CRUD operations for managing docks
  - `/docks/[id]/page.js` - Individual dock detail pages
  - `/login/page.js` - Authentication page
  - `/layout.js` - Root layout with AuthProvider

- `/src/components/` - React components
  - `dock-card.jsx`, `dock-table.jsx`, `dock-form.jsx` - Dock management UI
  - `protected-route.jsx` - Authentication wrapper
  - `shell.jsx` - Layout wrapper with navigation
  - `nav.jsx` - Navigation component
  - `/ui/` - shadcn/ui components (button, card, dialog, etc.)

- `/src/lib/` - Core utilities
  - `firebase.js` - Firebase initialization and configuration
  - `auth-context.js` - Authentication state management
  - `utils.js` - Utility functions including `cn()` for className merging

### Firebase Configuration

The app uses environment variables for Firebase configuration (stored in `.env`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_AUTH_PASSWORD` - Password for simple auth system

### Database Schema

Docks collection structure in Firebase Realtime Database:
```json
{
  "id": "string",
  "name": "string",
  "location": "string",
  "weight": "number",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "expires_at": "timestamp",
  "last_reweighed_at": "timestamp",
  "led_state": "boolean",
  "led_num": "number",
  "isBlinking": "boolean",
  "isNearExpiry": "boolean",
  "isReweighing": "boolean",
  "hardware_mac": "string",        // Original MAC address (hardware-created docks only)
  "device_created": "boolean",      // true if created by hardware device
  "ledstatus": {
    "redActive": "boolean",
    "yellowActive": "boolean",
    "greenActive": "boolean"
  }
}
```

### Hardware Integration

The system includes ESP32-based hardware devices that monitor physical fire extinguishers:

- **Location**: `/sketch/DockInit/DockInit.ino` - Arduino sketch for ESP32 devices
- **Components**:
  - HX711 load cell amplifier for weight measurement
  - Three LED indicators (Red, Yellow, Green) for status display
  - ESP32 microcontroller with WiFi connectivity

- **Hardware-Software Communication**:
  - Devices connect via WiFiManager portal (SSID: "Firext-Dock-Setup")
  - Real-time weight updates pushed to Firebase every 250ms
  - Bidirectional communication for LED control and status updates
  - Firebase streams monitor `isBlinking`, `isNearExpiry`, and `isReweighing` flags

### Unique ID Generation System

To prevent ID collisions between multiple hardware devices:

- **ID Format**: `{mac_address}_{random_suffix}` (e.g., `a4c138123456_x7k9m2`)
- **Generation Process**:
  1. Device gets its MAC address (lowercase, no colons)
  2. Appends a 6-character random alphanumeric suffix
  3. Checks Firebase for existing ID
  4. If collision detected, automatically generates new suffix
  5. Repeats until unique ID is found

- **ID Types**:
  - **Hardware-created**: Uses MAC + suffix format, includes `hardware_mac` and `device_created: true`
  - **Web-created**: Uses Firebase `push()` generated IDs (e.g., `-NrX7kM9...`)

### Key Features

1. **Dashboard Monitoring** - Real-time display of dock status with visual indicators:
   - Weight status (Green/Yellow/Red based on thresholds)
   - Expiration status (Color-coded based on days remaining)
   - LED state indicator for hardware integration
   - Automatic alerts for leaks and expired extinguishers

2. **CRUD Operations** - Full management capabilities for docks through the configure page

3. **Real-time Updates** - Uses Firebase's `onValue` listeners for live data synchronization

4. **Protected Routes** - All main pages wrapped with authentication checking

### Weight Thresholds

- **Normal (Green)**: > 3.2 kg
- **Warning (Yellow)**: 2.8 - 3.2 kg
- **Critical (Red)**: < 2.8 kg (indicates potential leak)

### Expiration Status

- **Safe (Green)**: > 30 days until expiration
- **Warning (Yellow)**: 7-30 days until expiration
- **Critical (Red)**: < 7 days or expired

### Component Patterns

- Components use client-side rendering (`"use client"`) for Firebase integration
- Firebase operations use the Realtime Database SDK (ref, onValue, update, set)
- UI components follow shadcn/ui patterns with Radix UI primitives
- Form handling uses react-hook-form for validation and submission
- Toast notifications via Sonner for user feedback
- Protected routes check authentication state before rendering

### Authentication Flow

- Simple password-based authentication stored in localStorage
- AuthProvider wraps the application in root layout
- ProtectedRoute component guards sensitive pages
- Login persists across browser sessions until explicit logout

### Development Notes

- The app uses Next.js App Router with client components for Firebase real-time features
- All Firebase database operations happen client-side using the Firebase SDK
- The dashboard automatically updates dock status flags based on weight and expiration data
- Hardware integration through `led_state` field for physical LED indicators
- Component styling uses Tailwind CSS with custom animations via tailwindcss-animate
- Path aliases configured: `@/` maps to `src/` directory

## Arduino Development

### Required Libraries

The ESP32 sketch requires the following libraries:
- `Firebase_ESP_Client` - Firebase Realtime Database connectivity
- `HX711` - Load cell amplifier interface
- `WiFiManager` - WiFi configuration portal

### Hardware Pin Configuration

```cpp
#define HX711_DOUT_PIN 26       // HX711 data pin
#define HX711_SCK_PIN 18        // HX711 clock pin
#define LED_RED_PIN 13          // Red LED indicator
#define LED_YELLOW_PIN 5        // Yellow LED indicator
#define LED_GREEN_PIN 4         // Green LED indicator
#define CALIBRATION_FACTOR -1000.0  // Load cell calibration
```

### LED Status Logic

The hardware LEDs operate in different modes based on Firebase flags:

1. **Reweighing Mode** (`isReweighing: true`):
   - Red: Weight < 3.2 kg
   - Yellow: 3.2 - 4.1 kg
   - Green: Weight > 4.1 kg

2. **Alert Mode** (`isBlinking: true`):
   - Red LED blinks at 500ms intervals
   - Indicates dock needs reweighing

3. **Expiry Warning** (`isNearExpiry: true`):
   - Red LED solid on
   - Indicates extinguisher nearing expiration

4. **Normal Mode**: All LEDs off

### Development Workflow

1. **Initial Setup**: Device creates WiFi AP for configuration
2. **ID Generation**: Unique ID created with collision detection
3. **Firebase Registration**: Device registers itself in database
4. **Continuous Monitoring**: Weight updates every 250ms
5. **Status Response**: LEDs respond to Firebase flag changes in real-time
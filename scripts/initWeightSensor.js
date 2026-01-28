// scripts/initWeightSensor.js
// Run this script ONLY to initialize the weight sensor in Firebase
// Docks are created via the website UI
// Usage: node scripts/initWeightSensor.js

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaUfe5b8LyA2mA-HtvUqUr77zKYm2KrJI",
  authDomain: "firext-124cd.firebaseapp.com",
  databaseURL: "https://firext-124cd-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "firext-124cd",
  storageBucket: "firext-124cd.firebasestorage.app",
  messagingSenderId: "16533696477",
  appId: "1:16533696477:web:c42a6d93735e1f21619034"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function initializeWeightSensor() {
  console.log('Initializing weight sensor in Firebase Realtime Database...\n');
  
  try {
    // Initialize weight sensor (the physical scale)
    const weightSensorRef = ref(database, 'weightSensor/scale1');
    await set(weightSensorRef, {
      weight: 0,
      timestamp: Date.now(),
      status: 'ready'
    });
    
    console.log('✓ Weight sensor initialized successfully!\n');
    console.log('=================================');
    console.log('Setup Complete!');
    console.log('=================================');
    console.log('Next steps:');
    console.log('1. Open your website');
    console.log('2. Click "Add" button to create docks');
    console.log('3. Upload Arduino code to ESP32');
    console.log('4. Start weighing!\n');
    
  } catch (error) {
    console.error('✗ Error initializing weight sensor:', error);
  }
  
  process.exit(0);
}

initializeWeightSensor().catch(console.error);
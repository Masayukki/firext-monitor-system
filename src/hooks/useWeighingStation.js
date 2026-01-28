// src/hooks/useWeighingStation.js
// Manual save hook - save weight with button click

"use client";

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';

export function useWeighingStation() {
  const [selectedDock, setSelectedDock] = useState(null);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [canSave, setCanSave] = useState(true); // Track if save button is enabled
  const [isListeningToWeight, setIsListeningToWeight] = useState(true); // NEW: Control weight updates
  
  const unsubscribeWeightRef = useRef(null);
  const lastSaveTimeRef = useRef(0); // Track when last save happened
  const cooldownTimerRef = useRef(null); // Track cooldown timer

  // Listen to the physical scale's weight updates
  useEffect(() => {
    // Clean up previous listener if exists
    if (unsubscribeWeightRef.current) {
      unsubscribeWeightRef.current();
      unsubscribeWeightRef.current = null;
    }

    if (!selectedDock) {
      setCurrentWeight(0);
      return;
    }

    const weightSensorRef = ref(db, 'weightSensor/scale1');
    
    const unsubscribe = onValue(weightSensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.weight !== undefined) {
        const newWeight = parseFloat(data.weight);
        
        // Only update weight if we're actively listening
        if (isListeningToWeight) {
          setCurrentWeight(newWeight);
        }
      }
    });

    unsubscribeWeightRef.current = unsubscribe;

    return () => {
      if (unsubscribeWeightRef.current) {
        unsubscribeWeightRef.current();
        unsubscribeWeightRef.current = null;
      }
    };
  }, [selectedDock, isListeningToWeight]);

  const saveDockWeight = async (dockId, weight) => {
    if (!dockId || weight <= 0) {
      console.warn('Invalid dock or weight');
      return;
    }
    
    setSaveStatus('saving');

    try {
      const dockRef = ref(db, `docks/${dockId}`);
      
      // Read current value first to check if it's being overwritten
      const timestamp = Date.now();
      
      // Save weight with timestamp
      await update(dockRef, {
        weight: parseFloat(weight.toFixed(2)),
        updated_at: timestamp,
        last_manual_save: timestamp,
        last_saved_from: 'website' // Track where save came from
      });

      console.log(`✓ SAVED to Firebase: ${weight.toFixed(2)} kg to dock ${dockId} at ${new Date(timestamp).toLocaleTimeString()}`);
      setSaveStatus('saved');

      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving dock:', error);
      setSaveStatus('error');
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  // Manual save function - called when button is clicked
  const saveWeight = async () => {
    if (!selectedDock || currentWeight <= 0 || !canSave) {
      console.log('Save blocked:', { 
        hasDock: !!selectedDock, 
        weight: currentWeight, 
        canSave 
      });
      return;
    }
    
    console.log(`🔵 SAVING: Dock ${selectedDock.id} with weight ${currentWeight.toFixed(2)} kg`);
    
    // Stop listening to weight updates after save
    setIsListeningToWeight(false);
    
    // Disable save button for cooldown period
    setCanSave(false);
    lastSaveTimeRef.current = Date.now();
    
    await saveDockWeight(selectedDock.id, currentWeight);
    
    // Re-enable save button and weight listening after 3 seconds
    cooldownTimerRef.current = setTimeout(() => {
      setCanSave(true);
      setIsListeningToWeight(true); // Resume weight updates
      console.log('✅ Save button re-enabled, weight updates resumed');
    }, 5000);
  };

  const selectDock = (dock) => {
    // If clicking the same dock, deselect it
    if (selectedDock?.id === dock.id) {
      deselectDock();
      return;
    }

    setSelectedDock(dock);
    setCurrentWeight(0);
    setSaveStatus(null);
    setCanSave(true); // Reset save button when selecting new dock
    setIsListeningToWeight(true); // Enable weight listening for new dock
    lastSaveTimeRef.current = 0;
    
    // Clear any existing cooldown timer
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    // Set global weighing flag in Firebase so ESP32 knows to light up LEDs
    const weighingFlagRef = ref(db, 'weightSensor/scale1');
    update(weighingFlagRef, { isWeighing: true }).catch(err => console.error('Error setting weighing flag:', err));
  };

  const deselectDock = async () => {
    // Clear global weighing flag FIRST so ESP32 immediately turns off LEDs
    const weighingFlagRef = ref(db, 'weightSensor/scale1');
    await update(weighingFlagRef, { isWeighing: false }).catch(err => console.error('Error clearing weighing flag:', err));
    
    // Immediately unsubscribe from Firebase listener
    if (unsubscribeWeightRef.current) {
      unsubscribeWeightRef.current();
      unsubscribeWeightRef.current = null;
    }
    
    // Clear cooldown timer
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    setSelectedDock(null);
    setCurrentWeight(0);
    setSaveStatus(null);
    setCanSave(true);
    setIsListeningToWeight(true); // Reset for next dock
    
    console.log('🔴 Deselected dock - LEDs should turn OFF');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeWeightRef.current) {
        unsubscribeWeightRef.current();
        unsubscribeWeightRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  return {
    // State
    selectedDock,
    currentWeight,
    saveStatus,
    canSave, // NEW: Whether save button is enabled
    
    // Actions
    selectDock,
    deselectDock,
    saveWeight,
    
    // Helpers
    isWeighing: !!selectedDock,
    isSaving: saveStatus === 'saving',
    isSaved: saveStatus === 'saved',
    hasError: saveStatus === 'error',
  };
}
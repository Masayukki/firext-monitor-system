"use client";

// src/components/DockWeighingStation.jsx
// Single weighing device for multiple docks with Firebase Realtime Database

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, push, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Scale, Check, Loader2, Radio, Search, X, Plus, Edit2, Trash2 } from 'lucide-react';

export default function DockWeighingStation() {
  const [docks, setDocks] = useState([]);
  const [selectedDock, setSelectedDock] = useState(null);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDock, setNewDock] = useState({ name: '', location: '' });
  
  const saveTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Load all docks from Firebase Realtime Database
  useEffect(() => {
    const docksRef = ref(database, 'docks');
    
    const unsubscribe = onValue(docksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const docksArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setDocks(docksArray);
      } else {
        setDocks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to the physical scale's weight updates
  useEffect(() => {
    if (!selectedDock) return;

    const weightSensorRef = ref(database, 'weightSensor/scale1');
    
    const unsubscribe = onValue(weightSensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.weight !== undefined) {
        const newWeight = parseFloat(data.weight);
        setCurrentWeight(newWeight);
        
        // Trigger 3-second save countdown
        startSaveCountdown(newWeight);
      }
    });

    return () => unsubscribe();
  }, [selectedDock]);

  const startSaveCountdown = (weight) => {
    // Clear existing timers
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Reset countdown
    setCountdown(3);
    setSaveStatus('pending');

    // Start countdown display
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set save timer for 3 seconds
    saveTimerRef.current = setTimeout(() => {
      saveDockWeight(selectedDock.id, weight);
      clearInterval(countdownIntervalRef.current);
      setCountdown(0);
    }, 3000);
  };

  const saveDockWeight = async (dockId, weight) => {
    setSaveStatus('saving');

    try {
      const dockRef = ref(database, `docks/${dockId}`);
      await update(dockRef, {
        weight: parseFloat(weight.toFixed(2)),
        updated_at: Date.now()
      });

      setSaveStatus('saved');

      // Update local state
      setDocks(prevDocks =>
        prevDocks.map(dock =>
          dock.id === dockId ? { ...dock, weight: parseFloat(weight.toFixed(2)), updated_at: Date.now() } : dock
        )
      );

      // Update selected dock
      setSelectedDock(prev => ({ ...prev, weight: parseFloat(weight.toFixed(2)), updated_at: Date.now() }));

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error saving dock:', error);
      setSaveStatus('error');
    }
  };

  const addNewDock = async () => {
    if (!newDock.name || !newDock.location) {
      alert('Please fill in both name and location');
      return;
    }

    try {
      const docksRef = ref(database, 'docks');
      const newDockRef = push(docksRef);
      
      await update(newDockRef, {
        id: newDockRef.key,
        name: newDock.name,
        location: newDock.location,
        weight: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
        expires_at: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year from now
      });

      setNewDock({ name: '', location: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding dock:', error);
      alert('Failed to add dock');
    }
  };

  const deleteDock = async (dockId) => {
    if (!confirm('Are you sure you want to delete this dock?')) return;

    try {
      const dockRef = ref(database, `docks/${dockId}`);
      await remove(dockRef);
      
      if (selectedDock?.id === dockId) {
        deselectDock();
      }
    } catch (error) {
      console.error('Error deleting dock:', error);
      alert('Failed to delete dock');
    }
  };

  const selectDock = (dock) => {
    // Clear any pending saves
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setSelectedDock(dock);
    setCurrentWeight(0);
    setSaveStatus(null);
    setCountdown(0);
    setSearchTerm('');
  };

  const deselectDock = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setSelectedDock(null);
    setCurrentWeight(0);
    setSaveStatus(null);
    setCountdown(0);
  };

  const getWeightStatus = (weight) => {
    if (weight >= 5.0) return { color: 'bg-green-500', label: 'Good', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    if (weight >= 4.0) return { color: 'bg-yellow-500', label: 'Medium', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    return { color: 'bg-red-500', label: 'Low - Check!', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  };

  const getSaveStatusDisplay = () => {
    if (saveStatus === 'pending' && countdown > 0) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="font-semibold">Auto-saving in {countdown}s...</span>
        </div>
      );
    }
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-semibold">Saving...</span>
        </div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Saved Successfully!</span>
        </div>
      );
    }
    if (saveStatus === 'error') {
      return (
        <div className="text-red-600 font-semibold">Error saving - please retry</div>
      );
    }
    return (
      <div className="text-slate-400 text-sm">Place extinguisher on scale to begin</div>
    );
  };

  const filteredDocks = docks.filter(dock =>
    dock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dock.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unweighedCount = docks.filter(d => !d.weight || d.weight === 0).length;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Dock Weighing Station
          </h1>
          <p className="text-slate-600">
            Select a dock, place the extinguisher on the scale, and the weight will auto-save after 3 seconds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Dock List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Docks ({docks.length})
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search docks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Dock List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredDocks.map(dock => {
                  const isSelected = selectedDock?.id === dock.id;
                  const weightStatus = getWeightStatus(dock.weight || 0);

                  return (
                    <div
                      key={dock.id}
                      className={`relative group rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-lg scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <button
                        onClick={() => selectDock(dock)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{dock.name}</span>
                          <div className={`w-3 h-3 rounded-full ${weightStatus.color}`} />
                        </div>
                        <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                          {dock.location}
                        </div>
                        <div className={`text-sm font-medium mt-1 ${isSelected ? 'text-white' : weightStatus.textColor}`}>
                          {dock.weight ? `${dock.weight.toFixed(2)} kg` : 'Not weighed'}
                        </div>
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDock(dock.id);
                        }}
                        className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isSelected ? 'bg-blue-400 hover:bg-blue-300' : 'bg-red-100 hover:bg-red-200'
                        }`}
                      >
                        <Trash2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-red-600'}`} />
                      </button>
                    </div>
                  );
                })}

                {filteredDocks.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {docks.length === 0 ? 'No docks yet. Click "Add" to create one.' : 'No docks found'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Weighing Display */}
          <div className="lg:col-span-2">
            {selectedDock ? (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Selected Dock Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold">Currently Weighing</h2>
                    <button
                      onClick={deselectDock}
                      className="p-2 hover:bg-blue-400 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{selectedDock.name}</h3>
                  <p className="text-blue-100">{selectedDock.location}</p>
                </div>

                {/* Weight Display */}
                <div className="p-8">
                  {/* Current Weight Reading */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 mb-6">
                    <div className="flex items-center justify-center mb-4">
                      <Scale className="w-16 h-16 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <div className="text-6xl font-bold text-slate-800 mb-2">
                        {currentWeight.toFixed(2)}
                        <span className="text-3xl text-slate-500 ml-2">kg</span>
                      </div>
                      {currentWeight > 0 && (
                        <div className="mt-4">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getWeightStatus(currentWeight).bgColor} ${getWeightStatus(currentWeight).borderColor} border-2`}>
                            <div className={`w-3 h-3 rounded-full ${getWeightStatus(currentWeight).color}`} />
                            <span className={`font-semibold ${getWeightStatus(currentWeight).textColor}`}>
                              {getWeightStatus(currentWeight).label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Status */}
                  <div className="bg-slate-50 rounded-lg p-6 text-center">
                    {getSaveStatusDisplay()}
                  </div>

                  {/* Previous Weight Info */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Previous weight:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDock.weight ? `${selectedDock.weight.toFixed(2)} kg` : 'Not recorded'}
                      </span>
                    </div>
                    {selectedDock.updated_at && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600">Last updated:</span>
                        <span className="text-slate-800">
                          {new Date(selectedDock.updated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                      <li>Place the fire extinguisher on the scale</li>
                      <li>Wait for the weight to stabilize</li>
                      <li>System will auto-save after 3 seconds</li>
                      <li>Look for "Saved Successfully!" confirmation</li>
                      <li>Remove extinguisher and select next dock</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              // No Dock Selected State
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Scale className="w-24 h-24 text-slate-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  No Dock Selected
                </h3>
                <p className="text-slate-600 mb-6">
                  Select a dock from the list to begin weighing
                </p>
                {docks.length > 0 && (
                  <div className="inline-block px-6 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{unweighedCount}</strong> docks need to be weighed
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Dock Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Add New Dock</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dock Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Dock A-1"
                    value={newDock.name}
                    onChange={(e) => setNewDock({ ...newDock, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Building A - Floor 1"
                    value={newDock.location}
                    onChange={(e) => setNewDock({ ...newDock, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDock({ name: '', location: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addNewDock}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Dock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
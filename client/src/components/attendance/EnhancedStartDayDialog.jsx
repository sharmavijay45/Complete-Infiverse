import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Home,
  Building,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  AlertTriangle,
  CheckCircle,
  Clock,
  Navigation,
  MapPinned,
  Smartphone,
  Target,
  Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useAuth } from '../../context/auth-context';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

const OFFICE_COORDINATES = {
  latitude: 19.160122,
  longitude: 72.839720
};
const OFFICE_RADIUS = 500; // meters
const OFFICE_ADDRESS = 'Blackhole Infiverse LLP, Road Number 3, near Hathi Circle, above Bright Connection, Kala Galli, Motilal Nagar II, Goregaon West, Mumbai, Maharashtra';

const EnhancedStartDayDialog = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('location'); // location, validation, confirmation
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [isInOfficeRange, setIsInOfficeRange] = useState(false);
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (isOpen) {
      initializeDialog();
      getDeviceInfo();
      getBatteryInfo();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeDialog = () => {
    setStep('location');
    setLoading(false);
    setLocation(null);
    setLocationError(null);
    setWorkFromHome(false);
    setIsInOfficeRange(false);
    setDistanceFromOffice(null);
  };

  const getDeviceInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      timestamp: new Date().toISOString()
    };
    setDeviceInfo(info);
  };

  const getBatteryInfo = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
      }
    } catch (error) {
      console.warn('Battery API not supported:', error);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(coords);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  };

  const handleGetLocation = async () => {
    try {
      setLoading(true);
      setLocationError(null);
      
      const coords = await getCurrentLocation();
      
      // Calculate distance from office
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        OFFICE_COORDINATES.latitude,
        OFFICE_COORDINATES.longitude
      );
      
      setLocation(coords);
      setDistanceFromOffice(distance);
      setIsInOfficeRange(distance <= OFFICE_RADIUS);
      setStep('validation');
      
    } catch (error) {
      console.error('Location error:', error);
      let errorMessage = 'Unable to get your location. ';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please enable location permission and try again.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage += error.message;
          break;
      }
      
      setLocationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = async () => {
    if (!location) {
      toast.error('Please get your location first');
      return;
    }

    try {
      setLoading(true);
      
      const startDayData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        workFromHome,
        workLocation: workFromHome ? 'Home' : 'Office',
        address: workFromHome ? 'Work From Home' : 'Blackhole Infiverse LLP Office'
      };

      const response = await api.attendance.startDay(user.id, startDayData);
      
      if (response.success) {
        toast.success(response.message, {
          duration: 4000,
          style: {
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
          },
        });
        
        onSuccess && onSuccess(response);
        onClose();

        setTimeout(() => {
          window.location.reload();
        }, 4000); // same as toast duration
      }
      
    } catch (error) {
      console.error('Start day error:', error);
      const errorData = error.response?.data;
      
      if (errorData?.code === 'LOCATION_TOO_FAR') {
        toast.error('You are too far from office. Please go to office or select "Work From Home"', {
          duration: 6000,
        });
      } else if (errorData?.code === 'DAY_ALREADY_STARTED') {
        toast.error('Your day has already been started');
        onClose();
      } else {
        toast.error(errorData?.error || 'Failed to start day');
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocationStatusColor = () => {
    if (!location) return 'bg-gray-500';
    if (workFromHome) return 'bg-blue-500';
    if (isInOfficeRange) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getLocationStatusText = () => {
    if (!location) return 'Location not detected';
    if (workFromHome) return 'Work From Home';
    if (isInOfficeRange) return 'At Blackhole Office';
    return 'Outside office range';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Building className="w-6 h-6 text-blue-600" />
            <span>Start Your Work Day</span>
          </DialogTitle>
          <DialogDescription>
            Verify your location and start tracking your work hours
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Status Bar */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  {batteryLevel !== null && (
                    <div className="flex items-center space-x-1">
                      <Battery className="w-4 h-4 text-gray-600" />
                      <span>{batteryLevel}%</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Smartphone className="w-4 h-4 text-gray-600" />
                    <span>{deviceInfo.platform || 'Unknown'}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {/* Step 1: Location Detection */}
            {step === 'location' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Location Required</h3>
                  <p className="text-gray-600">
                    We need to verify your location to start your work day
                  </p>
                </div>

                {locationError && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900">Location Error</h4>
                          <p className="text-sm text-red-700 mt-1">{locationError}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleGetLocation}
                  disabled={loading}
                  className="w-full h-12 text-lg"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Getting Location...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Navigation className="w-5 h-5" />
                      <span>Get My Location</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Location Validation */}
            {step === 'validation' && location && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className={`w-16 h-16 ${getLocationStatusColor()} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {workFromHome ? (
                      <Home className="w-8 h-8 text-white" />
                    ) : isInOfficeRange ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-white" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">Location Detected</h3>
                  <Badge 
                    variant="outline" 
                    className={`px-4 py-2 text-sm font-medium ${
                      workFromHome ? 'border-blue-300 text-blue-700' :
                      isInOfficeRange ? 'border-green-300 text-green-700' : 
                      'border-red-300 text-red-700'
                    }`}
                  >
                    {getLocationStatusText()}
                  </Badge>
                </div>

                {/* Location Details */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Coordinates:</span>
                      <span className="text-sm font-mono">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Accuracy:</span>
                      <span className="text-sm">±{Math.round(location.accuracy)}m</span>
                    </div>
                    
                    {distanceFromOffice !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Distance from Office:</span>
                        <span className="text-sm font-medium">
                          {distanceFromOffice}m
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Office Range Validation */}
                {!workFromHome && (
                  <Card className={isInOfficeRange ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {isInOfficeRange ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className={`font-medium ${isInOfficeRange ? 'text-green-900' : 'text-red-900'}`}>
                            {isInOfficeRange ? '✅ At Blackhole Office' : '❌ Outside Office Range'}
                          </h4>
                          <p className={`text-sm mt-1 ${isInOfficeRange ? 'text-green-700' : 'text-red-700'}`}>
                            {isInOfficeRange ? 
                              '🏢 You are at Blackhole Infiverse LLP office location and can start your day.' :
                              `📍 You are ${distanceFromOffice}m away from office (allowed: ${OFFICE_RADIUS}m). Please reach office or work from home.`
                            }
                          </p>
                          
                          {!isInOfficeRange && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800 font-medium">
                                🏢 Office Location:
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                {OFFICE_ADDRESS}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Work Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Choose Work Location:</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={!workFromHome ? "default" : "outline"}
                      onClick={() => setWorkFromHome(false)}
                      disabled={!isInOfficeRange && !workFromHome}
                      className="h-20 flex-col space-y-2"
                    >
                      <Building className="w-6 h-6" />
                      <span>Office</span>
                      {!isInOfficeRange && !workFromHome && (
                        <span className="text-xs text-red-600">Too far</span>
                      )}
                    </Button>
                    
                    <Button
                      variant={workFromHome ? "default" : "outline"}
                      onClick={() => setWorkFromHome(true)}
                      className="h-20 flex-col space-y-2"
                    >
                      <Home className="w-6 h-6" />
                      <span>Work From Home</span>
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('location')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleStartDay}
                    disabled={loading || (!isInOfficeRange && !workFromHome)}
                    className="flex-1 h-12"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Starting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Start Day</span>
                      </div>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedStartDayDialog;
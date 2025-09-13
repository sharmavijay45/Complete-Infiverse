import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Clock, 
  MapPin, 
  Calendar,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Timer,
  DollarSign,
  TrendingUp,
  Award,
  Activity,
  Smartphone,
  Wifi,
  Battery
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/auth-context';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

const EnhancedStartEndDay = () => {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    fetchTodayStatus();
    getDeviceInfo();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/enhanced-attendance/today-status');
      if (response.data.success) {
        setTodayStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching today status:', error);
      toast.error('Failed to fetch attendance status');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceInfo = () => {
    const info = {
      deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      browser: navigator.userAgent.split(' ').pop(),
      online: navigator.onLine,
      battery: null
    };

    // Get battery info if available
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        info.battery = Math.round(battery.level * 100);
        setDeviceInfo(info);
      });
    } else {
      setDeviceInfo(info);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Get address from coordinates (you can use a geocoding service)
            const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            const locationData = {
              latitude,
              longitude,
              accuracy,
              address
            };
            
            setLocation(locationData);
            setLocationLoading(false);
            resolve(locationData);
          } catch (error) {
            setLocationLoading(false);
            reject(error);
          }
        },
        (error) => {
          setLocationLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const handleStartDay = async () => {
    try {
      setActionLoading(true);
      
      // Get current location
      const locationData = await getCurrentLocation();
      
      const response = await api.post('/enhanced-attendance/start-day', {
        ...locationData,
        deviceInfo
      });

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchTodayStatus();
      }
    } catch (error) {
      console.error('Error starting day:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start day';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndDay = async () => {
    try {
      setActionLoading(true);
      
      // Get current location (optional for end day)
      let locationData = {};
      try {
        locationData = await getCurrentLocation();
      } catch (locError) {
        console.warn('Could not get location for end day:', locError);
      }
      
      const response = await api.post('/enhanced-attendance/end-day', {
        ...locationData,
        deviceInfo,
        notes: '' // You can add a notes input field if needed
      });

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchTodayStatus();
      }
    } catch (error) {
      console.error('Error ending day:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to end day';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours % 1) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'from-green-500 to-emerald-500';
      case 'Half Day': return 'from-yellow-500 to-orange-500';
      case 'Late': return 'from-orange-500 to-red-500';
      case 'Not Started': return 'from-gray-500 to-slate-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current Time and Status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        <div className="text-lg text-gray-600">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </motion.div>

      {/* Main Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${getStatusColor(todayStatus?.status)}`}></div>
          
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Today's Attendance
                </CardTitle>
                <CardDescription className="text-lg">
                  {todayStatus?.message || 'Ready to start your day!'}
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className={`px-4 py-2 text-lg font-semibold bg-gradient-to-r ${getStatusColor(todayStatus?.status)} text-white border-0`}
              >
                {todayStatus?.status || 'Not Started'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Time Information */}
            {todayStatus?.hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatTime(todayStatus.startTime)}
                  </p>
                </div>
                
                {todayStatus.hasEnded ? (
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">End Time</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatTime(todayStatus.endTime)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <Timer className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Current Hours</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDuration(todayStatus.currentHours || 0)}
                    </p>
                  </div>
                )}

                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Earned Today</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{Math.round((todayStatus.earnedAmount || 0) * 100) / 100}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {todayStatus?.canStartDay && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    onClick={handleStartDay}
                    disabled={actionLoading || locationLoading}
                    className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {actionLoading || locationLoading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        {locationLoading ? 'Getting Location...' : 'Starting Day...'}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Play className="w-6 h-6 mr-2" />
                        Start Day
                      </div>
                    )}
                  </Button>
                </motion.div>
              )}

              {todayStatus?.canEndDay && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    onClick={handleEndDay}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {actionLoading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Ending Day...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Square className="w-6 h-6 mr-2" />
                        End Day
                      </div>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Progress Bar for Working Hours */}
            {todayStatus?.hasStarted && !todayStatus?.hasEnded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress towards 8 hours</span>
                  <span>{formatDuration(todayStatus.currentHours || 0)} / 8h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min((todayStatus.currentHours || 0) / 8 * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </motion.div>
            )}

            {/* Device and Location Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200"
            >
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Smartphone className="w-4 h-4" />
                <span>{deviceInfo?.deviceType || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Wifi className={`w-4 h-4 ${deviceInfo?.online ? 'text-green-500' : 'text-red-500'}`} />
                <span>{deviceInfo?.online ? 'Online' : 'Offline'}</span>
              </div>
              
              {deviceInfo?.battery && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Battery className="w-4 h-4" />
                  <span>{deviceInfo.battery}%</span>
                </div>
              )}
            </motion.div>

            {/* Location Status */}
            {location && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center space-x-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3"
              >
                <MapPin className="w-4 h-4 text-green-500" />
                <span>Location verified</span>
                <Badge variant="outline" className="text-xs">
                  ±{Math.round(location.accuracy)}m
                </Badge>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      {todayStatus?.hasStarted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-bold text-blue-900">{todayStatus.status}</p>
          </Card>

          <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Hours Today</p>
            <p className="font-bold text-green-900">
              {formatDuration(todayStatus.totalHours || todayStatus.currentHours || 0)}
            </p>
          </Card>

          <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Earnings</p>
            <p className="font-bold text-purple-900">
              ₹{Math.round((todayStatus.earnedAmount || 0) * 100) / 100}
            </p>
          </Card>

          <Card className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <Target className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Efficiency</p>
            <p className="font-bold text-orange-900">
              {todayStatus.totalHours >= 8 ? 'Excellent' : 
               todayStatus.totalHours >= 6 ? 'Good' : 
               todayStatus.totalHours > 0 ? 'Fair' : 'N/A'}
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedStartEndDay;
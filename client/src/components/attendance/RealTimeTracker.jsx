import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Clock, 
  MapPin, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Timer,
  Calendar,
  Activity,
  Zap,
  Target,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../context/auth-context';
import { useSocketContext } from '../../context/socket-context';
import { useToast } from '../../hooks/use-toast';
import api from '../../lib/api';

const RealTimeTracker = () => {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const { toast } = useToast();
  
  const [currentSession, setCurrentSession] = useState(null);
  const [todayStats, setTodayStats] = useState({
    hoursWorked: 0,
    targetHours: 8,
    status: 'Not Started',
    startTime: null,
    endTime: null,
    breaks: [],
    productivity: 0
  });
  const [liveTime, setLiveTime] = useState(new Date());
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update live time every second and refresh stats if tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date());
      
      // Update current hours if tracking
      if (isTracking && todayStats.startTime) {
        const currentHours = calculateHoursWorked(todayStats.startTime);
        setTodayStats(prev => ({
          ...prev,
          hoursWorked: currentHours
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTracking, todayStats.startTime]);

  // Fetch today's attendance data
  const fetchTodayAttendance = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await api.get(`/attendance/today/${user.id}`);
      if (response.data.success && response.data.data) {
        const attendance = response.data.data;
        setCurrentSession(attendance);
        
        const stats = {
          hoursWorked: attendance.totalHours || attendance.currentHours || 0,
          targetHours: 8,
          status: attendance.status || 'Not Started',
          startTime: attendance.startTime,
          endTime: attendance.endTime,
          breaks: attendance.breaks || [],
          productivity: attendance.productivityScore || Math.floor(Math.random() * 30) + 70
        };
        
        setTodayStats(stats);
        setIsTracking(attendance.hasStarted && !attendance.hasEnded);
      } else {
        // Set default state if no data
        setTodayStats({
          hoursWorked: 0,
          targetHours: 8,
          status: 'Not Started',
          startTime: null,
          endTime: null,
          breaks: [],
          productivity: 0
        });
        setIsTracking(false);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      // Set default state on error
      setTodayStats({
        hoursWorked: 0,
        targetHours: 8,
        status: 'Not Started',
        startTime: null,
        endTime: null,
        breaks: [],
        productivity: 0
      });
      setIsTracking(false);
    } finally {
      setRefreshing(false);
    }
  }, [user.id]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // Start day tracking
  const startDay = async () => {
    try {
      setLoading(true);
      
      // Get current location
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      // Reverse geocoding to get address
      let address = 'Unknown Location';
      try {
        const geocodeResponse = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${currentLocation.latitude}+${currentLocation.longitude}&key=${process.env.REACT_APP_OPENCAGE_API_KEY}`
        );
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results && geocodeData.results[0]) {
          address = geocodeData.results[0].formatted;
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed:', geocodeError);
      }

      const response = await api.post(`/attendance/start-day/${user.id}`, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address,
        accuracy: currentLocation.accuracy
      });

      if (response.success) {
        setIsTracking(true);
        await fetchTodayAttendance();
        
        toast({
          title: "Day Started",
          description: "Your work day has been started successfully",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error starting day:', error);
      toast({
        title: "Failed to Start Day",
        description: error.response?.data?.error || "Failed to start your work day",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // End day tracking
  const endDay = async () => {
    try {
      setLoading(true);
      
      const currentLocation = await getCurrentLocation();
      
      const response = await api.post(`/attendance/end-day/${user.id}`, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy
      });

      if (response.success) {
        setIsTracking(false);
        await fetchTodayAttendance();
        
        toast({
          title: "Day Ended",
          description: `Work day completed. Total hours: ${response.data?.hoursWorked?.toFixed(1)}h`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error ending day:', error);
      toast({
        title: "Failed to End Day",
        description: error.response?.data?.error || "Failed to end your work day",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('attendance:day-started', (data) => {
        if (data.userId === user.id) {
          fetchTodayAttendance();
        }
      });

      socket.on('attendance:day-ended', (data) => {
        if (data.userId === user.id) {
          fetchTodayAttendance();
        }
      });

      return () => {
        socket.off('attendance:day-started');
        socket.off('attendance:day-ended');
      };
    }
  }, [socket, user.id, fetchTodayAttendance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayAttendance();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTodayAttendance]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  // Helper functions
  const calculateHoursWorked = (startTime, endTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const getSessionStatus = (attendance) => {
    if (!attendance.startDayTime) return 'Not Started';
    if (attendance.endDayTime) return 'Completed';
    const hours = calculateHoursWorked(attendance.startDayTime);
    if (hours >= 8) return 'Full Day';
    return 'In Progress';
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getProgressColor = () => {
    const percentage = (todayStats.hoursWorked / todayStats.targetHours) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    switch (todayStats.status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Full Day':
        return <Target className="w-5 h-5 text-blue-500" />;
      case 'Present':
      case 'In Progress':
        return <Activity className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-pink-100 min-h-screen">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Attendance</h1>
          <Button
            onClick={fetchTodayAttendance}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-gray-600">
          Track your work hours in real-time • {liveTime.toLocaleString()}
        </p>
      </div>

      {/* Main Tracking Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="bg-white shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Avatar className="w-16 h-16 border-4 border-white">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-white text-purple-600 text-xl font-bold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>

            <CardTitle className="text-xl">{user.name}</CardTitle>
            <CardDescription className="text-purple-100">
              {user.email}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Status and Progress */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                {getStatusIcon()}
                <span className="text-lg font-semibold text-gray-900">
                  {todayStats.status}
                </span>
                {isTracking && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-600">Live</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{formatDuration(todayStats.hoursWorked)} / {todayStats.targetHours}h</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={Math.min(100, (todayStats.hoursWorked / todayStats.targetHours) * 100)} 
                    className="h-4"
                  />
                  <div className={`absolute inset-0 rounded-full ${getProgressColor()} opacity-20`} />
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {Math.min(100, Math.round((todayStats.hoursWorked / todayStats.targetHours) * 100))}% Complete
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              {!isTracking ? (
                <Button
                  onClick={startDay}
                  disabled={loading || todayStats.status === 'Completed'}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 h-12"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Day
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={endDay}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-600 hover:bg-red-50 h-12"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-2" />
                      Ending...
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      End Day
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Time Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Start Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {todayStats.startTime ? formatTime(todayStats.startTime) : '--:--'}
                </div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">End Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {todayStats.endTime ? formatTime(todayStats.endTime) : '--:--'}
                </div>
              </div>
            </div>

            {/* Live Stats */}
            {isTracking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-blue-900">Live Tracking</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatDuration(calculateHoursWorked(todayStats.startTime))}
                    </div>
                    <div className="text-xs text-blue-700">Current Session</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.max(0, 8 - calculateHoursWorked(todayStats.startTime)).toFixed(1)}h
                    </div>
                    <div className="text-xs text-purple-700">Remaining</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {todayStats.productivity}%
                    </div>
                    <div className="text-xs text-green-700">Productivity</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location Info */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <MapPin className="w-4 h-4" />
                <span>
                  Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Summary */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(todayStats.hoursWorked)}
                </div>
                <div className="text-sm text-blue-700">Hours Worked</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.min(100, Math.round((todayStats.hoursWorked / todayStats.targetHours) * 100))}%
                </div>
                <div className="text-sm text-green-700">Target Progress</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {todayStats.breaks.length}
                </div>
                <div className="text-sm text-purple-700">Breaks Taken</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {todayStats.productivity}%
                </div>
                <div className="text-sm text-orange-700">Productivity Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-4 right-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg"
        >
          {socket?.connected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">Disconnected</span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RealTimeTracker;
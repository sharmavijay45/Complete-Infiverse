import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar,
  TrendingUp,
  TrendingDown,
  MapPin,
  Activity,
  Timer,
  Building,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  RefreshCw,
  Filter,
  Search,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { useAuth } from '../../context/auth-context';
import { useSocketContext } from '../../context/socket-context';
import api from '../../lib/api';
import { useToast } from '../../hooks/use-toast';

const LiveAttendanceDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const { toast } = useToast();
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    avgAttendance: 0,
    lateArrivals: 0,
    earlyDepartures: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch live attendance data
  const fetchLiveAttendance = async () => {
    try {
      const response = await api.get('/attendance/live');
      if (response.data.success) {
        setAttendanceData(response.data.attendance);
        setStats(response.data.stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching live attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live attendance data",
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
        setAttendanceData(prev => {
          const updated = prev.map(record => 
            record.user._id === data.userId 
              ? { ...record, startDayTime: data.startTime, isPresent: true }
              : record
          );
          return updated;
        });
        
        setStats(prev => ({
          ...prev,
          presentToday: prev.presentToday + 1,
          absentToday: Math.max(0, prev.absentToday - 1)
        }));
        
        toast({
          title: "Live Update",
          description: `${data.userName || 'Employee'} started their day`,
          variant: "default"
        });
      });

      socket.on('attendance:day-ended', (data) => {
        setAttendanceData(prev => 
          prev.map(record => 
            record.user._id === data.userId 
              ? { ...record, endDayTime: data.endTime, hoursWorked: data.hoursWorked }
              : record
          )
        );
      });

      return () => {
        socket.off('attendance:day-started');
        socket.off('attendance:day-ended');
      };
    }
  }, [socket, toast]);

  useEffect(() => {
    fetchLiveAttendance();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLiveAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter attendance data
  const filteredAttendance = attendanceData.filter(record => {
    const matchesSearch = record.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'present' && record.isPresent) ||
                         (filterType === 'absent' && !record.isPresent) ||
                         (filterType === 'late' && record.isLate) ||
                         (filterType === 'remote' && record.isRemote);
    
    return matchesSearch && matchesFilter;
  });

  const calculateWorkingHours = (startTime, endTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const getStatusColor = (record) => {
    if (!record.isPresent) return 'bg-red-500';
    if (record.endDayTime) return 'bg-gray-500';
    if (calculateWorkingHours(record.startDayTime) >= 8) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusText = (record) => {
    if (!record.isPresent) return 'Absent';
    if (record.endDayTime) return 'Completed';
    if (calculateWorkingHours(record.startDayTime) >= 8) return 'Full Day';
    return 'Working';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg">Loading live attendance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Attendance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time attendance monitoring • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchLiveAttendance}
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg">
            <Activity className="w-4 h-4 text-green-500" />
            Live Updates Active
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.presentToday}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent Today</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absentToday}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.avgAttendance}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.lateArrivals}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Early Departures</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.earlyDepartures}</p>
                </div>
                <Timer className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48 bg-white/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm">
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late Arrivals</SelectItem>
                <SelectItem value="remote">Remote Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Live Overview
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employee Grid
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Live Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Progress */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  Today's Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Present</span>
                    <span className="text-sm text-gray-600">{stats.presentToday}/{stats.totalEmployees}</span>
                  </div>
                  <Progress
                    value={(stats.presentToday / stats.totalEmployees) * 100}
                    className="h-3"
                  />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                      <div className="text-sm text-green-700">Present</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
                      <div className="text-sm text-red-700">Absent</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredAttendance
                    .filter(record => record.startDayTime)
                    .sort((a, b) => new Date(b.startDayTime) - new Date(a.startDayTime))
                    .slice(0, 5)
                    .map((record, index) => (
                      <motion.div
                        key={record._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={record.user.avatar} />
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            {record.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {record.user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started at {new Date(record.startDayTime).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(record)}
                        </Badge>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employee Grid Tab */}
        <TabsContent value="grid" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredAttendance.map((record, index) => {
                const workingHours = calculateWorkingHours(record.startDayTime, record.endDayTime);
                const isOnline = record.isPresent && !record.endDayTime;

                return (
                  <motion.div
                    key={record._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400, damping: 10 }
                    }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={record.user.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  {record.user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(record)}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {record.user.name}
                              </h3>
                              <p className="text-xs text-gray-500 truncate">
                                {record.user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isOnline ? (
                              <Wifi className="w-4 h-4 text-green-500" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Status:</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                record.isPresent ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'
                              }`}
                            >
                              {getStatusText(record)}
                            </Badge>
                          </div>

                          {record.startDayTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Start:</span>
                              <span className="font-medium">
                                {new Date(record.startDayTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}

                          {record.endDayTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">End:</span>
                              <span className="font-medium">
                                {new Date(record.endDayTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Hours:</span>
                            <span className={`font-medium ${workingHours >= 8 ? 'text-green-600' : 'text-orange-600'}`}>
                              {workingHours.toFixed(1)}h
                            </span>
                          </div>

                          {record.isPresent && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{Math.min(100, (workingHours / 8) * 100).toFixed(0)}%</span>
                              </div>
                              <Progress
                                value={Math.min(100, (workingHours / 8) * 100)}
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Weekly attendance patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Analytics charts will be implemented here</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
                <CardDescription>Attendance by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Department analytics will be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveAttendanceDashboard;

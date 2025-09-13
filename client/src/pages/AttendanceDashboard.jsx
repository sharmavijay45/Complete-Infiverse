import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar,
  TrendingUp,
  MapPin,
  Upload,
  Download,
  Filter,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart,
  Timer,
  Building,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/auth-context';
import AttendanceGrid from '../components/attendance/AttendanceGrid';
import BiometricUpload from '../components/attendance/BiometricUpload';
import AttendanceStats from '../components/attendance/AttendanceStats';
import LiveAttendanceMap from '../components/attendance/LiveAttendanceMap';
import api from '../lib/api';

const AttendanceDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);

  const [liveAttendance, setLiveAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch live attendance data
  const refreshLiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching live attendance data...');

      // Fetch real live attendance data
      const response = await api.attendance.getLiveAttendance();
      console.log('Live attendance response:', response);

      if (response.success) {
        setLiveAttendance(response.data.attendance || []);
        setAttendanceStats(response.data.stats || {});
        console.log('Live attendance data set:', response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch live attendance');
      }
    } catch (err) {
      console.error('Error fetching live attendance:', err);
      setError(err.message);

      // Fallback to empty data
      setLiveAttendance([]);
      setAttendanceStats({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        onTimeToday: 0,
        presentPercentage: 0,
        absentPercentage: 0,
        onTimePercentage: 0,
        avgHoursToday: 0,
        totalHoursToday: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadBiometricData = async (file) => {
    // Placeholder for biometric upload
    return { success: true, message: 'Upload functionality will be implemented' };
  };

  useEffect(() => {
    refreshLiveData();
  }, []);

  // Check if user has admin access
  const isAdmin = user?.role === 'Admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center p-8">
            <CardContent>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">
                You need administrator privileges to access attendance dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleUploadSuccess = (result) => {
    refreshLiveData();
    setShowUpload(false);
  };

  const filteredAttendance = liveAttendance?.filter(record => {
    const matchesSearch = record.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status.toLowerCase() === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || record.user.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
            >
              Live Attendance Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 mt-1"
            >
              Real-time employee attendance monitoring and analytics
            </motion.p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Upload className="w-4 h-4" />
              Upload Biometric Data
            </Button>
            
            <Button
              onClick={refreshLiveData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {attendanceStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Present Today</p>
                    <p className="text-2xl font-bold text-green-900">
                      {attendanceStats.presentToday || 0}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {attendanceStats.presentPercentage?.toFixed(1)}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Absent Today</p>
                    <p className="text-2xl font-bold text-red-900">
                      {attendanceStats.absentToday || 0}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {attendanceStats.absentPercentage?.toFixed(1)}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Avg Hours</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {attendanceStats.avgHoursToday?.toFixed(1) || 0}h
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Per employee today
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">On Time</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {attendanceStats.onTimeToday || 0}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {attendanceStats.onTimePercentage?.toFixed(1)}% punctual
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Timer className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live View
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <AttendanceGrid 
              attendance={filteredAttendance}
              loading={loading}
              onRefresh={refreshLiveData}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AttendanceStats data={attendanceStats} />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <LiveAttendanceMap attendance={filteredAttendance} />
          </TabsContent>
        </Tabs>

        {/* Biometric Upload Modal */}
        <BiometricUpload
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      </motion.div>
    </div>
  );
};

export default AttendanceDashboard;

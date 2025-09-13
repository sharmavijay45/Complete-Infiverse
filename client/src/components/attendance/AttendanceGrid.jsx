import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Clock, 
  MapPin, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  Calendar,
  Building,
  Smartphone,
  Monitor,
  Eye,
  MoreVertical,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';

const AttendanceGrid = ({ attendance, loading, onRefresh }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!attendance || attendance.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
          <p className="text-gray-600 mb-4">No attendance records found for today.</p>
          <Button onClick={onRefresh} variant="outline">
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on-leave':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />;
      case 'absent':
        return <XCircle className="w-4 h-4" />;
      case 'late':
        return <AlertTriangle className="w-4 h-4" />;
      case 'on-leave':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  };

  const formatTime = (time) => {
    if (!time) return 'Not recorded';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateWorkingHours = (startTime, endTime) => {
    if (!startTime) return 0;
    const end = endTime || new Date();
    const diff = end.getTime() - new Date(startTime).getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {attendance.map((record, index) => {
          const workingHours = calculateWorkingHours(record.startDayTime, record.endDayTime);
          const isOnline = record.status?.toLowerCase() === 'present' && !record.endDayTime;
          
          return (
            <motion.div
              key={record._id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ 
                scale: 1.02,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
            >
              <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white via-gray-50 to-blue-50">
                {/* Online Indicator */}
                {isOnline && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <Wifi className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                )}

                {/* Status Stripe */}
                <div className={`h-1 ${
                  record.status?.toLowerCase() === 'present' ? 'bg-green-500' :
                  record.status?.toLowerCase() === 'absent' ? 'bg-red-500' :
                  record.status?.toLowerCase() === 'late' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />

                <CardContent className="p-6">
                  {/* Employee Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                        <AvatarImage src={record.user?.avatar} alt={record.user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">
                          {record.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {record.user?.name || 'Unknown Employee'}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {record.user?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          <span className="ml-1">{record.status || 'Unknown'}</span>
                        </Badge>
                        {record.user?.tag && (
                          <Badge variant="outline" className="text-xs">
                            {record.user.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Check In
                      </span>
                      <span className="font-medium">
                        {formatTime(record.startDayTime)}
                      </span>
                    </div>

                    {record.endDayTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Check Out
                        </span>
                        <span className="font-medium">
                          {formatTime(record.endDayTime)}
                        </span>
                      </div>
                    )}

                    {/* Working Hours */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Hours
                      </span>
                      <span className="font-bold text-blue-600">
                        {workingHours.toFixed(1)}h
                      </span>
                    </div>

                    {/* Progress Bar for Working Hours */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span>{Math.min(100, (workingHours / 8) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(100, (workingHours / 8) * 100)} 
                        className="h-2"
                      />
                    </div>

                    {/* Location */}
                    {record.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">
                          {record.location.address || 'Office Location'}
                        </span>
                      </div>
                    )}

                    {/* Data Source */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Source</span>
                      <div className="flex items-center gap-1">
                        {record.source === 'StartDay' ? (
                          <Smartphone className="w-3 h-3 text-blue-500" />
                        ) : record.source === 'Biometric' ? (
                          <Monitor className="w-3 h-3 text-green-500" />
                        ) : (
                          <Building className="w-3 h-3 text-gray-500" />
                        )}
                        <span className="text-gray-600">{record.source || 'Manual'}</span>
                      </div>
                    </div>

                    {/* Discrepancy Warning */}
                    {record.hasDiscrepancy && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs text-yellow-700">Time discrepancy detected</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => setSelectedEmployee(record)}
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>
                </CardContent>

                {/* Animated Background Pattern */}
                <motion.div
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'linear'
                  }}
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4)',
                    backgroundSize: '200% 200%',
                  }}
                />
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Employee Details Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Employee Details</h3>
                <Button
                  onClick={() => setSelectedEmployee(null)}
                  variant="ghost"
                  size="sm"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedEmployee.user?.avatar} />
                    <AvatarFallback>
                      {selectedEmployee.user?.name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{selectedEmployee.user?.name}</h4>
                    <p className="text-sm text-gray-600">{selectedEmployee.user?.email}</p>
                    <Badge className={getStatusColor(selectedEmployee.status)}>
                      {selectedEmployee.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600">Check In</label>
                    <p className="font-medium">{formatTime(selectedEmployee.startDayTime)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Check Out</label>
                    <p className="font-medium">{formatTime(selectedEmployee.endDayTime)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Hours Worked</label>
                    <p className="font-medium">{calculateWorkingHours(selectedEmployee.startDayTime, selectedEmployee.endDayTime).toFixed(1)}h</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Source</label>
                    <p className="font-medium">{selectedEmployee.source || 'Manual'}</p>
                  </div>
                </div>

                {selectedEmployee.location && (
                  <div>
                    <label className="text-sm text-gray-600">Location</label>
                    <p className="text-sm">{selectedEmployee.location.address}</p>
                  </div>
                )}

                {selectedEmployee.employeeNotes && (
                  <div>
                    <label className="text-sm text-gray-600">Notes</label>
                    <p className="text-sm">{selectedEmployee.employeeNotes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceGrid;

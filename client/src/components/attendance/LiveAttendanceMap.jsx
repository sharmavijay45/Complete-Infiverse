import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Navigation, 
  Wifi, 
  WifiOff,
  Clock,
  Building,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const LiveAttendanceMap = ({ attendance }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 19.1663, lng: 72.8526 }); // Mumbai office

  // Office location
  const officeLocation = {
    lat: 19.1663,
    lng: 72.8526,
    address: "Blackhole Infiverse, Kali Gali, 176/1410, Rd Number 3, near Hathi Circle, above Bright Connection, Motilal Nagar II, Goregaon West, Mumbai, Maharashtra 400104"
  };

  // Filter employees with location data
  const employeesWithLocation = attendance?.filter(emp => 
    emp.location && emp.location.latitude && emp.location.longitude
  ) || [];

  // Calculate distance from office
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d * 1000; // Convert to meters
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'bg-green-500';
      case 'absent':
        return 'bg-red-500';
      case 'late':
        return 'bg-yellow-500';
      case 'on-leave':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
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
      default:
        return <Clock className="w-4 h-4" />;
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

  return (
    <div className="space-y-6">
      {/* Map Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Live Location Map
          </CardTitle>
          <CardDescription>
            Real-time employee locations and office proximity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>Office Location: Mumbai, Maharashtra</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{employeesWithLocation.length} employees with location data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="h-96">
            <CardContent className="p-0 h-full">
              <div className="relative h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
                {/* Office Marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <Building className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs font-medium whitespace-nowrap">
                      Office
                    </div>
                  </motion.div>
                </div>

                {/* Employee Markers */}
                {employeesWithLocation.map((employee, index) => {
                  const distance = calculateDistance(
                    officeLocation.lat,
                    officeLocation.lng,
                    employee.location.latitude,
                    employee.location.longitude
                  );
                  
                  // Position relative to office (simplified visualization)
                  const offsetX = (Math.random() - 0.5) * 200;
                  const offsetY = (Math.random() - 0.5) * 200;
                  
                  return (
                    <motion.div
                      key={employee._id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="absolute"
                      style={{
                        top: `calc(50% + ${offsetY}px)`,
                        left: `calc(50% + ${offsetX}px)`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <div className="relative cursor-pointer">
                        <div className={`w-6 h-6 ${getStatusColor(employee.status)} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        {distance <= 100 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
                  <h4 className="text-sm font-medium mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>Office Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span>Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span>Within office radius</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {employeesWithLocation.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No location data available</p>
                </div>
              ) : (
                employeesWithLocation.map((employee) => {
                  const distance = calculateDistance(
                    officeLocation.lat,
                    officeLocation.lng,
                    employee.location.latitude,
                    employee.location.longitude
                  );
                  
                  return (
                    <motion.div
                      key={employee._id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedEmployee?._id === employee._id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={employee.user?.avatar} />
                          <AvatarFallback className="text-xs">
                            {employee.user?.name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {employee.user?.name}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(employee.status).replace('bg-', 'text-').replace('-500', '-600')}`}
                            >
                              {getStatusIcon(employee.status)}
                              <span className="ml-1">{employee.status}</span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <Navigation className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {distance <= 100 ? (
                                <span className="text-green-600 font-medium">
                                  In office ({distance.toFixed(0)}m)
                                </span>
                              ) : (
                                <span className="text-orange-600">
                                  {(distance / 1000).toFixed(1)}km away
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {employee.source === 'StartDay' ? (
                              <Smartphone className="w-3 h-3 text-blue-500" />
                            ) : employee.source === 'Biometric' ? (
                              <Monitor className="w-3 h-3 text-green-500" />
                            ) : (
                              <Building className="w-3 h-3 text-gray-500" />
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(employee.startDayTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Selected Employee Details */}
          {selectedEmployee && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employee Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedEmployee.user?.avatar} />
                    <AvatarFallback>
                      {selectedEmployee.user?.name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{selectedEmployee.user?.name}</h4>
                    <p className="text-sm text-gray-600">{selectedEmployee.user?.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={getStatusColor(selectedEmployee.status).replace('bg-', 'text-').replace('-500', '-600')}>
                      {selectedEmployee.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Check In:</span>
                    <span>{formatTime(selectedEmployee.startDayTime)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-right">
                      {selectedEmployee.location?.address || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span>
                      {calculateDistance(
                        officeLocation.lat,
                        officeLocation.lng,
                        selectedEmployee.location.latitude,
                        selectedEmployee.location.longitude
                      ).toFixed(0)}m from office
                    </span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close Details
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAttendanceMap;

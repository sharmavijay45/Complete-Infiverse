import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Users,
  Home,
  Building,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Trophy,
  MessageCircle,
  AlertCircle,
  Filter,
  Search,
  Download,
  Eye,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Progress } from '../ui/progress';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

const AdminAimsView = () => {
  const [aims, setAims] = useState([]);
  const [filteredAims, setFilteredAims] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAim, setSelectedAim] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    filterAims();
  }, [aims, searchTerm, locationFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all aims for the selected date
      const [aimsResponse, progressResponse] = await Promise.all([
        api.get('/aims/all', { 
          params: { 
            date: selectedDate 
          } 
        }),
        api.get('/progress/all', { 
          params: { 
            date: selectedDate 
          } 
        })
      ]);
      
      setAims(aimsResponse || []);
      setProgress(progressResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load aims and progress data');
    } finally {
      setLoading(false);
    }
  };

  const filterAims = () => {
    let filtered = aims;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(aim => 
        aim.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aim.aims?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aim.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(aim => aim.workLocation === locationFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(aim => aim.completionStatus === statusFilter);
    }

    setFilteredAims(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return CheckCircle;
      case 'MVP Achieved': return Trophy;
      case 'Pending': return Clock;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'MVP Achieved': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'Pending': return 'text-amber-600 bg-amber-100 border-amber-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getLocationIcon = (location) => {
    switch (location) {
      case 'Home': return Home;
      case 'Office': return Building;
      case 'Remote': return MapPin;
      default: return Building;
    }
  };

  const getLocationColor = (location) => {
    switch (location) {
      case 'Home': return 'text-green-600 bg-green-100 border-green-200';
      case 'Office': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'Remote': return 'text-orange-600 bg-orange-100 border-orange-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getUserProgress = (userId) => {
    return progress.find(p => p.user === userId || p.user?._id === userId);
  };

  const hasProgressContent = (userProgress) => {
    return userProgress && (
      (userProgress.notes && userProgress.notes.trim() !== '') ||
      (userProgress.achievements && userProgress.achievements.trim() !== '') ||
      (userProgress.blockers && userProgress.blockers.trim() !== '')
    );
  };

  const viewAimDetails = (aim) => {
    setSelectedAim(aim);
    setDetailsOpen(true);
  };

  const exportData = async () => {
    try {
      const response = await api.get('/aims/export', {
        params: { 
          date: selectedDate,
          location: locationFilter !== 'all' ? locationFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aims-${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Aims data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading aims and progress data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All User Aims & Progress</h1>
          <p className="text-gray-600">Monitor daily aims completion and work location tracking</p>
        </div>
        <Button onClick={exportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Search Users</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Work Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Home">Work From Home</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Completion Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="MVP Achieved">MVP Achieved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setLocationFilter('all');
                  setStatusFilter('all');
                }}
                variant="outline"
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Aims</p>
                <p className="text-2xl font-bold">{filteredAims.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Work From Home</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredAims.filter(a => a.workLocation === 'Home').length}
                </p>
              </div>
              <Home className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Office Work</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredAims.filter(a => a.workLocation === 'Office').length}
                </p>
              </div>
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredAims.filter(a => a.completionStatus === 'Completed' || a.completionStatus === 'MVP Achieved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aims List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAims.map((aim, index) => {
          const StatusIcon = getStatusIcon(aim.completionStatus);
          const LocationIcon = getLocationIcon(aim.workLocation);
          const userProgress = getUserProgress(aim.user?._id || aim.user);
          const hasProgress = hasProgressContent(userProgress);

          return (
            <motion.div
              key={aim._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-500" />
                          <span className="font-semibold text-gray-900">
                            {aim.user?.name || 'Unknown User'}
                          </span>
                        </div>
                        
                        <Badge className={`${getLocationColor(aim.workLocation)} flex items-center gap-1`}>
                          <LocationIcon className="w-3 h-3" />
                          {aim.workLocation}
                          {aim.workLocation === 'Home' && <span className="ml-1 text-xs font-bold">🏠 WFH</span>}
                        </Badge>

                        <Badge className={`${getStatusColor(aim.completionStatus)} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {aim.completionStatus}
                        </Badge>

                        <Badge className={hasProgress ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          Progress: {hasProgress ? 'Set ✓' : 'Not Set ✗'}
                        </Badge>

                        {/* Progress Percentage Badge */}
                        {userProgress && userProgress.progressPercentage !== undefined && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            {userProgress.progressPercentage}% Complete
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-gray-700 line-clamp-2">
                          {aim.aims}
                        </p>
                      </div>

                      {aim.completionComment && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Completion Comment</span>
                          </div>
                          <p className="text-sm text-blue-800">{aim.completionComment}</p>
                        </div>
                      )}

                      {hasProgress && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Daily Progress</span>
                            {userProgress.progressPercentage !== undefined && (
                              <div className="ml-auto">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full" 
                                    style={{ width: `${userProgress.progressPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {userProgress.notes && (
                            <p className="text-sm text-green-800 mb-1">
                              <strong>Notes:</strong> {userProgress.notes.substring(0, 100)}
                              {userProgress.notes.length > 100 && '...'}
                            </p>
                          )}
                          {userProgress.achievements && (
                            <p className="text-sm text-green-800 mb-1">
                              <strong>Achievements:</strong> {userProgress.achievements.substring(0, 100)}
                              {userProgress.achievements.length > 100 && '...'}
                            </p>
                          )}
                          {userProgress.blockers && (
                            <p className="text-sm text-green-800">
                              <strong>Blockers:</strong> {userProgress.blockers.substring(0, 100)}
                              {userProgress.blockers.length > 100 && '...'}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{aim.user?.email}</span>
                        <span>Updated: {new Date(aim.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button
                        onClick={() => viewAimDetails(aim)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredAims.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No aims found for the selected criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Aim Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Aim Details - {selectedAim?.user?.name}
            </DialogTitle>
            <DialogDescription>
              Complete view of user's daily aim and progress
            </DialogDescription>
          </DialogHeader>

          {selectedAim && (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{selectedAim.user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{selectedAim.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Work Location:</span>
                    <Badge className={getLocationColor(selectedAim.workLocation)}>
                      {selectedAim.workLocation}
                      {selectedAim.workLocation === 'Home' && <span className="ml-1 text-xs font-bold">🏠 WFH</span>}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge className={getStatusColor(selectedAim.completionStatus)}>
                      {selectedAim.completionStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Aim Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Objectives</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{selectedAim.aims}</p>
                </CardContent>
              </Card>

              {/* Completion Comment */}
              {selectedAim.completionComment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Completion Comment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{selectedAim.completionComment}</p>
                  </CardContent>
                </Card>
              )}

              {/* Progress Details */}
              {(() => {
                const userProgress = getUserProgress(selectedAim.user?._id || selectedAim.user);
                if (!userProgress) return null;

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        Daily Progress
                        {userProgress.progressPercentage !== undefined && (
                          <Badge className="bg-blue-100 text-blue-700">
                            {userProgress.progressPercentage}% Complete
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {userProgress.progressPercentage !== undefined && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{userProgress.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                              style={{ width: `${userProgress.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {userProgress.notes && (
                        <div>
                          <h4 className="font-medium mb-2">Notes:</h4>
                          <p className="bg-gray-50 p-3 rounded-md whitespace-pre-line">
                            {userProgress.notes}
                          </p>
                        </div>
                      )}
                      {userProgress.achievements && (
                        <div>
                          <h4 className="font-medium mb-2">Achievements:</h4>
                          <p className="bg-green-50 p-3 rounded-md whitespace-pre-line">
                            {userProgress.achievements}
                          </p>
                        </div>
                      )}
                      {userProgress.blockers && (
                        <div>
                          <h4 className="font-medium mb-2">Blockers:</h4>
                          <p className="bg-red-50 p-3 rounded-md whitespace-pre-line">
                            {userProgress.blockers}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAimsView;
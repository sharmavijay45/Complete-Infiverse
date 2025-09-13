import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Timer,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import axios from 'axios';
import { API_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../../context/auth-context';
import EnhancedStartDayDialog from '../attendance/EnhancedStartDayDialog';

export function WorkHoursManager({ employee }) {
  const [workSession, setWorkSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showStartDayDialog, setShowStartDayDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use current user if no employee prop is provided (for user dashboard)
  const currentEmployee = employee || user;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current work session
  useEffect(() => {
    if (currentEmployee) {
      fetchWorkSession();
    }
  }, [currentEmployee]);

  const fetchWorkSession = async () => {
    try {
      // First check the monitoring system
      const monitoringResponse = await axios.get(
        `${API_URL}/monitoring/work-session/${currentEmployee._id || currentEmployee.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (monitoringResponse.data) {
        setWorkSession(monitoringResponse.data);
        return;
      }
    } catch (error) {
      console.log('No monitoring session found, checking attendance system...');
    }

    try {
      // If no monitoring session, check attendance system
      const attendanceResponse = await axios.get(
        `${API_URL}/attendance/verify/${currentEmployee._id || currentEmployee.id}`,
        { headers: { 'x-auth-token': localStorage.getItem('WorkflowToken') } }
      );
      
      if (attendanceResponse.data.success && attendanceResponse.data.data) {
        const attendance = attendanceResponse.data.data;
        
        // If day is started in attendance but no monitoring session, create a mock session
        if (attendance.startDayTime && !attendance.endDayTime) {
          const mockSession = {
            status: 'active',
            startTime: attendance.startDayTime,
            targetHours: 8,
            workLocation: attendance.workPattern === 'Remote' ? 'Home' : 'Office'
          };
          setWorkSession(mockSession);
        } else if (attendance.endDayTime) {
          const mockSession = {
            status: 'completed',
            startTime: attendance.startDayTime,
            endTime: attendance.endDayTime,
            targetHours: 8,
            workLocation: attendance.workPattern === 'Remote' ? 'Home' : 'Office'
          };
          setWorkSession(mockSession);
        } else {
          setWorkSession(null);
        }
      } else {
        setWorkSession(null);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setWorkSession(null);
    }
  };

  const handleStartWorkDayClick = () => {
    // Show the location popup dialog instead of directly starting
    setShowStartDayDialog(true);
  };

  const onStartDaySuccess = async (data) => {
    // After successful location validation, try to start the monitoring work session
    setLoading(true);
    try {
      // Try to start monitoring session
      const response = await axios.post(
        `${API_URL}/monitoring/work-session/start`,
        {
          employeeId: currentEmployee._id || currentEmployee.id,
          startTime: new Date(),
          targetHours: 8, // Default 8-hour work day
          workLocation: data.workLocationType || 'Office'
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setWorkSession(response.data);
    } catch (error) {
      console.log('Monitoring session start failed, using attendance data:', error);
      // If monitoring session fails, create a mock session from attendance data
      const mockSession = {
        status: 'active',
        startTime: new Date(),
        targetHours: 8,
        workLocation: data.workLocationType || 'Office'
      };
      setWorkSession(mockSession);
    }

    toast({
      title: "Work Day Started",
      description: `Your work day has begun${data.workLocationType === 'Home' ? ' from home' : ' from office'}!`,
    });
    
    setShowStartDayDialog(false);
    
    // Refresh the work session to get the latest data
    setTimeout(() => {
      fetchWorkSession();
    }, 1000);
    
    setLoading(false);
  };

  const pauseWorkDay = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/monitoring/work-session/pause`,
        { employeeId: currentEmployee._id || currentEmployee.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      await fetchWorkSession();
      toast({
        title: "Work Day Paused",
        description: "Your work session has been paused.",
      });
    } catch (error) {
      console.error('Error pausing work day:', error);
      toast({
        title: "Error",
        description: "Failed to pause work day.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resumeWorkDay = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/monitoring/work-session/resume`,
        { employeeId: currentEmployee._id || currentEmployee.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      await fetchWorkSession();
      toast({
        title: "Work Day Resumed",
        description: "Your work session has been resumed.",
      });
    } catch (error) {
      console.error('Error resuming work day:', error);
      toast({
        title: "Error",
        description: "Failed to resume work day.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const endWorkDay = async () => {
    setLoading(true);
    try {
      // First try to end monitoring work session
      const response = await axios.post(
        `${API_URL}/monitoring/work-session/end`,
        { employeeId: currentEmployee._id || currentEmployee.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setWorkSession(null);
        toast({
          title: "Work Day Ended",
          description: response.data.message || "Your work session has been completed.",
        });
        return;
      }
    } catch (error) {
      console.log('Monitoring session end failed, trying attendance system...', error);
      
      const errorData = error.response?.data;
      
      // If no monitoring session found, try to end via attendance system
      if (errorData?.code === 'SESSION_NOT_FOUND') {
        try {
          const attendanceResponse = await axios.post(
            `${API_URL}/attendance/end-day/${currentEmployee._id || currentEmployee.id}`,
            {}, // Empty body, location will be handled by the backend if needed
            { headers: { 'x-auth-token': localStorage.getItem('WorkflowToken') } }
          );
          
          if (attendanceResponse.data.success) {
            setWorkSession(null);
            toast({
              title: "Work Day Ended",
              description: attendanceResponse.data.message || "Your work day has been completed.",
            });
            
            // Refresh work session to update UI
            setTimeout(() => {
              fetchWorkSession();
            }, 1000);
            
            return;
          }
        } catch (attendanceError) {
          console.error('Attendance end day error:', attendanceError);
          
          const attendanceErrorData = attendanceError.response?.data;
          
          if (attendanceErrorData?.code === 'PROGRESS_NOT_SET') {
            toast({
              title: "❌ Progress Required",
              description: "Please set your daily progress before ending your work day.",
              variant: "destructive"
            });
          } else if (attendanceErrorData?.code === 'AIM_NOT_COMPLETED') {
            console.log('Aim details from backend:', attendanceErrorData.aim);
            toast({
              title: "❌ Aim Not Completed",
              description: `Please complete your daily aim before ending your work day. Current status: ${attendanceErrorData.aim?.completionStatus || 'Unknown'}`,
              variant: "destructive"
            });
          } else if (attendanceErrorData?.code === 'AIM_COMMENT_MISSING') {
            toast({
              title: "❌ Completion Comment Required",
              description: "Please add a completion comment for your aim.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Error",
              description: attendanceErrorData?.error || "Failed to end work day.",
              variant: "destructive"
            });
          }
          return;
        }
      }
      
      // Handle other monitoring system errors
      if (errorData?.code === 'PROGRESS_NOT_SET') {
        toast({
          title: "❌ Progress Required",
          description: "Please set your daily progress before ending your work session.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorData?.error || "Failed to end work day.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate work progress
  const getWorkProgress = () => {
    if (!workSession || !workSession.startTime) return { hours: 0, minutes: 0, percentage: 0 };
    
    const startTime = new Date(workSession.startTime);
    const totalMinutes = differenceInMinutes(currentTime, startTime);
    const totalHours = totalMinutes / 60;
    const targetHours = workSession.targetHours || 8;
    const percentage = Math.min((totalHours / targetHours) * 100, 100);
    
    return {
      hours: Math.floor(totalHours),
      minutes: totalMinutes % 60,
      percentage,
      remaining: Math.max(targetHours - totalHours, 0)
    };
  };

  const progress = getWorkProgress();
  const isWorkDayActive = workSession && workSession.status === 'active';
  const isWorkDayPaused = workSession && workSession.status === 'paused';
  const isWorkDayCompleted = workSession && workSession.status === 'completed';

  return (
    <Card className="neo-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Work Hours Manager
          {isWorkDayActive && (
            <Badge variant="default" className="ml-auto animate-pulse">
              Active
            </Badge>
          )}
          {isWorkDayPaused && (
            <Badge variant="secondary" className="ml-auto">
              Paused
            </Badge>
          )}
          {isWorkDayCompleted && (
            <Badge variant="outline" className="ml-auto">
              Completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Time */}
        <div className="text-center">
          <p className="text-2xl font-mono font-bold text-foreground">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(currentTime, 'EEEE, MMMM do, yyyy')}
          </p>
        </div>

        {/* Work Progress */}
        {workSession && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Work Progress</span>
              <span className="text-sm text-muted-foreground">
                {progress.hours}h {progress.minutes}m / {workSession.targetHours || 8}h
              </span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.percentage.toFixed(1)}% complete</span>
              <span>{progress.remaining.toFixed(1)}h remaining</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!workSession && (
            <Button 
              onClick={handleStartWorkDayClick} 
              disabled={loading}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Work Day
            </Button>
          )}
          
          {isWorkDayActive && (
            <>
              <Button 
                onClick={pauseWorkDay} 
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button 
                onClick={endWorkDay} 
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                End Day
              </Button>
            </>
          )}
          
          {isWorkDayPaused && (
            <>
              <Button 
                onClick={resumeWorkDay} 
                disabled={loading}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button 
                onClick={endWorkDay} 
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                End Day
              </Button>
            </>
          )}
          
          {isWorkDayCompleted && (
            <Button 
              onClick={handleStartWorkDayClick} 
              disabled={loading}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Start New Day
            </Button>
          )}
        </div>

        {/* Work Session Info */}
        {workSession && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Started: {format(new Date(workSession.startTime), 'HH:mm')}</p>
            {workSession.endTime && (
              <p>Ended: {format(new Date(workSession.endTime), 'HH:mm')}</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Enhanced Start Day Dialog with Location Popup */}
      <EnhancedStartDayDialog
        isOpen={showStartDayDialog}
        onClose={() => setShowStartDayDialog(false)}
        onStartDay={onStartDaySuccess}
        user={currentEmployee}
      />
    </Card>
  );
}

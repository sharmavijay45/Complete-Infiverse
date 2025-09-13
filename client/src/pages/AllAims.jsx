"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Loader2, Calendar, Filter, RefreshCw, Clock, Bell, ChevronLeft, ChevronRight, MapPin, TrendingUp, CheckCircle, AlertCircle, Target, User } from "lucide-react"
import { useToast } from "../hooks/use-toast"
import { useAuth } from "../context/auth-context"
import { api, API_URL } from "../lib/api"
import { format, addDays, subDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import axios from "axios"

function AllAims() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [aims, setAims] = useState([])
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [automateAimReminders, setAutomateAimReminders] = useState(false)
  const [automateProgressReminders, setAutomateProgressReminders] = useState(false)
  const filterCardRef = useRef(null)

  const fetchData = useCallback(async () => {
    const scrollPosition = filterCardRef.current ? filterCardRef.current.getBoundingClientRect().top + window.scrollY : 0
    try {
      setIsLoading(true)

      // Fetch departments
      const departmentsResponse = await api.departments.getDepartments()
      console.log('AllAims - Departments response:', departmentsResponse)
      const departmentsData = departmentsResponse.success ? departmentsResponse.data : departmentsResponse
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [])

      // Fetch enhanced aims with progress data
      const filters = {}
      if (selectedDepartment && selectedDepartment !== "all") filters.department = selectedDepartment
      if (selectedDate) filters.date = selectedDate.toISOString()

      try {
        // Try enhanced API first
        const enhancedResponse = await axios.get(`${API_URL || 'http://localhost:5000/api'}/enhanced-aims/with-progress`, {
          params: filters,
          headers: {
            'x-auth-token': localStorage.getItem('WorkflowToken')
          }
        })
        console.log('AllAims - Enhanced aims response:', enhancedResponse.data)
        const enhancedAims = enhancedResponse.data.success ? enhancedResponse.data.data : enhancedResponse.data
        console.log('AllAims - Enhanced aims processed:', enhancedAims)
        
        // Log progress entries for each aim
        if (Array.isArray(enhancedAims)) {
          enhancedAims.forEach(aim => {
            console.log(`User ${aim.user?.name}: progressEntries=${aim.progressEntries?.length || 0}, isPending=${aim.isPending}`);
            if (aim.progressEntries && aim.progressEntries.length > 0) {
              console.log('Progress entries:', aim.progressEntries);
            }
          });
        }
        
        setAims(Array.isArray(enhancedAims) ? enhancedAims : [])
      } catch (enhancedError) {
        console.log('Enhanced API failed, using regular API:', enhancedError)
        // Fallback to regular API
        const aimsData = await api.aims.getAims(filters)
        console.log('AllAims - Regular aims data:', aimsData)
        setAims(Array.isArray(aimsData) ? aimsData : [])
      }

      setAutomateAimReminders(false)
      setAutomateProgressReminders(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load aims data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      if (filterCardRef.current) {
        window.scrollTo({ top: scrollPosition, behavior: "instant" })
      }
    }
  }, [selectedDate, selectedDepartment, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData()
  }

  const handleSendReminders = async () => {
    try {
      setIsSendingReminders(true)
      const result = await api.notifications.broadcastAimReminders()
      toast({
        title: "Success",
        description: `Sent ${result.emails.length} aim reminder emails to users`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error sending reminders:", error)
      toast({
        title: "Error",
        description: "Failed to send reminder emails",
        variant: "destructive",
      })
    } finally {
      setIsSendingReminders(false)
    }
  }

  const handleToggleAutomation = async (type, value) => {
    try {
      if (type === "aim") {
        setAutomateAimReminders(value)
      } else {
        setAutomateProgressReminders(value)
      }

      await api.notifications.toggleAutomation({
        automateAimReminders: type === "aim" ? value : automateAimReminders,
        automateProgressReminders: type === "progress" ? value : automateProgressReminders,
      })

      toast({
        title: "Success",
        description: `Automation for ${type} reminders ${value ? "enabled" : "disabled"}`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating automation settings:", error)
      toast({
        title: "Error",
        description: "Failed to update automation settings",
        variant: "destructive",
      })

      if (type === "aim") {
        setAutomateAimReminders(!value)
      } else {
        setAutomateProgressReminders(!value)
      }
    }
  }

  const handlePreviousDate = () => {
    setSelectedDate(subDays(selectedDate, 1))
  }

  const handleNextDate = () => {
    setSelectedDate(addDays(selectedDate, 1))
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return format(date, "h:mm a")
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'h:mm a');
  };

  const getLocationColor = (location) => {
    switch (location) {
      case 'WFH':
      case 'Home':
        return 'bg-blue-100 text-blue-800';
      case 'Remote':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status, isPending) => {
    if (isPending) {
      return 'bg-orange-100 text-orange-800';
    }
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'MVP Achieved':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status, isPending) => {
    if (isPending) {
      return <Clock className="h-3 w-3" />;
    }
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'MVP Achieved':
        return <Target className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status, isPending) => {
    if (isPending) {
      return 'Pending Progress';
    }
    return status;
  };

  const renderAimCard = (aim) => {
    const isPending = aim.isPending || (aim.progressPercentage === 0 && (!aim.progressEntries || aim.progressEntries.length === 0));
    
    return (
      <div key={aim._id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Header with user info and tags */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 flex items-center gap-1">
              <User className="h-4 w-4" />
              {aim.user?.name || "Unknown User"}
            </span>
            
            {/* Work Location Tag */}
            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
              getLocationColor(aim.workSessionInfo?.workLocationTag || aim.workLocation)
            }`}>
              <MapPin className="h-3 w-3" />
              {aim.workSessionInfo?.workLocationTag || aim.workLocation || 'Office'}
            </span>
            
            {/* Progress Percentage */}
            {aim.progressPercentage > 0 && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {aim.progressPercentage}%
              </span>
            )}
            
            {/* Completion Status with Pending Logic */}
            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
              getStatusColor(aim.completionStatus, isPending)
            }`}>
              {getStatusIcon(aim.completionStatus, isPending)}
              {getStatusText(aim.completionStatus, isPending)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Set at {formatTime(aim.createdAt)}</span>
          </div>
        </div>

        {/* Department info */}
        {aim.department && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Department:</span> {aim.department.name}
          </div>
        )}

        {/* Main aim content */}
        <div className="mb-3">
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
            {aim.aims}
          </p>
        </div>

        {/* Progress Information - Enhanced with actual progress entries */}
        {(aim.progressEntries && aim.progressEntries.length > 0) ? (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Daily Progress ({aim.progressEntries.length} updates)
            </h4>
            
            {aim.progressEntries.map((entry, index) => (
              <div key={entry._id} className="mb-3 p-2 bg-white rounded border-l-2 border-purple-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-purple-600">
                    {entry.task?.title || 'General Progress'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(entry.date)} - {entry.progressPercentage}%
                  </span>
                </div>
                
                {entry.notes && (
                  <div className="mb-1">
                    <span className="text-xs font-medium text-gray-600">Notes: </span>
                    <span className="text-xs text-gray-700">{entry.notes}</span>
                  </div>
                )}
                
                {entry.achievements && (
                  <div className="mb-1">
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Achievements: 
                    </span>
                    <span className="text-xs text-gray-700 ml-1">{entry.achievements}</span>
                  </div>
                )}
                
                {entry.blockers && (
                  <div>
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Blockers: 
                    </span>
                    <span className="text-xs text-gray-700 ml-1">{entry.blockers}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Show pending message if no progress
          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              No Progress Updates Yet
            </h4>
            <p className="text-xs text-orange-600">This user hasn't submitted any progress updates for today.</p>
          </div>
        )}

        {/* Work Session Info */}
        {aim.workSessionInfo && (aim.workSessionInfo.startDayTime || aim.workSessionInfo.totalHoursWorked > 0) && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Work Session
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {aim.workSessionInfo.startDayTime && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-blue-600">Start:</span>
                  <span className="text-gray-700">
                    {formatTime(aim.workSessionInfo.startDayTime)}
                  </span>
                </div>
              )}
              
              {aim.workSessionInfo.endDayTime && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-blue-600">End:</span>
                  <span className="text-gray-700">
                    {formatTime(aim.workSessionInfo.endDayTime)}
                  </span>
                </div>
              )}
              
              {aim.workSessionInfo.totalHoursWorked > 0 && (
                <div className="col-span-2 flex items-center gap-1">
                  <span className="font-medium text-blue-600">Hours Worked:</span>
                  <span className="text-gray-700 font-semibold">
                    {aim.workSessionInfo.totalHoursWorked}h
                  </span>
                  {aim.workSessionInfo.totalHoursWorked >= 8 && (
                    <span className="text-green-600 text-xs">✓ Full Day</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion Comment */}
        {aim.completionComment && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <h4 className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Completion Comment
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              {aim.completionComment}
            </p>
          </div>
        )}
      </div>
    );
  };

  const groupAimsByDepartment = () => {
    const grouped = {}

    aims.forEach((aim) => {
      const deptName = aim.department?.name || "No Department"
      if (!grouped[deptName]) {
        grouped[deptName] = []
      }
      grouped[deptName].push(aim)
    })

    return grouped
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading aims data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Aims</h1>
          <p className="text-muted-foreground">View and manage daily aims across all departments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button variant="outline" onClick={handleSendReminders} disabled={isSendingReminders}>
            {isSendingReminders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Send Aim Reminders
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>Configure automated reminders for aims and progress updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Daily Aim Reminders</h3>
                <p className="text-sm text-muted-foreground">Automatically send reminders at 10:00 AM daily</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="aim-automation"
                  checked={automateAimReminders}
                  onCheckedChange={(value) => handleToggleAutomation("aim", value)}
                />
                <Label htmlFor="aim-automation">{automateAimReminders ? "Enabled" : "Disabled"}</Label>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Progress Update Reminders</h3>
                <p className="text-sm text-muted-foreground">Automatically send reminders at 5:00 PM daily</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="progress-automation"
                  checked={automateProgressReminders}
                  onCheckedChange={(value) => handleToggleAutomation("progress", value)}
                />
                <Label htmlFor="progress-automation">{automateProgressReminders ? "Enabled" : "Disabled"}</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card ref={filterCardRef} >
        <CardHeader>
          <CardTitle>Filter Aims</CardTitle>
          <CardDescription>Filter aims by department and date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <Label htmlFor="department-filter" className="mb-2 block">
                Department
              </Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} className="bg-white border border-gray-300 rounded-md shadow-sm">
                   <SelectTrigger id="department-filter" >
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-1/3">
              <Label className="mb-2 block">Date</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousDate}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  {format(selectedDate, "MMMM d, yyyy")}
                </div>
                <Button variant="outline" size="icon" onClick={handleNextDate}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-full md:w-1/3 flex items-end">
              <Button className="w-full" onClick={handleRefresh}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="by-department">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="by-department">By Department</TabsTrigger>
          <TabsTrigger value="all-aims">All Aims</TabsTrigger>
        </TabsList>

        <TabsContent value="by-department" className="mt-6">
          {Object.keys(groupAimsByDepartment()).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No aims found</h3>
                <p className="text-muted-foreground mt-1">
                  No aims have been set for the selected date and department.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupAimsByDepartment()).map(([deptName, deptAims]) => (
                <Card key={deptName}>
                  <CardHeader>
                    <CardTitle>{deptName}</CardTitle>
                    <CardDescription>{deptAims.length} team members have set aims</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deptAims.map((aim) => renderAimCard(aim))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-aims" className="mt-6">
          {aims.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No aims found</h3>
                <p className="text-muted-foreground mt-1">
                  No aims have been set for the selected date and department.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Aims for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
                <CardDescription>{aims.length} team members have set aims</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aims.map((aim) => renderAimCard(aim))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AllAims

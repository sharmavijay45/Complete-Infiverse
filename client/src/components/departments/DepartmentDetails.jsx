import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Progress } from "../ui/progress";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Target, 
  TrendingUp,
  Calendar,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { api } from "../../lib/api";
import { format } from "date-fns";

export function DepartmentDetails({ department, onBack }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departmentData, setDepartmentData] = useState({
    users: [],
    tasks: [],
    aims: [],
    stats: {}
  });

  useEffect(() => {
    if (department) {
      fetchDepartmentDetails();
    }
  }, [department]);

  const fetchDepartmentDetails = async () => {
    try {
      setLoading(true);
      
      // Get department ID (handle both _id and id)
      const departmentId = department._id || department.id;
      if (!departmentId) {
        throw new Error("Department ID is missing");
      }

      console.log("Fetching details for department:", departmentId, department);
      
      // Fetch department users
      const usersResponse = await api.users.getUsers();
      const departmentUsers = usersResponse.filter(user => 
        user.department && (user.department._id === departmentId || user.department.id === departmentId)
      );

      // Fetch department tasks
      const tasksResponse = await api.departments.getDepartmentTasks(departmentId);
      
      // Fetch department aims - using the with-progress endpoint
      let aimsResponse = { success: true, data: [] };
      try {
        const aimsData = await api.aims.getAimsWithProgress({
          department: departmentId,
          date: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
        });
        aimsResponse = aimsData.success ? aimsData : { success: true, data: Array.isArray(aimsData) ? aimsData : [] };
      } catch (aimsError) {
        console.warn("Could not fetch aims for department:", aimsError);
        // Continue without aims data
        aimsResponse = { success: false, data: [] };
      }

      // Calculate department statistics
      const stats = calculateDepartmentStats(departmentUsers, tasksResponse, aimsResponse.data);

      setDepartmentData({
        users: departmentUsers,
        tasks: tasksResponse,
        aims: aimsResponse.data,
        stats
      });

    } catch (error) {
      console.error("Error fetching department details:", error);
      toast({
        title: "Error",
        description: "Failed to load department details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDepartmentStats = (users, tasks, aims) => {
    const totalUsers = users.length;
    const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
    const totalAims = Array.isArray(aims) ? aims.length : 0;
    
    // Task statistics
    const completedTasks = Array.isArray(tasks) ? tasks.filter(task => task.status === 'Completed').length : 0;
    const inProgressTasks = Array.isArray(tasks) ? tasks.filter(task => task.status === 'In Progress').length : 0;
    const pendingTasks = Array.isArray(tasks) ? tasks.filter(task => task.status === 'Pending').length : 0;
    
    // Aim statistics
    const completedAims = Array.isArray(aims) ? aims.filter(aim => aim.completionStatus === 'Completed').length : 0;
    const pendingAims = Array.isArray(aims) ? aims.filter(aim => aim.isPending).length : 0;
    const aimsWithProgress = Array.isArray(aims) ? aims.filter(aim => !aim.isPending).length : 0;
    
    // Attendance statistics (from aims data)
    const presentUsers = Array.isArray(aims) ? aims.filter(aim => 
      aim.workSessionInfo && aim.workSessionInfo.startDayTime
    ).length : 0;
    
    return {
      totalUsers,
      totalTasks,
      totalAims,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      completedAims,
      pendingAims,
      aimsWithProgress,
      presentUsers,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      aimCompletionRate: totalAims > 0 ? Math.round((completedAims / totalAims) * 100) : 0,
      attendanceRate: totalUsers > 0 ? Math.round((presentUsers / totalUsers) * 100) : 0
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-500";
      case "In Progress":
        return "bg-blue-500/10 text-blue-500";
      case "Pending":
        return "bg-amber-500/10 text-amber-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-500/10 text-red-500";
      case "Medium":
        return "bg-amber-500/10 text-amber-500";
      case "Low":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading department details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: department.color }}
              />
              {department.name}
            </h1>
            <p className="text-muted-foreground">
              {department.description || "Department overview and management"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchDepartmentDetails}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {departmentData.stats.presentUsers} present today ({departmentData.stats.attendanceRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {departmentData.stats.completedTasks} completed ({departmentData.stats.taskCompletionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Aims</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.stats.totalAims}</div>
            <p className="text-xs text-muted-foreground">
              {departmentData.stats.completedAims} completed ({departmentData.stats.aimCompletionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.stats.aimsWithProgress}</div>
            <p className="text-xs text-muted-foreground">
              Aims with progress updates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
          <TabsTrigger value="users">Team Members</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="aims">Daily Aims</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({departmentData.users.length})</CardTitle>
              <CardDescription>All members in this department</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentData.users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p>No team members found in this department.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentData.users.map((user) => {
                        const userAim = departmentData.aims.find(aim => aim.user && aim.user._id === user._id);
                        const isPresent = userAim && userAim.workSessionInfo && userAim.workSessionInfo.startDayTime;
                        
                        return (
                          <TableRow key={user._id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={isPresent ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {isPresent ? "Present" : "Absent"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Tasks ({departmentData.tasks.length})</CardTitle>
              <CardDescription>All tasks assigned to this department</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentData.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p>No tasks found for this department.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentData.tasks.map((task) => (
                        <TableRow key={task._id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.assignee?.name || "Unassigned"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={task.progress || 0} className="w-16 h-2" />
                              <span className="text-xs">{task.progress || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No date"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aims" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Aims ({departmentData.aims.length})</CardTitle>
              <CardDescription>Daily objectives set by team members</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentData.aims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p>No aims set for today in this department.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentData.aims.map((aim) => (
                    <div key={aim._id} className="border rounded-lg p-4 bg-white shadow-sm">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
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
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              {aim.progressPercentage}% Progress
                            </span>
                          )}
                          
                          {/* Status */}
                          <Badge className={aim.isPending ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                            {aim.isPending ? "Pending Progress" : aim.completionStatus}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Set at {format(new Date(aim.createdAt), "h:mm a")}</span>
                        </div>
                      </div>

                      {/* Aim Content */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                          {aim.aims}
                        </p>
                      </div>

                      {/* Progress Information */}
                      {aim.progressEntries && aim.progressEntries.length > 0 ? (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">
                            Progress Updates ({aim.progressEntries.length})
                          </h4>
                          {aim.progressEntries.slice(0, 2).map((entry, index) => (
                            <div key={entry._id} className="mb-2 text-xs">
                              {entry.notes && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Notes:</span> {entry.notes}
                                </div>
                              )}
                              {entry.achievements && (
                                <div className="text-green-700">
                                  <span className="font-medium">Achievements:</span> {entry.achievements}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-xs text-orange-600">No progress updates yet</p>
                        </div>
                      )}

                      {/* Work Session Info */}
                      {aim.workSessionInfo && aim.workSessionInfo.startDayTime && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-xs font-semibold text-blue-700 mb-1">Work Session</h4>
                          <div className="text-xs text-blue-600">
                            Started: {format(new Date(aim.workSessionInfo.startDayTime), "h:mm a")}
                            {aim.workSessionInfo.totalHoursWorked > 0 && (
                              <span className="ml-2">• {aim.workSessionInfo.totalHoursWorked}h worked</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
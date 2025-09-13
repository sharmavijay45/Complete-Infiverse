"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Progress } from "../ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { MoreHorizontal, Users, CheckSquare, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useToast } from "../../hooks/use-toast"
import { api } from "../../lib/api"
import { useSocketContext } from "../../context/socket-context"

export function DepartmentList({ onDepartmentSelect }) {
  const { toast } = useToast()
  const { events } = useSocketContext()
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [departmentTasks, setDepartmentTasks] = useState({})

  // Helper function to count active members
  const getActiveMemberCount = (members) => {
    if (!Array.isArray(members)) return 0;
    // Filter out null/undefined members (these are inactive users that didn't populate)
    return members.filter(member => member && member._id).length;
  }

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true)
        const response = await api.departments.getDepartments()
        console.log('DepartmentList - Departments response:', response)

        // Handle new API response format
        const data = response.success ? response.data : response
        setDepartments(Array.isArray(data) ? data : [])
        
        // Fetch tasks for each department
        const tasksPromises = data.map(async (dept) => {
          try {
            const departmentId = dept._id || dept.id;
            if (!departmentId) {
              console.warn('Department missing ID:', dept);
              return {
                departmentId: dept.name || 'unknown',
                tasks: { total: 0, completed: 0 }
              };
            }

            const tasks = await api.departments.getDepartmentTasks(departmentId)
            // Filter tasks that have active assignees (tasks with null assignees are filtered out by backend)
            const activeTasks = tasks.filter(task => task.assignee && task.assignee._id);
            const completed = activeTasks.filter(task => task.status === "Completed").length
            
            return {
              departmentId: departmentId,
              tasks: {
                total: activeTasks.length,
                completed: completed
              }
            }
          } catch (error) {
            console.error(`Error fetching tasks for department ${dept.name}:`, error)
            return {
              departmentId: dept._id || dept.id || dept.name,
              tasks: { total: 0, completed: 0 }
            }
          }
        })
        
        const tasksResults = await Promise.all(tasksPromises)
        const tasksMap = {}
        tasksResults.forEach(result => {
          tasksMap[result.departmentId] = result.tasks
        })
        
        setDepartmentTasks(tasksMap)
        setError(null)
      } catch (err) {
        setError(err.message || "Failed to load departments")
        toast({
          title: "Error",
          description: err.message || "Failed to load departments",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDepartments()
  }, [toast])

  // Listen for socket events to update departments
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1]
      
      if (latestEvent.type === 'department-created') {
        setDepartments(prev => [...prev, latestEvent.data])
        setDepartmentTasks(prev => ({
          ...prev,
          [latestEvent.data._id || latestEvent.data.id]: { total: 0, completed: 0 }
        }))
      } 
      else if (latestEvent.type === 'department-updated') {
        setDepartments(prev => prev.map(dept => 
          (dept._id || dept.id) === (latestEvent.data._id || latestEvent.data.id) ? latestEvent.data : dept
        ))
      }
      else if (latestEvent.type === 'department-deleted') {
        setDepartments(prev => prev.filter(dept => (dept._id || dept.id) !== (latestEvent.data._id || latestEvent.data.id)))
        setDepartmentTasks(prev => {
          const newMap = {...prev}
          delete newMap[latestEvent.data._id || latestEvent.data.id]
          return newMap
        })
      }
    }
  }, [events])

  const handleDeleteDepartment = async (deptId) => {
    if (confirm("Are you sure you want to delete this department?")) {
      try {
        setIsDeleting(true)
        await api.departments.deleteDepartment(deptId)
        setDepartments(departments.filter(dept => (dept._id || dept.id) !== deptId))
        toast({
          title: "Success",
          description: "Department deleted successfully"
        })
      } catch (error) {
        console.error("Error deleting department:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to delete department",
          variant: "destructive"
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>Manage and view all departments</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading departments...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>Manage and view all departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-red-500">
            <p>Error loading departments: {error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="grid">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="grid" className="mt-0">
        {departments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No departments found. Create a new department to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => {
              const departmentId = department._id || department.id;
              const tasks = departmentTasks[departmentId] || { total: 0, completed: 0 }
              const completionPercentage = tasks.total > 0 
                ? Math.round((tasks.completed / tasks.total) * 100) 
                : 0
              
              // Count only active members (backend filters inactive users to null)
              const activeMemberCount = getActiveMemberCount(department.members);
              
              return (
                <Card 
                  key={departmentId} 
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => onDepartmentSelect && onDepartmentSelect(department)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: department.color }} />
                          {department.name}
                        </CardTitle>
                        <CardDescription>{department.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onDepartmentSelect && onDepartmentSelect(department)}>
                            View Department
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit Department</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartment(departmentId);
                            }}
                            disabled={isDeleting}
                          >
                            Delete Department
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage 
                            src={department.lead?.avatar || "/placeholder.svg?height=40&width=40"} 
                            alt={department.lead?.name || "Lead"} 
                          />
                          <AvatarFallback>
                            {department.lead?.name ? department.lead.name.charAt(0) : "L"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {department.lead?.name || "No lead assigned"}
                            {department.lead && !department.lead.stillExist && (
                              <span className="text-xs text-red-500 ml-1">(Inactive)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">Department Lead</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activeMemberCount} Active Members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {tasks.completed}/{tasks.total} Tasks
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Task Completion</span>
                          <span>{completionPercentage}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="list" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>Manage and view all departments</CardDescription>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No departments found. Create a new department to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {departments.map((department) => {
                  const departmentId = department._id || department.id;
                  const tasks = departmentTasks[departmentId] || { total: 0, completed: 0 }
                  const completionPercentage = tasks.total > 0 
                    ? Math.round((tasks.completed / tasks.total) * 100) 
                    : 0
                  
                  // Count only active members (backend filters inactive users to null)
                  const activeMemberCount = getActiveMemberCount(department.members);
                    
                  return (
                    <div 
                      key={departmentId} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
                      onClick={() => onDepartmentSelect && onDepartmentSelect(department)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
                          style={{ backgroundColor: department.color }}
                        >
                          {department.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium">{department.name}</h3>
                          <p className="text-sm text-muted-foreground">{department.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activeMemberCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {tasks.completed}/{tasks.total}
                          </span>
                        </div>
                        <Badge>{completionPercentage}%</Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onDepartmentSelect && onDepartmentSelect(department)}>
                              View Department
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Department</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDepartment(departmentId);
                              }}
                              disabled={isDeleting}
                            >
                              Delete Department
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
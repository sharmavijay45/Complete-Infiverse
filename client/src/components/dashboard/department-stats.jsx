"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { Loader2 } from "lucide-react"
import { api } from "../../lib/api"
import { useToast } from "../../hooks/use-toast"

export function DepartmentStats({ onDepartmentSelect }) {
  const { toast } = useToast()
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDepartmentStats = async () => {
      try {
        setIsLoading(true)
        const data = await api.dashboard.getDepartmentStats()
        setDepartments(data)
      } catch (error) {
        console.error("Error fetching department stats:", error)
        toast({
          title: "Error",
          description: "Failed to load department statistics",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDepartmentStats()
  }, [toast])

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Department Progress</CardTitle>
          <CardDescription>Task completion by department</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (departments.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Department Progress</CardTitle>
          <CardDescription>Task completion by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No department data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Department Progress</CardTitle>
        <CardDescription>Task completion by department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departments.map((department) => (
            <div 
              key={department._id || department.id || department.name} 
              className="space-y-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200"
              onClick={() => onDepartmentSelect && onDepartmentSelect(department)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full`} 
                    style={{ backgroundColor: department.color }}
                  />
                  <span className="text-sm font-medium">{department.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {department.completed || 0}/{department.total || 0}
                </span>
              </div>
              <Progress 
                value={department.total > 0 ? (department.completed / department.total) * 100 : 0} 
                className="h-2" 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { useToast } from "../../hooks/use-toast"
import { api } from "../../lib/api"
import { format } from "date-fns"

export function UserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [actionType, setActionType] = useState("") // "exit" or "reactivate"
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("active")

  // Fetch all users including exited ones
  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search query and active tab
  useEffect(() => {
    let filtered = users

    // Filter by status based on active tab
    if (activeTab === "active") {
      filtered = filtered.filter(user => user.stillExist === 1)
    } else if (activeTab === "exited") {
      filtered = filtered.filter(user => user.stillExist === 0)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        user.department?.name?.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
  }, [users, searchQuery, activeTab])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const data = await api.admin.getAllUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user._id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select users to perform this action",
        variant: "destructive",
      })
      return
    }

    setActionType(action)
    setShowConfirmDialog(true)
  }

  const confirmBulkAction = async () => {
    try {
      setIsUpdating(true)
      const stillExist = actionType === "reactivate" ? 1 : 0

      // Update each selected user
      const promises = selectedUsers.map(userId =>
        api.admin.updateUserStatus(userId, stillExist)
      )

      await Promise.all(promises)

      // Update local state
      setUsers(prev => prev.map(user => 
        selectedUsers.includes(user._id) 
          ? { ...user, stillExist }
          : user
      ))

      setSelectedUsers([])
      setShowConfirmDialog(false)

      toast({
        title: "Success",
        description: `${selectedUsers.length} user(s) ${actionType === "reactivate" ? "reactivated" : "marked as exited"} successfully`,
      })
    } catch (error) {
      console.error("Error updating users:", error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSingleUserAction = async (userId, stillExist) => {
    try {
      await api.admin.updateUserStatus(userId, stillExist)
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, stillExist } : user
      ))

      toast({
        title: "Success",
        description: `User ${stillExist === 1 ? "reactivated" : "marked as exited"} successfully`,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (stillExist) => {
    if (stillExist === 1) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <UserCheck className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <UserX className="h-3 w-3 mr-1" />
          Exited
        </Badge>
      )
    }
  }

  const activeUsers = users.filter(user => user.stillExist === 1)
  const exitedUsers = users.filter(user => user.stillExist === 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user status and access</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading users...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user status and access. Mark employees as exited when they leave the company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name, email, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("exit")}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Mark as Exited ({selectedUsers.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("reactivate")}
                  className="text-green-600 hover:text-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reactivate ({selectedUsers.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exited Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{exitedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
              <TabsTrigger value="exited">Exited Users ({exitedUsers.length})</TabsTrigger>
              <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={(e) => handleUserSelect(user._id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.department?.name || "No Department"}</TableCell>
                      <TableCell>{getStatusBadge(user.stillExist)}</TableCell>
                      <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.stillExist === 1 ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleSingleUserAction(user._id, 0)}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Mark as Exited
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => handleSingleUserAction(user._id, 1)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType === "reactivate" ? "reactivate" : "mark as exited"} {selectedUsers.length} user(s)?
              {actionType === "exit" && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Exited users will no longer appear in most lists and won't be able to access the system.
                    They can be reactivated later if needed.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkAction}
              disabled={isUpdating}
              className={actionType === "reactivate" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : actionType === "reactivate" ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {actionType === "reactivate" ? "Reactivate Users" : "Mark as Exited"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
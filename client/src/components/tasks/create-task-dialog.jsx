import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import api, { API_URL } from "@/lib/api";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { isValid, parse } from "date-fns";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/context/auth-context";
import { getUserTasks } from "@/lib/user-api";

export function CreateTaskDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]); // ✅ Initialize as empty array
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedUserTasks, setSelectedUserTasks] = useState([]);
  const [loadingUserTasks, setLoadingUserTasks] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "",
    assignee: "",
    priority: "Medium",
    status: "Pending",
    dependencies: [],
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        description: "",
        department: "",
        assignee: "",
        priority: "Medium",
        status: "Pending",
        dependencies: [],
      });
      setDueDate("");
      setDocumentFile(null);
      setDateError("");
      setFilteredUsers([]);
      setAssigneeSearch("");
      setSelectedUserTasks([]);
      setLoadingUserTasks(false);

      const fetchData = async () => {
  try {
    // ✅ FIXED: Use authenticated API methods instead of direct axios calls
    const [departmentsResponse, usersResponse, tasksResponse] = await Promise.all([
      api.departments.getDepartments(),
      api.users.getUsers(), // Use authenticated API method
      api.tasks.getTasks(), // Use authenticated API method
    ]);

    console.log('Departments response:', departmentsResponse);
    console.log('Users response:', usersResponse);
    console.log('Tasks response:', tasksResponse);

    // ✅ Handle different response formats for departments
    let departmentsData = [];
    if (Array.isArray(departmentsResponse)) {
      departmentsData = departmentsResponse;
    } else if (departmentsResponse?.success && Array.isArray(departmentsResponse.data)) {
      departmentsData = departmentsResponse.data;
    } else if (departmentsResponse?.data && Array.isArray(departmentsResponse.data)) {
      departmentsData = departmentsResponse.data;
    }

    // ✅ Filter users by email starting with "blackhole" and ensure data is an array
    const filteredUsers = Array.isArray(usersResponse)
      ? usersResponse.filter((user) => user.email && user.email.toLowerCase().startsWith("blackhole"))
      : [];

    // ✅ Ensure all data is arrays
    setDepartments(departmentsData);
    setAllUsers(filteredUsers);
    setTasks(Array.isArray(tasksResponse) ? tasksResponse : []);

    console.log('Processed data:', {
      departments: departmentsData.length,
      users: filteredUsers.length,
      tasks: Array.isArray(tasksResponse) ? tasksResponse.length : 0
    });

  } catch (error) {
    console.error("Error fetching data:", error);
    toast.error("Failed to load required data");
    // ✅ Set empty arrays on error
    setDepartments([]);
    setAllUsers([]);
    setTasks([]);
  }
};

      fetchData();
    }
  }, [open]);

  const handleDepartmentChange = (departmentId) => {
    setFormData((prev) => ({ ...prev, department: departmentId, assignee: "" }));
    setAssigneeSearch("");
    
    // ✅ Filter users by department - show all active users (removed blackhole filtering)
    const usersInDepartment = allUsers.filter(
      (user) => user.department?._id === departmentId && user.stillExist === 1
    );
    setFilteredUsers(usersInDepartment);
    
    console.log('Users in department:', usersInDepartment);
  };

  const handleAssigneeSearch = (e) => {
  const searchValue = e.target.value;
  setAssigneeSearch(searchValue);
  
  // Filter users by department and email starting with "blackhole"
  const usersInDepartment = allUsers.filter(
    (user) =>
      user.department?._id === formData.department &&
      user.stillExist === 1 &&
      user.email.toLowerCase().startsWith("blackhole")
  );
  
  if (searchValue.trim() === "") {
    setFilteredUsers(usersInDepartment);
  } else {
    const filtered = usersInDepartment.filter((user) =>
      user.name.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredUsers(filtered);
  }
};
  const handleAssigneeSelect = async (user) => {
    setFormData((prev) => ({ ...prev, assignee: user._id }));
    setAssigneeSearch(user.name);
    setFilteredUsers([]); // Clear filtered users after selection

    // Fetch user's previous tasks
    await fetchUserTasks(user._id);
  };

  const fetchUserTasks = async (userId) => {
    setLoadingUserTasks(true);
    try {
      const tasks = await getUserTasks(userId);
      setSelectedUserTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      setSelectedUserTasks([]);
    } finally {
      setLoadingUserTasks(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDueDate(value);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      setDateError("Please enter a valid date in YYYY-MM-DD format");
      return;
    }

    const parsedDate = parse(value, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      setDateError("Invalid date");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      setDateError("Due date cannot be in the past");
      return;
    }

    setDateError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/html",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PDF, DOC, DOCX, TXT, and HTML files are allowed.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setDocumentFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.department || !formData.assignee) {
      toast.error("Please fill in all required fields (Title, Department, Assignee)");
      return;
    }

    if (dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate)) {
        toast.error("Please enter a valid due date in YYYY-MM-DD format");
        return;
      }

      const parsedDate = parse(dueDate, "yyyy-MM-dd", new Date());
      if (!isValid(parsedDate)) {
        toast.error("Invalid due date");
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        toast.error("Due date cannot be in the past");
        return;
      }
    }

    setIsLoading(true);

    try {
      // ✅ FIXED: Use authenticated API method for task creation
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("assignee", formData.assignee);
      formDataToSend.append("priority", formData.priority);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("dependencies", JSON.stringify(formData.dependencies));
      formDataToSend.append("user", user.id);
      formDataToSend.append("links", formData.links || "");

      if (dueDate) {
        formDataToSend.append("dueDate", dueDate);
      }
      if (documentFile) {
        formDataToSend.append("document", documentFile);
        formDataToSend.append("fileType", documentFile.type);
      }

      console.log("Creating task with data:", formData);

      // ✅ Use authenticated fetch API instead of axios
      const token = localStorage.getItem("WorkflowToken");
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          ...(token && { "x-auth-token": token }),
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create task: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Task created successfully:", result);

      toast.success("Task created successfully");
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error.message || "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="dialog-overlay">
      <DialogContent className="dialog-content sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Add a new task to your workflow management system</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              className="min-h-[100px]"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="links">Links</Label>
            <Input
              id="links"
              placeholder="Add relevant links (comma-separated)"
              value={formData.links}
              onChange={(e) => handleChange("links", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="department">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.department}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger id="department" className="bg-white border-gray-300">
                  <SelectValue placeholder={
                    Array.isArray(departments) && departments.length > 0 
                      ? "Select department" 
                      : "Loading departments..."
                  } />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 max-h-60 overflow-y-auto z-[70]">
                  {Array.isArray(departments) && departments.length > 0 && 
                    departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {Array.isArray(departments) && departments.length === 0 && (
                <p className="text-sm text-gray-500">Loading departments...</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignee-search">
                Assignee <span className="text-red-500">*</span>
              </Label>
              <Input
                id="assignee-search"
                placeholder="Search assignees..."
                value={assigneeSearch}
                onChange={handleAssigneeSearch}
                disabled={!formData.department}
              />
              {filteredUsers.length > 0 && formData.department && (
                <div className="bg-white border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center justify-between"
                      onClick={() => handleAssigneeSelect(user)}
                    >
                      <span>{user.name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Active
                      </span>
                    </div>
                    ))}
                </div>
              )}
              {formData.department && filteredUsers.length === 0 && assigneeSearch && !formData.assignee && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No active users found in this department
                </div>
              )}

              {/* User's Previous Tasks */}
              {formData.assignee && (
                <div className="mt-4 p-4 neo-card border-primary/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h4 className="font-semibold text-foreground">Previous Tasks for {assigneeSearch}</h4>
                  </div>

                  {loadingUserTasks ? (
                    <div className="text-center py-4">
                      <div className="animate-pulse-cyber text-muted-foreground text-sm">Loading tasks...</div>
                    </div>
                  ) : selectedUserTasks.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUserTasks.slice(0, 5).map((task) => (
                        <div key={task._id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg border border-border/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                task.status === 'Completed' ? 'bg-green-500/20 text-green-500' :
                                task.status === 'In Progress' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-yellow-500/20 text-yellow-500'
                              }`}>
                                {task.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                task.priority === 'High' ? 'bg-red-500/20 text-red-500' :
                                task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-green-500/20 text-green-500'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground ml-2">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                          </div>
                        </div>
                      ))}
                      {selectedUserTasks.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          +{selectedUserTasks.length - 5} more tasks
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No previous tasks found for this user
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleChange("priority", value)}
              >
                <SelectTrigger id="priority" className="bg-white border-gray-300">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 z-[70]">
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="text"
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChange={handleDateChange}
                className={cn(dateError && "border-red-500")}
              />
              {dateError && <p className="text-sm text-red-500">{dateError}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dependencies">Dependencies</Label>
            <Select
              value={formData.dependencies[0] || ""}
              onValueChange={(value) => handleChange("dependencies", value ? [value] : [])}
            >
              <SelectTrigger id="dependencies" className="bg-white border-gray-300">
                <SelectValue placeholder={
                  Array.isArray(tasks) && tasks.length > 0 
                    ? "Select dependent tasks" 
                    : "No tasks available"
                } />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 max-h-60 overflow-y-auto z-[70]">
                {Array.isArray(tasks) && tasks.length > 0 && 
                  tasks.map((task) => (
                    <SelectItem key={task._id} value={task._id}>
                      {task.title}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
            {Array.isArray(tasks) && tasks.length === 0 && (
              <p className="text-sm text-gray-500">No tasks available for dependencies</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="document">Document</Label>
            <Input
              id="document"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.html"
              onChange={handleFileChange}
            />
            {documentFile && (
              <p className="text-sm text-muted-foreground">Selected: {documentFile.name}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading || dateError}>
            {isLoading ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
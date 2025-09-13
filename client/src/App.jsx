import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { SidebarProvider } from "./components/ui/sidebar";
import { Toaster } from "./components/ui/toaster";
import { WorkspaceProvider } from "./context/workspace-context";
import { SocketProvider } from "./context/socket-context";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Dependencies from "./pages/Dependencies";
import Departments from "./pages/Departments";
import Optimization from "./pages/Optimization";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import TaskDetails from "./pages/TaskDetails";
import CompletedTasks from "./pages/CompletedTasks";
import Progress from "./pages/Progress";
import TodaysAim from "./pages/TodaysAim";
import AllAims from "./pages/AllAims";
import { DashboardProvider } from "./context/DashboardContext";
import Leaderboard from "./pages/Leaderboard";
import { EmployeeMonitoring } from "./pages/EmployeeMonitoring";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import SalaryManagement from "./pages/SalaryManagement";
import IndividualSalaryManagement from "./pages/IndividualSalaryManagement";
import AttendanceDataManagement from "./components/admin/AttendanceDataManagement";
import AdminAimsView from "./components/admin/AdminAimsView";
import UserManagement from "./pages/UserManagement";
import LeaveRequest from "./pages/LeaveRequest";
import axios from "axios";
import { API_URL } from "./lib/api";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePushNotifications } from "./hooks/usePushNotifications";

function App() {
  const user = JSON.parse(localStorage.getItem("WorkflowUser") || "{}");
  const isAdmin = user?.role === "Admin";

  const [recentReviews, setRecentReviews] = useState([]);
  const [hasNewReviews, setHasNewReviews] = useState(false);
  const { subscribe } = usePushNotifications()

  useEffect(() => {
    // Auto-subscribe to push notifications if user is logged in
    if (user?.id) {
      subscribe().catch(console.error)
    }
  }, [user?.id])

  const markReviewsAsSeen = () => {
    setRecentReviews([]);
    setHasNewReviews(false);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.id) {
        console.log("No user ID found in localStorage");
        setRecentReviews([]);
        setHasNewReviews(false);
        return;
      }

      const token = localStorage.getItem("WorkflowToken");
      if (!token) {
        console.log("No authentication token found");
        setRecentReviews([]);
        setHasNewReviews(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/users/${user.id}/submissions`, {
          headers: { "x-auth-token": token },
        });
        console.log("Submissions API response:", response.data);
        const submissions = Array.isArray(response.data) ? response.data : [];
        const recentlyReviewed = submissions.filter((submission) => {
          if (submission.status !== "Pending") {
            const reviewDate = new Date(submission.updatedAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return reviewDate > sevenDaysAgo;
          }
          return false;
        });
        setRecentReviews(recentlyReviewed);
        setHasNewReviews(recentlyReviewed.length > 0);
      } catch (error) {
        // Handle different types of errors gracefully
        if (error.response?.status === 404) {
          console.log("User submissions not found - this is normal for new users");
        } else if (error.response?.status === 403) {
          console.log("Not authorized to access submissions");
        } else if (error.response?.status === 401) {
          console.log("Authentication failed - token may be expired");
          // Clear invalid token
          localStorage.removeItem("WorkflowToken");
          localStorage.removeItem("WorkflowUser");
        } else {
          console.log("Error fetching recent reviews:", error.message);
        }
        setRecentReviews([]);
        setHasNewReviews(false);
      }
    };

    // Only fetch reviews if user is logged in
    if (user?.id && localStorage.getItem("WorkflowToken")) {
      fetchReviews();
      const intervalId = setInterval(fetchReviews, 5 * 60 * 1000); // Poll every 5 minutes
      return () => clearInterval(intervalId);
    }
  }, [user?.id]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="workflow-theme">
      <Router>
        <AuthProvider>
          <WorkspaceProvider>
            <SocketProvider>
              <SidebarProvider>
                <DashboardProvider
                  recentReviews={recentReviews}
                  hasNewReviews={hasNewReviews}
                  markReviewsAsSeen={markReviewsAsSeen}
                >
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route
                      path="/"
                      element={
                        isAdmin ? (
                          <Navigate to="/dashboard" replace />
                        ) : (
                          <ProtectedRoute>
                            <Navigate to="/userdashboard" replace />
                          </ProtectedRoute>
                        )
                      }
                    />

                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route
                        path="/all-aims"
                        element={
                          <ProtectedRoute>
                            <AllAims />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/aims"
                        element={
                          <ProtectedRoute>
                            <TodaysAim />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/progress"
                        element={
                          <ProtectedRoute>
                            <Progress />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admindashboard"
                        element={
                          <ProtectedRoute>
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/userdashboard"
                        element={
                          <ProtectedRoute>
                            <UserDashboard />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/tasks"
                        element={
                          <ProtectedRoute>
                            <Tasks />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/:id"
                        element={
                          <ProtectedRoute>
                            <TaskDetails />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dependencies"
                        element={
                          <ProtectedRoute>
                            <Dependencies />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/departments"
                        element={
                          <ProtectedRoute>
                            <Departments />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/optimization"
                        element={
                          <ProtectedRoute>
                            <Optimization />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={<Settings />}
                      />
                      <Route
                        path="/completedtask"
                        element={
                          <ProtectedRoute>
                            <CompletedTasks />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/leaderboard"
                        element={
                          <ProtectedRoute>
                            <Leaderboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/monitoring"
                        element={
                          <ProtectedRoute>
                            <EmployeeMonitoring />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin-aims"
                        element={
                          <ProtectedRoute>
                            <AdminAimsView />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/user-management"
                        element={
                          <ProtectedRoute>
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Routes>
                  <Toaster />
                </DashboardProvider>
              </SidebarProvider>
            </SocketProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
}

export default App;
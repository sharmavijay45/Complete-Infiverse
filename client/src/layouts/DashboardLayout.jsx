"use client"

import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { DashboardSidebar } from "../components/dashboard/sidebar"
import { DashboardHeader } from "../components/dashboard/header"
import EnhancedStartDayDialog from "../components/attendance/EnhancedStartDayDialog"
import { useAuth } from "../context/auth-context"
import api from "../lib/api"

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const [showStartDayDialog, setShowStartDayDialog] = useState(false)
  const [checkedPrompt, setCheckedPrompt] = useState(false)

  useEffect(() => {
    // Only check once after login
    if (!user || checkedPrompt) return

    const dateKey = new Date().toISOString().slice(0, 10)
    const storageKey = `startDayPromptShown:${user.id}:${dateKey}`

    // If user already started day previously or we've shown the prompt manually today, skip
    if (localStorage.getItem(storageKey)) {
      setCheckedPrompt(true)
      return
    }

    // Use verify endpoint to determine if the user can start day
    api
      .get(`/attendance/verify/${user.id}`)
      .then((res) => {
        const data = res?.data || res // handle both {success,data} and direct data
        if (data && data.canStartDay) {
          setShowStartDayDialog(true)
        }
      })
      .catch(() => {
        // On failure, do nothing; user can still start from Start Day page
      })
      .finally(() => {
        setCheckedPrompt(true)
      })
  }, [user, checkedPrompt])

  const handleStartDaySuccess = () => {
    if (!user) return
    const dateKey = new Date().toISOString().slice(0, 10)
    const storageKey = `startDayPromptShown:${user.id}:${dateKey}`
    localStorage.setItem(storageKey, "1")
    setShowStartDayDialog(false)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    // Add a class to the body to prevent scrolling when sidebar is open
    if (!sidebarOpen) {
      document.body.classList.add('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-open')
    }
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Cyber Background Elements */}
      <div className="fixed inset-0 bg-cyber-grid opacity-20 pointer-events-none"></div>
      <div className="fixed inset-0 gradient-cyber opacity-5 pointer-events-none"></div>

      {/* Enhanced Cyber Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-lg transition-cyber animate-fade-in"
          onClick={() => toggleSidebar()}
        />
      )}

      {/* Fixed Sidebar for Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-80">
          <DashboardSidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-cyber md:hidden ${
          sidebarOpen ? 'translate-x-0 glow-primary' : '-translate-x-full'
        }`}
      >
        <DashboardSidebar />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 z-40">
          <DashboardHeader sidebarOpen={sidebarOpen} onSidebarToggle={toggleSidebar} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full p-4 md:p-6 lg:p-8">
            <div className="max-w-full mx-auto animate-fade-in">
              <Outlet />
              <EnhancedStartDayDialog
                isOpen={showStartDayDialog}
                onClose={() => setShowStartDayDialog(false)}
                onSuccess={handleStartDaySuccess}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
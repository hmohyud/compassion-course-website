import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ContentProvider } from './context/ContentContext'
import ProtectedRoute from './components/ProtectedRoute'
import UserProtectedRoute from './components/UserProtectedRoute'

// Public Pages
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProgramsPage from './pages/ProgramsPage'
import ContactPage from './pages/ContactPage'
import CompassCompanionPage from './pages/CompassCompanionPage'

// User Pages
import UserLoginPage from './pages/UserLoginPage'
import UserRegisterPage from './pages/UserRegisterPage'
import PortalPage from './pages/PortalPage'
import CirclePage from './pages/CirclePage'

// Platform Pages
import PlatformDashboard from './pages/platform/PlatformDashboard'
import UserProfilePage from './pages/platform/UserProfilePage'
import WebcastsPage from './pages/platform/WebcastsPage'
import WebcastJoinPage from './pages/platform/WebcastJoinPage'
import WhiteboardsPage from './pages/platform/WhiteboardsPage'
import WhiteboardPage from './pages/platform/WhiteboardPage'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import WebcastManagement from './pages/admin/WebcastManagement'
import AdminManagement from './pages/admin/AdminManagement'
import ContentManagement from './pages/admin/ContentManagement'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/compass-companion" element={<CompassCompanionPage />} />
              
              {/* User Routes */}
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/register" element={<UserRegisterPage />} />
              <Route path="/portal" element={
                <UserProtectedRoute>
                  <PortalPage />
                </UserProtectedRoute>
              } />
              <Route path="/portal/circle" element={
                <UserProtectedRoute>
                  <CirclePage />
                </UserProtectedRoute>
              } />
              
              {/* Platform Routes */}
              <Route path="/platform" element={
                <UserProtectedRoute>
                  <PlatformDashboard />
                </UserProtectedRoute>
              } />
              <Route path="/platform/profile" element={
                <UserProtectedRoute>
                  <UserProfilePage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/webcasts" element={
                <UserProtectedRoute>
                  <WebcastsPage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/webcasts/:id/join" element={
                <UserProtectedRoute>
                  <WebcastJoinPage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/whiteboards" element={
                <UserProtectedRoute>
                  <WhiteboardsPage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/whiteboards/:id" element={
                <UserProtectedRoute>
                  <WhiteboardPage />
                </UserProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/login-4f73b2c" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/webcasts" element={
                <ProtectedRoute>
                  <WebcastManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/manage" element={
                <ProtectedRoute>
                  <AdminManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/content" element={
                <ProtectedRoute>
                  <ContentManagement />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </ContentProvider>
    </AuthProvider>
  )
}

export default App

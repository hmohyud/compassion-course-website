import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthModalProvider } from './context/AuthModalContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { ContentProvider } from './context/ContentContext'
import ProtectedRoute from './components/ProtectedRoute'
import UserProtectedRoute from './components/UserProtectedRoute'
import LeadershipProtectedRoute from './components/LeadershipProtectedRoute'

// Public Pages
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProgramsPage from './pages/ProgramsPage'
import ContactPage from './pages/ContactPage'
import CompassCompanionPage from './pages/CompassCompanionPage'

// User Pages
import UserLoginPage from './pages/UserLoginPage'
import UserRegisterPage from './pages/UserRegisterPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import PortalPage from './pages/PortalPage'
import CirclePage from './pages/CirclePage'
import BacklogPage from './pages/BacklogPage'
import CompassionCourseUniversityPage from './pages/CompassionCourseUniversityPage'
import LibraryPage from './pages/LibraryPage'
import LeadershipPortalPage from './pages/LeadershipPortalPage'
import LeadershipDashboardPage from './pages/leadership/LeadershipDashboardPage'
import TeamBoardsListPage from './pages/leadership/TeamBoardsListPage'
import CreateTeamPage from './pages/leadership/CreateTeamPage'
import LeadershipMainBacklogPage from './pages/leadership/LeadershipMainBacklogPage'
import LeadershipTeamPage from './pages/leadership/LeadershipTeamPage'
import TeamBoardPage from './pages/leadership/TeamBoardPage'
import TeamBoardSettingsPage from './pages/leadership/TeamBoardSettingsPage'
import TeamWhiteboardsListPage from './pages/leadership/TeamWhiteboardsListPage'
import TeamWhiteboardPage from './pages/leadership/TeamWhiteboardPage'

// Platform Pages
import UserProfilePage from './pages/platform/UserProfilePage'
import WebcastsPage from './pages/platform/WebcastsPage'
import WebcastJoinPage from './pages/platform/WebcastJoinPage'
import WhiteboardsPage from './pages/platform/WhiteboardsPage'
import WhiteboardPage from './pages/platform/WhiteboardPage'
import EventsPage from './pages/platform/EventsPage'
import CoursesPage from './pages/platform/CoursesPage'
import MemberHubPage from './pages/platform/MemberHubPage'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import WebcastManagement from './pages/admin/WebcastManagement'
import ContentManagement from './pages/admin/ContentManagement'
import UserManagement from './pages/admin/UserManagement'
import RolePermissionsPage from './pages/admin/RolePermissionsPage'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ContentProvider>
          <Router>
          <AuthModalProvider>
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
              <Route path="/change-password" element={
                <UserProtectedRoute skipMustChangePasswordCheck>
                  <ChangePasswordPage />
                </UserProtectedRoute>
              } />
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
              <Route path="/portal/university" element={
                <UserProtectedRoute>
                  <CompassionCourseUniversityPage />
                </UserProtectedRoute>
              } />
              <Route path="/portal/backlog" element={
                <UserProtectedRoute>
                  <BacklogPage />
                </UserProtectedRoute>
              } />
              <Route path="/portal/library" element={
                <UserProtectedRoute>
                  <LibraryPage />
                </UserProtectedRoute>
              } />
              <Route path="/portal/leadership" element={
                <LeadershipProtectedRoute>
                  <LeadershipPortalPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/dashboard" element={
                <LeadershipProtectedRoute>
                  <LeadershipDashboardPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/backlog" element={
                <LeadershipProtectedRoute>
                  <LeadershipMainBacklogPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/new" element={
                <LeadershipProtectedRoute>
                  <CreateTeamPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/:teamId/board/settings" element={
                <LeadershipProtectedRoute>
                  <TeamBoardSettingsPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/:teamId/board" element={
                <LeadershipProtectedRoute>
                  <TeamBoardPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/:teamId/whiteboards/:whiteboardId" element={
                <LeadershipProtectedRoute>
                  <TeamWhiteboardPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/:teamId/whiteboards" element={
                <LeadershipProtectedRoute>
                  <TeamWhiteboardsListPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams/:teamId" element={
                <LeadershipProtectedRoute>
                  <LeadershipTeamPage />
                </LeadershipProtectedRoute>
              } />
              <Route path="/portal/leadership/teams" element={
                <LeadershipProtectedRoute>
                  <TeamBoardsListPage />
                </LeadershipProtectedRoute>
              } />
              
              {/* Platform Routes */}
              <Route path="/platform" element={<Navigate to="/portal/university" replace />} />
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
              <Route path="/platform/events" element={
                <UserProtectedRoute>
                  <EventsPage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/courses" element={
                <UserProtectedRoute>
                  <CoursesPage />
                </UserProtectedRoute>
              } />
              <Route path="/platform/resources" element={
                <UserProtectedRoute>
                  <MemberHubPage />
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
              <Route path="/admin/manage" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/content" element={
                <ProtectedRoute>
                  <ContentManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/role-config" element={
                <ProtectedRoute>
                  <RolePermissionsPage />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
          </AuthModalProvider>
        </Router>
      </ContentProvider>
      </PermissionsProvider>
    </AuthProvider>
  )
}

export default App

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthModalProvider } from './context/AuthModalContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { ContentProvider } from './context/ContentContext'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import UserProtectedRoute from './components/UserProtectedRoute'
import LeadershipProtectedRoute from './components/LeadershipProtectedRoute'

// Public Pages
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProgramsPage from './pages/ProgramsPage'
import ContactPage from './pages/ContactPage'
import CompassCompanionPage from './pages/CompassCompanionPage'
import LearnMorePage from './pages/LearnMorePage'
import VolunteerPage from './pages/VolunteerPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

// User Pages
import UserLoginPage from './pages/UserLoginPage'
import UserRegisterPage from './pages/UserRegisterPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import PortalPage from './pages/PortalPage'
import CirclePage from './pages/CirclePage'
import BacklogPage from './pages/BacklogPage'
import CompassionCourseUniversityPage from './pages/CompassionCourseUniversityPage'
import LibraryPage from './pages/LibraryPage'
import LeadershipDashboardPage from './pages/LeadershipDashboardPage'
import WorkItemDetailPage from './pages/leadership/WorkItemDetailPage'
// Platform Pages
import UserProfilePage from './pages/platform/UserProfilePage'
import WebcastsPage from './pages/platform/WebcastsPage'
import WebcastJoinPage from './pages/platform/WebcastJoinPage'
import WhiteboardsListPage from './pages/WhiteboardsListPage'
import WhiteboardEditorPage from './pages/WhiteboardEditorPage'
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
          <ScrollToTop />
          <AuthModalProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/compass-companion" element={<CompassCompanionPage />} />
              <Route path="/learn-more" element={<LearnMorePage />} />
              <Route path="/volunteer" element={<VolunteerPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
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
                  <LeadershipDashboardPage />
                </LeadershipProtectedRoute>
              } />
              {/* Keep direct link to work item detail page */}
              <Route path="/portal/leadership/tasks/:workItemId" element={
                <LeadershipProtectedRoute>
                  <WorkItemDetailPage />
                </LeadershipProtectedRoute>
              } />
              {/* Redirect old sub-routes to the consolidated dashboard */}
              <Route path="/portal/leadership/dashboard" element={<Navigate to="/portal/leadership" replace />} />
              <Route path="/portal/leadership/backlog" element={<Navigate to="/portal/leadership?tab=backlog" replace />} />
              <Route path="/portal/leadership/teams/new" element={<Navigate to="/portal/leadership" replace />} />
              <Route path="/portal/leadership/teams/:teamId/board/settings" element={<Navigate to="/portal/leadership" replace />} />
              <Route path="/portal/leadership/teams/:teamId/board" element={<Navigate to="/portal/leadership" replace />} />
              <Route path="/portal/leadership/teams/:teamId" element={<Navigate to="/portal/leadership" replace />} />
              <Route path="/portal/leadership/teams" element={<Navigate to="/portal/leadership" replace />} />
              
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
              <Route path="/whiteboards" element={
                <UserProtectedRoute>
                  <WhiteboardsListPage />
                </UserProtectedRoute>
              } />
              <Route path="/whiteboards/:boardId" element={
                <UserProtectedRoute>
                  <WhiteboardEditorPage />
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

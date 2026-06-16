import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthModalProvider } from './context/AuthModalContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { ContentProvider } from './context/ContentContext'
import ScrollToTop from './components/ScrollToTop'
import RouteMeta from './components/RouteMeta'
import UserProtectedRoute from './components/UserProtectedRoute'
import LeadershipProtectedRoute from './components/LeadershipProtectedRoute'
import ProtectedRoute from './components/ProtectedRoute'

// Public Pages
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProgramsPage from './pages/ProgramsPage'
import ContactPage from './pages/ContactPage'
import CompassCompanionPage from './pages/CompassCompanionPage'
import LearnMorePage from './pages/LearnMorePage'
import UnauthorizedPage from './pages/UnauthorizedPage'

// User Pages
import UserLoginPage from './pages/UserLoginPage'
import UserRegisterPage from './pages/UserRegisterPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
// PortalPage removed — /portal now redirects to /portal/leadership
import CirclePage from './pages/CirclePage'
import CommunityPage from './pages/CommunityPage'
import CommunityComingSoonPage from './pages/CommunityComingSoonPage'
import BacklogPage from './pages/BacklogPage'
import CompassionCourseUniversityPage from './pages/CompassionCourseUniversityPage'
import LibraryPage from './pages/LibraryPage'
import LeadershipDashboardPage from './pages/LeadershipDashboardPage'
import WorkItemDetailPage from './pages/leadership/WorkItemDetailPage'
// Platform Pages
import UserProfilePage from './pages/platform/UserProfilePage'
import WebcastsPage from './pages/platform/WebcastsPage'
import WebcastJoinPage from './pages/platform/WebcastJoinPage'
import EventsPage from './pages/platform/EventsPage'
import CoursesPage from './pages/platform/CoursesPage'
import MemberHubPage from './pages/platform/MemberHubPage'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'

// Weekly content (admin-only, Firebase-gated)
import WeeklyListPage from './pages/weekly/WeeklyListPage'
import WeeklyViewerPage from './pages/weekly/WeeklyViewerPage'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ContentProvider>
          <Router>
          <ScrollToTop />
          <RouteMeta />
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
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* User Routes */}
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/register" element={<UserRegisterPage />} />
              <Route path="/change-password" element={
                <UserProtectedRoute skipMustChangePasswordCheck>
                  <ChangePasswordPage />
                </UserProtectedRoute>
              } />
              <Route path="/community" element={<CommunityComingSoonPage />} />
              <Route path="/portal/community" element={<CommunityPage />} />
              <Route path="/portal" element={<Navigate to="/portal/leadership" replace />} />
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
              
              {/* Weekly content (admin-only, Firebase-gated). Clean URLs:
                  /weekly → list of all weeks
                  /weekly/:weekNum → single week viewer
                  /admin-portal/weekly → admin CRUD for weekly content */}
              {/* Member Portal — gates itself via email + roster lookup,
                  not via ProtectedRoute (which would punt non-admin
                  members to the admin login page instead of the email
                  gate). */}
              <Route path="/weekly" element={<WeeklyListPage />} />
              <Route path="/weekly/:weekNum" element={<WeeklyViewerPage />} />
              {/* /admin-portal/weekly was a standalone copy of the same view
                  that lives at /portal/leadership?tab=adminPortal&adminTab=weekly.
                  Redirect so we have one source of truth for content management. */}
              <Route path="/admin-portal/weekly" element={
                <Navigate to="/portal/leadership?tab=adminPortal&adminTab=weekly" replace />
              } />
              {/* Old standalone route — keep as redirect for any saved bookmarks. */}
              <Route path="/admin-portal/members" element={
                <Navigate to="/portal/leadership?tab=adminPortal&adminTab=members" replace />
              } />

              {/* Admin Routes — login pages still needed, everything else redirects to dashboard */}
              <Route path="/admin/login-4f73b2c" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<Navigate to="/portal/leadership?tab=adminPortal" replace />} />
              <Route path="/admin/users" element={<Navigate to="/portal/leadership?tab=adminPortal&adminTab=users" replace />} />
              <Route path="/admin/manage" element={<Navigate to="/portal/leadership?tab=adminPortal&adminTab=users" replace />} />
              <Route path="/admin/content" element={<Navigate to="/portal/leadership?tab=adminPortal&adminTab=content" replace />} />
              <Route path="/admin/webcasts" element={<Navigate to="/portal/leadership?tab=adminPortal" replace />} />
              <Route path="/admin/role-config" element={<Navigate to="/portal/leadership?tab=adminPortal&adminTab=roles" replace />} />
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

import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { RouteRecord } from 'vite-react-ssg'
import { AuthProvider } from './context/AuthContext'
import { AuthModalProvider } from './context/AuthModalContext'
import { PermissionsProvider } from './context/PermissionsContext'
import { ContentProvider } from './context/ContentContext'
import ScrollToTop from './components/ScrollToTop'
import UserProtectedRoute from './components/UserProtectedRoute'
import LeadershipProtectedRoute from './components/LeadershipProtectedRoute'

// Public Pages
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
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

// Compass Companions is an external product (compass-companions.com), not a
// page we host. The old internal /compass-companion landing page was retired;
// anyone hitting that old URL is bounced to the external site.
const COMPASS_COMPANIONS_URL = 'https://www.compass-companions.com/'
function CompassCompanionsRedirect() {
  useEffect(() => {
    window.location.replace(COMPASS_COMPANIONS_URL)
  }, [])
  return null
}

/**
 * RootLayout — wraps every route with the app's context providers and the
 * shared chrome (ScrollToTop + AuthModalProvider). vite-react-ssg supplies the
 * router, so there is no <BrowserRouter> here; <Outlet /> renders the matched
 * child route.
 *
 * Per-route <head> (title/description/canonical/OG) is handled by the <Seo />
 * component inside each public page via vite-react-ssg's <Head>, which both
 * bakes the head at prerender time and updates it on client navigation — so the
 * old client-only RouteMeta component is no longer mounted here.
 */
function RootLayout() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ContentProvider>
          <ScrollToTop />
          <AuthModalProvider>
            <div className="App">
              <Outlet />
            </div>
          </AuthModalProvider>
        </ContentProvider>
      </PermissionsProvider>
    </AuthProvider>
  )
}

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public Routes
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'programs', element: <Navigate to="/" replace /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'compass-companion', element: <CompassCompanionsRedirect /> },
      { path: 'learn-more', element: <LearnMorePage /> },
      { path: 'unauthorized', element: <UnauthorizedPage /> },

      // User Routes
      { path: 'login', element: <UserLoginPage /> },
      { path: 'register', element: <UserRegisterPage /> },
      {
        path: 'change-password',
        element: (
          <UserProtectedRoute skipMustChangePasswordCheck>
            <ChangePasswordPage />
          </UserProtectedRoute>
        ),
      },
      { path: 'community', element: <CommunityComingSoonPage /> },
      { path: 'portal/community', element: <CommunityPage /> },
      { path: 'portal', element: <Navigate to="/portal/leadership" replace /> },
      {
        path: 'portal/circle',
        element: (
          <UserProtectedRoute>
            <CirclePage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'portal/university',
        element: (
          <UserProtectedRoute>
            <CompassionCourseUniversityPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'portal/backlog',
        element: (
          <UserProtectedRoute>
            <BacklogPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'portal/library',
        element: (
          <UserProtectedRoute>
            <LibraryPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'portal/leadership',
        element: (
          <LeadershipProtectedRoute>
            <LeadershipDashboardPage />
          </LeadershipProtectedRoute>
        ),
      },
      // Keep direct link to work item detail page
      {
        path: 'portal/leadership/tasks/:workItemId',
        element: (
          <LeadershipProtectedRoute>
            <WorkItemDetailPage />
          </LeadershipProtectedRoute>
        ),
      },
      // Redirect old sub-routes to the consolidated dashboard
      { path: 'portal/leadership/dashboard', element: <Navigate to="/portal/leadership" replace /> },
      { path: 'portal/leadership/backlog', element: <Navigate to="/portal/leadership?tab=backlog" replace /> },
      { path: 'portal/leadership/teams/new', element: <Navigate to="/portal/leadership" replace /> },
      { path: 'portal/leadership/teams/:teamId/board/settings', element: <Navigate to="/portal/leadership" replace /> },
      { path: 'portal/leadership/teams/:teamId/board', element: <Navigate to="/portal/leadership" replace /> },
      { path: 'portal/leadership/teams/:teamId', element: <Navigate to="/portal/leadership" replace /> },
      { path: 'portal/leadership/teams', element: <Navigate to="/portal/leadership" replace /> },

      // Platform Routes
      { path: 'platform', element: <Navigate to="/portal/university" replace /> },
      {
        path: 'platform/profile',
        element: (
          <UserProtectedRoute>
            <UserProfilePage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'platform/webcasts',
        element: (
          <UserProtectedRoute>
            <WebcastsPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'platform/webcasts/:id/join',
        element: (
          <UserProtectedRoute>
            <WebcastJoinPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'platform/events',
        element: (
          <UserProtectedRoute>
            <EventsPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'platform/courses',
        element: (
          <UserProtectedRoute>
            <CoursesPage />
          </UserProtectedRoute>
        ),
      },
      {
        path: 'platform/resources',
        element: (
          <UserProtectedRoute>
            <MemberHubPage />
          </UserProtectedRoute>
        ),
      },

      // Weekly content (admin-only, Firebase-gated). Clean URLs:
      //   /weekly → list of all weeks
      //   /weekly/:weekNum → single week viewer
      //   /admin-portal/weekly → admin CRUD for weekly content
      // Member Portal — gates itself via email + roster lookup, not via
      // ProtectedRoute (which would punt non-admin members to the admin login
      // page instead of the email gate).
      { path: 'weekly', element: <WeeklyListPage /> },
      { path: 'weekly/:weekNum', element: <WeeklyViewerPage /> },
      // /admin-portal/weekly was a standalone copy of the same view that lives
      // at /portal/leadership?tab=adminPortal&adminTab=weekly. Redirect so we
      // have one source of truth for content management.
      {
        path: 'admin-portal/weekly',
        element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=weekly" replace />,
      },
      // Old standalone route — keep as redirect for any saved bookmarks.
      {
        path: 'admin-portal/members',
        element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=members" replace />,
      },

      // Admin Routes — login pages still needed, everything else redirects to dashboard
      { path: 'admin/login-4f73b2c', element: <LoginPage /> },
      { path: 'admin/login', element: <LoginPage /> },
      { path: 'admin', element: <Navigate to="/portal/leadership?tab=adminPortal" replace /> },
      { path: 'admin/users', element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=users" replace /> },
      { path: 'admin/manage', element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=users" replace /> },
      { path: 'admin/content', element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=content" replace /> },
      { path: 'admin/webcasts', element: <Navigate to="/portal/leadership?tab=adminPortal" replace /> },
      { path: 'admin/role-config', element: <Navigate to="/portal/leadership?tab=adminPortal&adminTab=roles" replace /> },
    ],
  },
]

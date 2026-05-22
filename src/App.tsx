/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import { PageSkeleton } from './components/ui/Skeleton';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { useWebVitals, trackPageView } from './lib/analytics';
import ScreenProtector from './components/ScreenProtector';
import { useKeyboardShortcuts, ShortcutsModal } from './lib/keyboardShortcuts.tsx';
import InstallAppBanner from './components/InstallAppBanner';
import NotificationManager from './components/NotificationManager';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const EventDetails = React.lazy(() => import('./pages/EventDetails'));
const Persons = React.lazy(() => import('./pages/Persons'));
const Stats = React.lazy(() => import('./pages/Stats'));
const PublicInvite = React.lazy(() => import('./pages/PublicInvite'));
const RegisterRequest = React.lazy(() => import('./pages/RegisterRequest'));
const Register = React.lazy(() => import('./pages/Register'));
const RegistrationRequests = React.lazy(() => import('./pages/RegistrationRequests'));
const BroadcastNotification = React.lazy(() => import('./pages/BroadcastNotification'));
const Pinnwand = React.lazy(() => import('./pages/Pinnwand'));
const MemberProfile = React.lazy(() => import('./pages/MemberProfile'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const AdminSettings = React.lazy(() => import('./pages/AdminSettings'));

function Analytics() {
  const location = useLocation();
  
  useWebVitals();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  
  return null;
}

function KeyboardShortcutsHandler() {
  useKeyboardShortcuts();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <KeyboardShortcutsHandler />
      <NotificationManager />
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 4000,
          style: {
            background: '#0e0e0e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }
        }} 
      />
      <OfflineBanner />
      <ScreenProtector />
      <InstallAppBanner />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-request" element={<RegisterRequest />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<PublicInvite />} />
          
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="events/:id" element={<EventDetails />} />
            <Route path="persons" element={<Persons />} />
            <Route path="persons/requests" element={<RegistrationRequests />} />
            <Route
              path="registration-requests"
              element={<Navigate to="/persons/requests" replace />}
            />
            <Route path="stats" element={<Stats />} />
            <Route path="broadcast" element={<BroadcastNotification />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="kalender" element={<CalendarPage />} />
            <Route path="pinnwand" element={<Pinnwand />} />
            <Route path="profil" element={<MemberProfile />} />
            <Route path="einstellungen" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

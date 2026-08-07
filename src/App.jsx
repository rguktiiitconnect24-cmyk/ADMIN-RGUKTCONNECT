import Layout from './components/Layout/Layout';
import { Route } from 'react-router-dom';
import { Routes } from 'react-router-dom';
import NotificationWatcher from './components/Common/NotificationWatcher';
import { NavigationProvider } from './context/NavigationContext';
import { DownloadProvider } from './context/DownloadContext';
import { Suspense } from 'react';
import ExitConfirmModal from './components/Common/ExitConfirmModal';
import OfflineIndicator from './components/Common/OfflineIndicator';
import ProfessionalSplash from './components/Common/ProfessionalSplash';
import { Navigate } from 'react-router-dom';
import LoadingTransition from './components/Common/LoadingTransition';
import React, { lazy, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';


import { useAuth } from './context/AuthContext';
import { syncProfileToWidget } from './services/widgetService';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const ForgetPassword = lazy(() => import('./pages/ForgetPassword'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminFeedback = lazy(() => import('./pages/Admin/AdminFeedback'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const CreateAdminAccount = lazy(() => import('./pages/Admin/CreateAdminAccount'));
const ContentManagement = lazy(() => import('./pages/Admin/ContentManagement'));
const CourseContentManagement = lazy(() => import('./pages/Admin/CourseContentManagement'));
const ComplaintsManagement = lazy(() => import('./pages/Admin/ComplaintsManagement'));
const Welcome = lazy(() => import('./pages/Welcome'));
const TimetableManagement = lazy(() => import('./pages/Admin/TimetableManagement'));
const AdminExams = lazy(() => import('./pages/Admin/AdminExams'));
const AdminExamSettings = lazy(() => import('./pages/Admin/AdminExamSettings'));
const AppUpdateManagement = lazy(() => import('./pages/Admin/AppUpdateManagement'));
const AttendanceManagement = lazy(() => import('./pages/Admin/AttendanceManagement'));
const CgpaManagement = lazy(() => import('./pages/Admin/CgpaManagement'));
const AdminQRScanner = lazy(() => import('./pages/Admin/AdminQRScanner'));
const AdminStudentDetail = lazy(() => import('./pages/Admin/AdminStudentDetail'));
const AdminQuizList = lazy(() => import('./pages/Admin/AdminQuizList'));
const AdminQuizForm = lazy(() => import('./pages/Admin/AdminQuizForm'));
const AdminQuestionBank = lazy(() => import('./pages/Admin/AdminQuestionBank'));
const AdminQuizAnalytics = lazy(() => import('./pages/Admin/AdminQuizAnalytics'));
const AdminQuestionAnalytics = lazy(() => import('./pages/Admin/AdminQuestionAnalytics'));
const NoticeManagement = lazy(() => import('./pages/Admin/NoticeManagement'));
const CreateNotice = lazy(() => import('./pages/Admin/CreateNotice'));
const CreateFacultyAccount = lazy(() => import('./pages/Admin/CreateFacultyAccount'));
const TestFileUpload = lazy(() => import('./pages/Admin/TestFileUpload'));
const BookOrdersManagement = lazy(() => import('./pages/Admin/BookOrdersManagement'));
const AppHealthMonitor = lazy(() => import('./pages/Admin/AppHealthMonitor'));


const AdminRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingTransition persistent />;
  if (!user || user.role?.toLowerCase() !== 'admin') return <Navigate to="/login" replace />;
  
  if (permission && user.permissions && user.permissions.length > 0) {
    if (!user.permissions.includes('all') && !user.permissions.includes(permission)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};


const App = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [appInfo, setAppInfo] = React.useState({ version: '2.8.3', build: '17' });
  const [showExitModal, setShowExitModal] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);

  // Sync Profile to Widget whenever user data changes
  useEffect(() => {
    if (user && Capacitor.getPlatform() !== 'web') {
      syncProfileToWidget({
        name: user.name || user.displayName || 'Student',
        id: user.studentId || user.uid || 'R000000'
      });
    }
  }, [user]);

  useEffect(() => {
    const handleNavigate = (e) => {
      const target = e.detail;
      if (target) {
        navigate(target);
      }
    };
    window.addEventListener('appNavigate', handleNavigate);
    return () => window.removeEventListener('appNavigate', handleNavigate);
  }, [navigate]);


  // 1. Fetch App Info once
  useEffect(() => {
    const getAppInfo = async () => {
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const info = await CapacitorApp.getInfo();
          setAppInfo(info);
        } catch (e) {
          console.error("App info fetch failed:", e);
        }
      }
    };
    getAppInfo();
  }, []);





  useEffect(() => {
    const setupBackButton = async () => {
      if (!Capacitor.isNativePlatform()) return null;
      
      const listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Paths where we should confirm exit instead of going back
        const rootPaths = ['/dashboard', '/login', '/'];
        
        if (rootPaths.includes(location.pathname)) {
          setShowExitModal(true);
        } else if (canGoBack || location.key !== 'default') {
          // Use navigate(-1) to go back in React Router history
          navigate(-1);
        } else {
          setShowExitModal(true);
        }
      });


      return listener;
    };

    const listenerPromise = setupBackButton();

    // --- Custom Validation System ---
    let currentTooltip = null;

    const removeTooltip = () => {
      if (currentTooltip) {
        currentTooltip.style.opacity = '0';
        currentTooltip.style.transform = 'translateY(5px)';
        setTimeout(() => {
          if (currentTooltip && currentTooltip.parentNode) {
            currentTooltip.parentNode.removeChild(currentTooltip);
          }
          currentTooltip = null;
        }, 200);
      }
    };

    const handleInvalid = (e) => {
      // Prevent browser default bubble
      if (e.preventDefault) e.preventDefault();
      const target = e.target;
      
      // 1. Highlight the input
      target.classList.add('input-invalid');
      
      // 2. Find a suitable container for the error message
      const container = target.closest('.login-input-wrapper') || target.closest('.login-form-group') || target.closest('.input-wrapper') || target.closest('.form-group') || target.parentNode;
      
      // Clear any existing error message for this input
      const existingError = container.parentNode.querySelector(`.form-error-message[data-for="${target.id || target.name}"]`);
      if (existingError) existingError.remove();

      // 3. Create and inject the new error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error-message';
      errorDiv.setAttribute('data-for', target.id || target.name);
      errorDiv.setAttribute('aria-live', 'polite');
      
      // Professional SVG Icon (Triangle Exclamation)
      const errorIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>`;

      // Get field label or name for better message
      const placeholder = (target.getAttribute('placeholder') || '').replace(/[\•\.]/g, '').trim();
      const fieldName = target.getAttribute('name') || target.id || 'field';
      const displayLabel = placeholder || fieldName;
      
      errorDiv.innerHTML = `
        ${errorIcon}
        <span><span class="brand-label">RGUKT CONNECT says:</span> Please enter your ${displayLabel.toLowerCase()} to continue</span>
      `;

      // Insert it after the container
      container.parentNode.insertBefore(errorDiv, container.nextSibling);

      // Trigger animation
      requestAnimationFrame(() => {
        errorDiv.classList.add('visible');
      });

      // 4. Focus the field
      if (target.focus) target.focus();

      // 5. Cleanup on input
      const cleanup = () => {
        target.classList.remove('input-invalid');
        errorDiv.classList.remove('visible');
        setTimeout(() => { if (errorDiv.parentNode) errorDiv.remove(); }, 250);
        target.removeEventListener('input', cleanup);
        target.removeEventListener('blur', cleanup);
      };
      target.addEventListener('input', cleanup);
      target.addEventListener('blur', cleanup);
    };

    const handleGlobalClick = (e) => {
      const btn = e.target.closest('button[type="submit"], input[type="submit"]') || e.target.closest('button:not([type])');
      
      if (btn && btn.form) {
        const form = btn.form;
        if (!form.noValidate) {
          // If the form doesn't have noValidate, we let the browser handle it or we can force it
        }

        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) {
            handleInvalid({ target: firstInvalid });
          }
        }
      }
    };

    window.addEventListener('invalid', handleInvalid, true);
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      listenerPromise.then(l => l && l.remove());
      window.removeEventListener('invalid', handleInvalid, true);
      window.removeEventListener('click', handleGlobalClick, true);
      removeTooltip(); // Cleanup old tooltips if any
    };
  }, [location.pathname, navigate]);
  
  if (showSplash) {
    return <ProfessionalSplash onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <LoadingTransition persistent />;
  }


    return (
    <>
      <OfflineIndicator />
      <ExitConfirmModal 
        isOpen={showExitModal} 
        onConfirm={() => CapacitorApp.exitApp()} 
        onCancel={() => setShowExitModal(false)} 
      />



      <Suspense fallback={<LoadingTransition persistent />}>
        <DownloadProvider>
          <NavigationProvider>
            <NotificationWatcher />
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgetPassword />} />
              <Route element={<Layout />}>
                <Route path="/admin" element={<AdminRoute><Navigate to="/admin/dashboard" replace /></AdminRoute>} />
                <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute permission="admin-users"><UserManagement /></AdminRoute>} />
                <Route path="/admin/new" element={<AdminRoute permission="admin-users"><CreateAdminAccount /></AdminRoute>} />
                <Route path="/admin/faculty/new" element={<AdminRoute permission="admin-users"><CreateFacultyAccount /></AdminRoute>} />
                <Route path="/admin/content" element={<AdminRoute permission="admin-content"><ContentManagement /></AdminRoute>} />
                <Route path="/admin/courses" element={<AdminRoute permission="admin-courses"><CourseContentManagement /></AdminRoute>} />
                <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
                <Route path="/admin/complaints" element={<AdminRoute permission="admin-complaints"><ComplaintsManagement /></AdminRoute>} />
                <Route path="/admin/notices" element={<AdminRoute permission="admin-notices"><NoticeManagement /></AdminRoute>} />
                <Route path="/admin/notices/create" element={<AdminRoute permission="admin-notices"><CreateNotice /></AdminRoute>} />
                <Route path="/admin/notices/edit/:id" element={<AdminRoute permission="admin-notices"><CreateNotice /></AdminRoute>} />
                <Route path="/admin/book-orders" element={<AdminRoute permission="admin-books"><BookOrdersManagement /></AdminRoute>} />
                <Route path="/admin/timetable" element={<AdminRoute permission="admin-timetable"><TimetableManagement /></AdminRoute>} />
                <Route path="/admin/exams" element={<AdminRoute permission="admin-exams"><AdminExams /></AdminRoute>} />
                <Route path="/admin/exams/settings" element={<AdminRoute permission="admin-exams"><AdminExamSettings /></AdminRoute>} />
                <Route path="/admin/updates" element={<AdminRoute permission="admin-updates"><AppUpdateManagement /></AdminRoute>} />
                <Route path="/admin/attendance" element={<AdminRoute permission="admin-attendance"><AttendanceManagement /></AdminRoute>} />
                <Route path="/admin/cgpa" element={<AdminRoute permission="admin-cgpa"><CgpaManagement /></AdminRoute>} />
                <Route path="/admin/scanner" element={<AdminRoute permission="admin-scanner"><AdminQRScanner /></AdminRoute>} />
                <Route path="/admin/health" element={<AdminRoute><AppHealthMonitor /></AdminRoute>} />
                <Route path="/admin/student/:uid" element={<AdminRoute permission="admin-users"><AdminStudentDetail /></AdminRoute>} />
                <Route path="/admin/quizzes" element={<AdminRoute permission="admin-quizzes"><AdminQuizList /></AdminRoute>} />
                <Route path="/admin/quizzes/new" element={<AdminRoute permission="admin-quizzes"><AdminQuizForm /></AdminRoute>} />
                <Route path="/admin/quizzes/edit/:quizId" element={<AdminRoute permission="admin-quizzes"><AdminQuizForm /></AdminRoute>} />
                <Route path="/admin/quizzes/:quizId/questions" element={<AdminRoute permission="admin-quizzes"><AdminQuestionBank /></AdminRoute>} />
                <Route path="/admin/quizzes/:quizId/analytics" element={<AdminRoute permission="admin-quizzes"><AdminQuizAnalytics /></AdminRoute>} />
                <Route path="/admin/quizzes/:quizId/question/:questionIndex" element={<AdminRoute permission="admin-quizzes"><AdminQuestionAnalytics /></AdminRoute>} />
                <Route path="/admin/test-upload" element={<AdminRoute><TestFileUpload /></AdminRoute>} />

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Routes>
          </NavigationProvider>
        </DownloadProvider>
      </Suspense>
  </>
);
};

export default App;

import { LayoutDashboard, FileText, User, Users, MessageSquare, Calendar, ClipboardList, Database, QrCode, BookOpen, Bell, Library, Activity, Send } from 'lucide-react';

export const NAV_ITEMS = [
    {
        id: 'admin-dashboard',
        label: 'Home',
        path: '/admin/dashboard',
        icon: LayoutDashboard,
        adminOnly: true
    },
    {
        id: 'admin-users',
        label: 'Users',
        path: '/admin/users',
        icon: Users,
        adminOnly: true
    },
    {
        id: 'admin-scanner',
        label: 'Scanner',
        path: '/admin/scanner',
        icon: QrCode,
        adminOnly: true
    },
    {
        id: 'admin-complaints',
        label: 'Complaints',
        path: '/admin/complaints',
        icon: MessageSquare,
        adminOnly: true
    },
    {
        id: 'admin-exams',
        label: 'Exams',
        path: '/admin/exams',
        icon: ClipboardList,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-quizzes',
        label: 'Quiz Dashboard',
        path: '/admin/quizzes',
        icon: FileText,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-courses',
        label: 'Course Content',
        path: '/admin/courses',
        icon: BookOpen,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-timetable',
        label: 'Timetable',
        path: '/admin/timetable',
        icon: Calendar,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-attendance',
        label: 'Attendance',
        path: '/admin/attendance',
        icon: Database,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-notices',
        label: 'Notice Board',
        path: '/admin/notices',
        icon: Bell,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-notifications',
        label: 'Push Notifications',
        path: '/admin/notifications',
        icon: Send,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-books',
        label: 'Book Orders',
        path: '/admin/book-orders',
        icon: Library,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-feedback',
        label: 'Feedbacks',
        path: '/admin/feedback',
        icon: MessageSquare,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-app-health',
        label: 'App Health Monitor',
        path: '/admin/health',
        icon: Activity,
        adminOnly: true,
        hideOnMobile: true
    },
    {
        id: 'admin-profile',
        label: 'Profile',
        path: '/profile',
        icon: User,
        adminOnly: true
    },
];

export const FACULTY_NAV_ITEMS = [];

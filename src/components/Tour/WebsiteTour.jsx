import { useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./WebsiteTour.css";
import { useAuth } from '../../context/AuthContext';

const WebsiteTour = () => {
    const { user, updateProfileData } = useAuth();

    useEffect(() => {
        // Only run if user exists and hasn't seen the tour yet
        if (!user || user.tourCompleted) return;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            overlayClickNext: false,
            popoverClass: 'driverjs-theme',
            doneBtnText: 'Finish',
            nextBtnText: 'Next',
            prevBtnText: 'Previous',
            onDestroyed: async () => {
                // Mark tour as completed via AuthContext (updates DB + Local State)
                try {
                    await updateProfileData({ tourCompleted: true });
                } catch (error) {
                    console.error("Error updating tour status:", error);
                }
            },
            steps: [
                {
                    element: '.dashboard-container',
                    popover: {
                        title: 'Welcome to RGUKT CONNECT!',
                        description: 'This is your central hub for all academic activities. Let\'s take a quick tour.',
                        side: "center",
                        align: 'center'
                    }
                },
                {
                    element: '.sidebar',
                    popover: {
                        title: 'Navigation Sidebar',
                        description: 'Access your Courses, Time Table, and other resources from this menu. It collapses on smaller screens.',
                        side: "right",
                        align: 'start'
                    }
                },
                {
                    element: '.stats-grid',
                    popover: {
                        title: 'Quick Stats',
                        description: 'View your live attendance and academic progress at a glance here.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '.theme-toggle-btn',
                    popover: {
                        title: 'Study Mode',
                        description: 'Switch between Light and Dark modes to suit your study environment.',
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '.user-profile-link',
                    popover: {
                        title: 'Your Profile',
                        description: 'Manage your bio, contact info, and security settings here.',
                        side: "top",
                        align: 'end'
                    }
                }
            ]
        });

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            driverObj.drive();
        }, 1500);

        return () => clearTimeout(timer);
    }, [user]);

    return null; // This component doesn't render anything visible itself
};

export default WebsiteTour;

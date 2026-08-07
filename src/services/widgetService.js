import { registerPlugin } from '@capacitor/core';

const Widget = registerPlugin('Widget');

export const syncSeatingToWidget = async (seatingInfo) => {
    try {
        if (!seatingInfo) return;
        
        await Widget.updateSeatingData({
            id: seatingInfo['ID No.'] || '---',
            name: seatingInfo['NAME OF THE STUDENT'] || '---',
            sp: seatingInfo['SP'] || '--',
            hall: seatingInfo['EXAM HALL'] || '---',
            subject: seatingInfo['SUBJECT'] || 'No subject'
        });
        console.log('Widget synced successfully');
    } catch (error) {
        console.error('Failed to sync widget:', error);
    }
};

export const syncScheduleToWidget = async (scheduleData) => {
    try {
        if (!scheduleData) return;
        await Widget.updateScheduleData(scheduleData);
    } catch (error) {
        console.error('Failed to sync schedule widget:', error);
    }
};

export const syncComplaintsToWidget = async (complaintsData) => {
    try {
        if (!complaintsData) return;
        await Widget.updateComplaintsData(complaintsData);
    } catch (error) {
        console.error('Failed to sync complaints widget:', error);
    }
};

export const syncProfileToWidget = async (profileData) => {
    try {
        if (!profileData) return;
        await Widget.updateProfileData(profileData);
    } catch (error) {
        console.error('Failed to sync profile widget:', error);
    }
};

export const syncEventsToWidget = async (eventsData) => {
    try {
        if (!eventsData) return;
        await Widget.updateEventsData(eventsData);
    } catch (error) {
        console.warn('Widget sync skipped (Native only):', error);
    }
};

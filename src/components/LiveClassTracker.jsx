import { Beaker, PenTool, Laptop, Database, Code, BookOpen, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import './LiveClassTracker.css';

const timeSlots = [
    '08:30 AM - 09:30 AM',
    '09:30 AM - 10:30 AM',
    '10:40 AM - 11:40 AM',
    '11:40 AM - 12:40 PM',
    '01:40 PM - 02:40 PM',
    '02:40 PM - 03:40 PM',
    '03:50 PM - 04:50 PM'
];

const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const now = new Date();
    now.setHours(hours, parseInt(minutes, 10), 0, 0);
    return now;
};

const subjectMap = {
    'P': 'Physics',
    'M': 'Mathematics',
    'C': 'Chemistry',
    'E': 'English',
    'IT': 'Information Technology',
    'T': 'Telugu',
    'B': 'Biology',
};

const getFullSubjectName = (subjectCode) => {
    if (!subjectCode) return '';
    const upperCode = subjectCode.trim().toUpperCase();
    return subjectMap[upperCode] || subjectCode;
};

const getIconForSubject = (subject) => {
    const sub = subject.toLowerCase();
    if (sub.includes('physic')) return <Beaker size={24} color="#4f46e5" />;
    if (sub.includes('math')) return <PenTool size={24} color="#4f46e5" />;
    if (sub.includes('computer') || sub.includes('it') || sub.includes('ct')) return <Laptop size={24} color="#4f46e5" />;
    if (sub.includes('data') || sub.includes('db')) return <Database size={24} color="#4f46e5" />;
    if (sub.includes('code') || sub.includes('lab')) return <Code size={24} color="#4f46e5" />;
    return <BookOpen size={24} color="#4f46e5" />;
};

const LiveClassTracker = ({ schedule }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!schedule || schedule === 'NOT_FOUND') return null;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[currentTime.getDay()];
    const todaySchedule = schedule[currentDay];

    if (!todaySchedule || todaySchedule.length === 0) return null;

    let currentClass = null;
    let nextClass = null;

    // Simplified logic to find current and next class
    for (let i = 0; i < timeSlots.length; i++) {
        const [startStr, endStr] = timeSlots[i].split(' - ');
        const startTime = parseTime(startStr);
        const endTime = parseTime(endStr);

        if (currentTime >= startTime && currentTime <= endTime) {
            currentClass = {
                subject: getFullSubjectName(todaySchedule[i]),
                time: timeSlots[i],
                endTime: endTime,
                startTime: startTime
            };
            // Find next valid class
            for (let j = i + 1; j < timeSlots.length; j++) {
                if (todaySchedule[j] && todaySchedule[j] !== 'Free' && todaySchedule[j] !== '-') {
                    nextClass = {
                        subject: getFullSubjectName(todaySchedule[j]),
                        time: timeSlots[j],
                        startTime: parseTime(timeSlots[j].split(' - ')[0])
                    };
                    break;
                }
            }
            break;
        } else if (currentTime < startTime) {
            // We are before this class, so it could be the next class if it's valid
            if (todaySchedule[i] && todaySchedule[i] !== 'Free' && todaySchedule[i] !== '-') {
                nextClass = {
                    subject: getFullSubjectName(todaySchedule[i]),
                    time: timeSlots[i],
                    startTime: startTime
                };
                break;
            }
        }
    }

    // Format date string
    const dateString = currentTime.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Progress calculation
    let progress = 0;
    let remainingStr = '';
    if (currentClass) {
        const totalDuration = currentClass.endTime - currentClass.startTime;
        const elapsed = currentTime - currentClass.startTime;
        progress = (elapsed / totalDuration) * 100;
        
        const remainingMs = currentClass.endTime - currentTime;
        const remainingMins = Math.floor(remainingMs / 60000);
        const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
        remainingStr = `${remainingMins}:${remainingSecs.toString().padStart(2, '0')}`;
    }

    let startsInStr = '';
    if (!currentClass && nextClass) {
        const startsInMs = nextClass.startTime - currentTime;
        const startsInMins = Math.floor(startsInMs / 60000);
        startsInStr = `Starts in ${startsInMins} min`;
    }

    if (!currentClass && !nextClass) return null; // No classes left today

    return (
        <div className="live-tracker-container">
            <div className="live-tracker-cards">
                {/* Current Class Card */}
                {currentClass ? (
                    <div className="live-card current-class-card">
                        <div className="live-card-header">
                            <span className="live-card-label">CURRENT CLASS</span>
                            <span className="live-badge">
                                <span className="live-dot"></span> LIVE
                            </span>
                        </div>
                        <div className="live-card-body">
                            <div className="subject-icon">
                                {getIconForSubject(currentClass.subject)}
                            </div>
                            <div className="subject-details">
                                <h3>{currentClass.subject}</h3>
                                <p>{currentClass.time}</p>
                            </div>
                        </div>
                        <div className="live-card-footer">
                            <div className="time-remaining">
                                <Clock size={14} />
                                <span>{remainingStr} remaining</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="live-card empty-class-card">
                        <p>No class right now</p>
                    </div>
                )}

                {/* Next Class Card */}
                {nextClass && (
                    <div className="live-card next-class-card">
                        <div className="live-card-header">
                            <span className="live-card-label">NEXT CLASS</span>
                        </div>
                        <div className="live-card-body">
                            <div className="subject-icon">
                                {getIconForSubject(nextClass.subject)}
                            </div>
                            <div className="subject-details">
                                <h3>{nextClass.subject}</h3>
                                <p>{nextClass.time}</p>
                            </div>
                        </div>
                        <div className="live-card-footer">
                            <div className="time-starts-in">
                                <Clock size={14} />
                                <span>{startsInStr}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveClassTracker;

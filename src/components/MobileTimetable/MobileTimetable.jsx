import { Calendar, ChevronDown, React } from 'lucide-react';
import React, { useState } from 'react';
import { mapSubjectName } from '../../utils/formatUtils';
import './MobileTimetable.css';

const MobileTimetable = ({ schedule, selectedDay, timeSlots }) => {
    // Make sure we have a valid expanded day, defaulting to selectedDay or Monday if not found
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const initialDay = daysOfWeek.includes(selectedDay) ? selectedDay : 'Monday';
    const [expandedDay, setExpandedDay] = useState(initialDay);

    // Dynamic color mapping based on subject string hash to keep colors consistent
    const getSubjectColorClass = (subject) => {
        if (!subject || subject === 'Free' || subject === '-') return '';
        const mappedName = mapSubjectName(subject);
        let hash = 0;
        for (let i = 0; i < mappedName.length; i++) {
            hash = mappedName.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use mod 6 to distribute among the 6 gradient styles
        const index = Math.abs(hash % 6);
        return `subject-color-${index}`;
    };

    const toggleDay = (day) => {
        setExpandedDay(day === expandedDay ? null : day);
    };

    return (
        <div className="mobile-timetable-container">
            <div className="mobile-timetable-header">
                <h2 className="mobile-timetable-title">Weekly Time Table</h2>
                <div className="mobile-timetable-divider"></div>
            </div>
            
            {daysOfWeek.map(day => {
                const daySchedule = schedule[day] || [];
                // Only count non-free periods for the summary
                const activePeriods = daySchedule.filter(s => s && s !== 'Free' && s !== '-').length;
                const isExpanded = expandedDay === day;

                return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Accordion Header */}
                        <div 
                            className={`mobile-day-accordion ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleDay(day)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={18} style={{ color: isExpanded ? '#818cf8' : '#94a3b8' }} />
                                <h3 className="mobile-day-title">{day.substring(0, 3).toUpperCase()} <span className="mobile-day-periods">({activePeriods} Periods)</span></h3>
                            </div>
                            <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: isExpanded ? '#818cf8' : '#64748b' }}>
                                <ChevronDown size={20} strokeWidth={2.5} />
                            </div>
                        </div>

                        {/* Expanded Period Cards - Always rendered for smooth CSS transition */}
                        <div className={`mobile-day-content-wrapper ${isExpanded ? 'open' : ''}`}>
                            <div className="mobile-day-expanded">
                                {daySchedule.map((subject, idx) => {
                                    // timeSlots is array of 7 elements.
                                    // Lunch is inserted between idx 3 and 4 manually here.
                                    
                                    const periodNum = idx + 1;
                                    const timeSlot = timeSlots[idx];
                                    const isFree = !subject || subject === 'Free' || subject === '-';
                                    const mappedSubject = mapSubjectName(subject);
                                    const colorClass = getSubjectColorClass(subject);
                                    
                                    const periodCard = (
                                        <div key={`p${periodNum}`} className={`mobile-period-card ${isFree ? 'mobile-free-period' : colorClass}`}>
                                            <div className="mobile-period-header">
                                                <span className="mobile-period-badge">P{periodNum}</span>
                                                <span className="mobile-period-time">{timeSlot}</span>
                                            </div>
                                            {!isFree && (
                                                <h4 className="mobile-period-subject-full">{mappedSubject}</h4>
                                            )}
                                            {isFree && <span>Free Period</span>}
                                        </div>
                                    );

                                    // Render Lunch Break explicitly after Period 4
                                    if (idx === 3) {
                                        return (
                                            <React.Fragment key={`p${periodNum}-with-lunch`}>
                                                {periodCard}
                                                <div className="mobile-lunch-card">
                                                    <span className="mobile-lunch-time">12:40 - 01:40 PM</span>
                                                    <h4 className="mobile-lunch-title">Lunch Break</h4>
                                                </div>
                                            </React.Fragment>
                                        );
                                    }

                                    return periodCard;
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MobileTimetable;

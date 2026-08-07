import { ChevronLeft, ChevronRight, LayoutGrid, List, CheckCircle2, X, CalendarIcon, Clock, Edit2, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays,
    isToday,
    parseISO
} from 'date-fns';


import { syncEventsToWidget } from '../../services/widgetService';
import './CustomCalendar.css';

const GOOGLE_API_KEY = "AIzaSyAUq7whUeEkgUDtlrDqH5oPXrkYf47Un9Y";
const HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

const CustomCalendar = () => {
    // --- State ---
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month', 'list'
    const [localEvents, setLocalEvents] = useState(() => {
        const saved = localStorage.getItem('student_calendar_events');
        return saved ? JSON.parse(saved) : [];
    });
    const [googleEvents, setGoogleEvents] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
    const [toast, setToast] = useState(null); // { message, details, type }


    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        time: '09:00',
        category: 'Study'
    });

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('student_calendar_events', JSON.stringify(localEvents));
    }, [localEvents]);

    useEffect(() => {
        fetchGoogleHolidays();
    }, [currentMonth]);

    const fetchGoogleHolidays = async () => {
        const start = startOfMonth(currentMonth).toISOString();
        const end = endOfMonth(currentMonth).toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(HOLIDAY_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${start}&timeMax=${end}`;

        try {
            setIsLoadingHolidays(true);
            const response = await fetch(url);
            const data = await response.json();
            if (data.items) {
                const holidays = data.items.map(item => ({
                    id: item.id,
                    title: item.summary,
                    date: item.start.date || item.start.dateTime.split('T')[0],
                    isGoogle: true,
                    category: 'Holiday'
                }));
                setGoogleEvents(holidays);
            }
        } catch (error) {
            console.error("Failed to fetch holidays:", error);
        } finally {
            setIsLoadingHolidays(false);
        }
    };

    // --- Helpers ---
    const allEvents = useMemo(() => {
        return [...localEvents, ...googleEvents];
    }, [localEvents, googleEvents]);

    useEffect(() => {
        const syncToWidget = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayEvents = allEvents.filter(e => e.date === todayStr);
            
            await syncEventsToWidget({
                count: todayEvents.length.toString(),
                event1: todayEvents[0]?.title || "No events today",
                time1: todayEvents[0]?.time || "",
                event2: todayEvents[1]?.title || "",
                time2: todayEvents[1]?.time || ""
            });
        };
        syncToWidget();
    }, [allEvents]);

    const getEventsForDate = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return allEvents.filter(event => event.date === dateStr);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // --- Actions ---
    const handleAddEvent = (e) => {
        e.preventDefault();
        const newEvent = {
            ...formData,
            id: editingEvent ? editingEvent.id : Date.now().toString(),
            date: format(selectedDate, 'yyyy-MM-dd'),
            isGoogle: false
        };

        if (editingEvent) {
            setLocalEvents(prev => prev.map(ev => ev.id === editingEvent.id ? newEvent : ev));
        } else {
            setLocalEvents(prev => [...prev, newEvent]);
        }

        setIsAddModalOpen(false);
        setEditingEvent(null);
        resetForm();

        // Show Success Toast
        setToast({
            message: editingEvent ? 'Event Updated' : 'Event Created Successfully',
            details: newEvent.title,
            type: 'success'
        });
        setTimeout(() => setToast(null), 4000);
    };

    const deleteEvent = (id) => {
        setLocalEvents(prev => prev.filter(ev => ev.id !== id));
        setEventToDelete(null);
        setToast({
            message: 'Event Deleted',
            details: 'The event has been removed',
            type: 'delete'
        });
        setTimeout(() => setToast(null), 3000);
    };

    const startEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            description: event.description,
            time: event.time,
            category: event.category
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', time: '09:00', category: 'Study' });
    };

    // --- Render Helpers ---
    const renderHeader = () => (
        <div className="cal-header">
            <div className="cal-title-section">
                <div className="cal-month-name">
                    <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
                </div>
                <div className="cal-nav-btns">
                    <button onClick={prevMonth} className="cal-nav-btn"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentMonth(new Date())} className="cal-today-btn">Today</button>
                    <button onClick={nextMonth} className="cal-nav-btn"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="cal-view-toggles">
                <button 
                    className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
                    onClick={() => setViewMode('month')}
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                >
                    <List size={18} />
                </button>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="cal-days-row">
                {days.map(day => <div key={day} className="cal-day-label">{day}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;
                const dayEvents = getEventsForDate(day);
                
                days.push(
                    <div
                        key={day.toString()}
                        className={`cal-cell ${
                            !isSameMonth(day, monthStart) ? "disabled" : 
                            isSameDay(day, selectedDate) ? "selected" : ""
                        } ${isToday(day) ? "today" : ""}`}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <span className="cal-cell-number">{formattedDate}</span>
                        <div className="cal-cell-events">
                            {dayEvents.slice(0, 3).map((ev, idx) => (
                                <div key={ev.id} className={`cal-event-dot ${ev.category.toLowerCase()}`}></div>
                            ))}
                            {dayEvents.length > 3 && <div className="cal-event-more">+{dayEvents.length - 3}</div>}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="cal-row" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="cal-body">{rows}</div>;
    };

    return (
        <div className="custom-calendar-container">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className={`cal-toast success`}
                    >
                        <div className="toast-icon">
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="toast-content">
                            <strong>{toast.message}</strong>
                            <p>{toast.details}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="toast-close">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="cal-main-layout">
                {/* Left Side: Calendar Control */}
                <div className="cal-view-section">
                    {renderHeader()}
                    {viewMode === 'month' ? (
                        <div className="cal-grid-wrapper">
                            {renderDays()}
                            {renderCells()}
                        </div>
                    ) : (
                        <div className="cal-list-view">
                            <div className="list-view-header">Upcoming Events</div>
                            {allEvents.length === 0 ? (
                                <div className="empty-list">
                                    <CalendarIcon size={48} opacity={0.3} />
                                    <p>No upcoming events scheduled</p>
                                </div>
                            ) : (
                                allEvents
                                    .filter(ev => parseISO(ev.date) >= startOfMonth(currentMonth))
                                    .sort((a,b) => a.date.localeCompare(b.date))
                                    .map(ev => {
                                        const eventDate = parseISO(ev.date);
                                        return (
                                            <div key={ev.id} className={`list-event-card ${ev.category.toLowerCase()}`} onClick={() => setSelectedDate(eventDate)}>
                                                <div className="list-event-date">
                                                    <span>{format(eventDate, 'MMM')}</span>
                                                    <span className="day-num">{format(eventDate, 'd')}</span>
                                                </div>
                                                <div className="list-event-info">
                                                    <h4>{ev.title}</h4>
                                                    {ev.time && <p><Clock size={12}/> {ev.time}</p>}
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Agenda / Today's View (Dashboard) */}
                <div className="cal-agenda-sidebar">
                    <div className="cal-dashboard-summary">
                        <div className="summary-card">
                            <span className="summary-label">Today's Tasks</span>
                            <span className="summary-count">{getEventsForDate(new Date()).length}</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-label">Upcoming</span>
                            <span className="summary-count">
                                {localEvents.filter(ev => parseISO(ev.date) > new Date()).length}
                            </span>
                        </div>
                    </div>

                    <div className="agenda-header">
                        <h3>{format(selectedDate, 'eeee, MMM d')}</h3>
                        {isToday(selectedDate) && <span className="today-badge">Today</span>}
                    </div>

                    <div className="agenda-events">
                        <AnimatePresence mode="popLayout">
                            {getEventsForDate(selectedDate).length > 0 ? (
                                getEventsForDate(selectedDate).map(event => (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        key={event.id} 
                                        className={`agenda-card ${event.category.toLowerCase()} ${event.isGoogle ? 'google-event' : ''}`}
                                    >
                                        <div className="agenda-card-content">
                                            <div className="agenda-time">
                                                <Clock size={14} />
                                                {event.time || 'All Day'}
                                            </div>
                                            <h4>{event.title}</h4>
                                            {event.description && <p>{event.description}</p>}
                                            {event.isGoogle && <span className="holiday-tag">Public Holiday</span>}
                                        </div>
                                        {!event.isGoogle && (
                                            <div className="agenda-card-actions">
                                                <button onClick={() => startEdit(event)} className="agenda-btn edit"><Edit2 size={14} /></button>
                                                <button onClick={() => setEventToDelete(event)} className="agenda-btn delete"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="agenda-empty"
                                >
                                    <CalendarIcon size={48} opacity={0.2} />
                                    <p>No events scheduled for this day</p>
                                    <button className="add-event-inline" onClick={() => setIsAddModalOpen(true)}>
                                        <Plus size={16} /> Add Event
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button className="floating-add-btn" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="cal-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="cal-modal" 
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="cal-modal-header">
                                <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
                                <button onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddEvent}>
                                <div className="form-group">
                                    <label>Event Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Mathematics Exam"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Time</label>
                                        <input 
                                            type="time" 
                                            value={formData.time}
                                            onChange={e => setFormData({...formData, time: e.target.value})}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select 
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            <option>Study</option>
                                            <option>Exams</option>
                                            <option>Personal</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <textarea 
                                        rows="3"
                                        placeholder="Add notes..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    ></textarea>
                                </div>
                                <div className="cal-modal-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-save">
                                        {editingEvent ? 'Save Changes' : 'Create Event'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {eventToDelete && (
                    <div className="cal-modal-overlay" onClick={() => setEventToDelete(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="cal-modal delete-confirm-modal" 
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="delete-modal-icon">
                                <Trash2 size={32} />
                            </div>
                            <h3>Delete Event?</h3>
                            <p>Are you sure you want to delete <strong>"{eventToDelete.title}"</strong>? This action cannot be undone.</p>
                            <div className="cal-modal-footer">
                                <button className="btn-cancel" onClick={() => setEventToDelete(null)}>Keep it</button>
                                <button className="btn-save btn-danger" onClick={() => deleteEvent(eventToDelete.id)}>
                                    Yes, Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomCalendar;

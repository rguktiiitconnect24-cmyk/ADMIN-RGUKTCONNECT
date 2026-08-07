import { ArrowLeft, BookOpen, X, ChevronRight, Calendar } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PROGRAMS } from '../../config/academics';
import './CourseSelectionModal.css';

const CourseSelectionModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedProgram, setSelectedProgram] = useState(null);

    if (!isOpen) return null;

    const handleYearSelect = (program, year) => {
        setSelectedProgram(program);
        setSelectedYear(year);
    };

    const handleSemesterSelect = (semId) => {
        navigate(`/courses/${selectedYear.id}/${semId}${selectedBranch ? `?branch=${selectedBranch.id}` : ''}`);
        onClose();
        // Reset state after a small delay so closing animation doesn't show the first screen
        setTimeout(() => {
            setSelectedYear(null);
            setSelectedBranch(null);
            setSelectedProgram(null);
        }, 300);
    };

    const handleBranchSelect = (branch) => {
        setSelectedBranch(branch);
    };

    const handleBack = () => {
        if (selectedBranch) {
            setSelectedBranch(null);
        } else {
            setSelectedYear(null);
            setSelectedProgram(null);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setSelectedYear(null);
            setSelectedBranch(null);
            setSelectedProgram(null);
        }, 300);
    };

    return createPortal(
        <div className="course-modal-overlay animate-fade-in" onClick={handleClose}>
            <div className="course-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="course-modal-grabber"></div>
                
                <div className="course-modal-header">
                    {selectedYear ? (
                        <button className="back-btn-circle" onClick={handleBack}>
                            <ArrowLeft size={20} />
                        </button>
                    ) : (
                        <div className="header-icon">
                            <BookOpen size={24} />
                        </div>
                    )}
                    <div className="header-text">
                        <h2>{selectedBranch ? selectedBranch.label : (selectedYear ? selectedYear.label : 'Academic Programs')}</h2>
                        <p>{selectedYear ? (selectedYear.branches && !selectedBranch ? 'Select your branch' : 'Select your semester') : 'Select your year to view courses'}</p>
                    </div>
                    <button className="close-btn-circle" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="course-modal-body">
                    {selectedYear ? (
                        selectedYear.branches && !selectedBranch ? (
                            <div className="semesters-list animate-fade-in">
                                {selectedYear.branches.map(branch => (
                                    <button 
                                        key={branch.id} 
                                        className="semester-item-row"
                                        onClick={() => handleBranchSelect(branch)}
                                    >
                                        <div className="sem-icon-box">
                                            <BookOpen size={18} />
                                        </div>
                                        <span className="sem-label">{branch.label}</span>
                                        <ChevronRight size={18} className="sem-arrow" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="semesters-list animate-fade-in">
                                {(selectedBranch ? selectedBranch.semesters : selectedYear.semesters).map(sem => (
                                    <button 
                                        key={sem.id} 
                                        className="semester-item-row"
                                        onClick={() => handleSemesterSelect(sem.id)}
                                    >
                                        <div className="sem-icon-box">
                                            <Calendar size={18} />
                                        </div>
                                        <span className="sem-label">{sem.label}</span>
                                        <ChevronRight size={18} className="sem-arrow" />
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        PROGRAMS.map(program => (
                            <div key={program.id} className="program-section">
                                <div className="section-label">
                                    <span>{program.id === 'puc' ? 'Pre-University' : 'Engineering'}</span>
                                    <div className="section-line"></div>
                                </div>
                                <div className="years-list">
                                    {program.years.map(year => (
                                        <button 
                                            key={year.id} 
                                            className={`year-item-card theme-${program.color}`}
                                            onClick={() => handleYearSelect(program, year)}
                                        >
                                            <div className="year-icon-box">
                                                <program.icon size={20} />
                                            </div>
                                            <div className="year-details">
                                                <span className="y-label">{year.label}</span>
                                                <span className="y-sub">{year.subLabel}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CourseSelectionModal;

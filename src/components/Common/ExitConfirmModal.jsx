import { createPortal } from 'react-dom';
import './ExitConfirmModal.css';

const ExitConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    const modalContent = (
        <div className="exit-modal-overlay animate-fade-in" onClick={onCancel}>
            <div className="exit-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
                {/* Content */}
                <div className="exit-modal-header">
                    <h2>Exit Application?</h2>
                    <p>Are you sure you want to close the app? You can return anytime to continue your progress.</p>
                </div>


                {/* Action Buttons */}
                <div className="exit-modal-actions">
                    <button 
                        className="exit-modal-btn confirm" 
                        onClick={onConfirm}
                    >
                        <span>Yes, Exit</span>
                    </button>

                    <button 
                        className="exit-modal-btn cancel" 
                        onClick={onCancel}
                    >
                        No, Stay Here
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ExitConfirmModal;

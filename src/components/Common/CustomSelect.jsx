import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

/**
 * CustomSelect Component
 * A premium dropdown component that matches the design aesthetic.
 * 
 * @param {string} label - The label shown above the select
 * @param {Array} options - Array of { value, label } objects
 * @param {string} value - Currently selected value
 * @param {function} onChange - Callback function when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 */
const CustomSelect = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option...",
  className = "",
  upward = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Find the label for the current value
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard interaction
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${className}`} ref={dropdownRef}>
      {label && <label className="custom-select-label">{label}</label>}
      
      <div className="custom-select-wrapper">
        <div 
          className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown size={20} className="custom-select-icon" />
        </div>

        <div className={`custom-select-dropdown ${isOpen ? 'open' : ''} ${upward ? 'upward' : ''}`}>
          <div className="custom-select-options" role="listbox">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  role="option"
                  aria-selected={value === option.value}
                >
                  {option.label}
                  {value === option.value && (
                    <Check size={16} style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              ))
            ) : (
              <div className="custom-select-option" style={{ cursor: 'default', opacity: 0.5 }}>
                No options available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSelect;

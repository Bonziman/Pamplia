// src/components/Modal.tsx
import React, { ReactNode } from 'react';
import './Modal.css'; // Import the CSS

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode; // Allow any valid React content
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null; // Don't render anything if the modal is closed
  }

  // Prevent clicks inside the content from closing the modal
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    // Overlay covers the whole screen
    <div className="modal-overlay" onClick={onClose}>
      {/* Content area */}
      <div className="modal-content" onClick={handleContentClick}>
        {/* Close button */}
        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
          × {/* HTML entity for 'X' */}
        </button>

        {/* Optional Title */}
        {title && <h2 className="modal-title">{title}</h2>}

        {/* Modal Body Content */}
        {children}
      </div>
    </div>
  );
};

export default Modal;

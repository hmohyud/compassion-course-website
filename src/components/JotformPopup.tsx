import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface JotformPopupProps {
  formId: string;
  buttonText: string;
  className?: string;
}

export default function JotformPopup({ formId, buttonText, className = '' }: JotformPopupProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!formId) return null;

  return (
    <>
      <button
        type="button"
        className={`btn-primary jotform-popup-trigger ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        {buttonText}
      </button>

      {open && createPortal(
        <div
          className="jotform-modal-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            ref={panelRef}
            className="jotform-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Registration form"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="jotform-modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="jotform-modal-iframe-wrap">
              <iframe
                src={`https://pci.jotform.com/form/${formId}`}
                title="Registration form"
                className="jotform-modal-iframe"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

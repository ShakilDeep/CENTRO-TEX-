import { useState, useCallback } from 'react';

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Custom hook for managing modal state
 * Eliminates duplicate modal state management across components
 * 
 * @example
 * ```tsx
 * const modal = useModal();
 * 
 * return (
 *   <>
 *     <button onClick={modal.open}>Open Modal</button>
 *     {modal.isOpen && <Modal onClose={modal.close}>...</Modal>}
 *   </>
 * );
 * ```
 */
export function useModal(initialState = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}

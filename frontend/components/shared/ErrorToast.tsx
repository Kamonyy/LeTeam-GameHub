'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ErrorToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-1/2 z-50 -translate-x-1/2 animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 bg-hub-danger/90 backdrop-blur-sm text-white text-sm rounded-lg shadow-lg border border-hub-danger">
        <span>{message}</span>
        <button
          onClick={onDismiss}
          className="p-0.5 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

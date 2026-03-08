import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import CaptchaPage from './pages/CaptchaPage';

export default function App() {
  const [isVerified, setIsVerified] = useState(() => {
    try {
      const lastVerified = localStorage.getItem('captcha_verified_time');
      if (lastVerified) {
        const timeDiff = Date.now() - parseInt(lastVerified, 10);
        if (timeDiff < 86400000) {
          return true;
        }
      }
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
    return false;
  });
  const [isBlocked, setIsBlocked] = useState(false);

  const handleCaptchaSuccess = () => {
    try {
      localStorage.setItem('captcha_verified_time', Date.now().toString());
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
    setIsVerified(true);
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // Only prevent the menu from opening, don't block the site
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        setIsBlocked(true);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isBlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-950 text-white font-sans">
        <div className="text-center p-8 bg-red-900/50 rounded-3xl border border-red-500/30 max-w-md mx-4">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Acesso Bloqueado</h1>
          <p className="text-red-200">
            Ação não permitida. O sistema detectou uma tentativa de inspeção.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return <CaptchaPage onSuccess={handleCaptchaSuccess} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

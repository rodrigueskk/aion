import { useState, useEffect } from 'react';
import { ChatSession, Message, Stroke } from './types';
import { v4 as uuidv4 } from 'uuid';

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('broxa_ai_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('localStorage is not available', e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('broxa_ai_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  }, [sessions]);

  const createSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'Nova Conversa',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const addMessage = (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const newMessage: Message = {
          ...message,
          id: uuidv4(),
          timestamp: Date.now(),
        };
        const updatedMessages = [...session.messages, newMessage];
        
        let newTitle = session.title;
        if (updatedMessages.filter(m => m.role === 'user').length === 1 && message.role === 'user') {
            const textContent = message.content.trim();
            if (textContent) {
                newTitle = textContent.slice(0, 30) + (textContent.length > 30 ? '...' : '');
            } else if (message.imageUrl) {
                newTitle = 'Imagem enviada';
            }
        }

        return {
          ...session,
          title: newTitle,
          messages: updatedMessages,
          updatedAt: Date.now(),
        };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  const togglePinSession = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s));
  };

  const togglePinMessage = (sessionId: string, messageId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)
        };
      }
      return s;
    }));
  };

  const addStroke = (sessionId: string, messageId: string, stroke: Stroke) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === messageId) {
              return { ...m, strokes: [...(m.strokes || []), stroke] };
            }
            return m;
          })
        };
      }
      return s;
    }));
  };

  const setStrokes = (sessionId: string, messageId: string, strokes: Stroke[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === messageId) {
              return { ...m, strokes };
            }
            return m;
          })
        };
      }
      return s;
    }));
  };

  const updateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    createSession,
    addMessage,
    deleteSession,
    togglePinSession,
    togglePinMessage,
    addStroke,
    setStrokes,
    updateSessionTitle
  };
}

export function useSettingsStore() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('broxa_ai_settings');
      return saved ? JSON.parse(saved) : { enableEffects: true, theme: 'dark', secondaryColor: '#22c55e', customInstruction: '', backgroundImage: null, selectionColor: '#3b82f6' };
    } catch (e) {
      console.warn('localStorage is not available', e);
      return { enableEffects: true, theme: 'dark', secondaryColor: '#22c55e', customInstruction: '', backgroundImage: null, selectionColor: '#3b82f6' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('broxa_ai_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('localStorage is not available', e);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    setSettings((s: any) => ({ ...s, ...newSettings }));
  };

  return { settings, updateSettings };
}

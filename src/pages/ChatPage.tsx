import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, MessageSquare, Trash2, Send, Image as ImageIcon, X, Settings, Pin, Highlighter, AlertTriangle, Undo2, Redo2, Eraser, Copy, Check, ChevronDown } from 'lucide-react';
import { useChatStore, useSettingsStore } from '../store';
import { generateResponse, generateTitle } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Point } from '../types';

const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="25" r="14" fill="var(--color-sec)" />
    <path d="M50 45 L20 30 C 10 25, 0 40, 15 55 L50 90 L85 55 C 100 40, 90 25, 80 30 Z" stroke="var(--color-sec)" strokeWidth="10" strokeLinejoin="round" />
    <path d="M30 45 L50 60 L70 45" stroke="#2B5B9E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 55 L50 68 L65 55" stroke="#2B5B9E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MessageItem = ({ msg, sessionId, settings, isHighlightMode, isEraserMode, highlightColor, togglePinMessage, addStroke, onStrokeStart }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
        drawAll();
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    };
  }, [msg.strokes, currentStroke, settings.theme]);

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (points: Point[], color: string, isEraser?: boolean) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 20;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.4;
      }
      ctx.stroke();
    };

    msg.strokes?.forEach((s: any) => drawStroke(s.points, s.color, s.isEraser));
    if (currentStroke.length > 0) {
      drawStroke(currentStroke, highlightColor, isEraserMode);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    drawAll();
  }, [msg.strokes, currentStroke, highlightColor]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHighlightMode || msg.role !== 'ai') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDrawing(true);
    setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !isHighlightMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrentStroke(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const newStroke = { color: highlightColor, points: currentStroke, isEraser: isEraserMode };
      addStroke(sessionId, msg.id, newStroke);
      if (onStrokeStart) onStrokeStart(msg.id, newStroke);
    }
    setCurrentStroke([]);
  };

  return (
    <motion.div 
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative`}
    >
      {msg.role === 'ai' && (
        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
          <Logo className="w-6 h-6" />
        </div>
      )}
      <div 
        ref={containerRef}
        className={`relative max-w-[85%] md:max-w-[75%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user' ? 'bg-[var(--bg-surface)] text-[var(--text-base)] rounded-tr-sm border border-[var(--border-subtle)]' : 'bg-transparent text-[var(--text-base)]'}`}
      >
        {msg.role === 'ai' && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 z-10 ai-message-canvas rounded-3xl ${isHighlightMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
          />
        )}
        
        {msg.role === 'ai' && (
          <div className="absolute -right-12 top-2 flex flex-col gap-2 z-20">
            <button 
              onClick={() => togglePinMessage(sessionId, msg.id)}
              className={`p-2 rounded-full transition-colors ${msg.isPinned ? 'text-[var(--color-sec)] bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]'}`}
              title={msg.isPinned ? "Desmarcar como importante" : "Marcar como importante"}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button 
              onClick={handleCopy}
              className="p-2 rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]"
              title="Copiar mensagem"
            >
              {isCopied ? <Check className="w-4 h-4 text-[var(--color-sec)]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className="relative z-0 message-content">
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="Upload" className="max-w-sm w-full rounded-2xl mb-4 object-contain shadow-lg border border-[var(--border-strong)]" />
          )}
          {msg.content && (
            <div className={`prose ${settings.theme === 'dark' ? 'prose-invert' : ''} max-w-none highlight-strong-no-effect ${msg.role === 'user' ? 'prose-p:leading-relaxed' : 'prose-p:leading-relaxed prose-pre:bg-[var(--bg-input)] prose-pre:border prose-pre:border-[var(--border-strong)] prose-pre:rounded-2xl'}`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap m-0">{msg.content}</p>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({node, ...props}) => <strong style={{ color: settings.secondaryColor }} {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function ChatPage() {
  const navigate = useNavigate();
  const { sessions, currentSessionId, setCurrentSessionId, currentSession, createSession, addMessage, deleteSession, togglePinSession, togglePinMessage, addStroke, setStrokes, updateSessionTitle } = useChatStore();
  const { settings, updateSettings } = useSettingsStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSettingsConfirm, setShowSettingsConfirm] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [isPinnedMessagesOpen, setIsPinnedMessagesOpen] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#eab308');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [undoStack, setUndoStack] = useState<{messageId: string, stroke: any}[]>([]);
  const [redoStack, setRedoStack] = useState<{messageId: string, stroke: any}[]>([]);
  const [selectedModel, setSelectedModel] = useState<'thinking' | 'fast' | 'search' | 'as'>('thinking');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [searchLogs, setSearchLogs] = useState<string[]>([]);
  const [shakeInput, setShakeInput] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(60);

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const newHeight = Math.max(60, Math.min(window.innerHeight * 0.6, startHeightRef.current + deltaY));
    setTextareaHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = textareaHeight;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pinnedSessions = sessions.filter(s => s.isPinned);
  const unpinnedSessions = sessions.filter(s => !s.isPinned);
  const pinnedMessages = currentSession?.messages.filter(m => m.isPinned) || [];
  const hasHighlights = currentSession?.messages.some(m => m.strokes && m.strokes.length > 0);

  const latestState = useRef({ sessions, currentSessionId, setStrokes, addStroke });
  useEffect(() => {
    latestState.current = { sessions, currentSessionId, setStrokes, addStroke };
  });

  useEffect(() => {
    if (!textareaRef.current) return;
    let lastHeight = 0;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const maxHeight = window.innerHeight * 0.6;
        const currentHeight = entry.contentRect.height;
        if (currentHeight >= maxHeight - 5 && lastHeight < maxHeight - 5) {
          setShakeInput(true);
          setTimeout(() => setShakeInput(false), 500);
        }
        lastHeight = currentHeight;
      }
    });
    observer.observe(textareaRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCloseSettings = () => {
    if (JSON.stringify(tempSettings) !== JSON.stringify(settings)) {
      setShowSettingsConfirm(true);
    } else {
      setIsSettingsOpen(false);
    }
  };

  const handleBgUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setTempSettings({ ...tempSettings, backgroundImage: canvas.toDataURL('image/jpeg', 0.6) });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmSettingsClose = (save: boolean) => {
    if (save) {
      updateSettings(tempSettings);
    } else {
      setTempSettings(settings);
    }
    setShowSettingsConfirm(false);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setTempSettings(settings);
    }
  }, [isSettingsOpen, settings]);

  const handleAddStrokeToStack = (messageId: string, stroke: any) => {
    setUndoStack(prev => [...prev, { messageId, stroke }]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const lastAction = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setRedoStack(r => [...r, lastAction]);
      
      const { sessions, currentSessionId, setStrokes } = latestState.current;
      const msg = sessions.find(s => s.id === currentSessionId)?.messages.find(m => m.id === lastAction.messageId);
      if (msg && msg.strokes) {
        const newStrokes = msg.strokes.filter(s => s !== lastAction.stroke);
        setStrokes(currentSessionId!, lastAction.messageId, newStrokes);
      }
      return newStack;
    });
  };

  const handleRedo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const actionToRedo = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      setUndoStack(u => [...u, actionToRedo]);
      
      const { currentSessionId, addStroke } = latestState.current;
      addStroke(currentSessionId!, actionToRedo.messageId, actionToRedo.stroke);
      return newStack;
    });
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--color-sec', settings.secondaryColor);
    document.documentElement.style.setProperty('--selection-color', settings.selectionColor || '#3b82f6');
    if (settings.theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [settings.secondaryColor, settings.theme, settings.selectionColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9' || e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        showError('Acesso ao console bloqueado por segurança.');
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (isHighlightMode) {
        const target = e.target as HTMLElement;
        if (!target.closest('.ai-message-canvas') && !target.closest('.highlighter-tools')) {
          showError('Você só pode grifar as respostas da IA!');
        }
      }
    };
    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [isHighlightMode]);

  useEffect(() => {
    const checkMemory = () => {
      if ((performance as any).memory) {
        const used = (performance as any).memory.usedJSHeapSize;
        if (used > 1073741824) { // 1GB
          setIsOverloaded(true);
        }
      }
    };
    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, createSession, setCurrentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-[var(--border-strong)]');
      setTimeout(() => el.classList.remove('bg-[var(--border-strong)]'), 2000);
    }
    setIsPinnedMessagesOpen(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImageMimeType(null);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userMessageContent = input.trim();
    const userImageUrl = selectedImage;
    const userImageMimeType = selectedImageMimeType;

    const isFirstMessage = !currentSession || currentSession.messages.length === 0;

    addMessage(sessionId, {
      role: 'user',
      content: userMessageContent,
      imageUrl: userImageUrl || undefined,
    });

    if (isFirstMessage && userMessageContent) {
      generateTitle(userMessageContent).then(title => {
        updateSessionTitle(sessionId, title);
      }).catch(console.error);
    }

    setInput('');
    setSelectedImage(null);
    setSelectedImageMimeType(null);
    setIsLoading(true);
    
    setTimeout(scrollToBottom, 100);

    try {
      if (selectedModel === 'search') {
        setIsSearching(true);
        setIsTerminalOpen(true);
        setSearchLogs(['[SISTEMA] Iniciando máquina virtual...', '[REDE] Conectando aos servidores de verificação...']);
        
        const logs = [
          '[CHECKER] Analisando texto com GPTZero...',
          '[CHECKER] Analisando texto com ZeroGPT...',
          '[CHECKER] Analisando texto com Winston AI...',
          '[CHECKER] Analisando texto com Copyleaks...',
          '[ALERTA] Resultado inicial: Alta probabilidade de IA detectada.',
          '[PROCESSAMENTO] Iniciando processo de reescrita anti-detecção...',
          '[PROCESSAMENTO] Ajustando vocabulário e estrutura de frases...',
          '[PROCESSAMENTO] Adicionando imperfeições humanas sutis...',
          '[CHECKER] Re-verificando com GPTZero... 0% IA.',
          '[CHECKER] Re-verificando com ZeroGPT... 0% IA.',
          '[CHECKER] Re-verificando com Winston AI... 0% IA.',
          '[CHECKER] Re-verificando com Copyleaks... 0% IA.',
          '[SISTEMA] Sucesso! Texto finalizado e pronto para entrega.'
        ];

        for (let i = 0; i < logs.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 800));
          setSearchLogs(prev => [...prev, logs[i]]);
        }
      }

      const responseText = await generateResponse(userMessageContent, userImageUrl || undefined, userImageMimeType || undefined, selectedModel, settings.customInstruction);
      addMessage(sessionId, {
        role: 'ai',
        content: responseText || "Sem resposta.",
      });
    } catch (error: any) {
      console.error("Error generating response:", error);
      let errorMessage = "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.";
      
      const errorString = error?.toString() || "";
      let errorJson = "";
      try {
        errorJson = JSON.stringify(error);
      } catch (e) {}
      
      const isQuotaError = 
        error?.status === 429 || 
        error?.error?.code === 429 ||
        error?.message?.includes("429") || 
        error?.message?.includes("quota") || 
        error?.status === "RESOURCE_EXHAUSTED" ||
        error?.error?.status === "RESOURCE_EXHAUSTED" ||
        errorString.includes("429") ||
        errorString.includes("quota") ||
        errorString.includes("RESOURCE_EXHAUSTED") ||
        errorJson.includes("429") ||
        errorJson.includes("quota") ||
        errorJson.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        errorMessage = "O limite de uso da API foi excedido (Erro 429). Por favor, verifique sua cota no Google AI Studio ou tente novamente mais tarde.";
      } else if (errorString.includes("A chave da API do Gemini não está configurada") || error?.message?.includes("A chave da API")) {
        errorMessage = "A chave da API do Gemini não está configurada. Para que o site funcione na Netlify, você precisa adicionar a variável de ambiente `GEMINI_API_KEY` nas configurações do seu projeto na Netlify.";
      }

      addMessage(sessionId, {
        role: 'ai',
        content: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setIsTerminalOpen(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

const TypingTitle = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (text !== prevTextRef.current && text !== 'Nova Conversa') {
      setIsTyping(true);
      setDisplayedText('');
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 50);
      prevTextRef.current = text;
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
      prevTextRef.current = text;
    }
  }, [text]);

  return (
    <span className="text-sm truncate">
      {displayedText}
      {isTyping && <span className="animate-pulse">|</span>}
    </span>
  );
};

  const renderSession = (session: any) => (
    <motion.div 
      key={session.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => setCurrentSessionId(session.id)}
      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-[var(--bg-surface)] text-[var(--text-base)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-base)]'}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <TypingTitle text={session.title} />
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); togglePinSession(session.id); }}
          className={`p-1 transition-colors ${session.isPinned ? 'text-[var(--color-sec)]' : 'hover:text-[var(--text-base)]'}`}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
          className="p-1 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div 
      className="flex h-screen bg-[var(--bg-base)] text-[var(--text-base)] font-sans overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {settings.backgroundImage && (
        <div 
          className="absolute inset-0 z-0 opacity-30 blur-sm pointer-events-none bg-cover bg-center bg-no-repeat mix-blend-overlay"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        />
      )}
      <div className="flex w-full h-full relative z-10">
        <AnimatePresence>
          {errorToast && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              onClick={() => setErrorToast(null)}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 cursor-pointer group"
            >
              <AlertTriangle className="w-5 h-5" />
              {errorToast}
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full p-1">
                <X className="w-4 h-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {isOverloaded && (
          <motion.div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-4">Este sistema evita travamentos no site, inicie uma nova conversa ou tente novamente mais tarde</h2>
            <p className="text-red-400 text-xl">Ah não, sua conversa sobrecarregou</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white text-black rounded-xl font-bold">Recarregar Página</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-strong)] w-full max-w-md m-4 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] shrink-0">
                <h3 className="text-xl font-bold text-[var(--text-base)]">Configurações</h3>
                <button onClick={handleCloseSettings} className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Tema</span>
                  <div className="radio-group">
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="dark" 
                        checked={tempSettings.theme === 'dark'}
                        onChange={() => setTempSettings({ ...tempSettings, theme: 'dark' })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Escuro</span>
                    </label>
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="theme" 
                        value="light" 
                        checked={tempSettings.theme === 'light'}
                        onChange={() => setTempSettings({ ...tempSettings, theme: 'light' })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Claro</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Efeitos Visuais</span>
                  <div className="radio-group">
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="effects" 
                        checked={tempSettings.enableEffects}
                        onChange={() => setTempSettings({ ...tempSettings, enableEffects: true })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Ativado</span>
                    </label>
                    <label className="radio">
                      <input 
                        type="radio" 
                        name="effects" 
                        checked={!tempSettings.enableEffects}
                        onChange={() => setTempSettings({ ...tempSettings, enableEffects: false })}
                      />
                      <span className="radio-visual">
                        <span className="radio-dot"></span>
                      </span>
                      <span className="radio-label text-[var(--text-base)]">Desativado</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-base)] font-medium">Cor Secundária</span>
                  <input 
                    type="color" 
                    value={tempSettings.secondaryColor}
                    onChange={e => setTempSettings({ ...tempSettings, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-base)] font-medium">Cor de Seleção</span>
                  <input 
                    type="color" 
                    value={tempSettings.selectionColor || '#3b82f6'}
                    onChange={e => setTempSettings({ ...tempSettings, selectionColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Imagem de Fundo</span>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-sec)] hover:bg-[var(--bg-surface)] transition-colors relative overflow-hidden"
                      onClick={() => document.getElementById('bg-upload')?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleBgUpload(file);
                      }}
                    >
                      {tempSettings.backgroundImage ? (
                        <img src={tempSettings.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-[var(--text-muted)] mb-1" />
                          <span className="text-[10px] text-[var(--text-muted)] text-center px-2">Clique ou arraste</span>
                        </>
                      )}
                      <input 
                        id="bg-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBgUpload(file);
                        }}
                      />
                    </div>
                    {tempSettings.backgroundImage && (
                      <button 
                        onClick={() => setTempSettings({ ...tempSettings, backgroundImage: null })}
                        className="text-sm text-red-500 hover:text-red-400"
                      >
                        Remover Fundo
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[var(--text-base)] font-medium">Comportamento da IA (Instrução Customizada)</span>
                  <textarea 
                    value={tempSettings.customInstruction || ''}
                    onChange={e => setTempSettings({ ...tempSettings, customInstruction: e.target.value })}
                    placeholder="Deixe em branco para usar o padrão. Ex: Responda como um pirata..."
                    className="w-full bg-[var(--bg-input)] text-[var(--text-base)] border border-[var(--border-subtle)] rounded-xl p-3 min-h-[100px] resize-y focus:outline-none focus:border-[var(--color-sec)]"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[var(--bg-panel)] p-6 rounded-3xl border border-[var(--border-strong)] w-full max-w-sm m-4 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-[var(--text-base)]">Salvar alterações?</h3>
              <p className="text-[var(--text-muted)] mb-6">Você fez alterações nas configurações. Deseja salvá-las antes de sair?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => confirmSettingsClose(false)}
                  className="flex-1 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-base)] hover:bg-[var(--border-subtle)] transition-colors"
                >
                  Descartar
                </button>
                <button 
                  onClick={() => confirmSettingsClose(true)}
                  className="flex-1 py-2 rounded-xl bg-[var(--color-sec)] text-white hover:opacity-90 transition-opacity"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm border-4 border-dashed border-[var(--color-sec)] flex items-center justify-center"
          >
            <div className="text-2xl font-bold text-white flex flex-col items-center gap-4">
              <ImageIcon className="w-16 h-16 text-[var(--color-sec)] animate-bounce" />
              Solte a imagem aqui
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed z-[100] flex items-center justify-center transition-all duration-500 ${isTerminalOpen ? 'inset-0 bg-black/90 backdrop-blur-md' : 'bottom-24 right-8 w-64 h-16 bg-transparent cursor-pointer hover:scale-105'}`}
            onClick={() => !isTerminalOpen && setIsTerminalOpen(true)}
          >
            <div className={`w-full bg-black border border-green-500/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.2)] font-mono transition-all duration-500 ${isTerminalOpen ? 'max-w-2xl' : 'h-full'}`}>
              <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-green-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-green-500 text-sm font-bold">BROXA_VM</span>
                </div>
                {isTerminalOpen && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsTerminalOpen(false); }}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {isTerminalOpen ? (
                <div className="p-6 h-96 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                  {searchLogs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-sm ${log.includes('[ALERTA]') ? 'text-red-400' : log.includes('[SISTEMA]') ? 'text-blue-400' : 'text-green-400'}`}
                    >
                      <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                      {log}
                    </motion.div>
                  ))}
                  <div className="animate-pulse text-green-500">_</div>
                </div>
              ) : (
                <div className="px-4 py-2 h-full flex items-center">
                  <span className="text-green-500 text-xs truncate animate-pulse">
                    {searchLogs[searchLogs.length - 1] || "Processando..."}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-4 flex items-center justify-between">
          <div className={`flex items-center gap-3 text-lg font-bold ${settings.enableEffects ? 'broxa-title' : 'text-[var(--text-base)]'}`}>
            <Logo className="w-8 h-8" />
            BROXA AI
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-base)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pb-4">
          <button 
            onClick={() => createSession()}
            className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--bg-surface)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-2xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {pinnedSessions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">Conversas Favoritadas</div>
              <div className="space-y-1">
                <AnimatePresence>
                  {pinnedSessions.map(renderSession)}
                </AnimatePresence>
              </div>
            </div>
          )}
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">Histórico</div>
          <div className="space-y-1">
            <AnimatePresence>
              {unpinnedSessions.map(renderSession)}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)]">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-base)] transition-colors w-full p-2 rounded-xl hover:bg-[var(--bg-surface)]"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-base)] relative rounded-l-3xl md:rounded-l-[40px] border-l border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-base)]">
              <Menu className="w-5 h-5" />
            </button>
            <div className={`md:hidden flex items-center gap-2 text-[var(--text-base)] font-bold ${settings.enableEffects ? 'broxa-title' : ''}`}>
              <Logo className="w-6 h-6" />
              BROXA AI
            </div>
            
            <div className="flex items-center">
              <div className="relative">
                <button 
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-2 text-[var(--text-base)] font-bold text-base md:text-lg hover:bg-[var(--bg-surface)] px-3 py-2 rounded-xl transition-colors"
                >
                  BROXA {selectedModel === 'thinking' ? '1.0 Thinking' : selectedModel === 'fast' ? '1.0 Fast' : selectedModel === 'search' ? '0.5 Search' : '0.5 A.S'}
                  <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                </button>

                <AnimatePresence>
                  {isModelDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-[280px] md:w-80 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2">
                      <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-2">Latest</div>
                      
                      <button 
                        onClick={() => { setSelectedModel('thinking'); setIsModelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors ${selectedModel === 'thinking' ? 'bg-[var(--bg-surface)]' : ''}`}
                      >
                        <div>
                          <div className="font-bold text-[var(--text-base)]">Thinking 1.0</div>
                          <div className="text-xs text-[var(--text-muted)]">Pensa mais para gerar respostas melhores</div>
                        </div>
                        {selectedModel === 'thinking' && <Check className="w-5 h-5 text-[var(--text-base)]" />}
                      </button>

                      <button 
                        onClick={() => { setSelectedModel('fast'); setIsModelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors ${selectedModel === 'fast' ? 'bg-[var(--bg-surface)]' : ''}`}
                      >
                        <div>
                          <div className="font-bold text-[var(--text-base)]">Fast 1.0</div>
                          <div className="text-xs text-[var(--text-muted)]">Respostas imediatas</div>
                        </div>
                        {selectedModel === 'fast' && <Check className="w-5 h-5 text-[var(--text-base)]" />}
                      </button>

                      <button 
                        onClick={() => { setSelectedModel('search'); setIsModelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors ${selectedModel === 'search' ? 'bg-[var(--bg-surface)]' : ''}`}
                      >
                        <div>
                          <div className="font-bold text-[var(--text-base)] flex items-center gap-2">Search 0.5 <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">BETA</span></div>
                          <div className="text-xs text-[var(--text-muted)]">Reescrita anti-detecção de IA</div>
                        </div>
                        {selectedModel === 'search' && <Check className="w-5 h-5 text-[var(--text-base)]" />}
                      </button>

                      <button 
                        onClick={() => { setSelectedModel('as'); setIsModelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--bg-surface)] transition-colors ${selectedModel === 'as' ? 'bg-[var(--bg-surface)]' : ''}`}
                      >
                        <div>
                          <div className="font-bold text-[var(--text-base)] flex items-center gap-2">A.S 0.5 <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">BETA</span></div>
                          <div className="text-xs text-[var(--text-muted)]">Resumo</div>
                        </div>
                        {selectedModel === 'as' && <Check className="w-5 h-5 text-[var(--text-base)]" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button onClick={() => setIsPinnedMessagesOpen(!isPinnedMessagesOpen)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] relative">
                <Pin className="w-5 h-5" />
                {pinnedMessages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-sec)] rounded-full"></span>}
              </button>
              
              <AnimatePresence>
                {isPinnedMessagesOpen && (
                  <motion.div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-[var(--border-subtle)] font-bold text-[var(--text-base)]">Mensagens Fixadas</div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {pinnedMessages.length === 0 ? (
                        <div className="text-center text-[var(--text-muted)] p-4 text-sm">Nenhuma mensagem fixada.</div>
                      ) : (
                        pinnedMessages.map(m => (
                          <div key={m.id} onClick={() => scrollToMessage(m.id)} className="p-3 bg-[var(--bg-surface)] rounded-xl cursor-pointer hover:bg-[var(--border-strong)] transition-colors text-sm text-[var(--text-base)] line-clamp-3">
                            {m.content}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {!currentSession?.messages.length ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center mt-32"
              >
                <div className="w-24 h-24 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6 shadow-lg border border-[var(--border-strong)]">
                  <Logo className="w-14 h-14" />
                </div>
                <h2 className="text-3xl font-semibold mb-3">Como posso ajudar hoje?</h2>
                <p className="text-[var(--text-muted)] max-w-md text-lg">
                  Envie uma foto da sua tarefa ou faça uma pergunta. Estou aqui para fornecer respostas precisas e organizadas.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {currentSession.messages.map((msg) => (
                  <MessageItem 
                    key={msg.id} 
                    msg={msg} 
                    sessionId={currentSessionId} 
                    settings={settings} 
                    isHighlightMode={isHighlightMode || isEraserMode} 
                    isEraserMode={isEraserMode}
                    highlightColor={highlightColor} 
                    togglePinMessage={togglePinMessage} 
                    addStroke={addStroke} 
                    onStrokeStart={handleAddStrokeToStack}
                  />
                ))}
              </AnimatePresence>
            )}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 justify-start"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-1 shadow-lg border border-[var(--border-strong)]">
                  <Logo className="w-6 h-6" />
                </div>
                <div className="px-6 py-5 flex items-center gap-3 text-[var(--text-muted)] bg-transparent rounded-3xl rounded-tl-sm">
                  <div className="jumping-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pt-12 pb-6 px-4 md:px-8 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full mb-4 left-0 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-strong)] flex items-start gap-2 shadow-2xl"
                >
                  <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-xl" />
                  <button onClick={removeImage} className="p-1.5 bg-black/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors absolute top-3 right-3 shadow-md backdrop-blur-sm">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`bg-[var(--bg-input)] border rounded-3xl flex flex-col shadow-2xl overflow-hidden focus-within:ring-1 transition-all ${shakeInput ? 'animate-shake border-red-500 ring-1 ring-red-500' : 'border-[var(--border-strong)] focus-within:border-[var(--border-strong)] focus-within:ring-[var(--border-strong)]'}`}>
              <div 
                className="w-full h-3 cursor-ns-resize flex items-center justify-center hover:bg-[var(--border-subtle)] transition-colors opacity-50 hover:opacity-100"
                onMouseDown={handleResizeStart}
              >
                <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]"></div>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (isHighlightMode) setIsHighlightMode(false);
                  if (isEraserMode) setIsEraserMode(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Envie uma mensagem, cole ou arraste uma foto..."
                className="w-full bg-transparent text-[var(--text-base)] placeholder-[var(--text-muted)] px-5 py-2 resize-none focus:outline-none custom-scrollbar text-base"
                style={{ height: `${textareaHeight}px` }}
              />
              <div className="flex items-end justify-between px-3 pb-3 pt-1 gap-2">
                <div className="flex flex-wrap items-center gap-1 highlighter-tools flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)] rounded-2xl transition-colors"
                    title="Anexar imagem"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-[var(--border-strong)] mx-1"></div>
                  <button 
                    onClick={() => {
                      setIsHighlightMode(!isHighlightMode);
                      if (isEraserMode) setIsEraserMode(false);
                    }}
                    className={`p-2.5 rounded-2xl transition-colors ${isHighlightMode && !isEraserMode ? 'bg-[var(--color-sec)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]'}`}
                    title="Modo Marca-texto"
                  >
                    <Highlighter className="w-5 h-5" />
                  </button>
                  {hasHighlights && (
                    <button 
                      onClick={() => {
                        setIsEraserMode(!isEraserMode);
                        if (!isHighlightMode) setIsHighlightMode(true);
                      }}
                      className={`p-2.5 rounded-2xl transition-colors ${isEraserMode ? 'bg-[var(--text-base)] text-[var(--bg-base)]' : 'text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--border-subtle)]'}`}
                      title="Borracha"
                    >
                      <Eraser className="w-5 h-5" />
                    </button>
                  )}
                  <AnimatePresence>
                    {isHighlightMode && !isEraserMode && (
                      <motion.div
                        initial={{ width: 0, opacity: 0, scale: 0.8 }}
                        animate={{ width: 'auto', opacity: 1, scale: 1 }}
                        exit={{ width: 0, opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 bg-[var(--bg-surface)] rounded-full px-2 py-1.5 border border-[var(--border-strong)] ml-2 overflow-hidden shadow-sm"
                      >
                        {['#22c55e', '#eab308', '#ec4899', '#3b82f6', '#a855f7'].map(color => (
                          <button
                            key={color}
                            onClick={() => setHighlightColor(color)}
                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${highlightColor === color ? 'ring-2 ring-offset-2 ring-[var(--text-base)] ring-offset-[var(--bg-surface)]' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <div className="w-px h-4 bg-[var(--border-strong)] mx-1 flex-shrink-0"></div>
                        <button
                          onClick={() => setIsHighlightMode(false)}
                          className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors flex-shrink-0"
                          title="Sair do modo marca-texto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {(undoStack.length > 0 || redoStack.length > 0) && (
                    <div className="flex items-center gap-1 ml-2 border-l border-[var(--border-strong)] pl-2">
                      <button 
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 transition-colors"
                        title="Desfazer (Ctrl+Z)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-base)] disabled:opacity-30 transition-colors"
                        title="Refazer (Ctrl+Y)"
                      >
                        <Redo2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className="p-3 bg-[var(--text-base)] hover:opacity-80 disabled:opacity-50 text-[var(--bg-base)] rounded-2xl transition-all flex items-center justify-center shadow-lg disabled:shadow-none shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="text-center mt-4 text-xs text-[var(--text-muted)]">
              BROXA AI pode cometer erros. Considere verificar informações importantes. <span className="text-red-500/80 font-medium">Não utilize essa ia para respostas em trabalhos importantes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

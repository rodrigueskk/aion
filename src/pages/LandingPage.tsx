import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoading(false), 500);
          return 100;
        }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#111] text-[#e0e0e0] overflow-hidden relative selection:bg-green-500/30">
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 preloader-bg flex justify-center items-center z-[10000]"
          >
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-8 flex justify-center items-center">
                <svg className="ghost-svg" viewBox="0 0 100 100" width="64" height="64">
                  <path className="ghost-body" d="M20,50 Q20,20 50,20 Q80,20 80,50 L80,80 L70,70 L60,80 L50,70 L40,80 L30,70 L20,80 Z" />
                  <circle className="ghost-eye left-eye" cx="40" cy="45" r="5" />
                  <circle className="ghost-eye right-eye" cx="60" cy="45" r="5" />
                </svg>
              </div>
              <div className="loading-text-anim text-xs uppercase mb-3">INICIANDO SISTEMA...</div>
              <div className="w-24 h-[1px] mx-auto rounded-sm overflow-hidden bg-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-[#00ff80] to-[#00cc66] transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="fixed inset-0 flex flex-col justify-center items-center p-5 text-center"
        >
          <div className="max-w-[90%] overflow-hidden mb-[5vh]">
            <h1 className="quote-font text-[6vw] leading-[1.3] font-normal uppercase">
              NOVA IA SECRETA DO GLORINHA FEITA POR KA_ANONIM0
            </h1>
          </div>
          
          <button 
            onClick={() => navigate('/chat')}
            className="mt-8 px-8 py-4 bg-black text-white font-bold tracking-wider rounded-full border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:border-green-500/60 transition-all duration-300 flex items-center gap-3"
          >
            ACESSAR SISTEMA
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </button>
        </motion.div>
      )}
    </div>
  );
}

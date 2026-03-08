import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CaptchaProps {
  onSuccess: () => void;
}

export default function CaptchaPage({ onSuccess }: CaptchaProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleCheck = () => {
    if (isChecked || isVerifying) return;
    setIsVerifying(true);
    
    // Simulate network delay for verification
    setTimeout(() => {
      setIsVerifying(false);
      setIsChecked(true);
      setTimeout(() => {
        onSuccess();
      }, 500);
    }, 1500);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a] text-white font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#141414] p-8 rounded-3xl border border-zinc-800 flex flex-col items-center max-w-sm w-full mx-4 shadow-2xl"
      >
        <ShieldAlert className="w-16 h-16 text-zinc-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2 text-center">Verificação de Segurança</h2>
        <p className="text-zinc-400 text-center mb-8 text-sm">
          Por favor, confirme que você é humano para acessar a BROXA AI.
        </p>

        <div 
          onClick={handleCheck}
          className={`w-full p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all ${
            isChecked 
              ? 'border-green-500/50 bg-green-500/10' 
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
          }`}
        >
          <div className="w-8 h-8 rounded-md border-2 border-zinc-600 flex items-center justify-center bg-black shrink-0">
            {isVerifying && (
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            )}
            {isChecked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </motion.div>
            )}
          </div>
          <span className={`font-medium ${isChecked ? 'text-green-500' : 'text-zinc-300'}`}>
            {isVerifying ? 'Verificando...' : isChecked ? 'Verificado' : 'Sou humano'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

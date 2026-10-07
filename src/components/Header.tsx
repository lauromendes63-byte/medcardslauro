import React from 'react';
import { Flame, Sparkles, Settings } from 'lucide-react';
import { ProgressoDiario } from '../types';
import { MEDCARDS_SVG_DATA_URI } from '../utils/pwaSetup';

interface HeaderProps {
  progresso: ProgressoDiario;
  onExportar: () => void;
  onResetar: () => void;
  onAbrirImportExport?: () => void;
  onAbrirConfiguracoes?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  progresso,
  onAbrirImportExport,
  onAbrirConfiguracoes,
}) => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/75 py-2.5 px-3.5 sm:px-6 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Marca Minimalista */}
        <div className="flex items-center gap-2.5">
          <img 
            src={MEDCARDS_SVG_DATA_URI} 
            alt="MedCards" 
            className="w-7 h-7 rounded-xl object-cover border border-zinc-200/60" 
          />
          <span className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-none">
            MedCards
          </span>
        </div>

        {/* Lado Direito: Streak e Ações Rápidas */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sequência / Streak */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-semibold"
            title={`${progresso.sequenciaDias} dias seguidos de estudo ativo`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{progresso.sequenciaDias}d</span>
          </div>

          {/* Importador Inteligente / Prompt Gemini */}
          {onAbrirImportExport && (
            <button
              id="btn-import-export-header"
              onClick={onAbrirImportExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer touch-instant shadow-2xs"
              title="Prompt ao Gemini, importar flashcards ou exportar dados"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Gemini & IA</span>
            </button>
          )}

          {/* Atalho Configurações */}
          {onAbrirConfiguracoes && (
            <button
              onClick={onAbrirConfiguracoes}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer touch-instant"
              title="Configurações e Backup"
            >
              <Settings className="w-4 h-4" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


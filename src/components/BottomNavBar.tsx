import React from 'react';
import { 
  LayoutGrid, 
  RotateCcw, 
  Plus,
  GraduationCap, 
  BarChart3,
} from 'lucide-react';
import { TabNavegacao } from '../types';

interface BottomNavBarProps {
  tabAtiva: TabNavegacao;
  onTabChange: (tab: TabNavegacao) => void;
  pendentesHojeCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  tabAtiva,
  onTabChange,
  pendentesHojeCount,
}) => {
  return (
    <nav 
      id="nav-inferior-fixa"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] px-2 sm:px-6 touch-manipulation select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1">
        
        {/* Tab 1: Eixos */}
        <button
          id="tab-btn-eixos"
          onClick={() => onTabChange('eixos')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer min-h-[48px] touch-instant ${
            tabAtiva === 'eixos' 
              ? 'text-zinc-900 font-bold bg-zinc-100/90' 
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <LayoutGrid className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] tracking-tight mt-0.5">Eixos</span>
        </button>

        {/* Tab 2: Revisões */}
        <button
          id="tab-btn-revisoes"
          onClick={() => onTabChange('revisoes')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer min-h-[48px] touch-instant ${
            tabAtiva === 'revisoes' 
              ? 'text-zinc-900 font-bold bg-zinc-100/90' 
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <div className="relative">
            <RotateCcw className="w-5 h-5 stroke-[1.9]" />
            {pendentesHojeCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {pendentesHojeCount > 99 ? '99+' : pendentesHojeCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Revisões</span>
        </button>

        {/* Tab 3: Criar Card (Destaque Central Minimalista) */}
        <button
          id="tab-btn-criar-card"
          onClick={() => onTabChange('criar_card')}
          className="flex flex-col items-center justify-center -mt-3 group cursor-pointer min-h-[52px] touch-instant"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm ${
            tabAtiva === 'criar_card'
              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
              : 'bg-zinc-900 hover:bg-zinc-800 text-white'
          }`}>
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className={`text-[9.5px] tracking-tight mt-0.5 font-semibold ${
            tabAtiva === 'criar_card' ? 'text-emerald-700' : 'text-zinc-600'
          }`}>
            Criar
          </span>
        </button>

        {/* Tab 4: Provas / Treino */}
        <button
          id="tab-btn-provas"
          onClick={() => onTabChange('provas')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer min-h-[48px] touch-instant ${
            tabAtiva === 'provas' 
              ? 'text-zinc-900 font-bold bg-zinc-100/90' 
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <GraduationCap className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] tracking-tight mt-0.5">Provas</span>
        </button>

        {/* Tab 5: Métricas */}
        <button
          id="tab-btn-metricas"
          onClick={() => onTabChange('metricas')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer min-h-[48px] touch-instant ${
            tabAtiva === 'metricas' 
              ? 'text-zinc-900 font-bold bg-zinc-100/90' 
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <BarChart3 className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] tracking-tight mt-0.5">Métricas</span>
        </button>

      </div>
    </nav>
  );
};


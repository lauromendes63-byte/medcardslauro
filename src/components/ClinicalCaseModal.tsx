import React, { useState } from 'react';
import { 
  X, 
  Stethoscope, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw,
  Zap,
  FilePenLine,
  Activity,
  Sparkles,
  Clock,
  Lightbulb,
  Trash2
} from 'lucide-react';
import { CardClinico } from '../types';
import { StorageService } from '../services/storage';
import { FormattedClinicalText } from './FormattedClinicalText';
import { extrairPerguntaObjetiva } from '../utils/clinicalTextUtils';
import { EixoEmojiBadge } from './EixoEmojiBadge';

interface ClinicalCaseModalProps {
  card: CardClinico;
  onClose: () => void;
  onRegistrarRevisao: (cardId: string, avaliacao: 'errei' | 'dificil' | 'bom' | 'facil', tempoSegundos: number) => void;
  onEditarCard?: (card: CardClinico) => void;
  onExcluirCard?: (cardId: string) => void;
}

const IsolatedTimerBadge: React.FC<{ paused: boolean; startTime: number }> = React.memo(({ paused, startTime }) => {
  const [tempoDecorrido, setTempoDecorrido] = useState<number>(0);

  React.useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setTempoDecorrido(Math.max(1, Math.round((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, startTime]);

  const min = Math.floor(tempoDecorrido / 60);
  const seg = tempoDecorrido % 60;
  return (
    <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
      <Clock className="w-3 h-3 text-slate-500" />
      <span>{`${min}:${seg.toString().padStart(2, '0')}`}</span>
    </div>
  );
});

export const ClinicalCaseModal: React.FC<ClinicalCaseModalProps> = ({
  card,
  onClose,
  onRegistrarRevisao,
  onEditarCard,
  onExcluirCard,
}) => {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<number | null>(null);
  const [tempoInicio] = useState<number>(Date.now());
  const caso = card.casoClinicoDados;

  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);

  const handleConfirmarExclusaoCard = () => {
    setModalConfirmarExclusao(false);
    if (onExcluirCard) {
      onExcluirCard(card.id);
    } else {
      StorageService.excluirCard(card.id);
    }
    onClose();
  };

  if (!caso) return null;

  const respondeu = opcaoSelecionada !== null;
  const acertou = opcaoSelecionada === caso.indiceCorreto;
  const letras = ['A', 'B', 'C', 'D', 'E'];

  const finalizar = (avaliacao: 'errei' | 'dificil' | 'bom' | 'facil') => {
    const tempoGasto = Math.max(1, Math.round((Date.now() - tempoInicio) / 1000));
    const cardId = card.id;
    onClose();
    requestAnimationFrame(() => {
      setTimeout(() => {
        onRegistrarRevisao(cardId, avaliacao, tempoGasto);
      }, 0);
    });
  };

  const perguntaLimpa = extrairPerguntaObjetiva(card.perguntaGatilho, caso.historiaClinica);

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F7F5] overflow-y-auto min-h-screen text-left flex flex-col justify-start touch-pan-y overscroll-y-contain">
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-2.5 sm:py-3.5 space-y-2.5 flex-1 flex flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))] animate-in fade-in duration-150">
        
        {/* ================================================================= */}
        {/* BARRA SUPERIOR DEDICADA: 1 LINHA, ALINHADA, SEM SOBREPOSIÇÃO      */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl px-3 py-2 sm:py-2.5 border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-2 shrink-0">
          
          {/* Lado Esquerdo: Ícone + Caso Clínico + Especialidade / Tópico */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-3xs">
              <Stethoscope className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 shrink-0">
              Caso Clínico
            </span>
            <EixoEmojiBadge card={card} size="sm" />
            {card.topicoNome && (
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px] hidden md:inline">
                • {card.topicoNome.replace(/^tópico:\s*/i, '')}
              </span>
            )}
          </div>

          {/* Centro: Tempo decorrido e Botão de Editar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <IsolatedTimerBadge paused={respondeu} startTime={tempoInicio} />


            {onEditarCard && (
              <button
                type="button"
                onClick={() => onEditarCard(card)}
                title="Editar este caso clínico"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 flex items-center justify-center transition-all cursor-pointer shadow-3xs active:scale-95"
              >
                <FilePenLine className="w-4 h-4 text-emerald-600" />
              </button>
            )}
          </div>

          {/* Lado Direito: Botão Lixeira + Botão X para Encerrar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setModalConfirmarExclusao(true)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-3xs active:scale-95"
              title="Excluir este caso clínico permanentemente"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-3xs active:scale-95"
              title="Encerrar visualização"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CARD PRINCIPAL COM CONTEÚDO CLÍNICO                               */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5 text-left flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            
            {/* Título do Caso Clínico (Visível por completo, sem corte) */}
            <div className="pb-1.5 border-b border-slate-100 text-left">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                <FormattedClinicalText text={card.titulo} />
              </h2>
            </div>

            {/* Vinheta Médica do Paciente (Quadro Clínico) */}
            <div className="bg-gradient-to-br from-blue-50/60 via-slate-50/80 to-indigo-50/30 p-3 sm:p-4 rounded-2xl border border-blue-100/90 space-y-2 shadow-3xs text-left">
              <div className="flex items-center justify-between pb-1 border-b border-blue-100/60">
                <span className="text-[10px] sm:text-[10.5px] font-black tracking-wider uppercase text-blue-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Quadro Clínico
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">Cenário Real</span>
              </div>

              {/* Fonte Normal, limpa, confortável e justificada até as margens */}
              <div className="text-xs sm:text-[13px] text-slate-950 leading-relaxed font-medium text-left">
                <FormattedClinicalText text={caso.historiaClinica} />
              </div>

              {caso.exameFisicoSinais && (
                <div className="mt-1.5 p-2.5 sm:p-3 bg-white/95 rounded-xl border border-blue-100/80 shadow-3xs text-left space-y-1">
                  <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1">
                    🩺 Exame Físico & Sinais Vitais
                  </span>
                  <div className="text-xs sm:text-[12.5px] text-slate-700 font-normal leading-relaxed">
                    <FormattedClinicalText text={caso.exameFisicoSinais} />
                  </div>
                </div>
              )}
            </div>

            {/* Pergunta de Decisão Clínica (Sem repetição redundante da história) */}
            <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal text-left flex items-start gap-2 pt-0.5">
              <span className="text-blue-600 font-bold shrink-0 mt-0.5 select-none text-sm">➔</span>
              <div className="flex-1">
                <FormattedClinicalText text={perguntaLimpa} />
              </div>
            </div>

            {/* Alternativas de Escolha Única */}
            <div className="space-y-1.5 sm:space-y-2">
              {caso.opcoes.map((opcao, idx) => {
                const isSelected = opcaoSelecionada === idx;
                const isCorrect = idx === caso.indiceCorreto;
                const textoLimpo = opcao.replace(/^[A-Ea-e][\)\.\-]\s*/, '').trim();

                let estilo = 'bg-white border-slate-200/90 text-slate-900 hover:bg-slate-50 shadow-3xs';
                if (respondeu) {
                  if (isCorrect) {
                    estilo = 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 font-semibold shadow-2xs';
                  } else if (isSelected && !isCorrect) {
                    estilo = 'bg-rose-50/90 border-2 border-rose-400 text-rose-950 font-semibold shadow-2xs';
                  } else {
                    estilo = 'bg-slate-50/60 border-slate-200/40 text-slate-400 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={respondeu}
                    onClick={() => setOpcaoSelecionada(idx)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all duration-100 ease-out flex items-start gap-2.5 sm:gap-3 ${estilo} ${
                      !respondeu ? 'cursor-pointer active:scale-[0.99]' : ''
                    }`}
                  >
                    <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition-all mt-0.5 ${
                      respondeu && isCorrect
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : respondeu && isSelected && !isCorrect
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {respondeu && isCorrect ? (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                      ) : respondeu && isSelected && !isCorrect ? (
                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                      ) : (
                        letras[idx]
                      )}
                    </span>
                    <span className="flex-1 text-xs sm:text-[13px] leading-relaxed pt-0.5 font-medium">
                      <FormattedClinicalText text={textoLimpo} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Justificativa Detalhada com FormattedClinicalText */}
            {respondeu && (
              <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-2 animate-in fade-in duration-200 text-left ${
                acertou ? 'bg-emerald-50/60 border-emerald-300' : 'bg-rose-50/60 border-rose-300'
              }`}>
                <div className="flex items-center justify-between pb-1 border-b border-black/5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-3.5 h-3.5 ${acertou ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <span className={`text-xs font-bold ${acertou ? 'text-emerald-950' : 'text-rose-950'}`}>
                      {acertou ? 'Parabéns, Conduta Correta!' : 'Gabarito Oficial & Raciocínio:'}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    acertou ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}>
                    Gabarito: {letras[caso.indiceCorreto]}
                  </span>
                </div>
                
                <div className="text-slate-950">
                  <FormattedClinicalText text={caso.justificativaDetalhada} />
                </div>

                {/* Nota de Fixação de Alto Contraste (Substituindo Pérola Clínica) */}
                {card.perolaClinica && (
                  <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-amber-100/90 border border-amber-300/90 text-slate-950 flex items-start gap-2 shadow-3xs">
                    <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 text-xs sm:text-[12.5px] leading-relaxed">
                      <strong className="text-amber-900 font-black uppercase text-[10px] tracking-wider block mb-0.5">
                        Dica:
                      </strong>
                      <span className="text-slate-900 font-semibold">
                        {card.perolaClinica}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de Avaliação SRS */}
          {respondeu && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 bg-white">
              <span className="text-[10.5px] font-bold text-slate-600 block mb-2 text-center">
                Avaliação de Retenção (SRS):
              </span>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => finalizar('errei')}
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] sm:text-xs transition-transform duration-100 ease-out shadow-3xs active:scale-[0.98] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 mb-0.5" strokeWidth={1.75} />
                  <span>Errei</span>
                </button>
                <button
                  type="button"
                  onClick={() => finalizar('dificil')}
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-[11px] sm:text-xs transition-transform duration-100 ease-out shadow-3xs active:scale-[0.98] cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 mb-0.5" strokeWidth={1.75} />
                  <span>Difícil</span>
                </button>
                <button
                  type="button"
                  onClick={() => finalizar('bom')}
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 font-bold text-[11px] sm:text-xs transition-transform duration-100 ease-out shadow-3xs active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mb-0.5" strokeWidth={1.75} />
                  <span>Bom</span>
                </button>
                <button
                  type="button"
                  onClick={() => finalizar('facil')}
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] sm:text-xs transition-transform duration-100 ease-out shadow-3xs active:scale-[0.98] cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-500 mb-0.5" strokeWidth={1.75} />
                  <span>Fácil</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão do Caso Clínico */}
      {modalConfirmarExclusao && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Excluir Caso Clínico?</h4>
                <p className="text-xs text-slate-500">Tem certeza que deseja excluir permanentemente este caso clínico?</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 line-clamp-2">
              "{card.titulo}"
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalConfirmarExclusao(false)}
                className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusaoCard}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

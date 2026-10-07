import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  RotateCw, 
  RotateCcw, 
  AlertCircle, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  ChevronLeft,
  ChevronRight, 
  PartyPopper, 
  Image as ImageIcon, 
  FileText, 
  Scissors, 
  GitFork, 
  Eye, 
  EyeOff, 
  ArrowDown, 
  Brain,
  Pencil,
  FilePenLine,
  Activity,
  XCircle,
  Trash2,
  CheckCheck,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CardClinico, MascaraImagem, BlocoOclusao, FluxogramaComplexoDados } from '../types';
import { formatarTempoMinutos, obterInfoRodadaCard } from '../utils/timerUtils';
import { StorageService } from '../services/storage';
import { ComplexFlowchartViewer } from './ComplexFlowchartViewer';
import { FormattedClinicalText } from './FormattedClinicalText';
import { extrairPerguntaObjetiva } from '../utils/clinicalTextUtils';
import { obterPassosNormalizados, limparPerguntaNorteadora } from '../utils/flowchartNormalizer';
import { EixoEmojiBadge } from './EixoEmojiBadge';

/**
 * Cronômetro isolado em subcomponente memoizado para evitar re-renderizar
 * o modal inteiro e o texto clínico a cada 1 segundo no celular.
 */
const SessionTimerBadge: React.FC<{ resetKey: number; paused: boolean; comfortMode?: boolean }> = React.memo(({
  resetKey,
  paused,
  comfortMode = false,
}) => {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    setSegundos(0);
  }, [resetKey]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSegundos(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resetKey, paused]);

  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  const formatado = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded-lg border ${
        comfortMode
          ? 'bg-[#EFECE6] text-stone-700 border-[#E2DDD3]'
          : 'bg-zinc-100/90 text-zinc-600 border-zinc-200/80'
      }`}
    >
      <Clock className="w-3 h-3 text-zinc-400" />
      <span>{formatado}</span>
    </div>
  );
});

interface ReviewSessionModalProps {
  cards: CardClinico[];
  onClose: () => void;
  onRegistrarRevisao: (cardId: string, avaliacao: 'errei' | 'dificil' | 'bom' | 'facil', tempoSegundos: number, modo?: 'estudo' | 'revisao') => void;
  onEditarCard?: (card: CardClinico, indice: number) => void;
  onExcluirCard?: (cardId: string) => void;
  initialIndex?: number;
  onIndexChange?: (indice: number) => void;
  modo?: 'estudo' | 'revisao';
}

export const ReviewSessionModal: React.FC<ReviewSessionModalProps> = ({
  cards,
  onClose,
  onRegistrarRevisao,
  onEditarCard,
  onExcluirCard,
  initialIndex = 0,
  onIndexChange,
  modo = 'revisao',
}) => {
  const [modoAtivo, setModoAtivo] = useState<'estudo' | 'revisao'>(modo);
  const [filaCards, setFilaCards] = useState<CardClinico[]>(cards);
  const [indiceAtual, setIndiceAtual] = useState(initialIndex);
  const [mostrarVerso, setMostrarVerso] = useState(false);
  const tempoInicioCardRef = useRef<number>(Date.now());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false);
  const [exibirDicas, setExibirDicas] = useState<boolean>(() => StorageService.getExibirDicas());
  const [confortoVisual, setConfortoVisual] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('medcards_conforto_visual');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleConfortoVisual = useCallback(() => {
    setConfortoVisual(prev => {
      const novo = !prev;
      try {
        localStorage.setItem('medcards_conforto_visual', JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }, []);

  // Sincronizar modo inicial ou atualizações externas
  useEffect(() => {
    if (modo) {
      setModoAtivo(modo);
    }
  }, [modo]);

  // Sincronizar quando os cards forem atualizados externamente (ex: edição)
  useEffect(() => {
    setFilaCards(cards);
  }, [cards]);

  // Sincronizar índice inicial se fornecido
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < cards.length) {
      setIndiceAtual(initialIndex);
    }
  }, [initialIndex, cards.length]);

  // Notificar o pai sobre mudança de questão
  useEffect(() => {
    onIndexChange?.(indiceAtual);
  }, [indiceAtual, onIndexChange]);

  const handleToggleExibirDicas = useCallback(() => {
    setExibirDicas(prev => {
      const novo = !prev;
      StorageService.setExibirDicas(novo);
      return novo;
    });
  }, []);

  // Estados interativos por card (idênticos aos de Provas e Simulados)
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [mascarasReveladas, setMascarasReveladas] = useState<Record<string, boolean>>({});
  const [clozesRevelados, setClozesRevelados] = useState<Record<number, boolean>>({});
  const [blocosFluxoRevelados, setBlocosFluxoRevelados] = useState<Record<string, boolean>>({});

  const [estatisticasSessao, setEstatisticasSessao] = useState({
    errei: 0,
    dificil: 0,
    bom: 0,
    facil: 0,
    totalSegundos: 0,
  });

  const cardAtual = filaCards[indiceAtual];
  const totalCards = filaCards.length;

  // Leituras de storage memoizadas para zero bloqueio de renderização
  const configTimers = useMemo(() => StorageService.getConfiguracaoTimers(), []);
  const eixos = useMemo(() => StorageService.getEixos(), [cardAtual?.eixoId]);
  const eixoDoCard = useMemo(() => eixos.find(e => e.id === cardAtual?.eixoId), [eixos, cardAtual?.eixoId]);
  const topicoDoCard = useMemo(() => eixoDoCard?.topicos?.find(t => t.id === cardAtual?.topicoId), [eixoDoCard, cardAtual?.topicoId]);
  const infoRodada = useMemo(() => cardAtual ? obterInfoRodadaCard(cardAtual, topicoDoCard, configTimers) : null, [cardAtual, topicoDoCard, configTimers]);

  // Rastreia quantas vezes cada card foi re-enfileirado por erro (máx 2)
  const reEnqueueCountRef = useRef<Record<string, number>>({});

  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickPergunta, setQuickPergunta] = useState('');
  const [quickResposta, setQuickResposta] = useState('');
  const [quickDica, setQuickDica] = useState('');
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const handleOpenQuickEdit = () => {
    if (!cardAtual) return;
    setQuickPergunta(cardAtual.perguntaGatilho || cardAtual.titulo || '');
    setQuickResposta(cardAtual.resposta || (cardAtual.casoClinicoDados ? cardAtual.casoClinicoDados.opcoes[cardAtual.casoClinicoDados.indiceCorreto] : ''));
    setQuickDica(cardAtual.perolaClinica || '');
    setIsQuickEditOpen(true);
  };

  const handleSaveQuickEdit = () => {
    if (!cardAtual) return;
    const cardAtualizado: CardClinico = {
      ...cardAtual,
      perguntaGatilho: quickPergunta.trim() || cardAtual.perguntaGatilho,
      titulo: quickPergunta.trim().length > 50 ? quickPergunta.trim().substring(0, 47) + '...' : (quickPergunta.trim() || cardAtual.titulo),
      resposta: quickResposta.trim(),
      perolaClinica: quickDica.trim() || 'Ponto essencial para fixação e retenção.',
    };

    if (cardAtualizado.casoClinicoDados) {
      cardAtualizado.casoClinicoDados = {
        ...cardAtualizado.casoClinicoDados,
        historiaClinica: quickPergunta.trim() || cardAtualizado.casoClinicoDados.historiaClinica,
        justificativaDetalhada: quickDica.trim() || cardAtualizado.casoClinicoDados.justificativaDetalhada,
      };
    }

    StorageService.atualizarCard(cardAtualizado);
    setFilaCards(prev => prev.map((c, i) => i === indiceAtual ? cardAtualizado : c));
    setQuickToast('Card atualizado com sucesso!');
    setTimeout(() => setQuickToast(null), 2200);
    setIsQuickEditOpen(false);
  };

  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);

  const handleConfirmarExclusaoCard = () => {
    if (!cardAtual) return;
    const cardIdParaExcluir = cardAtual.id;
    setModalConfirmarExclusao(false);

    if (onExcluirCard) {
      onExcluirCard(cardIdParaExcluir);
    } else {
      StorageService.excluirCard(cardIdParaExcluir);
    }

    if (filaCards.length <= 1) {
      onClose();
      return;
    }

    const novaFila = filaCards.filter((_, i) => i !== indiceAtual);
    setFilaCards(novaFila);
    if (indiceAtual >= novaFila.length) {
      setIndiceAtual(novaFila.length - 1);
    }
    setMostrarVerso(false);
    setRespostaSelecionada(null);
    setQuickToast('Flashcard excluído com sucesso!');
    setTimeout(() => setQuickToast(null), 2200);
  };

  // Resetar estados interativos e cronômetro a cada novo card + scroll imediato p/ topo
  useEffect(() => {
    tempoInicioCardRef.current = Date.now();
    setMostrarVerso(false);
    setRespostaSelecionada(null);
    setMascarasReveladas({});
    setClozesRevelados({});
    setBlocosFluxoRevelados({});
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [indiceAtual]);

  // Interações de Oclusão de Imagem
  const toggleMascaraOclusao = (mascaraId: string) => {
    setMascarasReveladas(prev => {
      const novo = { ...prev, [mascaraId]: !prev[mascaraId] };
      if (!prev[mascaraId] && cardAtual?.mascarasImagem && cardAtual.mascarasImagem.length > 0) {
        const todasReveladas = cardAtual.mascarasImagem.every(m => novo[m.id]);
        if (todasReveladas) {
          setMostrarVerso(true);
        }
      }
      return novo;
    });
  };

  const revelarTodasMascaras = () => {
    if (cardAtual?.mascarasImagem) {
      const all: Record<string, boolean> = {};
      cardAtual.mascarasImagem.forEach(m => { all[m.id] = true; });
      setMascarasReveladas(all);
    }
    setMostrarVerso(true);
  };

  // Interações de Cloze (Lacunas Clicáveis)
  const toggleClozeIndividual = (clozeIdx: number) => {
    setClozesRevelados(prev => {
      const novo = { ...prev, [clozeIdx]: !prev[clozeIdx] };
      if (!prev[clozeIdx] && cardAtual?.textoCloze) {
        const matches = Array.from(cardAtual.textoCloze.matchAll(/\{\{c(\d+)::/g)).map(m => parseInt(m[1], 10));
        const todasReveladas = matches.length > 0 && matches.every(num => novo[num]);
        if (todasReveladas) {
          setMostrarVerso(true);
        }
      }
      return novo;
    });
  };

  const revelarTodosClozes = () => {
    const all: Record<number, boolean> = {};
    if (cardAtual?.textoCloze) {
      const matches = Array.from(cardAtual.textoCloze.matchAll(/\{\{c(\d+)::/g));
      matches.forEach(m => { all[parseInt(m[1], 10)] = true; });
    }
    if (Object.keys(all).length === 0) {
      for (let i = 1; i <= 20; i++) all[i] = true;
    }
    setClozesRevelados(all);
    setMostrarVerso(true);
  };

  // Lista unificada e retrocompatível de passos (Passo 1 até o fim, todos iniciando ocluídos)
  const passosNormalizados = useMemo(
    () => (cardAtual ? obterPassosNormalizados(cardAtual) : []),
    [cardAtual]
  );

  // Interações de Passo a Passo Sequencial
  const toggleBlocoFluxo = (blocoId: string) => {
    setBlocosFluxoRevelados(prev => {
      const estadoAtual = prev[blocoId] || mostrarVerso;
      const novo = { ...prev };
      if (mostrarVerso) {
        // Se estava tudo revelado por mostrarVerso, reconstrói o mapa mantendo os outros visíveis e ocultando este
        passosNormalizados.forEach(p => {
          novo[p.id] = p.id !== blocoId;
        });
        setMostrarVerso(false);
        return novo;
      }

      novo[blocoId] = !estadoAtual;
      if (!estadoAtual && passosNormalizados.length > 0 && passosNormalizados.every(p => novo[p.id])) {
        setMostrarVerso(true);
      }
      return novo;
    });
  };

  const revelarTodosBlocosFluxo = () => {
    const all: Record<string, boolean> = {};
    passosNormalizados.forEach(p => {
      all[p.id] = true;
    });
    setBlocosFluxoRevelados(all);
    setMostrarVerso(true);
  };

  const ocultarTodosBlocosFluxo = () => {
    setBlocosFluxoRevelados({});
    setMostrarVerso(false);
  };

  const revelarProximoBlocoFluxo = () => {
    const proximo = passosNormalizados.find(p => !blocosFluxoRevelados[p.id] && !mostrarVerso);
    if (proximo) {
      toggleBlocoFluxo(proximo.id);
    } else {
      revelarTodosBlocosFluxo();
    }
  };

  // Interação de Caso Clínico (Múltipla Escolha)
  const handleSelecionarAlternativa = (index: number) => {
    if (respostaSelecionada !== null || !cardAtual?.casoClinicoDados) return;
    setRespostaSelecionada(index);
    setMostrarVerso(true);
  };

  // Resposta SRS com transição visual instantânea (<16ms no celular)
  const responder = (avaliacao: 'errei' | 'dificil' | 'bom' | 'facil') => {
    if (!cardAtual) return;

    const cardId = cardAtual.id;
    const modoParaSalvar = modoAtivo;
    const tempoGasto = Math.max(1, Math.round((Date.now() - tempoInicioCardRef.current) / 1000));

    setEstatisticasSessao(prev => ({
      ...prev,
      [avaliacao]: prev[avaliacao] + 1,
      totalSegundos: prev.totalSegundos + tempoGasto,
    }));

    // Re-enfileiramento com ciclo de repetição SOMENTE no Modo Revisão
    const MAX_REENQUEUE = 2;
    let reEnqueued = false;
    if (modoAtivo === 'revisao' && avaliacao === 'errei' && filaCards.length > 1) {
      const count = reEnqueueCountRef.current[cardId] || 0;
      if (count < MAX_REENQUEUE) {
        reEnqueueCountRef.current[cardId] = count + 1;
        setFilaCards(prev => [...prev, cardAtual]);
        reEnqueued = true;
      }
    }

    // 1. Atualiza o card na tela IMEDIATAMENTE antes da gravação no storage
    if (indiceAtual + 1 < filaCards.length + (reEnqueued ? 1 : 0)) {
      setMostrarVerso(false);
      setRespostaSelecionada(null);
      setIndiceAtual(prev => prev + 1);
    } else {
      setSessaoFinalizada(true);
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback caso canvas não esteja disponível
      }
    }

    // 2. Persiste revisão no próximo frame livre para zero travamento ao toque
    requestAnimationFrame(() => {
      setTimeout(() => {
        onRegistrarRevisao(cardId, avaliacao, tempoGasto, modoParaSalvar);
      }, 0);
    });
  };

  const handleVoltarCard = () => {
    if (indiceAtual > 0) {
      setMostrarVerso(false);
      setRespostaSelecionada(null);
      setIndiceAtual(prev => prev - 1);
    }
  };

  const handlePularCard = () => {
    const deveRegistrarEstudo = mostrarVerso && cardAtual && modoAtivo === 'estudo';
    const cardId = cardAtual?.id;
    const tempoGasto = Math.max(1, Math.round((Date.now() - tempoInicioCardRef.current) / 1000));

    if (indiceAtual + 1 < filaCards.length) {
      setMostrarVerso(false);
      setRespostaSelecionada(null);
      setIndiceAtual(prev => prev + 1);
    } else {
      setSessaoFinalizada(true);
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback
      }
    }

    if (deveRegistrarEstudo && cardId) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          onRegistrarRevisao(cardId, 'bom', tempoGasto, 'estudo');
        }, 0);
      });
    }
  };

  // Teclas de atalho para estudo veloz (Espaço = Virar/Revelar, Setas = Voltar/Pular, 1-4 = SRS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessaoFinalizada || isQuickEditOpen) return;

      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleVoltarCard();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePularCard();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!mostrarVerso && passosNormalizados.length > 0 && (cardAtual?.tipoCard === 'fluxograma_oclusao' || !!cardAtual?.algoritmoDecisao)) {
          revelarProximoBlocoFluxo();
        } else {
          setMostrarVerso(prev => !prev);
        }
      } else if (mostrarVerso || respostaSelecionada !== null) {
        if (e.key === '1') responder('errei');
        else if (e.key === '2') responder('dificil');
        else if (e.key === '3') responder('bom');
        else if (e.key === '4') responder('facil');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mostrarVerso, respostaSelecionada, indiceAtual, sessaoFinalizada, filaCards.length, isQuickEditOpen, passosNormalizados, blocosFluxoRevelados, cardAtual]);

  if (!cardAtual && !sessaoFinalizada) {
    return null;
  }


  // =========================================================================
  // TELA DE CONCLUSÃO DA SESSÃO
  // =========================================================================
  if (sessaoFinalizada) {
    const total = estatisticasSessao.errei + estatisticasSessao.dificil + estatisticasSessao.bom + estatisticasSessao.facil;
    const acertos = estatisticasSessao.bom + estatisticasSessao.facil;
    const percentual = total > 0 ? Math.round((acertos / total) * 100) : 100;
    const tempoGastoMinutos = Math.max(1, Math.round(estatisticasSessao.totalSegundos / 60));

    return (
      <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto min-h-screen flex items-center justify-center p-3 sm:p-4 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 text-center space-y-5 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <PartyPopper className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Sessão Concluída!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Aproveitamento de <strong>{percentual}%</strong> nas revisões ({tempoGastoMinutos} min)
            </p>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                percentual >= 80 ? 'bg-emerald-500' : percentual >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${percentual}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-lg font-bold text-rose-700 block">{estatisticasSessao.errei}</span>
              <span className="text-[10px] font-bold text-rose-600 uppercase">Errei</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-lg font-bold text-amber-700 block">{estatisticasSessao.dificil}</span>
              <span className="text-[10px] font-bold text-amber-600 uppercase">Difícil</span>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-lg font-bold text-blue-700 block">{estatisticasSessao.bom}</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase">Bom</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-lg font-bold text-emerald-700 block">{estatisticasSessao.facil}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Fácil</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Voltar ao Aplicativo
          </button>
        </div>
      </div>
    );
  }

  // Identificação do Formato do Card
  const isCaso = cardAtual?.tipoCard === 'caso_clinico' && !!cardAtual?.casoClinicoDados;
  const isImageOcclusion = cardAtual?.tipoCard === 'image_occlusion' && !!cardAtual?.imagemUrl;
  const isCloze = cardAtual?.tipoCard === 'cloze' && !!cardAtual?.textoCloze;
  const isFluxogramaComplexo = cardAtual?.tipoCard === 'fluxograma_complexo' || !!cardAtual?.fluxogramaComplexo;
  const isFluxograma = !isFluxogramaComplexo && (cardAtual?.tipoCard === 'fluxograma_oclusao' || (cardAtual as any)?.tipoCard === 'fluxograma' || !!cardAtual?.algoritmoDecisao || (cardAtual?.blocosOclusao && cardAtual.blocosOclusao.length > 0) || (cardAtual?.etapasFluxograma && cardAtual.etapasFluxograma.length > 0));

  const progressoPercentual = totalCards > 0 ? Math.min(100, Math.round(((indiceAtual + 1) / totalCards) * 100)) : 100;

  // =========================================================================
  // TELA DEDICADA PADRÃO UNIFICADA (ESTÉTICA MINIMALISTA & LEITURA CONFORTÁVEL)
  // =========================================================================
  return (
    <div
      ref={scrollContainerRef}
      className={`fixed inset-0 z-50 overflow-y-auto min-h-screen text-left flex flex-col justify-start touch-pan-y overscroll-y-contain transition-colors duration-200 ${
        confortoVisual ? 'bg-[#F2EFE9]' : 'bg-[#F7F7F5]'
      }`}
    >
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 pt-2 sm:pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2 flex-1 flex flex-col">
        
        {/* Barra Superior Minimalista */}
        <div
          className={`rounded-2xl px-2.5 sm:px-3.5 py-2 border flex items-center justify-between gap-1.5 shrink-0 transition-colors duration-200 ${
            confortoVisual
              ? 'bg-[#FAF8F5] border-[#E6E0D6] shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
              : 'bg-white border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.025)]'
          }`}
        >
          {/* Esquerda: Navegação (Voltar / Pular) + Progresso + Eixo */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`flex items-center p-0.5 rounded-xl border shrink-0 ${
                confortoVisual ? 'bg-[#EFECE6] border-[#E2DDD3]' : 'bg-zinc-100/80 border-zinc-200/70'
              }`}
            >
              <button
                type="button"
                id="btn-nav-voltar-card"
                onClick={handleVoltarCard}
                disabled={indiceAtual === 0}
                title={indiceAtual === 0 ? "Primeiro flashcard da sessão" : "Voltar ao flashcard anterior (←)"}
                className={`p-1.5 rounded-lg flex items-center justify-center touch-instant ${
                  indiceAtual === 0
                    ? 'text-zinc-300 cursor-not-allowed opacity-40'
                    : 'text-zinc-700 hover:text-zinc-950 hover:bg-white cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="h-3.5 w-px bg-zinc-200/80 mx-0.5" />

              <button
                type="button"
                id="btn-nav-pular-card"
                onClick={handlePularCard}
                title={indiceAtual + 1 >= totalCards ? "Concluir sessão (→)" : "Pular este flashcard e ir ao próximo (→)"}
                className="p-1.5 rounded-lg flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-white cursor-pointer touch-instant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs sm:text-[13px] font-bold text-zinc-800 tabular-nums whitespace-nowrap">
              {totalCards > 1 ? `${indiceAtual + 1}/${totalCards}` : '1/1'}
            </span>
            <EixoEmojiBadge card={cardAtual} size="sm" />
          </div>

          {/* Direita: Cronômetro Isolado + Conforto Visual + Editar + Dica + Lixeira + Fechar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <SessionTimerBadge
              resetKey={indiceAtual}
              paused={sessaoFinalizada}
              comfortMode={confortoVisual}
            />

            {/* Modo Conforto Visual (Tom Papel Quente anti-cansaço visual) */}
            <button
              type="button"
              onClick={handleToggleConfortoVisual}
              title={confortoVisual ? "Modo Papel Quente ativo (toque para fundo claro padrão)" : "Ativar Modo Leitura Conforto (tom papel quente sem cansaço visual)"}
              className={`p-1.5 rounded-lg border cursor-pointer touch-instant flex items-center justify-center ${
                confortoVisual
                  ? 'bg-amber-100/80 text-amber-900 border-amber-300/80'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            {/* Editar (Apenas Ícone) */}
            <button
              type="button"
              id="btn-editar-card-sessao"
              onClick={() => {
                if (isImageOcclusion && onEditarCard) {
                  onEditarCard(cardAtual, indiceAtual);
                } else {
                  handleOpenQuickEdit();
                }
              }}
              title="Editar este flashcard"
              className={`p-1.5 rounded-lg border cursor-pointer touch-instant flex items-center justify-center ${
                confortoVisual
                  ? 'bg-[#FAF8F5] border-[#E2DDD3] text-stone-700 hover:bg-white'
                  : 'bg-white border-zinc-200/80 text-zinc-600 hover:text-blue-600 hover:border-blue-300'
              }`}
            >
              <FilePenLine className="w-3.5 h-3.5" />
            </button>

            {/* Dica (Ícone com status) */}
            <button
              type="button"
              onClick={handleToggleExibirDicas}
              title={exibirDicas ? "Dicas ativadas (clique para ocultar)" : "Dicas ocultas (clique para exibir)"}
              className={`p-1.5 rounded-lg border cursor-pointer touch-instant flex items-center justify-center ${
                exibirDicas
                  ? 'bg-amber-50/90 text-amber-800 border-amber-200'
                  : 'bg-zinc-50 text-zinc-400 border-zinc-200/80 hover:bg-zinc-100'
              }`}
            >
              <Lightbulb className={`w-3.5 h-3.5 ${exibirDicas ? 'text-amber-500 fill-amber-400' : 'text-zinc-400'}`} />
            </button>

            {/* Lixeira (Excluir Card) */}
            <button
              type="button"
              id="btn-excluir-card-sessao"
              onClick={() => setModalConfirmarExclusao(true)}
              title="Excluir este flashcard permanentemente"
              className={`p-1.5 rounded-lg border cursor-pointer touch-instant flex items-center justify-center ${
                confortoVisual
                  ? 'bg-[#FAF8F5] border-[#E2DDD3] text-stone-400 hover:text-rose-600 hover:border-rose-200'
                  : 'bg-white border-zinc-200/80 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Fechar Sessão */}
            <button
              type="button"
              onClick={onClose}
              title="Encerrar sessão"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100/80 border border-transparent cursor-pointer touch-instant flex items-center justify-center"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Card Principal da Questão / Flashcard */}
        <div
          key={`${cardAtual.id}-${indiceAtual}`}
          className={`rounded-2xl sm:rounded-3xl border flex-1 flex flex-col justify-between overflow-hidden animate-card-reveal transition-colors duration-200 ${
            confortoVisual
              ? 'bg-[#FAF8F5] border-[#E6E0D6] shadow-[0_1px_3px_rgba(0,0,0,0.025)]'
              : 'bg-white border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.025)]'
          }`}
        >
          {/* Barra de Progresso Minimalista de 2px no topo do card */}
          <div className="w-full h-[2.5px] bg-zinc-100/80 overflow-hidden shrink-0">
            <div
              className="h-full bg-zinc-800 transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${progressoPercentual / 100})` }}
            />
          </div>

          <div className="p-3.5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Cabeçalho do Card: Tópico + Modo + Título */}
              <div className="space-y-2 pb-3 border-b border-zinc-100">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {cardAtual.topicoNome ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        confortoVisual
                          ? 'bg-[#EFECE6] text-stone-700 border-[#E2DDD3]'
                          : 'bg-zinc-100/80 text-zinc-600 border-zinc-200/60'
                      }`}
                    >
                      {cardAtual.topicoNome.replace(/^tópico:\s*/i, '')}
                    </span>
                  ) : <span />}

                  {/* Pill de Alternância: Modo Estudo vs Modo Revisão */}
                  <button
                    type="button"
                    id="btn-toggle-modo-sessao"
                    onClick={() => setModoAtivo(prev => prev === 'estudo' ? 'revisao' : 'estudo')}
                    title={modoAtivo === 'estudo' 
                      ? "Modo Estudo: cada card aparece uma única vez (sem repetições). Toque para alternar." 
                      : "Modo Revisão: cards com erro voltam ao final da fila. Toque para alternar."}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer touch-instant ${
                      modoAtivo === 'estudo'
                        ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80'
                        : 'bg-indigo-50/80 text-indigo-800 border-indigo-200/80'
                    }`}
                  >
                    {modoAtivo === 'estudo' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Estudo (1ª vez)</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 text-indigo-600" />
                        <span>Revisão (Ciclo)</span>
                      </>
                    )}
                  </button>
                </div>

                <h3 className="text-[15px] sm:text-[17px] font-semibold text-zinc-900 leading-snug tracking-tight text-left">
                  {cardAtual.titulo}
                </h3>
              </div>

            {/* =============================================================== */}
            {/* FORMATO 1: CASO CLÍNICO COM MÚLTIPLA ESCOLHA                     */}
            {/* =============================================================== */}
            {isCaso && (
              <div className="space-y-3.5 text-left">
                {/* Vinheta Médica do Paciente (Editorial Clean) */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 text-left ${
                    confortoVisual
                      ? 'bg-[#F3EFE8] border-[#E4DECFE0]'
                      : 'bg-zinc-50/80 border-zinc-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/60">
                    <span className="text-[10.5px] font-bold tracking-wider uppercase text-zinc-600 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      Quadro Clínico
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">Cenário Prático</span>
                  </div>

                  <p className="text-[13.5px] sm:text-[14.5px] text-zinc-800 leading-[1.65] font-normal text-left">
                    {cardAtual.casoClinicoDados!.historiaClinica}
                  </p>

                  {cardAtual.casoClinicoDados!.exameFisicoSinais && (
                    <div
                      className={`mt-2 p-3 rounded-xl border text-left space-y-1 ${
                        confortoVisual
                          ? 'bg-[#FAF8F5] border-[#E4DECF]'
                          : 'bg-white border-zinc-200/70'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                        🩺 Exame Físico & Sinais Vitais
                      </span>
                      <p className="text-[13px] sm:text-[13.5px] text-zinc-700 font-normal leading-[1.6]">
                        {cardAtual.casoClinicoDados!.exameFisicoSinais}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pergunta de Decisão */}
                <div className="pt-0.5 text-[13.5px] sm:text-[14.5px] text-zinc-800 leading-[1.65] font-medium flex items-start gap-2 text-left">
                  <span className="text-zinc-400 font-semibold shrink-0 mt-0.5 select-none text-sm">➔</span>
                  <div className="flex-1">
                    <FormattedClinicalText 
                      text={extrairPerguntaObjetiva(
                        cardAtual.perguntaGatilho,
                        cardAtual.casoClinicoDados?.historiaClinica
                      ) || 'Qual a conduta diagnóstica ou terapêutica imediata mais apropriada?'} 
                    />
                  </div>
                </div>

                {/* Alternativas de Escolha Única */}
                <div className="space-y-2">
                  {cardAtual.casoClinicoDados!.opcoes.map((opcao, idx) => {
                    const letras = ['A', 'B', 'C', 'D', 'E'];
                    const foiRespondido = respostaSelecionada !== null;
                    const eCorreta = idx === cardAtual.casoClinicoDados!.indiceCorreto;
                    const foiEscolhida = idx === respostaSelecionada;
                    const textoLimpo = opcao.replace(/^[A-Ea-e][\)\.\-]\s*/, '');

                    let styleClass = confortoVisual
                      ? 'bg-[#FAF8F5] hover:bg-[#F3EFE8] border-[#E2DDD3] text-zinc-800'
                      : 'bg-white hover:bg-zinc-50/80 border-zinc-200/85 text-zinc-800';
                    if (foiRespondido) {
                      if (eCorreta) {
                        styleClass = 'bg-emerald-50/85 border-emerald-400 text-emerald-950 font-medium';
                      } else if (foiEscolhida && !eCorreta) {
                        styleClass = 'bg-rose-50/85 border-rose-300 text-rose-950 font-medium';
                      } else {
                        styleClass = 'bg-zinc-50/40 border-zinc-200/40 text-zinc-400 opacity-55';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={foiRespondido}
                        onClick={() => handleSelecionarAlternativa(idx)}
                        className={`w-full p-3 sm:p-3.5 rounded-xl border text-left text-[13.5px] sm:text-[14px] flex items-start gap-2.5 cursor-pointer touch-instant ${styleClass}`}
                      >
                        <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-semibold flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                          foiRespondido && eCorreta 
                            ? 'bg-emerald-600 text-white' 
                            : foiRespondido && foiEscolhida 
                              ? 'bg-rose-600 text-white' 
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200/80'
                        }`}>
                          {foiRespondido && eCorreta ? (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                          ) : foiRespondido && foiEscolhida ? (
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                          ) : (
                            letras[idx]
                          )}
                        </span>
                        <span className="flex-1 leading-[1.6] pt-0.5">
                          <FormattedClinicalText text={textoLimpo} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {respostaSelecionada !== null && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/90 text-zinc-900 space-y-2 animate-card-reveal text-left">
                    <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-semibold text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gabarito & Justificativa</span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-900">
                        Alternativa {['A', 'B', 'C', 'D', 'E'][cardAtual.casoClinicoDados!.indiceCorreto]}
                      </span>
                    </div>
                    <div className="text-zinc-800 text-[13.5px] sm:text-[14.5px] leading-[1.65]">
                      <FormattedClinicalText text={cardAtual.casoClinicoDados!.justificativaDetalhada} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* FORMATO 2: OCLUSÃO DE IMAGEM (SVG POLÍGONOS + RETÂNGULOS)        */}
            {/* =============================================================== */}
            {isImageOcclusion && (
              <div className="space-y-3">
                <p className="text-xs sm:text-[13px] font-medium text-zinc-600">
                  {cardAtual.perguntaGatilho || 'Identifique as estruturas ocluídas na imagem:'}
                </p>

                <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-950 flex items-center justify-center p-1 sm:p-2 select-none">
                  <div 
                    className="relative inline-block max-w-full select-none"
                    style={{ lineHeight: 0 }}
                  >
                    <img
                      src={cardAtual.imagemUrl}
                      alt={cardAtual.titulo}
                      className="block max-w-full h-auto max-h-[60vh] sm:max-h-[480px] w-auto mx-auto select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />

                    {/* Camada SVG para Máscaras Livres com Polígonos */}
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none" 
                      viewBox="0 0 100 100" 
                      preserveAspectRatio="none"
                    >
                      {(cardAtual.mascarasImagem || [])
                        .filter(m => m.tipoForma === 'livre' && m.pontos && m.pontos.length > 2)
                        .map((m) => {
                          const revelado = mascarasReveladas[m.id];
                          const pontosString = m.pontos!.map(p => `${p.x},${p.y}`).join(' ');

                          return (
                            <g
                              key={m.id}
                              className="pointer-events-auto cursor-pointer"
                              onClick={() => toggleMascaraOclusao(m.id)}
                            >
                              <polygon
                                points={pontosString}
                                fill={revelado ? 'transparent' : '#4f46e5'}
                                fillOpacity={revelado ? 0 : 1}
                                stroke={revelado ? 'rgba(16, 185, 129, 0.7)' : '#c7d2fe'}
                                strokeWidth={revelado ? '1' : '1.2'}
                                strokeDasharray={revelado ? '2,2' : undefined}
                                className="hover:brightness-110"
                              />
                              {!revelado && (
                                <text
                                  x={m.x + m.largura / 2}
                                  y={m.y + m.altura / 2}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#ffffff"
                                  fontSize="3.8"
                                  fontWeight="bold"
                                  className="select-none pointer-events-none drop-shadow-sm"
                                >
                                  [ #{m.numero} ]
                                </text>
                              )}
                            </g>
                          );
                        })}
                    </svg>

                    {/* Máscaras Retangulares */}
                    {(cardAtual.mascarasImagem || [])
                      .filter(m => m.tipoForma !== 'livre' || !m.pontos || m.pontos.length <= 2)
                      .map((m) => {
                        const revelado = mascarasReveladas[m.id];

                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleMascaraOclusao(m.id)}
                            className={`absolute rounded-md flex items-center justify-center text-center p-1 text-xs cursor-pointer select-none touch-instant ${
                              revelado
                                ? 'bg-transparent border-2 border-dashed border-emerald-500/70 hover:bg-emerald-500/10'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold border border-indigo-300 shadow-sm opacity-100'
                            }`}
                            style={{
                              left: `${m.x}%`,
                              top: `${m.y}%`,
                              width: `${m.largura}%`,
                              height: `${m.altura}%`,
                              opacity: revelado ? undefined : 1,
                            }}
                            title={revelado ? `Estrutura revelada: ${m.textoOculto} (toque para ocultar)` : `Toque para revelar estrutura #${m.numero}`}
                          >
                            {!revelado && (
                              <span className="text-[10px] font-black bg-white/20 px-1 py-0.2 rounded-sm">
                                #{m.numero}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Botões de Ação e Status */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={revelarTodasMascaras}
                    className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer touch-instant"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Revelar Todas</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    Toque na máscara para revelar
                  </span>
                </div>

                {/* Lista de estruturas abaixo da imagem */}
                {(cardAtual.mascarasImagem || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Estruturas Ocluídas:</span>
                      <span className="text-[10px] font-medium text-zinc-400">
                        {(cardAtual.mascarasImagem || []).filter(m => mascarasReveladas[m.id]).length}/{(cardAtual.mascarasImagem || []).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(cardAtual.mascarasImagem || []).map((m) => {
                        const revelado = mascarasReveladas[m.id];
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMascaraOclusao(m.id)}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer select-none touch-instant ${
                              revelado
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                : 'bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200/80 text-zinc-600'
                            }`}
                          >
                            <span
                              className={`shrink-0 w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                                revelado
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-200/80 text-zinc-700'
                              }`}
                            >
                              #{m.numero}
                            </span>
                            <div className="flex-1 min-w-0">
                              {revelado ? (
                                <div className="text-[13px] sm:text-[13.5px] leading-snug break-words">
                                  <FormattedClinicalText text={m.textoOculto} />
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-zinc-400">
                                  Toque para revelar #{m.numero}
                                </span>
                              )}
                              {exibirDicas && m.dica && (
                                <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                                  Dica: {m.dica}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* FORMATO 3A: FLUXOGRAMA CLÍNICO (DIAGNÓSTICO / RASTREIO / CONDUTA)*/}
            {/* =============================================================== */}
            {isFluxogramaComplexo && (
              <ComplexFlowchartViewer
                fluxograma={
                  cardAtual.fluxogramaComplexo || {
                    id: cardAtual.id,
                    titulo: cardAtual.titulo,
                    descricao: cardAtual.perolaClinica,
                    noInicialId: 'no-1',
                    nos: [
                      {
                        id: 'no-1',
                        titulo: cardAtual.perguntaGatilho || cardAtual.titulo,
                        descricao: cardAtual.resposta,
                        tipo: 'inicio',
                        ramos: [],
                      },
                    ],
                  }
                }
                initialFullScreen={false}
                comfortMode={confortoVisual}
                tituloContexto={cardAtual.titulo}
                perguntaGatilho={cardAtual.perguntaGatilho || (cardAtual as any).pergunta}
                card={cardAtual}
                onRegistrarConclusao={() => setMostrarVerso(true)}
              />
            )}

            {/* =============================================================== */}
            {/* FORMATO 3B: PASSO A PASSO SEQUENCIAL (PASSO 1 AO FIM OCLUÍDOS)   */}
            {/* =============================================================== */}
            {isFluxograma && (
              <div className="space-y-3 text-left">
                {/* Pergunta / Tópico Norteador Direto ao Ponto */}
                <div
                  className={`p-3.5 rounded-2xl border text-[14px] sm:text-[15px] font-medium text-zinc-800 leading-[1.62] ${
                    confortoVisual ? 'bg-[#F3EFE8] border-[#E4DECF]' : 'bg-zinc-50/80 border-zinc-200/80'
                  }`}
                >
                  <FormattedClinicalText
                    text={limparPerguntaNorteadora(cardAtual.perguntaGatilho, cardAtual.titulo)}
                  />
                </div>

                {/* Cabeçalho Minimalista de Progresso dos Passos */}
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    Sequência Passo a Passo ({passosNormalizados.filter(p => blocosFluxoRevelados[p.id] || mostrarVerso).length}/{passosNormalizados.length} revelados)
                  </span>

                  <div className="flex items-center gap-1.5">
                    {mostrarVerso ? (
                      <button
                        type="button"
                        onClick={ocultarTodosBlocosFluxo}
                        className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer touch-instant"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Ocultar Passos</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={revelarTodosBlocosFluxo}
                        className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer touch-instant"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Revelar Todos</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista Sequencial Limpa (Passo 1 até o fim, TODOS começando ocluídos) */}
                <div className="space-y-2">
                  {passosNormalizados.map((passo, idx) => {
                    const revelado = !!blocosFluxoRevelados[passo.id] || mostrarVerso;
                    const primeiroNaoReveladoIdx = passosNormalizados.findIndex(
                      p => !blocosFluxoRevelados[p.id] && !mostrarVerso
                    );
                    const ehProximoDaVez = idx === primeiroNaoReveladoIdx;

                    return (
                      <div key={passo.id} className="space-y-1">
                        {idx > 0 && (
                          <div className="flex justify-center py-0.5 select-none">
                            <ArrowDown className="w-3.5 h-3.5 text-zinc-300" strokeWidth={2.2} />
                          </div>
                        )}

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleBlocoFluxo(passo.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleBlocoFluxo(passo.id);
                            }
                          }}
                          className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer select-none touch-instant transition-colors ${
                            revelado
                              ? confortoVisual
                                ? 'bg-white border-[#DFD8C8] text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                                : 'bg-white border-zinc-200/90 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                              : ehProximoDaVez
                              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-100/90 hover:bg-zinc-200/75 border-zinc-200/80 text-zinc-600'
                          }`}
                        >
                          {revelado ? (
                            <div className="flex items-start gap-3 animate-card-reveal">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {passo.numero}
                              </span>
                              <div className="flex-1 min-w-0 space-y-1">
                                {passo.titulo && (
                                  <p className="text-[13.5px] sm:text-[14.5px] font-semibold text-zinc-900 leading-snug">
                                    <FormattedClinicalText text={passo.titulo} />
                                  </p>
                                )}
                                <div className="text-[13.5px] sm:text-[14.5px] text-zinc-800 font-normal leading-[1.64]">
                                  <FormattedClinicalText text={passo.conteudo} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    ehProximoDaVez
                                      ? 'bg-white/15 text-white'
                                      : 'bg-zinc-200/80 text-zinc-700'
                                  }`}
                                >
                                  {passo.numero}
                                </span>
                                <span
                                  className={`text-[13px] sm:text-[13.5px] font-semibold ${
                                    ehProximoDaVez ? 'text-white' : 'text-zinc-600'
                                  }`}
                                >
                                  Passo {passo.numero}
                                </span>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                  ehProximoDaVez ? 'text-emerald-300' : 'text-zinc-400'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{ehProximoDaVez ? 'Toque para revelar' : 'Ocluído'}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* FORMATO 4: CLOZE (LACUNAS CLICÁVEIS PARTE A PARTE)                */}
            {/* =============================================================== */}
            {isCloze && (
              <div className="space-y-2.5">
                <p className="text-xs sm:text-[13px] font-medium text-zinc-500">
                  {cardAtual.perguntaGatilho || 'Toque nas lacunas para revelar o termo clínico:'}
                </p>

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border text-[14px] sm:text-[15px] font-normal text-zinc-800 leading-[1.72] whitespace-pre-line ${
                    confortoVisual ? 'bg-[#F3EFE8] border-[#E4DECF]' : 'bg-zinc-50/70 border-zinc-200/70'
                  }`}
                >
                  {cardAtual.textoCloze!.split(/(\{\{c\d+::[^\}]+\}\})/).map((part, i) => {
                    const match = part.match(/\{\{c(\d+)::([^:\}]+)(?:::([^\}]+))?\}\}/);
                    if (match) {
                      const clozeNumero = parseInt(match[1], 10);
                      const termoOculto = match[2];
                      const dicaOpcional = match[3];
                      const revelado = clozesRevelados[clozeNumero] || mostrarVerso;

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleClozeIndividual(clozeNumero)}
                          className={`inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md text-[13.5px] sm:text-[14.5px] font-semibold cursor-pointer touch-instant ${
                            revelado
                              ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/80'
                              : 'bg-amber-100/90 hover:bg-amber-200/80 text-amber-950 border border-amber-300/80'
                          }`}
                          title={revelado ? 'Toque para ocultar esta lacuna' : 'Toque para revelar esta lacuna'}
                        >
                          {revelado ? termoOculto : (exibirDicas && dicaOpcional ? `[ ${dicaOpcional} ]` : `[ ... ]`)}
                        </button>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={revelarTodosClozes}
                    className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer touch-instant"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Revelar Todas as Lacunas</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    Toque em cada lacuna para testar
                  </span>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* FORMATO 5: CONCEITO / PERGUNTA DIRETA (TOQUE NO CARD VIRA)       */}
            {/* =============================================================== */}
            {!isCaso && !isImageOcclusion && !isCloze && !isFluxograma && !isFluxogramaComplexo && (
              <div
                role={!mostrarVerso ? 'button' : undefined}
                tabIndex={!mostrarVerso ? 0 : undefined}
                onClick={() => {
                  if (!mostrarVerso) setMostrarVerso(true);
                }}
                onKeyDown={(e) => {
                  if (!mostrarVerso && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setMostrarVerso(true);
                  }
                }}
                className={`p-4 sm:p-5 rounded-2xl border min-h-[112px] flex flex-col justify-center text-left ${
                  !mostrarVerso ? 'cursor-pointer touch-instant' : ''
                } ${
                  confortoVisual
                    ? 'bg-[#F3EFE8] border-[#E4DECF] hover:border-stone-300'
                    : 'bg-zinc-50/70 border-zinc-200/70 hover:border-zinc-300/80'
                }`}
              >
                <div className="text-[14px] sm:text-[15.5px] font-normal text-zinc-800 leading-[1.68] w-full">
                  <FormattedClinicalText text={cardAtual.perguntaGatilho} />
                </div>
                {!mostrarVerso && (
                  <div className="mt-3 pt-2 border-t border-zinc-200/50 flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-400 select-none">
                    <Eye className="w-3 h-3" />
                    <span>Toque aqui ou no botão abaixo para revelar a resposta</span>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* RESPOSTA COMPLETA & PÉROLA CLÍNICA REVELADA                      */}
            {/* =============================================================== */}
            {mostrarVerso && !isCaso && (
              <div className="space-y-3 animate-card-reveal pt-1">
                {!isFluxograma && !isFluxogramaComplexo ? (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                      confortoVisual
                        ? 'bg-[#F6F2EA] border-[#DFD8C8] text-stone-900'
                        : 'bg-zinc-50/50 border-zinc-200/85 text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70">
                      <span className="text-zinc-700 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resposta Esperada</span>
                      </span>
                      {cardAtual.diretrizReferencia && (
                        <span className="text-[10.5px] text-zinc-400 font-medium truncate max-w-[60%]">
                          {cardAtual.diretrizReferencia}
                        </span>
                      )}
                    </div>

                    <div className="text-[14px] sm:text-[15px] leading-[1.68]">
                      <FormattedClinicalText text={cardAtual.resposta} />
                    </div>

                    {cardAtual.perolaClinica && (
                      <div
                        className={`mt-3 p-3 sm:p-3.5 rounded-xl border flex items-start gap-2.5 ${
                          confortoVisual
                            ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                            : 'bg-amber-50/75 border-amber-200/75 text-amber-950'
                        }`}
                      >
                        <span className="text-amber-600 shrink-0 select-none text-sm mt-0.5">💡</span>
                        <div className="flex-1 min-w-0 text-left text-[13px] sm:text-[13.5px] leading-[1.6]">
                          <span className="font-bold text-amber-900 uppercase tracking-wider text-[10.5px] mr-1.5">
                            Ponto-Chave:
                          </span>
                          <span className="font-medium text-zinc-800">
                            {cardAtual.perolaClinica}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  cardAtual.perolaClinica && (
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border flex items-start gap-2.5 ${
                        confortoVisual
                          ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                          : 'bg-amber-50/75 border-amber-200/75 text-amber-950'
                      }`}
                    >
                      <span className="text-amber-600 shrink-0 select-none text-sm mt-0.5">💡</span>
                      <div className="flex-1 min-w-0 text-left text-[13px] sm:text-[13.5px] leading-[1.6]">
                        <span className="font-bold text-amber-900 uppercase tracking-wider text-[10.5px] mr-1.5">
                          Ponto-Chave:
                        </span>
                        <span className="font-medium text-zinc-800">
                          {cardAtual.perolaClinica}
                        </span>
                      </div>
                    </div>
                  )
                )}

                {exibirDicas && cardAtual.mnemonicoOuDica && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50/70 text-amber-900 border border-amber-200/60 text-xs font-medium leading-relaxed">
                      <span>🧠</span>
                      <span>{cardAtual.mnemonicoOuDica}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* =============================================================== */}
            {/* BARRA INFERIOR FIXA NA ZONA DO POLEGAR (VIRAR / AVALIAR SRS)     */}
            {/* =============================================================== */}
            <div
              className={`sticky bottom-0 z-20 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 pt-3 pb-3 sm:pb-4 mt-4 border-t backdrop-blur-md transition-colors duration-200 ${
                confortoVisual
                  ? 'bg-[#FAF8F5]/95 border-[#E6E0D6]'
                  : 'bg-white/95 border-zinc-100'
              }`}
            >
              {!isCaso && !mostrarVerso && (
                <div className="flex items-center gap-2">
                  {isFluxograma && passosNormalizados.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={revelarProximoBlocoFluxo}
                        className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] sm:text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 min-h-[48px] touch-instant shadow-xs"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2} />
                        <span>
                          {(() => {
                            const prox = passosNormalizados.find(p => !blocosFluxoRevelados[p.id]);
                            return prox
                              ? `Revelar Passo ${prox.numero} (${prox.numero}/${passosNormalizados.length})`
                              : 'Ver Todos os Passos';
                          })()}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={revelarTodosBlocosFluxo}
                        title="Revelar todos os passos de uma vez"
                        className={`px-3 py-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer min-h-[48px] shrink-0 touch-instant ${
                          confortoVisual
                            ? 'bg-[#EFECE6] border-[#E2DDD3] text-stone-700 hover:bg-[#E6E1D8]'
                            : 'bg-zinc-50 border-zinc-200/90 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        <span>Tudo</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMostrarVerso(true)}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] sm:text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 min-h-[48px] touch-instant shadow-xs"
                    >
                      <Eye className="w-4 h-4" strokeWidth={2} />
                      <span>{isFluxogramaComplexo ? 'Avaliar / Concluir Fluxograma' : 'Ver Resposta Esperada'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePularCard}
                    title="Pular para o próximo flashcard (→)"
                    className={`px-3.5 py-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer min-h-[48px] shrink-0 touch-instant ${
                      confortoVisual
                        ? 'bg-[#EFECE6] border-[#E2DDD3] text-stone-700 hover:bg-[#E6E1D8]'
                        : 'bg-zinc-50 border-zinc-200/90 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <span>Pular</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(mostrarVerso || respostaSelecionada !== null) && (
                <div className="space-y-2 animate-card-reveal">
                  <div className="flex items-center justify-between text-[10.5px] text-zinc-400 font-medium px-0.5">
                    <span>{modoAtivo === 'estudo' ? 'Concluir estudo deste card:' : 'Avaliação rápida de retenção:'}</span>
                    <span className="hidden sm:inline">Teclas: 1, 2, 3, 4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      id="btn-srs-errei"
                      onClick={() => responder('errei')}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/85 text-rose-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600 mb-0.5" strokeWidth={1.9} />
                      <span className="text-xs font-bold">Errei</span>
                      <span className="text-[10px] text-rose-600/90 font-medium">
                        {modoAtivo === 'estudo' ? 'Rever 12h' : (infoRodada ? formatarTempoMinutos(infoRodada.timers.erreiMinutos) : '2m')}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-srs-dificil"
                      onClick={() => responder('dificil')}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/85 text-amber-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mb-0.5" strokeWidth={1.9} />
                      <span className="text-xs font-bold">Difícil</span>
                      <span className="text-[10px] text-amber-700/90 font-medium">
                        {modoAtivo === 'estudo' ? 'Amanhã' : (infoRodada ? formatarTempoMinutos(infoRodada.timers.dificilMinutos) : '5m')}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-srs-bom"
                      onClick={() => responder('bom')}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-sky-50/85 hover:bg-sky-100/90 border border-sky-200/90 text-sky-900 font-semibold cursor-pointer min-h-[50px] touch-instant"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 mb-0.5" strokeWidth={1.9} />
                      <span className="text-xs font-bold">Bom</span>
                      <span className="text-[10px] text-sky-700/90 font-medium">
                        {modoAtivo === 'estudo' ? 'Estudado ✓' : (infoRodada ? formatarTempoMinutos(infoRodada.timers.bomMinutos) : '15m')}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-srs-facil"
                      onClick={() => responder('facil')}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-emerald-50/75 hover:bg-emerald-100/85 border border-emerald-200/85 text-emerald-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600 mb-0.5" strokeWidth={1.9} />
                      <span className="text-xs font-bold">Fácil</span>
                      <span className="text-[10px] text-emerald-700/90 font-medium">
                        {modoAtivo === 'estudo' ? 'Dominado ✓✓' : (infoRodada ? formatarTempoMinutos(infoRodada.timers.facilMinutos) : '30m')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Toast de Atualização Rápida */}
      {quickToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-70 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{quickToast}</span>
        </div>
      )}

      {/* Modal de Edição Rápida Embutida na Sessão */}
      {isQuickEditOpen && cardAtual && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 border border-slate-200 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FilePenLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Edição Rápida
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Questão {indiceAtual + 1} de {totalCards} • Sem sair da revisão
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Pergunta / Enunciado (Frente):
                </label>
                <textarea
                  rows={3}
                  value={quickPergunta}
                  onChange={e => setQuickPergunta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-y"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Resposta Esperada (Verso):
                </label>
                <textarea
                  rows={4}
                  value={quickResposta}
                  onChange={e => setQuickResposta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-y"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>Dica (Ponto-Chave):</span>
                </label>
                <input
                  type="text"
                  value={quickDica}
                  onChange={e => setQuickDica(e.target.value)}
                  placeholder="Ponto de virada da conduta ou pegadinha..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {onEditarCard ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickEditOpen(false);
                    onEditarCard(cardAtual, indiceAtual);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Editor completo ↗
                </button>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão do Card */}
      {modalConfirmarExclusao && cardAtual && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Excluir Flashcard?</h4>
                <p className="text-xs text-slate-500">Tem certeza que deseja excluir permanentemente este card?</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 line-clamp-2">
              "{cardAtual.titulo}"
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

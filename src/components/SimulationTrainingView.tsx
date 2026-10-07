import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw, 
  Sparkles, 
  Award,
  Play, 
  Check, 
  Brain, 
  Activity, 
  HeartPulse, 
  Zap, 
  ShieldAlert, 
  Stethoscope,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
  Scissors,
  GitFork,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Flame,
  Lightbulb,
  ArrowDown,
  Split,
  FilePenLine
} from 'lucide-react';
import { CardClinico, EixoClinico, EspecialidadeMedica, TipoCard, MascaraImagem, BlocoOclusao } from '../types';
import { StorageService } from '../services/storage';
import { obterEstiloCorVibrante } from './EixosView';
import { ComplexFlowchartViewer } from './ComplexFlowchartViewer';
import { FormattedClinicalText } from './FormattedClinicalText';
import { EixoEmojiBadge } from './EixoEmojiBadge';
import { obterPassosNormalizados, limparPerguntaNorteadora } from '../utils/flowchartNormalizer';

interface SimulationTrainingViewProps {
  cards: CardClinico[];
  eixos: EixoClinico[];
  onRegistrarRevisao?: (cardId: string, avaliacao: 'errei' | 'dificil' | 'bom' | 'facil', tempoSegundos: number) => void;
  onEditarCard?: (card: CardClinico, indice: number, questoes: CardClinico[]) => void;
  initialFase?: 'config' | 'ativo' | 'resultado';
  initialQuestoes?: CardClinico[];
  initialIndice?: number;
}

export type ModoCronometro = 'livre' | 'por_questao' | 'tempo_total';

export const SimulationTrainingView: React.FC<SimulationTrainingViewProps> = ({
  cards,
  eixos,
  onRegistrarRevisao,
  onEditarCard,
  initialFase,
  initialQuestoes,
  initialIndice,
}) => {
  // Navegação: 'config' | 'ativo' | 'resultado'
  const [fase, setFase] = useState<'config' | 'ativo' | 'resultado'>(initialFase || 'config');

  // Configuração de Quantidade
  const [limiteQuestoes, setLimiteQuestoes] = useState<number>(10);

  // Filtros de Tipo de Flashcard
  const [tiposSelecionados, setTiposSelecionados] = useState<TipoCard[]>([
    'caso_clinico',
    'image_occlusion',
    'conceito',
    'cloze',
    'fluxograma_complexo',
    'fluxograma_oclusao',
  ]);

  // Cronômetro
  const [modoCronometro, setModoCronometro] = useState<ModoCronometro>('por_questao');
  const [segundosPorQuestao, setSegundosPorQuestao] = useState<number>(90); // 90s padrão
  const [minutosTotal, setMinutosTotal] = useState<number>(15);

  // Tópicos e Eixos
  const [topicosSelecionados, setTopicosSelecionados] = useState<string[]>([]);
  const [eixosExpandidos, setEixosExpandidos] = useState<Record<string, boolean>>({});

  // Sessão Ativa
  const [questoesSessao, setQuestoesSessao] = useState<CardClinico[]>(initialQuestoes || []);
  const [indiceAtual, setIndiceAtual] = useState(initialIndice ?? 0);
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState(0);
  const [tempoDecorridoSegundos, setTempoDecorridoSegundos] = useState(0);

  // Sincronizar caso cards sejam editados durante a sessão de treino/estudo
  useEffect(() => {
    if (questoesSessao.length > 0) {
      setQuestoesSessao(prevQuestoes =>
        prevQuestoes.map(q => cards.find(c => c.id === q.id) || q)
      );
    }
  }, [cards]);

  // Sincronizar props iniciais se forem atualizadas
  useEffect(() => {
    if (initialFase) setFase(initialFase);
    if (initialQuestoes && initialQuestoes.length > 0) setQuestoesSessao(initialQuestoes);
    if (initialIndice !== undefined && initialIndice >= 0) setIndiceAtual(initialIndice);
  }, [initialFase, initialQuestoes, initialIndice]);

  // Resposta da Questão Ativa
  const [respostaSelecionada, setRespostaSelecionada] = useState<number | null>(null);
  const [respostasUsuario, setRespostasUsuario] = useState<Record<string, number>>({});
  const [filtroResultado, setFiltroResultado] = useState<'todas' | 'erros' | 'acertos'>('todas');
  const [cardsRecolhidos, setCardsRecolhidos] = useState<Record<string, boolean>>({});
  const [revelouVerso, setRevelouVerso] = useState(false);
  const [mascarasReveladas, setMascarasReveladas] = useState<Record<string, boolean>>({});
  const [clozesRevelados, setClozesRevelados] = useState<Record<number, boolean>>({});
  const [blocosFluxoRevelados, setBlocosFluxoRevelados] = useState<Record<string, boolean>>({});
  const [acertos, setAcertos] = useState<Record<string, boolean>>({});
  const [exibirDicas, setExibirDicas] = useState<boolean>(() => StorageService.getExibirDicas());

  const handleToggleExibirDicas = () => {
    setExibirDicas(prev => {
      const novo = !prev;
      StorageService.setExibirDicas(novo);
      return novo;
    });
  };

  // Renderizar ícone/emoji do Eixo com alto contraste
  const renderIconeEixo = (icone: string) => {
    if (/\p{Extended_Pictographic}/u.test(icone)) {
      return (
        <span className="text-lg leading-none select-none filter drop-shadow-xs">
          {icone}
        </span>
      );
    }
    return <Stethoscope className="w-4 h-4 text-blue-600" />;
  };

  // Estrutura hierárquica de Eixos com seus Tópicos
  const eixosComTopicos = useMemo(() => {
    return eixos.map(eixo => {
      const topicos = (eixo.topicos && eixo.topicos.length > 0)
        ? eixo.topicos.map(t => ({
            id: t.id,
            titulo: t.titulo,
            eixoId: eixo.id,
            eixoTitulo: eixo.titulo,
            especialidade: eixo.especialidade,
          }))
        : [{
            id: `top-eixo-${eixo.id}`,
            titulo: eixo.titulo,
            eixoId: eixo.id,
            eixoTitulo: eixo.titulo,
            especialidade: eixo.especialidade,
          }];

      const totalCardsEixo = cards.filter(c => c.eixoId === eixo.id).length;

      return {
        eixo,
        topicos,
        totalCards: totalCardsEixo,
      };
    });
  }, [eixos, cards]);

  const todosTopicosIds = useMemo(() => {
    const ids: string[] = [];
    eixosComTopicos.forEach(e => {
      e.topicos.forEach(t => ids.push(t.id));
    });
    return ids;
  }, [eixosComTopicos]);

  // Inicializa todos os tópicos selecionados
  useEffect(() => {
    if (topicosSelecionados.length === 0 && todosTopicosIds.length > 0) {
      setTopicosSelecionados(todosTopicosIds);
    }
  }, [todosTopicosIds]);

  // Contagem por Tipo
  const contagemPorTipo = useMemo(() => {
    const counts: Record<TipoCard, number> = {
      caso_clinico: 0,
      image_occlusion: 0,
      conceito: 0,
      cloze: 0,
      fluxograma_complexo: 0,
      fluxograma_oclusao: 0,
    };

    cards.forEach(c => {
      const topicoMatch = topicosSelecionados.length === 0 || 
        (c.topicoId && topicosSelecionados.includes(c.topicoId)) || 
        topicosSelecionados.includes(`top-eixo-${c.eixoId}`);
      
      if (topicoMatch) {
        const tipo = c.tipoCard || 'conceito';
        if (counts[tipo] !== undefined) {
          counts[tipo]++;
        } else {
          counts.conceito++;
        }
      }
    });

    return counts;
  }, [cards, topicosSelecionados]);

  // Cards elegíveis considerando Tópicos E Tipos de Card
  const cardsElegiveis = useMemo(() => {
    return cards.filter(c => {
      const topicoMatch = topicosSelecionados.length === 0 || 
        (c.topicoId && topicosSelecionados.includes(c.topicoId)) || 
        topicosSelecionados.includes(`top-eixo-${c.eixoId}`);
      if (!topicoMatch) return false;

      const tipo = c.tipoCard || 'conceito';
      return tiposSelecionados.includes(tipo);
    });
  }, [cards, topicosSelecionados, tiposSelecionados]);

  // Ajusta o limite se o banco for menor
  useEffect(() => {
    if (cardsElegiveis.length > 0 && limiteQuestoes > cardsElegiveis.length) {
      setLimiteQuestoes(Math.max(5, Math.min(10, cardsElegiveis.length)));
    }
  }, [cardsElegiveis.length]);

  // Timer do Simulado em Andamento
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (fase === 'ativo') {
      interval = setInterval(() => {
        setTempoDecorridoSegundos(prev => prev + 1);

        if (modoCronometro === 'por_questao' || modoCronometro === 'tempo_total') {
          setTempoRestanteSegundos(prev => {
            if (prev <= 1) {
              if (modoCronometro === 'por_questao') {
                handleAvancarProxima();
                return segundosPorQuestao;
              } else {
                setFase('resultado');
                return 0;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fase, modoCronometro, indiceAtual, segundosPorQuestao]);

  // Modificador de 5 em 5
  const alterarQuantidade = (delta: number) => {
    setLimiteQuestoes(prev => {
      const novo = prev + delta;
      const max = Math.max(5, cardsElegiveis.length || 50);
      return Math.min(max, Math.max(5, novo));
    });
  };

  // Alternar Tipo de Card
  const toggleTipoCard = (tipo: TipoCard) => {
    setTiposSelecionados(prev => {
      if (prev.includes(tipo)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== tipo);
      }
      return [...prev, tipo];
    });
  };

  // Alternar Tópico Individual
  const toggleTopico = (topicoId: string) => {
    setTopicosSelecionados(prev => 
      prev.includes(topicoId) ? prev.filter(id => id !== topicoId) : [...prev, topicoId]
    );
  };

  // Selecionar/desmarcar todos os tópicos de um eixo
  const toggleTodosDoEixo = (eixoId: string) => {
    const eixoObj = eixosComTopicos.find(e => e.eixo.id === eixoId);
    if (!eixoObj) return;

    const idsDoEixo = eixoObj.topicos.map(t => t.id);
    const todosJaMarcados = idsDoEixo.every(id => topicosSelecionados.includes(id));

    if (todosJaMarcados) {
      setTopicosSelecionados(prev => prev.filter(id => !idsDoEixo.includes(id)));
    } else {
      setTopicosSelecionados(prev => Array.from(new Set([...prev, ...idsDoEixo])));
    }
  };

  const alternarAccordionEixo = (eixoId: string) => {
    setEixosExpandidos(prev => ({ ...prev, [eixoId]: !prev[eixoId] }));
  };

  // Iniciar Simulado
  const handleIniciarSimulado = () => {
    let pool = [...cardsElegiveis];
    if (pool.length === 0) {
      pool = [...cards];
    }

    // Embaralha
    pool.sort(() => Math.random() - 0.5);
    const selecionados = pool.slice(0, Math.min(limiteQuestoes, pool.length));
    setQuestoesSessao(selecionados);
    setIndiceAtual(0);
    setRespostaSelecionada(null);
    setRespostasUsuario({});
    setFiltroResultado('todas');
    setCardsRecolhidos({});
    setRevelouVerso(false);
    setMascarasReveladas({});
    setClozesRevelados({});
    setBlocosFluxoRevelados({});
    setAcertos({});
    setTempoDecorridoSegundos(0);

    if (modoCronometro === 'por_questao') {
      setTempoRestanteSegundos(segundosPorQuestao);
    } else if (modoCronometro === 'tempo_total') {
      setTempoRestanteSegundos(minutosTotal * 60);
    } else {
      setTempoRestanteSegundos(0);
    }

    setFase('ativo');
  };

  const handleRefazerErros = () => {
    const questoesErradas = questoesSessao.filter(q => !acertos[q.id]);
    if (questoesErradas.length === 0) return;

    setQuestoesSessao(questoesErradas);
    setIndiceAtual(0);
    setRespostaSelecionada(null);
    setRespostasUsuario({});
    setFiltroResultado('todas');
    setCardsRecolhidos({});
    setRevelouVerso(false);
    setMascarasReveladas({});
    setClozesRevelados({});
    setBlocosFluxoRevelados({});
    setAcertos({});
    setTempoDecorridoSegundos(0);

    if (modoCronometro === 'por_questao') {
      setTempoRestanteSegundos(segundosPorQuestao);
    } else if (modoCronometro === 'tempo_total') {
      const novosMinutos = Math.max(5, Math.ceil(questoesErradas.length * 1.5));
      setMinutosTotal(novosMinutos);
      setTempoRestanteSegundos(novosMinutos * 60);
    } else {
      setTempoRestanteSegundos(0);
    }

    setFase('ativo');
  };

  const questaoAtual = questoesSessao[indiceAtual];

  // Interações com Questão Ativa
  const handleSelecionarAlternativa = (index: number) => {
    if (respostaSelecionada !== null || !questaoAtual?.casoClinicoDados) return;
    setRespostaSelecionada(index);
    setRespostasUsuario(prev => ({ ...prev, [questaoAtual.id]: index }));

    const correto = index === questaoAtual.casoClinicoDados.indiceCorreto;
    setAcertos(prev => ({ ...prev, [questaoAtual.id]: correto }));

    if (onRegistrarRevisao) {
      onRegistrarRevisao(questaoAtual.id, correto ? 'facil' : 'errei', 15);
    }
  };

  const handleAvaliarFlashcard = (correto: boolean) => {
    if (!questaoAtual) return;
    setAcertos(prev => ({ ...prev, [questaoAtual.id]: correto }));
    if (onRegistrarRevisao) {
      onRegistrarRevisao(questaoAtual.id, correto ? 'bom' : 'errei', 15);
    }
    handleAvancarProxima();
  };

  const toggleMascaraOclusao = (mascaraId: string) => {
    setMascarasReveladas(prev => {
      const novo = { ...prev, [mascaraId]: !prev[mascaraId] };
      if (!prev[mascaraId] && questaoAtual?.mascarasImagem && questaoAtual.mascarasImagem.length > 0) {
        const todasReveladas = questaoAtual.mascarasImagem.every(m => novo[m.id]);
        if (todasReveladas) {
          setRevelouVerso(true);
        }
      }
      return novo;
    });
  };

  const revelarTodasMascaras = () => {
    if (questaoAtual?.mascarasImagem) {
      const all: Record<string, boolean> = {};
      questaoAtual.mascarasImagem.forEach(m => { all[m.id] = true; });
      setMascarasReveladas(all);
    }
    setRevelouVerso(true);
  };

  const toggleClozeIndividual = (clozeIdx: number) => {
    setClozesRevelados(prev => {
      const novo = { ...prev, [clozeIdx]: !prev[clozeIdx] };
      if (!prev[clozeIdx] && questaoAtual?.textoCloze) {
        const matches = Array.from(questaoAtual.textoCloze.matchAll(/\{\{c(\d+)::/g)).map(m => parseInt(m[1], 10));
        const todasReveladas = matches.length > 0 && matches.every(num => novo[num]);
        if (todasReveladas) {
          setRevelouVerso(true);
        }
      }
      return novo;
    });
  };

  const revelarTodosClozes = () => {
    const all: Record<number, boolean> = {};
    for (let i = 0; i < 20; i++) {
      all[i] = true;
    }
    setClozesRevelados(all);
    setRevelouVerso(true);
  };

  const toggleBlocoFluxo = (blocoId: string) => {
    setBlocosFluxoRevelados(prev => {
      const novo = { ...prev, [blocoId]: !prev[blocoId] };
      if (!prev[blocoId] && questaoAtual) {
        const passos = obterPassosNormalizados(questaoAtual);
        if (passos.length > 0 && passos.every(p => novo[p.id])) {
          setRevelouVerso(true);
        }
      }
      return novo;
    });
  };

  const revelarTodosBlocosFluxo = () => {
    const all: Record<string, boolean> = {};
    if (questaoAtual) {
      obterPassosNormalizados(questaoAtual).forEach(p => { all[p.id] = true; });
    }
    setBlocosFluxoRevelados(all);
    setRevelouVerso(true);
  };

  const handleAvancarProxima = () => {
    if (indiceAtual + 1 < questoesSessao.length) {
      setIndiceAtual(prev => prev + 1);
      setRespostaSelecionada(null);
      setRevelouVerso(false);
      setMascarasReveladas({});
      setClozesRevelados({});
      setBlocosFluxoRevelados({});
      if (modoCronometro === 'por_questao') {
        setTempoRestanteSegundos(segundosPorQuestao);
      }
    } else {
      setFase('resultado');
    }
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // TELA 3: RESULTADO DO SIMULADO (GABARITO & REVISÃO CLÍNICA PREMIUM)
  // =========================================================================
  if (fase === 'resultado') {
    const total = questoesSessao.length;
    const acertosCount = Object.values(acertos).filter(Boolean).length;
    const errosCount = total - acertosCount;
    const percentual = total > 0 ? Math.round((acertosCount / total) * 100) : 0;
    const tempoGastoMinutos = Math.max(1, Math.round(tempoDecorridoSegundos / 60));
    const segundosMedios = total > 0 ? Math.round(tempoDecorridoSegundos / total) : 0;

    const questoesFiltradas = questoesSessao.filter(q => {
      const acertou = acertos[q.id];
      if (filtroResultado === 'erros') return !acertou;
      if (filtroResultado === 'acertos') return acertou;
      return true;
    });

    const todasRecolhidas = questoesFiltradas.length > 0 && questoesFiltradas.every(q => cardsRecolhidos[q.id] === true);

    const toggleTodosCards = () => {
      if (todasRecolhidas) {
        setCardsRecolhidos({});
      } else {
        const novo: Record<string, boolean> = {};
        questoesFiltradas.forEach(q => { novo[q.id] = true; });
        setCardsRecolhidos(novo);
      }
    };

    const toggleCard = (id: string) => {
      setCardsRecolhidos(prev => ({
        ...prev,
        [id]: !prev[id],
      }));
    };

    return (
      <div className="w-full space-y-4 pb-12 animate-in fade-in">
        {/* PAINEL HERÓI DE DESEMPENHO E ESTATÍSTICAS */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xs text-center space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 text-left">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs ${
                percentual >= 80 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                  : percentual >= 60 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}>
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    percentual >= 80 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : percentual >= 60 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {percentual >= 80 
                      ? '🏆 Domínio Clínico Excelente' 
                      : percentual >= 60 
                      ? '⭐ Bom Aproveitamento' 
                      : '🎯 Foco de Revisão Prioritária'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-0.5">
                  Aproveitamento: {percentual}%
                </h2>
              </div>
            </div>

            {/* Ações de Topo */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {errosCount > 0 && (
                <button
                  type="button"
                  onClick={handleRefazerErros}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Treinar novamente apenas as questões que errou"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Refazer Erros ({errosCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFase('config')}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Novo Simulado</span>
              </button>
            </div>
          </div>

          {/* Barra de Progresso com Gradiente */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  percentual >= 80 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : percentual >= 60 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <p className="text-[11.5px] text-slate-600 font-medium text-left">
              {percentual >= 80 
                ? 'Parabéns! Excelente retenção de protocolos e condutas clínicas.' 
                : percentual >= 60 
                ? 'Muito bom! Aproveite a revisão comentada abaixo para fixar os pontos das questões erradas.' 
                : 'Momento de ouro para consolidar: estude as condutas e justificativas comentadas abaixo.'}
            </p>
          </div>

          {/* Grid de 4 Métricas Clínicas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-left">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider">Acertos</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-950">
                {acertosCount} <span className="text-xs text-emerald-700 font-bold">/ {total}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-left">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider">Para Revisar</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-950">
                {errosCount} <span className="text-xs text-rose-700 font-bold">questões</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-left">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider">Tempo Total</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {formatarTempo(tempoDecorridoSegundos)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-left">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider">Média / Questão</span>
                <Timer className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {segundosMedios}s
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO DO GABARITO E REVISÃO DETALHADA */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
          {/* Barra de Filtros e Controles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-950">
                  Gabarito Detalhado & Revisão
                </h3>
                <span className="text-[10.5px] text-slate-500 font-medium">
                  {questoesFiltradas.length} de {total} questões exibidas
                </span>
              </div>
            </div>

            {/* Chips de Filtro */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFiltroResultado('todas')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroResultado === 'todas'
                    ? 'bg-slate-900 text-white shadow-3xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todas ({total})
              </button>

              <button
                type="button"
                onClick={() => setFiltroResultado('erros')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filtroResultado === 'erros'
                    ? 'bg-rose-600 text-white shadow-3xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Revisar ({errosCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroResultado('acertos')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filtroResultado === 'acertos'
                    ? 'bg-emerald-600 text-white shadow-3xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acertos ({acertosCount})</span>
              </button>

              <button
                type="button"
                onClick={toggleTodosCards}
                className="ml-auto text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl cursor-pointer flex items-center gap-1"
                title={todasRecolhidas ? 'Expandir todas as questões' : 'Recolher todas as questões'}
              >
                {todasRecolhidas ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expandir Todas</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher Todas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lista de Questões com Gabarito e Formatação Médica */}
          <div className="space-y-3.5">
            {questoesFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-2xl">🔍</span>
                <p className="text-xs font-bold text-slate-700">
                  Nenhuma questão encontrada com o filtro selecionado.
                </p>
                <button
                  type="button"
                  onClick={() => setFiltroResultado('todas')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Exibir todas as questões
                </button>
              </div>
            ) : (
              questoesFiltradas.map((q) => {
                const questaoOriginalIdx = questoesSessao.findIndex(item => item.id === q.id);
                const acertou = acertos[q.id];
                const recolhido = cardsRecolhidos[q.id] === true;
                const isCaso = q.tipoCard === 'caso_clinico' && !!q.casoClinicoDados;
                const respostaUsuarioIdx = respostasUsuario[q.id];

                return (
                  <div 
                    key={q.id}
                    className={`rounded-2xl border transition-all duration-200 text-left bg-white shadow-2xs overflow-hidden ${
                      acertou 
                        ? 'border-emerald-200/90 hover:border-emerald-300 ring-1 ring-emerald-50' 
                        : 'border-rose-200/90 hover:border-rose-300 ring-1 ring-rose-50'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div 
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-2.5 select-none transition-colors ${
                        acertou ? 'bg-emerald-50/20' : 'bg-rose-50/20'
                      }`}
                    >
                      <div 
                        onClick={() => toggleCard(q.id)}
                        className="flex flex-wrap items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-xs font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-3xs shrink-0">
                          Q{questaoOriginalIdx + 1}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <EixoEmojiBadge card={q} size="sm" />
                          {q.topicoNome && (
                            <span className="text-[10.5px] font-semibold text-slate-600">
                              • {q.topicoNome.replace(/^tópico:\s*/i, '')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botão de Edição Rápida */}
                        {onEditarCard && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditarCard(q, questaoOriginalIdx, questoesSessao);
                            }}
                            title="Editar este flashcard"
                            className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-lg border border-slate-200/90 hover:border-slate-300 bg-white text-slate-700 shadow-3xs cursor-pointer active:scale-95 transition-all"
                          >
                            <FilePenLine className="w-3 h-3 text-slate-600" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                        )}

                        {/* Badge de Acerto / Erro */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl border shadow-3xs ${
                          acertou 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          {acertou ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Acertou</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Revisar</span>
                            </>
                          )}
                        </span>

                        {/* Botão de Expandir / Recolher */}
                        <button
                          type="button"
                          onClick={() => toggleCard(q.id)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shadow-3xs"
                          title={recolhido ? 'Expandir detalhes' : 'Recolher detalhes'}
                        >
                          {recolhido ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo Expandido da Questão */}
                    {!recolhido && (
                      <div className="p-3.5 sm:p-5 pt-1 space-y-3.5 border-t border-slate-100">
                        {/* Título Clínico */}
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-slate-950 leading-snug">
                            <FormattedClinicalText text={q.titulo} />
                          </h4>
                        </div>

                        {/* 1. SE FOR CASO CLÍNICO: QUADRO CLÍNICO DO PACIENTE */}
                        {isCaso && q.casoClinicoDados && (
                          <div className="space-y-2">
                            <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100/90 text-left space-y-2">
                              <div className="flex items-center gap-1.5 text-blue-950">
                                <Stethoscope className="w-4 h-4 text-blue-600" />
                                <span className="text-[11px] font-black uppercase tracking-wider">
                                  Quadro Clínico do Paciente
                                </span>
                              </div>
                              <div className="text-xs sm:text-[13px] text-slate-950 font-normal leading-relaxed">
                                <FormattedClinicalText text={q.casoClinicoDados.historiaClinica} />
                              </div>
                              {q.casoClinicoDados.exameFisicoESinais && (
                                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 text-xs text-slate-900 leading-relaxed font-sans shadow-3xs">
                                  <strong className="text-[10.5px] text-blue-900 uppercase block mb-0.5">
                                    Exame Físico & Sinais Vitais:
                                  </strong>
                                  <FormattedClinicalText text={q.casoClinicoDados.exameFisicoESinais} />
                                </div>
                              )}
                            </div>

                            <div className="text-xs sm:text-[13px] font-normal text-slate-950 pt-0.5 pl-1 flex items-start gap-1.5">
                              <span className="text-blue-600 font-bold shrink-0 mt-0.5 select-none text-sm">➔</span>
                              <div className="flex-1">
                                <FormattedClinicalText text={q.perguntaGatilho || 'Qual a conduta diagnóstica ou terapêutica imediata mais apropriada?'} />
                              </div>
                            </div>

                            {/* Alternativas da Questão (A, B, C, D, E) */}
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block pl-1">
                                Análise das Alternativas:
                              </span>
                              {q.casoClinicoDados.opcoes.map((opcaoTexto, optIdx) => {
                                const isGabarito = optIdx === q.casoClinicoDados!.indiceCorreto;
                                const isMarcadaPeloUsuario = respostaUsuarioIdx === optIdx;
                                const letras = ['A', 'B', 'C', 'D', 'E'];
                                const letra = letras[optIdx] || String.fromCharCode(65 + optIdx);
                                const textoLimpo = opcaoTexto.replace(/^[A-Ea-e][\)\.\:\-]\s*/, '').trim();

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-[12.5px] flex items-start gap-2.5 transition-all ${
                                      isGabarito
                                        ? 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 font-semibold shadow-3xs'
                                        : isMarcadaPeloUsuario
                                        ? 'bg-rose-50/90 border-2 border-rose-400 text-rose-950 font-medium shadow-3xs'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 ${
                                      isGabarito 
                                        ? 'bg-emerald-600 text-white' 
                                        : isMarcadaPeloUsuario 
                                        ? 'bg-rose-600 text-white' 
                                        : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {letra}
                                    </span>

                                    <div className="flex-1 min-w-0 leading-relaxed font-normal">
                                      <FormattedClinicalText text={textoLimpo} />
                                    </div>

                                    {isGabarito && (
                                      <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0 shadow-3xs">
                                        <Check className="w-3 h-3" />
                                        <span>Gabarito</span>
                                      </span>
                                    )}

                                    {isMarcadaPeloUsuario && !isGabarito && (
                                      <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded-md shrink-0 shadow-3xs">
                                        <XCircle className="w-3 h-3" />
                                        <span>Sua Escolha</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. SE NÃO FOR CASO CLÍNICO: PERGUNTA GATILHO / ENUNCIADO */}
                        {!isCaso && q.perguntaGatilho && (
                          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-xs sm:text-[13px] font-normal text-slate-900 leading-relaxed flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              ?
                            </span>
                            <div className="flex-1 font-normal">
                              <FormattedClinicalText text={q.perguntaGatilho} />
                            </div>
                          </div>
                        )}

                        {/* 3. RESPOSTA / CONDUTA PADRÃO-OURO COM FORMATAÇÃO MÉDICA DE ALTO CONTRASTE */}
                        <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 p-3.5 sm:p-4 shadow-3xs space-y-2.5 text-left">
                          <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shadow-3xs">
                                <Activity className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-950">
                                Resposta & Conduta Padrão-Ouro
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-900 border border-blue-200/60">
                              Gabarito Oficial
                            </span>
                          </div>

                          <div className="text-xs sm:text-[13px] text-slate-950 leading-relaxed">
                            <FormattedClinicalText 
                              text={isCaso && q.casoClinicoDados?.justificativaDetalhada 
                                ? q.casoClinicoDados.justificativaDetalhada 
                                : q.resposta
                              } 
                            />
                          </div>
                        </div>

                        {/* 4. SE FOR CLOZE: EXIBIR COM LACUNAS REVELADAS EM VERDE */}
                        {q.tipoCard === 'cloze' && q.textoCloze && (
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-950 leading-relaxed whitespace-pre-line space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Texto com Lacunas Preenchidas:
                            </span>
                            {q.textoCloze.split(/(\{\{c\d+::[^\}]+\}\})/).map((part, i) => {
                              const match = part.match(/\{\{c(\d+)::([^:\}]+)(?:::([^\}]+))?\}\}/);
                              if (match) {
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 underline decoration-emerald-600 decoration-2"
                                  >
                                    {match[2]}
                                  </span>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </div>
                        )}

                        {/* 5. SE FOR IMAGE OCCLUSION OU FLUXOGRAMA COM IMAGEM */}
                        {q.imagemUrl && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 max-h-64 flex items-center justify-center bg-slate-50">
                            <img src={q.imagemUrl} alt={q.titulo} className="max-h-64 object-contain" />
                          </div>
                        )}

                        {/* 6. PÉROLA DE FIXAÇÃO CLÍNICA */}
                        {q.perolaClinica && (
                          <div className="p-3 sm:p-3.5 bg-amber-100/90 rounded-xl sm:rounded-2xl border-2 border-amber-300/90 text-slate-950 flex items-start gap-2.5 shadow-3xs text-left">
                            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs shrink-0 shadow-3xs mt-0.5 select-none">
                              💡
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-amber-900 uppercase tracking-wider text-[10px] sm:text-[10.5px] block mb-0.5">
                                Dica:
                              </span>
                              <p className="font-semibold text-slate-950 text-xs sm:text-[12.5px] leading-relaxed">
                                {q.perolaClinica}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 7. MNEMÔNICO OU DIRETRIZ DE REFERÊNCIA */}
                        {(q.mnemonicoOuDica || q.diretrizReferencia) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10.5px]">
                            {q.mnemonicoOuDica && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-200/80 font-medium">
                                <span>💡</span>
                                <span>Mnemônico: {q.mnemonicoOuDica}</span>
                              </span>
                            )}
                            {q.diretrizReferencia && (
                              <span className="text-slate-500 text-[10px] font-medium ml-auto">
                                Diretriz / Ref: {q.diretrizReferencia}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TELA 2: PROVA EM ANDAMENTO (MÚLTIPLOS FORMATOS)
  // =========================================================================
  if (fase === 'ativo' && questaoAtual) {
    const isCaso = questaoAtual.tipoCard === 'caso_clinico' && !!questaoAtual.casoClinicoDados;
    const isImageOcclusion = questaoAtual.tipoCard === 'image_occlusion' && !!questaoAtual.imagemUrl;
    const isCloze = questaoAtual.tipoCard === 'cloze' && !!questaoAtual.textoCloze;
    const isFluxogramaComplexo = questaoAtual.tipoCard === 'fluxograma_complexo' || !!questaoAtual.fluxogramaComplexo;
    const isFluxograma = !isFluxogramaComplexo && (questaoAtual.tipoCard === 'fluxograma_oclusao' || (questaoAtual as any).tipoCard === 'fluxograma') && (!!questaoAtual.algoritmoDecisao || !!questaoAtual.blocosOclusao || !!questaoAtual.etapasFluxograma);

    return (
      <div className="w-full space-y-2.5 pb-8 animate-in fade-in">
        {/* Barra Superior da Prova (Responsiva e sem sobreposição em telas mobile) */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">
              Questão {indiceAtual + 1}/{questoesSessao.length}
            </span>
            <EixoEmojiBadge card={questaoAtual} size="sm" />
            {questaoAtual.topicoNome && (
              <span className="text-[10.5px] text-slate-600 font-medium hidden sm:inline">
                • {questaoAtual.topicoNome.replace(/^tópico:\s*/i, '')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* Botão de Edição Rápida com Retorno Garantido */}
            {onEditarCard && (
              <button
                type="button"
                onClick={() => onEditarCard(questaoAtual, indiceAtual, questoesSessao)}
                title="Editar este flashcard"
                className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold px-2 py-1 rounded-lg border border-emerald-200 hover:border-emerald-400 bg-emerald-50 text-emerald-700 transition-all cursor-pointer shadow-3xs active:scale-95"
              >
                <FilePenLine className="w-3 h-3 text-emerald-600" />
                <span>Editar</span>
              </button>
            )}

            {/* Botão de Habilitar / Ocultar 100% as Dicas */}
            <button
              type="button"
              onClick={handleToggleExibirDicas}
              title={exibirDicas ? "Dicas ativadas (clique para ocultar 100% das dicas)" : "Dicas 100% ocultas (clique para exibir)"}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                exibirDicas
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 line-through'
              }`}
            >
              <Lightbulb className={`w-3.5 h-3.5 ${exibirDicas ? 'text-amber-600 fill-amber-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{exibirDicas ? 'Dicas: ON' : 'Dicas: OFF'}</span>
              <span className="sm:hidden">{exibirDicas ? 'Dica' : 'S/ Dica'}</span>
            </button>

            {modoCronometro !== 'livre' ? (
              <div className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                tempoRestanteSegundos <= 15 
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Timer className="w-3 h-3 text-amber-600" />
                <span>{formatarTempo(tempoRestanteSegundos)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatarTempo(tempoDecorridoSegundos)}</span>
              </div>
            )}

            <button
              onClick={() => setFase('resultado')}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
            >
              Encerrar
            </button>
          </div>
        </div>

        {/* Card da Questão */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5 text-left">
          {/* Título da Questão / Caso e Tópico */}
          <div className="text-center space-y-1">
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
              {questaoAtual.titulo}
            </h3>
            {questaoAtual.topicoNome && (
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-semibold">
                {questaoAtual.topicoNome.replace(/^tópico:\s*/i, '')}
              </div>
            )}
          </div>

          {/* MODO 1: CASO CLÍNICO COM MÚLTIPLA ESCOLHA */}
          {isCaso && (
            <div className="space-y-3 sm:space-y-3.5 text-left">
              {/* Vinheta Médica do Paciente */}
              <div className="bg-gradient-to-br from-blue-50/60 via-slate-50/80 to-indigo-50/30 p-3 sm:p-4 rounded-2xl border border-blue-100/90 space-y-2 shadow-3xs text-left">
                <div className="flex items-center justify-between pb-1 border-b border-blue-100/60">
                  <span className="text-[10px] sm:text-[10.5px] font-black tracking-wider uppercase text-blue-900 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    Quadro Clínico
                  </span>
                  <span className="text-[9.5px] text-blue-600 font-semibold">Cenário Real</span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-950 leading-relaxed font-medium text-left">
                  {questaoAtual.casoClinicoDados!.historiaClinica}
                </p>

                {questaoAtual.casoClinicoDados!.exameFisicoSinais && (
                  <div className="mt-1.5 p-2.5 bg-white/95 rounded-xl border border-blue-100/80 shadow-3xs text-left space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1">
                      🩺 Exame Físico & Sinais Vitais
                    </span>
                    <p className="text-xs sm:text-[12px] text-slate-700 font-normal leading-relaxed">
                      {questaoAtual.casoClinicoDados!.exameFisicoSinais}
                    </p>
                  </div>
                )}
              </div>

              {/* Pergunta de Decisão com tipografia normal e legível idêntica ao quadro clínico */}
              <div className="pt-0.5 text-xs sm:text-[13px] text-slate-950 leading-relaxed font-medium flex items-start gap-1.5 text-left">
                <span className="text-blue-600 font-bold shrink-0 mt-0.5 select-none text-sm">➔</span>
                <div className="flex-1">
                  <FormattedClinicalText 
                    text={questaoAtual.perguntaGatilho || 'Qual a conduta diagnóstica ou terapêutica imediata mais apropriada?'} 
                  />
                </div>
              </div>

              {/* Alternativas de Escolha Única */}
              <div className="space-y-2">
                {questaoAtual.casoClinicoDados!.opcoes.map((opcao, idx) => {
                  const letras = ['A', 'B', 'C', 'D', 'E'];
                  const foiRespondido = respostaSelecionada !== null;
                  const eCorreta = idx === questaoAtual.casoClinicoDados!.indiceCorreto;
                  const foiEscolhida = idx === respostaSelecionada;
                  const textoLimpo = opcao.replace(/^[A-Ea-e][\)\.\-]\s*/, '');

                  let styleClass = 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 shadow-3xs';
                  if (foiRespondido) {
                    if (eCorreta) {
                      styleClass = 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 font-semibold shadow-2xs';
                    } else if (foiEscolhida && !eCorreta) {
                      styleClass = 'bg-rose-50/90 border-2 border-rose-400 text-rose-950 font-semibold shadow-2xs';
                    } else {
                      styleClass = 'bg-slate-50/60 border-slate-200/40 text-slate-400 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={foiRespondido}
                      onClick={() => handleSelecionarAlternativa(idx)}
                      className={`w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left text-xs sm:text-[13px] transition-all duration-100 ease-out flex items-start gap-2.5 cursor-pointer ${styleClass} ${
                        !foiRespondido ? 'active:scale-[0.99]' : ''
                      }`}
                    >
                      <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition-all mt-0.5 ${
                        foiRespondido && eCorreta 
                          ? 'bg-emerald-600 text-white shadow-2xs' 
                          : foiRespondido && foiEscolhida 
                            ? 'bg-rose-600 text-white shadow-2xs' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {foiRespondido && eCorreta ? (
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                        ) : foiRespondido && foiEscolhida ? (
                          <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
                        ) : (
                          letras[idx]
                        )}
                      </span>
                      <span className="flex-1 leading-relaxed pt-0.5 font-medium">
                        <FormattedClinicalText text={textoLimpo} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {respostaSelecionada !== null && (
                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-300 text-slate-950 space-y-2 animate-in fade-in text-left">
                  <div className="flex items-center justify-between pb-1 border-b border-black/5">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Gabarito & Justificativa Detalhada:</span>
                    </div>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      Gabarito: {['A', 'B', 'C', 'D', 'E'][questaoAtual.casoClinicoDados!.indiceCorreto]}
                    </span>
                  </div>
                  <div className="text-slate-950 text-xs sm:text-[13px] leading-relaxed font-medium">
                    <FormattedClinicalText text={questaoAtual.casoClinicoDados!.justificativaDetalhada} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 2: OCLUSÃO DE IMAGEM (RETÂNGULOS + POLÍGONOS LIVRES SVG) */}
          {isImageOcclusion && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-800">
                {questaoAtual.perguntaGatilho || 'Identifique as estruturas ocluídas na imagem:'}
              </p>

              <div className="relative w-full rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1 sm:p-2 select-none shadow-inner">
                <div 
                  className="relative inline-block max-w-full select-none"
                  style={{ lineHeight: 0 }}
                >
                  <img
                    src={questaoAtual.imagemUrl}
                    alt={questaoAtual.titulo}
                    className="block max-w-full h-auto max-h-[60vh] sm:max-h-[480px] w-auto mx-auto select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />

                  {/* Camada SVG para Máscaras Livres com Polígonos */}
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    {(questaoAtual.mascarasImagem || [])
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
                              className="transition-all hover:brightness-110 active:scale-98"
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
                  {(questaoAtual.mascarasImagem || [])
                    .filter(m => m.tipoForma !== 'livre' || !m.pontos || m.pontos.length <= 2)
                    .map((m) => {
                      const revelado = mascarasReveladas[m.id];

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMascaraOclusao(m.id)}
                          className={`absolute rounded-md transition-all flex items-center justify-center text-center p-1 text-xs cursor-pointer select-none active:scale-95 ${
                            revelado
                              ? 'bg-transparent border-2 border-dashed border-emerald-500/70 hover:bg-emerald-500/10'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold border border-indigo-300 shadow-md hover:scale-[1.02] opacity-100'
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
                  className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Revelar Todas as Estruturas</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  Toque na oclusão ou no quadrado abaixo para revelar
                </span>
              </div>

              {/* Quadrados a parte com os nomes/respostas de cada estrutura abaixo da imagem */}
              {(questaoAtual.mascarasImagem || []).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Gabarito das Estruturas (Toque para revelar individualmente):</span>
                    <span className="text-[9px] font-semibold text-slate-400">
                      {(questaoAtual.mascarasImagem || []).filter(m => mascarasReveladas[m.id]).length} de {(questaoAtual.mascarasImagem || []).length} revelados
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(questaoAtual.mascarasImagem || []).map((m) => {
                      const revelado = mascarasReveladas[m.id];
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMascaraOclusao(m.id)}
                          className={`w-full p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                            revelado
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`shrink-0 w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center transition-colors ${
                              revelado
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{m.numero}
                          </span>
                          <div className="flex-1 min-w-0">
                            {revelado ? (
                              <div className="text-xs sm:text-[13px] leading-snug break-words">
                                <FormattedClinicalText text={m.textoOculto} />
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 italic">
                                [ Toque para revelar resposta #{m.numero} ]
                              </span>
                            )}
                            {exibirDicas && m.dica && (
                              <span className="text-[9px] text-slate-400 block truncate mt-0.5">
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

          {/* MODO 3A: FLUXOGRAMA (REVISÃO VISUAL COMPLETA / DIAGNÓSTICO / RASTREIO / TRATAMENTO) */}
          {isFluxogramaComplexo && (
            <div className="space-y-3">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  <FormattedClinicalText
                    text={limparPerguntaNorteadora(questaoAtual.perguntaGatilho || (questaoAtual as any).pergunta, questaoAtual.titulo)}
                  />
                </div>
              </div>

              <ComplexFlowchartViewer
                fluxograma={questaoAtual.fluxogramaComplexo || {
                  id: questaoAtual.id,
                  titulo: questaoAtual.titulo,
                  descricao: questaoAtual.perolaClinica,
                  noInicialId: 'no-1',
                  nos: [
                    {
                      id: 'no-1',
                      titulo: questaoAtual.perguntaGatilho || questaoAtual.titulo,
                      descricao: questaoAtual.resposta,
                      tipo: 'inicio',
                      ramos: []
                    }
                  ]
                }}
                perguntaGatilho={questaoAtual.perguntaGatilho || (questaoAtual as any).pergunta}
                tituloContexto={questaoAtual.titulo}
                onRegistrarConclusao={() => setRevelouVerso(true)}
              />
            </div>
          )}

          {/* MODO 3B: PASSO A PASSO SEQUENCIAL (DESDE O PASSO 1 ATÉ O FIM) */}
          {isFluxograma && (() => {
            const passos = obterPassosNormalizados(questaoAtual);
            const perguntaLimpa = limparPerguntaNorteadora(
              questaoAtual.perguntaGatilho || (questaoAtual as any).pergunta,
              questaoAtual.titulo
            );
            const proximoPasso = passos.find(p => !blocosFluxoRevelados[p.id] && !revelouVerso);
            const totalRevelados = revelouVerso
              ? passos.length
              : passos.filter(p => blocosFluxoRevelados[p.id]).length;

            return (
              <div className="space-y-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug flex-1 min-w-0">
                    <FormattedClinicalText text={perguntaLimpa} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-white border border-slate-200">
                      {totalRevelados}/{passos.length}
                    </span>
                    <button
                      type="button"
                      onClick={revelarTodosBlocosFluxo}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer"
                    >
                      Revelar Tudo
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {passos.map((passo, idx) => {
                    const revelado = Boolean(blocosFluxoRevelados[passo.id] || revelouVerso);
                    const ehProximoSugerido = !revelado && proximoPasso?.id === passo.id;

                    return (
                      <div key={passo.id || `sim-passo-${idx}`}>
                        {idx > 0 && (
                          <div className="flex justify-center py-0.5 select-none">
                            <div className={`w-0.5 h-2.5 rounded-full transition-colors ${revelado ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleBlocoFluxo(passo.id)}
                          className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.99] ${
                            revelado
                              ? 'bg-white border-emerald-300 shadow-2xs'
                              : ehProximoSugerido
                                ? 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                          }`}
                        >
                          {revelado ? (
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                {passo.numero}
                              </span>
                              <div className="flex-1 min-w-0 space-y-1">
                                {passo.titulo && (
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                    {passo.titulo}
                                  </p>
                                )}
                                <div className={`text-xs sm:text-[13px] leading-relaxed ${passo.titulo ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                                  <FormattedClinicalText text={passo.conteudo} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                  ehProximoSugerido ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-600'
                                }`}>
                                  {passo.numero}
                                </span>
                                <span className={`text-xs sm:text-sm font-bold ${ehProximoSugerido ? 'text-white' : 'text-slate-600'}`}>
                                  Passo {passo.numero}
                                </span>
                              </div>
                              <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${ehProximoSugerido ? 'text-blue-100' : 'text-slate-400'}`}>
                                {ehProximoSugerido && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
                                <span>{ehProximoSugerido ? 'Toque para revelar' : 'Ocluído'}</span>
                              </span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* MODO 4: CLOZE (OMISSÃO DE PALAVRAS COM CLIQUE INTERATIVO) */}
          {isCloze && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-800">
                {questaoAtual.perguntaGatilho || 'Complete as lacunas do texto clínico:'}
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                {questaoAtual.textoCloze!.split(/(\{\{c\d+::[^\}]+\}\})/).map((part, i) => {
                  const match = part.match(/\{\{c(\d+)::([^:\}]+)(?:::([^\}]+))?\}\}/);
                  if (match) {
                    const clozeNumero = parseInt(match[1], 10);
                    const termoOculto = match[2];
                    const dicaOpcional = match[3];
                    const revelado = clozesRevelados[clozeNumero] || revelouVerso;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleClozeIndividual(clozeNumero)}
                        className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          revelado
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 underline decoration-emerald-500 decoration-2'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        }`}
                        title={revelado ? 'Clique para ocultar' : 'Clique para revelar esta lacuna'}
                      >
                        {revelado ? termoOculto : (exibirDicas && dicaOpcional ? `[ ${dicaOpcional} ]` : `[...]`)}
                      </button>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={revelarTodosClozes}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Revelar Todas as Lacunas</span>
                </button>
                <span className="text-[9px] text-slate-400">
                  Toque na lacuna para revelar
                </span>
              </div>
            </div>
          )}

          {/* MODO 5: PADRÃO / CONCEITO (FRENTE E VERSO BÁSICO) */}
          {!isCaso && !isImageOcclusion && !isCloze && !isFluxograma && !isFluxogramaComplexo && (
            <div className="space-y-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 min-h-16 flex items-center justify-center text-center">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-relaxed max-w-xl mx-auto">
                  {questaoAtual.perguntaGatilho}
                </p>
              </div>
            </div>
          )}

          {/* FLUXO DE RESPOSTA E AVALIAÇÃO PARA NÃO-CASOS CLÍNICOS */}
          {!isCaso && (
            <div className="pt-1">
              {!revelouVerso ? (
                <button
                  onClick={() => {
                    if (isFluxograma) {
                      const passos = obterPassosNormalizados(questaoAtual);
                      const proximo = passos.find(p => !blocosFluxoRevelados[p.id]);
                      if (proximo) {
                        toggleBlocoFluxo(proximo.id);
                        return;
                      }
                    }
                    setRevelouVerso(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-transform duration-100 ease-out active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>
                    {isFluxograma
                      ? (() => {
                          const passos = obterPassosNormalizados(questaoAtual);
                          const proximo = passos.find(p => !blocosFluxoRevelados[p.id]);
                          return proximo ? `Revelar Passo ${proximo.numero} (${proximo.numero}/${passos.length})` : 'Concluir Revisão dos Passos';
                        })()
                      : isFluxogramaComplexo
                        ? 'Revelar Fluxograma Completo'
                        : 'Ver Resposta Esperada'}
                  </span>
                </button>
              ) : (
                <div className="space-y-2.5 animate-in fade-in">
                  {(!isFluxograma && !isFluxogramaComplexo) ? (
                    <div className="-mx-3 sm:-mx-5 px-3 sm:px-5 py-3 sm:py-3.5 bg-blue-50/20 border-t-2 border-b border-blue-200/80 text-slate-900 space-y-2.5">
                      <div className="text-center pb-1.5 border-b border-blue-100/90">
                        <span className="text-blue-900 text-xs sm:text-[13px] uppercase font-bold tracking-wider inline-block">
                          Resposta Esperada
                        </span>
                      </div>
                      <FormattedClinicalText text={questaoAtual.resposta} />
                      {questaoAtual.perolaClinica && (
                        <div className="mt-2.5 p-2.5 sm:p-3 bg-amber-100/90 rounded-xl border-2 border-amber-300/90 text-slate-950 flex items-start gap-2 shadow-3xs">
                          <span className="text-amber-700 font-bold shrink-0 select-none text-sm mt-0.5">💡</span>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="font-black text-amber-900 uppercase tracking-wider text-[10px] sm:text-[10.5px] mr-1.5 inline-block">
                              Dica:
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[12.5px] leading-relaxed">
                              {questaoAtual.perolaClinica}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : questaoAtual.perolaClinica ? (
                    <div className="p-2.5 sm:p-3 bg-amber-100/90 rounded-xl border-2 border-amber-300/90 text-slate-950 flex items-start gap-2 shadow-3xs">
                      <span className="text-amber-700 font-bold shrink-0 select-none text-sm mt-0.5">💡</span>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-black text-amber-900 uppercase tracking-wider text-[10px] sm:text-[10.5px] mr-1.5 inline-block">
                          Dica:
                        </span>
                        <span className="font-semibold text-slate-900 text-xs sm:text-[12.5px] leading-relaxed">
                          {questaoAtual.perolaClinica}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {((exibirDicas && questaoAtual.mnemonicoOuDica) || questaoAtual.diretrizReferencia) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-500">
                      {exibirDicas && questaoAtual.mnemonicoOuDica && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 text-amber-900 border border-amber-200/70 font-sans text-[10px] font-medium leading-relaxed">
                          <span>💡</span>
                          <span>{questaoAtual.mnemonicoOuDica}</span>
                        </span>
                      )}
                      {questaoAtual.diretrizReferencia && (
                        <span className="text-[10px] text-slate-400 font-sans ml-auto">
                          Ref: {questaoAtual.diretrizReferencia}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      onClick={() => handleAvaliarFlashcard(false)}
                      className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer flex items-center justify-center gap-1.5 transition-transform duration-100 ease-out active:scale-[0.98]"
                    >
                      <XCircle className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
                      <span>Errei / Revisar</span>
                    </button>
                    <button
                      onClick={() => handleAvaliarFlashcard(true)}
                      className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 cursor-pointer flex items-center justify-center gap-1.5 transition-transform duration-100 ease-out active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                      <span>Acertei</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AVANÇO EM CASO CLÍNICO */}
          {isCaso && respostaSelecionada !== null && (
            <button
              onClick={handleAvancarProxima}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <span>{indiceAtual + 1 === questoesSessao.length ? 'Finalizar Simulado' : 'Próxima Questão'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TELA 1: CONFIGURAÇÃO DO SIMULADO (SUPER LIMPA, BONITA & MOBILE-FIRST)
  // =========================================================================
  return (
    <div className="w-full space-y-3 pb-8 animate-in fade-in text-left">
      {/* 1. Cabeçalho Limpo: Provas e Simulados */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
          <GraduationCap className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
          Provas e Simulados
        </h2>
      </div>

      {/* 2. Seletor de Quantidade de Questões (Limpo e Centralizado) */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
        {/* Stepper Centralizado com [-] e [+] */}
        <div className="flex items-center justify-center gap-2.5 max-w-xs mx-auto">
          <button
            onClick={() => alterarQuantidade(-5)}
            disabled={limiteQuestoes <= 5}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
            title="Diminuir 5 questões"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl h-10 flex items-center justify-center px-4">
            <span className="text-lg font-black text-slate-900">
              {limiteQuestoes}
            </span>
            <span className="text-xs font-bold text-slate-500 ml-1.5">
              questões
            </span>
          </div>

          <button
            onClick={() => alterarQuantidade(5)}
            disabled={limiteQuestoes >= cardsElegiveis.length}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
            title="Aumentar 5 questões"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Chips de Quantidade Centralizados */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
          {[5, 10, 15, 20, 25, 30].map(val => (
            <button
              key={val}
              onClick={() => setLimiteQuestoes(Math.min(cardsElegiveis.length || val, val))}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                limiteQuestoes === val
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {val}
            </button>
          ))}
          {cardsElegiveis.length > 0 && (
            <button
              onClick={() => setLimiteQuestoes(cardsElegiveis.length)}
              className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                limiteQuestoes === cardsElegiveis.length
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              Máximo ({cardsElegiveis.length})
            </button>
          )}
        </div>
      </div>

      {/* 3. Cronômetro (Clean e Centralizado) */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block text-center">
          Cronômetro
        </span>

        {/* 3 Modos */}
        <div className="grid grid-cols-3 gap-1.5 max-w-md mx-auto">
          <button
            onClick={() => setModoCronometro('livre')}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              modoCronometro === 'livre'
                ? 'bg-white border-2 border-blue-600 ring-2 ring-blue-100 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
            <span className="text-[11px] font-bold block text-slate-900 leading-tight">
              Sem Limite
            </span>
          </button>

          <button
            onClick={() => setModoCronometro('por_questao')}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              modoCronometro === 'por_questao'
                ? 'bg-white border-2 border-blue-600 ring-2 ring-blue-100 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
            }`}
          >
            <Timer className="w-3.5 h-3.5 mx-auto mb-1 text-blue-600" />
            <span className="text-[11px] font-bold block text-slate-900 leading-tight">
              Por Questão
            </span>
          </button>

          <button
            onClick={() => setModoCronometro('tempo_total')}
            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
              modoCronometro === 'tempo_total'
                ? 'bg-white border-2 border-blue-600 ring-2 ring-blue-100 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
            }`}
          >
            <Flame className="w-3.5 h-3.5 mx-auto mb-1 text-amber-600" />
            <span className="text-[11px] font-bold block text-slate-900 leading-tight">
              Tempo Total
            </span>
          </button>
        </div>

        {/* Opções Conforme o Modo */}
        {modoCronometro === 'por_questao' && (
          <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap animate-in fade-in">
            {[
              { segs: 60, label: '1 min' },
              { segs: 90, label: '1.5 min' },
              { segs: 120, label: '2 min' },
              { segs: 180, label: '3 min' },
            ].map(item => (
              <button
                key={item.segs}
                onClick={() => setSegundosPorQuestao(item.segs)}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  segundosPorQuestao === item.segs
                    ? 'bg-blue-600 text-white shadow-3xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {modoCronometro === 'tempo_total' && (
          <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap animate-in fade-in">
            {[10, 15, 20, 30, 45].map(m => (
              <button
                key={m}
                onClick={() => setMinutosTotal(m)}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  minutosTotal === m
                    ? 'bg-blue-600 text-white shadow-3xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Filtros por Tipo de Flashcard */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Filtros por Tipo de Card
            </span>
          </div>
          <button
            onClick={() => setTiposSelecionados(['caso_clinico', 'image_occlusion', 'conceito', 'cloze', 'fluxograma_oclusao'])}
            className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Todos
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {[
            {
              id: 'caso_clinico' as TipoCard,
              rotulo: 'Múltipla Escolha / Caso Clínico',
              icone: FileText,
              cor: 'text-blue-600',
            },
            {
              id: 'image_occlusion' as TipoCard,
              rotulo: 'Oclusão de Imagem',
              icone: ImageIcon,
              cor: 'text-purple-600',
            },
            {
              id: 'conceito' as TipoCard,
              rotulo: 'Frente e Verso (Básico)',
              icone: Layers,
              cor: 'text-indigo-600',
            },
            {
              id: 'cloze' as TipoCard,
              rotulo: 'Omissão de Palavras (Cloze)',
              icone: Scissors,
              cor: 'text-emerald-600',
            },
            {
              id: 'fluxograma_oclusao' as TipoCard,
              rotulo: 'Fluxograma / Algoritmo',
              icone: GitFork,
              cor: 'text-amber-600',
            },
          ].map(item => {
            const ativo = tiposSelecionados.includes(item.id);
            const qtd = contagemPorTipo[item.id] || 0;
            const IconComp = item.icone;

            return (
              <div
                key={item.id}
                onClick={() => toggleTipoCard(item.id)}
                className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  ativo
                    ? 'bg-white border-blue-500 shadow-3xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                    ativo ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {ativo && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${ativo ? item.cor : 'text-slate-400'}`} />
                  <span className={`text-[11px] font-semibold truncate ${ativo ? 'text-slate-900' : 'text-slate-500'}`}>
                    {item.rotulo}
                  </span>
                </div>

                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                  ativo ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400'
                }`}>
                  {qtd}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Eixos Clínicos (Super Limpo e Compacto para Mobile) */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Eixos Clínicos
        </h3>

        <div className="space-y-1.5">
          {eixosComTopicos.map(({ eixo, topicos, totalCards }) => {
            const estilo = obterEstiloCorVibrante(eixo.corTema);
            const expandido = eixosExpandidos[eixo.id];
            const idsDoEixo = topicos.map(t => t.id);
            const todosMarcados = idsDoEixo.every(id => topicosSelecionados.includes(id));
            const algumMarcado = idsDoEixo.some(id => topicosSelecionados.includes(id));
            const accentColor = eixo.corTema?.accent || '#2563EB';

            return (
              <div
                key={eixo.id}
                className="rounded-xl border border-slate-200/80 overflow-hidden bg-white"
              >
                {/* Linha do Eixo */}
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <div 
                    onClick={() => toggleTodosDoEixo(eixo.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      todosMarcados 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : algumMarcado 
                          ? 'bg-blue-100 border-blue-400 text-blue-800' 
                          : 'border-slate-300 bg-white'
                    }`}>
                      {todosMarcados && <Check className="w-3 h-3 stroke-[3]" />}
                      {!todosMarcados && algumMarcado && <div className="w-1.5 h-1.5 bg-blue-600 rounded-xs" />}
                    </div>

                    <div 
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white border-2 shadow-xs`}
                      style={{ borderColor: accentColor }}
                    >
                      {renderIconeEixo(eixo.icone)}
                    </div>

                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {eixo.titulo}
                      </h4>
                      <span className="text-[9.5px] text-slate-400">
                        {totalCards} cards
                      </span>
                    </div>
                  </div>

                  {/* Toggle para Ver Tópicos */}
                  {topicos.length > 1 && (
                    <button
                      onClick={() => alternarAccordionEixo(eixo.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Lista de Tópicos Expandida */}
                {expandido && topicos.length > 1 && (
                  <div className="bg-slate-50/70 border-t border-slate-100 p-2 space-y-1">
                    {topicos.map(topico => {
                      const ativo = topicosSelecionados.includes(topico.id);
                      return (
                        <div
                          key={topico.id}
                          onClick={() => toggleTopico(topico.id)}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none"
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                            ativo ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {ativo && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className={`text-[11px] truncate ${ativo ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                            {topico.titulo}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Botão Iniciar Simulado */}
      <div className="pt-1">
        <button
          id="btn-iniciar-simulado-treino"
          onClick={handleIniciarSimulado}
          disabled={cardsElegiveis.length === 0}
          className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md transition-transform duration-100 ease-out active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Iniciar Simulado ({limiteQuestoes} questões)</span>
        </button>
      </div>
    </div>
  );
};

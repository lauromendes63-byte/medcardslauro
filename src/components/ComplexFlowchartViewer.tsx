import React, { useState, useMemo, useEffect } from 'react';
import {
  GitFork,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Lightbulb,
  FilePenLine,
  ArrowDown,
  AlertCircle,
  Zap,
  BookOpen,
  Layers,
} from 'lucide-react';
import {
  FluxogramaComplexoDados,
  NoFluxogramaComplexo,
  RamoFluxogramaComplexo,
  CardClinico,
  TopicoClinico,
} from '../types';
import { StorageService } from '../services/storage';
import { formatarTempoMinutos, obterInfoRodadaCard } from '../utils/timerUtils';
import { EixoEmojiBadge } from './EixoEmojiBadge';
import { FormattedClinicalText } from './FormattedClinicalText';
import {
  limparPerguntaNorteadora,
  obterFluxogramaNormalizado,
} from '../utils/flowchartNormalizer';

export const CORES_PALETA_RAMOS = [
  {
    corKey: 'emerald',
    badge: 'bg-emerald-50 text-emerald-900 border border-emerald-300',
    headerBg: 'bg-emerald-50/60',
    headerBorder: 'border-emerald-300',
    dot: 'bg-emerald-500',
    pillAtivo: 'bg-emerald-600 text-white border-emerald-600',
    pillInativo: 'border-emerald-300 hover:bg-emerald-50 text-emerald-900',
    cardBorder: 'border-emerald-300',
    lineColor: '#10b981',
  },
  {
    corKey: 'sky',
    badge: 'bg-sky-50 text-sky-900 border border-sky-300',
    headerBg: 'bg-sky-50/60',
    headerBorder: 'border-sky-300',
    dot: 'bg-sky-500',
    pillAtivo: 'bg-sky-600 text-white border-sky-600',
    pillInativo: 'border-sky-300 hover:bg-sky-50 text-sky-900',
    cardBorder: 'border-sky-300',
    lineColor: '#0284c7',
  },
  {
    corKey: 'amber',
    badge: 'bg-amber-50 text-amber-900 border border-amber-300',
    headerBg: 'bg-amber-50/60',
    headerBorder: 'border-amber-300',
    dot: 'bg-amber-500',
    pillAtivo: 'bg-amber-600 text-white border-amber-600',
    pillInativo: 'border-amber-300 hover:bg-amber-50 text-amber-900',
    cardBorder: 'border-amber-300',
    lineColor: '#d97706',
  },
  {
    corKey: 'purple',
    badge: 'bg-purple-50 text-purple-900 border border-purple-300',
    headerBg: 'bg-purple-50/60',
    headerBorder: 'border-purple-300',
    dot: 'bg-purple-500',
    pillAtivo: 'bg-purple-600 text-white border-purple-600',
    pillInativo: 'border-purple-300 hover:bg-purple-50 text-purple-900',
    cardBorder: 'border-purple-300',
    lineColor: '#9333ea',
  },
];

export const obterEstiloRamo = (idx: number) => {
  return CORES_PALETA_RAMOS[idx % CORES_PALETA_RAMOS.length];
};

const ESTILOS_COR_SETA: Record<
  string,
  { pill: string; stem: string; arrow: string; dot: string }
> = {
  verde: {
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-300/90',
    stem: 'bg-emerald-300',
    arrow: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  vermelho: {
    pill: 'bg-rose-50 text-rose-900 border-rose-300/90',
    stem: 'bg-rose-300',
    arrow: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  azul: {
    pill: 'bg-sky-50 text-sky-900 border-sky-300/90',
    stem: 'bg-sky-300',
    arrow: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-950 border-amber-300/90',
    stem: 'bg-amber-300',
    arrow: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  purple: {
    pill: 'bg-purple-50 text-purple-900 border-purple-300/90',
    stem: 'bg-purple-300',
    arrow: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  indigo: {
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-300/90',
    stem: 'bg-indigo-300',
    arrow: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  teal: {
    pill: 'bg-teal-50 text-teal-900 border-teal-300/90',
    stem: 'bg-teal-300',
    arrow: 'text-teal-600',
    dot: 'bg-teal-500',
  },
  slate: {
    pill: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    stem: 'bg-zinc-300',
    arrow: 'text-zinc-500',
    dot: 'bg-zinc-500',
  },
};

function obterEstiloSetaRamo(cor?: string, idxFallback: number = 0) {
  if (cor && ESTILOS_COR_SETA[cor]) return ESTILOS_COR_SETA[cor];
  const ordem = ['verde', 'vermelho', 'azul', 'amber', 'purple'];
  return ESTILOS_COR_SETA[ordem[idxFallback % ordem.length]];
}

interface ComplexFlowchartViewerProps {
  fluxograma: FluxogramaComplexoDados;
  onRegistrarConclusao?: () => void;
  initialFullScreen?: boolean;
  onAvaliarRevisao?: (avaliacao: 'errei' | 'dificil' | 'bom' | 'facil') => void;
  onClose?: () => void;
  tituloContexto?: string;
  perolaClinica?: string;
  perguntaGatilho?: string;
  tempoDecorridoSegundos?: number;
  progressoTexto?: string;
  badgeEspecialidade?: string;
  card?: CardClinico;
  topico?: TopicoClinico;
  onEditarCard?: (card: CardClinico) => void;
  onVoltarCard?: () => void;
  onPularCard?: () => void;
  canVoltar?: boolean;
  comfortMode?: boolean;
}

export const ComplexFlowchartViewer: React.FC<ComplexFlowchartViewerProps> = ({
  fluxograma,
  onRegistrarConclusao,
  initialFullScreen = false,
  onAvaliarRevisao,
  onClose,
  tituloContexto,
  perolaClinica,
  perguntaGatilho,
  progressoTexto,
  card,
  topico,
  onEditarCard,
  onVoltarCard,
  onPularCard,
  canVoltar = false,
  comfortMode = false,
}) => {
  const dadosNormalizados = useMemo(
    () => obterFluxogramaNormalizado(fluxograma, tituloContexto || card?.titulo),
    [fluxograma, tituloContexto, card?.titulo]
  );

  const nos = dadosNormalizados.nos;
  const noInicialId = dadosNormalizados.noInicialId || nos[0]?.id || '';

  // Ordem lógica BFS para revelar nó por nó com 1 toque
  const ordemNosIds = useMemo(() => {
    if (nos.length === 0) return [];
    const visitados = new Set<string>();
    const fila: string[] = [noInicialId];
    const ordem: string[] = [];

    while (fila.length > 0) {
      const atualId = fila.shift()!;
      if (!atualId || visitados.has(atualId)) continue;
      const noObj = nos.find(n => n.id === atualId);
      if (!noObj) continue;

      visitados.add(atualId);
      ordem.push(atualId);

      (noObj.ramos || []).forEach(r => {
        if (r.destinoNoId && !visitados.has(r.destinoNoId)) {
          fila.push(r.destinoNoId);
        }
      });
    }

    // Adicionar eventuais nós desconectados
    nos.forEach(n => {
      if (!visitados.has(n.id)) {
        visitados.add(n.id);
        ordem.push(n.id);
      }
    });

    return ordem;
  }, [nos, noInicialId]);

  // Nós que começam ocluídos no Modo Estudo Ativo:
  // Se houver > 1 nó, o nó raiz (quadro inicial/suspeita) dá o ponto de partida e todas as decisões/condutas seguintes começam ocluídas.
  // Se houver apenas 1 nó, ele próprio começa ocluído.
  const nosOcultaveisPadrao = useMemo(() => {
    if (ordemNosIds.length <= 1) return [...ordemNosIds];
    return ordemNosIds.slice(1);
  }, [ordemNosIds]);

  const [modoEstudo, setModoEstudo] = useState<'ativo' | 'completo'>('ativo');
  const [nosRevelados, setNosRevelados] = useState<Record<string, boolean>>({});
  const [exibirDicas, setExibirDicas] = useState<boolean>(() => StorageService.getExibirDicas());

  // Resetar ao trocar de card/fluxograma
  useEffect(() => {
    setNosRevelados({});
    setModoEstudo('ativo');
  }, [dadosNormalizados.id, card?.id]);

  const isNoRevelado = (noId: string) => {
    if (modoEstudo === 'completo') return true;
    if (ordemNosIds.length > 1 && noId === noInicialId && nosRevelados[noId] === undefined) {
      return true;
    }
    return !!nosRevelados[noId];
  };

  const totalOcultaveis = nosOcultaveisPadrao.length;
  const totalRevelados = modoEstudo === 'completo'
    ? totalOcultaveis
    : nosOcultaveisPadrao.filter(id => isNoRevelado(id)).length;
  const todosRevelados = modoEstudo === 'completo' || totalRevelados >= totalOcultaveis;

  useEffect(() => {
    if (todosRevelados && onRegistrarConclusao) {
      onRegistrarConclusao();
    }
  }, [todosRevelados, onRegistrarConclusao]);

  const toggleNo = (noId: string) => {
    if (modoEstudo === 'completo') {
      // Se estava em visão completa e tocou num nó para testar, volta para ativo ocultando este nó
      const estadoTodos: Record<string, boolean> = {};
      ordemNosIds.forEach(id => {
        estadoTodos[id] = id !== noId;
      });
      setModoEstudo('ativo');
      setNosRevelados(estadoTodos);
      return;
    }

    setNosRevelados(prev => ({
      ...prev,
      [noId]: !isNoRevelado(noId),
    }));
  };

  const revelarProximoNo = () => {
    const proximoId = ordemNosIds.find(id => !isNoRevelado(id));
    if (proximoId) {
      setNosRevelados(prev => ({ ...prev, [proximoId]: true }));
    } else {
      setModoEstudo('completo');
    }
  };

  const revelarTudo = () => {
    const todos: Record<string, boolean> = {};
    ordemNosIds.forEach(id => {
      todos[id] = true;
    });
    setNosRevelados(todos);
    setModoEstudo('completo');
  };

  const ocultarTudo = () => {
    setModoEstudo('ativo');
    setNosRevelados({});
  };

  const mapaNos = useMemo(() => {
    const map = new Map<string, NoFluxogramaComplexo>();
    nos.forEach(n => map.set(n.id, n));
    return map;
  }, [nos]);

  // Renderizador recursivo da Árvore Visual do Fluxograma (Diagnóstico / Rastreio / Tratamento)
  const renderSubarvore = (
    noId: string,
    ancestrais: Set<string>,
    profundidade: number = 0
  ): React.ReactNode => {
    const no = mapaNos.get(noId);
    if (!no) return null;

    if (ancestrais.has(noId)) {
      return (
        <div className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] font-medium text-zinc-600 text-center mx-auto max-w-xs">
          ↩ Retorna para: <strong className="font-semibold text-zinc-800">{no.titulo}</strong>
        </div>
      );
    }

    const novosAncestrais = new Set(ancestrais);
    novosAncestrais.add(noId);

    const revelado = isNoRevelado(no.id);
    const ehRaiz = no.id === noInicialId && profundidade === 0;
    const ramosValidos = (no.ramos || []).filter(r => r.destinoNoId && mapaNos.has(r.destinoNoId));

    // Acento sutil e semântico (sem textos "enche-linguiça" de tipo de caixa)
    const estiloCaixaRevelada = ehRaiz
      ? comfortMode
        ? 'bg-[#F3EFE8] border-[#D6CFC2] text-stone-900 border-l-4 border-l-blue-600'
        : 'bg-blue-50/35 border-blue-200/90 text-zinc-900 border-l-4 border-l-blue-600'
      : no.tipo === 'alerta'
      ? 'bg-rose-50/45 border-rose-200/90 text-zinc-900 border-l-4 border-l-rose-500'
      : no.tipo === 'decisao'
      ? 'bg-amber-50/40 border-amber-200/90 text-zinc-900 border-l-4 border-l-amber-500'
      : comfortMode
      ? 'bg-white border-[#E2DDD3] text-stone-900 border-l-4 border-l-emerald-600'
      : 'bg-white border-zinc-200/90 text-zinc-900 border-l-4 border-l-emerald-600';

    // Detectar se múltiplos ramos deste nó convergem para um mesmo nó neto (unificação de caminhos)
    let noConvergenteId: string | null = null;
    if (ramosValidos.length >= 2) {
      const contagemDestinosNetos = new Map<string, number>();
      ramosValidos.forEach(r => {
        const filho = mapaNos.get(r.destinoNoId);
        if (filho && filho.ramos.length === 1) {
          const netoId = filho.ramos[0].destinoNoId;
          if (netoId) {
            contagemDestinosNetos.set(netoId, (contagemDestinosNetos.get(netoId) || 0) + 1);
          }
        }
      });
      contagemDestinosNetos.forEach((count, id) => {
        if (count >= 2 && !noConvergenteId) {
          noConvergenteId = id;
        }
      });
    }

    return (
      <div className="flex flex-col items-center w-full">
        {/* Caixa Clínica do Fluxograma */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleNo(no.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleNo(no.id);
            }
          }}
          className={`w-full max-w-xl rounded-2xl border p-3.5 sm:p-4 text-left transition-colors cursor-pointer select-none touch-instant shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
            revelado
              ? `${estiloCaixaRevelada} hover:border-zinc-300`
              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-900 text-white'
          }`}
        >
          {revelado ? (
            <div className="space-y-1.5 animate-card-reveal">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13.5px] sm:text-[14.5px] font-semibold text-zinc-900 leading-snug flex-1">
                  <FormattedClinicalText text={no.titulo} />
                </div>
                {!ehRaiz && (
                  <span className="text-[10px] font-medium text-zinc-400 shrink-0 mt-0.5">
                    Ocultar
                  </span>
                )}
              </div>

              {no.descricao && (
                <div
                  className={`text-[13px] sm:text-[13.5px] text-zinc-700 font-normal leading-[1.6] ${
                    no.titulo ? 'pt-1.5 border-t border-zinc-200/60' : ''
                  }`}
                >
                  <FormattedClinicalText text={no.descricao} />
                </div>
              )}
            </div>
          ) : (
            <div className="py-1 flex flex-col items-center justify-center text-center space-y-1">
              <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-white">
                <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Toque para revelar esta etapa do fluxograma</span>
              </div>
              {exibirDicas && no.dica && (
                <span className="text-[11px] text-amber-300/95 font-medium">
                  💡 Pista: {no.dica}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CASO 1: Ramo Único (Conexão Vertical Direta) */}
        {ramosValidos.length === 1 && (
          <div className="flex flex-col items-center w-full">
            <div className="h-2.5 w-0.5 bg-zinc-300" />
            {ramosValidos[0].rotulo && (
              <>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-3xs max-w-xs text-center leading-tight ${
                    obterEstiloSetaRamo(ramosValidos[0].cor, 0).pill
                  }`}
                >
                  {ramosValidos[0].rotulo}
                </span>
                <div className="h-1.5 w-0.5 bg-zinc-300" />
              </>
            )}
            <ArrowDown className="w-3.5 h-3.5 text-zinc-400 -mt-1 mb-0.5" strokeWidth={2.2} />
            {renderSubarvore(ramosValidos[0].destinoNoId, novosAncestrais, profundidade + 1)}
          </div>
        )}

        {/* CASO 2: Bifurcação / Múltiplos Ramos (Ex: Sim vs Não, Alto vs Baixo Risco) */}
        {ramosValidos.length >= 2 && (
          <div className="flex flex-col items-center w-full">
            {/* Haste vertical saindo da caixa mãe */}
            <div className="h-3 w-0.5 bg-zinc-300" />

            {/* Barra horizontal conectora de bifurcação */}
            <div className="w-full relative pt-2">
              <div className="hidden sm:block absolute top-0 left-[16%] right-[16%] h-0.5 bg-zinc-300 rounded-full" />

              <div
                className={`grid gap-3 sm:gap-3.5 w-full items-start ${
                  ramosValidos.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : ramosValidos.length === 3
                    ? 'grid-cols-1 md:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {ramosValidos.map((ramo, rIdx) => {
                  const estiloSeta = obterEstiloSetaRamo(ramo.cor, rIdx);
                  const noFilho = mapaNos.get(ramo.destinoNoId);

                  // Se este filho converge para `noConvergenteId`, renderizamos o filho sem repetir o neto dentro da coluna
                  const filhoConvergeNoNeto =
                    noConvergenteId &&
                    noFilho &&
                    noFilho.ramos.length === 1 &&
                    noFilho.ramos[0].destinoNoId === noConvergenteId;

                  const filhoAjustado: NoFluxogramaComplexo | undefined =
                    filhoConvergeNoNeto && noFilho
                      ? { ...noFilho, ramos: [] }
                      : noFilho;

                  return (
                    <div
                      key={ramo.id || `${no.id}-r-${rIdx}`}
                      className="flex flex-col items-center w-full"
                    >
                      {/* Seta com Condição do Ramo */}
                      <div className="flex flex-col items-center mb-1">
                        {ramo.rotulo ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold border shadow-3xs text-center leading-snug ${estiloSeta.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${estiloSeta.dot}`} />
                            <span>{ramo.rotulo}</span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Caminho {rIdx + 1}
                          </span>
                        )}
                        <ArrowDown className={`w-3.5 h-3.5 mt-0.5 ${estiloSeta.arrow}`} strokeWidth={2.2} />
                      </div>

                      {/* Subárvore do ramo */}
                      {filhoConvergeNoNeto && filhoAjustado ? (
                        <div className="w-full flex flex-col items-center">
                          {(() => {
                            // Renderiza apenas a caixa do filho e a haste de saída para a convergência
                            const revFilho = isNoRevelado(filhoAjustado.id);
                            return (
                              <>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleNo(filhoAjustado.id)}
                                  className={`w-full rounded-2xl border p-3.5 text-left transition-colors cursor-pointer select-none touch-instant ${
                                    revFilho
                                      ? 'bg-white border-zinc-200/90 text-zinc-900 border-l-4 border-l-emerald-600'
                                      : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-900 text-white'
                                  }`}
                                >
                                  {revFilho ? (
                                    <div className="space-y-1 animate-card-reveal">
                                      <div className="text-[13px] sm:text-[14px] font-semibold text-zinc-900 leading-snug">
                                        <FormattedClinicalText text={filhoAjustado.titulo} />
                                      </div>
                                      {filhoAjustado.descricao && (
                                        <div className="text-[12.5px] sm:text-[13px] text-zinc-700 leading-[1.58] pt-1 border-t border-zinc-100">
                                          <FormattedClinicalText text={filhoAjustado.descricao} />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Toque para revelar</span>
                                    </div>
                                  )}
                                </div>
                                <div className="h-3 w-0.5 bg-zinc-300" />
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        renderSubarvore(ramo.destinoNoId, novosAncestrais, profundidade + 1)
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Se houve convergência de ramos para um nó em comum, renderiza o nó convergente centralizado abaixo */}
            {noConvergenteId && (
              <div className="flex flex-col items-center w-full mt-1">
                <div className="hidden sm:block w-[68%] h-0.5 bg-zinc-300 rounded-full" />
                <ArrowDown className="w-3.5 h-3.5 text-zinc-400 mt-0.5 mb-0.5" strokeWidth={2.2} />
                {renderSubarvore(noConvergenteId, novosAncestrais, profundidade + 2)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Identificar nós órfãos (caso algum card antigo tenha nós sem conexão a partir da raiz)
  const nosAlcanceRaiz = useMemo(() => {
    const visitados = new Set<string>();
    const fila = [noInicialId];
    while (fila.length > 0) {
      const id = fila.shift()!;
      if (!id || visitados.has(id)) continue;
      visitados.add(id);
      const n = mapaNos.get(id);
      n?.ramos.forEach(r => {
        if (r.destinoNoId && !visitados.has(r.destinoNoId)) fila.push(r.destinoNoId);
      });
    }
    return visitados;
  }, [noInicialId, mapaNos]);

  const nosDesconectados = useMemo(
    () => nos.filter(n => !nosAlcanceRaiz.has(n.id)),
    [nos, nosAlcanceRaiz]
  );

  const perguntaLimpa = limparPerguntaNorteadora(
    perguntaGatilho || card?.perguntaGatilho,
    tituloContexto || card?.titulo || dadosNormalizados.titulo
  );

  // Conteúdo central do Fluxograma (usado tanto inline no ReviewSessionModal quanto no modo Modal)
  const conteudoFluxograma = (
    <div className="space-y-3 text-left">
      {/* Pergunta / Tema Norteador Direto ao Ponto */}
      {perguntaLimpa && (
        <div
          className={`p-3.5 rounded-2xl border text-[13.5px] sm:text-[14.5px] font-medium text-zinc-800 leading-[1.6] ${
            comfortMode ? 'bg-[#F3EFE8] border-[#E4DECF]' : 'bg-zinc-50/80 border-zinc-200/80'
          }`}
        >
          <FormattedClinicalText text={perguntaLimpa} />
        </div>
      )}

      {/* Barra de Controle Minimalista: Alternar entre Praticar Oclusão vs Revisão Completa */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className={`inline-flex items-center p-0.5 rounded-xl border ${
            comfortMode ? 'bg-[#EFECE6] border-[#E2DDD3]' : 'bg-zinc-100 border-zinc-200/80'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (modoEstudo === 'completo') {
                ocultarTudo();
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer touch-instant ${
              modoEstudo === 'ativo' && !todosRevelados
                ? 'bg-white text-zinc-900 shadow-3xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <EyeOff className="w-3 h-3 text-indigo-600" />
            <span>Estudo Ativo ({totalRevelados}/{totalOcultaveis})</span>
          </button>

          <button
            type="button"
            onClick={revelarTudo}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer touch-instant ${
              todosRevelados
                ? 'bg-white text-emerald-900 shadow-3xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Eye className="w-3 h-3 text-emerald-600" />
            <span>Fluxograma Completo</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {!todosRevelados ? (
            <button
              type="button"
              onClick={revelarProximoNo}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-instant"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>+ Revelar Próximo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={ocultarTudo}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-instant"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ocultar p/ Testar</span>
            </button>
          )}
        </div>
      </div>

      {/* Árvore Visual do Fluxograma */}
      <div
        className={`p-3 sm:p-4 rounded-2xl border overflow-x-auto ${
          comfortMode ? 'bg-[#FAF8F5] border-[#E4DECF]' : 'bg-zinc-50/50 border-zinc-200/80'
        }`}
      >
        {noInicialId && mapaNos.has(noInicialId) ? (
          renderSubarvore(noInicialId, new Set(), 0)
        ) : (
          <div className="text-xs text-zinc-400 text-center py-6">
            Nenhuma etapa cadastrada neste fluxograma.
          </div>
        )}

        {/* Etapas adicionais desconectadas (se existirem em cards legados) */}
        {nosDesconectados.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-200/70 space-y-2">
            {nosDesconectados.map(n => (
              <div key={n.id} className="w-full">
                {renderSubarvore(n.id, new Set(), 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Se NÃO for tela cheia autônoma (ou seja, está embutido dentro do ReviewSessionModal ou SimulationTrainingView),
  // retorna diretamente o fluxograma limpo sem duplicar cabeçalhos ou barras.
  if (!initialFullScreen) {
    return conteudoFluxograma;
  }

  // Modo Modal Autônomo (ex: quando aberto isoladamente pelo VisualOcclusionModal)
  const infoRodada = card ? obterInfoRodadaCard(card, topico) : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F7F5] overflow-y-auto flex flex-col justify-start touch-pan-y">
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 pt-2 sm:pt-3 pb-6 space-y-2 flex-1 flex flex-col">
        {/* Barra Superior Minimalista */}
        <div className="rounded-2xl px-3 py-2 bg-white border border-zinc-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {(onVoltarCard || onPularCard) && (
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-100/80 border border-zinc-200/70 shrink-0">
                <button
                  type="button"
                  onClick={onVoltarCard}
                  disabled={!canVoltar}
                  className={`p-1.5 rounded-lg ${
                    !canVoltar
                      ? 'text-zinc-300 cursor-not-allowed'
                      : 'text-zinc-700 hover:bg-white cursor-pointer touch-instant'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="h-3.5 w-px bg-zinc-200/80 mx-0.5" />
                <button
                  type="button"
                  onClick={onPularCard}
                  className="p-1.5 rounded-lg text-zinc-700 hover:bg-white cursor-pointer touch-instant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {progressoTexto && (
              <span className="text-xs font-bold text-zinc-800 whitespace-nowrap">
                {progressoTexto}
              </span>
            )}
            {card && <EixoEmojiBadge card={card} size="sm" />}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {card && onEditarCard && (
              <button
                type="button"
                onClick={() => onEditarCard(card)}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-blue-600 cursor-pointer touch-instant"
                title="Editar fluxograma"
              >
                <FilePenLine className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setExibirDicas(prev => {
                  const n = !prev;
                  StorageService.setExibirDicas(n);
                  return n;
                });
              }}
              className={`p-1.5 rounded-lg border cursor-pointer touch-instant ${
                exibirDicas
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-zinc-50 text-zinc-400 border-zinc-200'
              }`}
              title="Alternar dicas"
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer touch-instant"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/80 p-3.5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="pb-2.5 border-b border-zinc-100 flex items-center justify-between gap-2">
              <h3 className="text-[15px] sm:text-[17px] font-semibold text-zinc-900 leading-snug">
                {tituloContexto || card?.titulo || dadosNormalizados.titulo}
              </h3>
              <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Fluxograma
              </span>
            </div>

            {conteudoFluxograma}

            {todosRevelados && (perolaClinica || card?.perolaClinica) && (
              <div className="p-3.5 rounded-xl bg-amber-50/75 border border-amber-200/80 flex items-start gap-2.5 animate-card-reveal">
                <span className="text-amber-600 text-sm shrink-0 mt-0.5">💡</span>
                <div className="text-[13px] sm:text-[13.5px] text-zinc-800 leading-[1.6]">
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[10.5px] mr-1.5">
                    Ponto-Chave:
                  </span>
                  <FormattedClinicalText text={perolaClinica || card?.perolaClinica || ''} />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé de Ação / Avaliação SRS */}
          {onAvaliarRevisao && (
            <div className="sticky bottom-0 z-20 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 pt-3 pb-3 bg-white/95 border-t border-zinc-100 backdrop-blur-md">
              {!todosRevelados ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={revelarProximoNo}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] sm:text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 min-h-[48px] touch-instant"
                  >
                    <Eye className="w-4 h-4" />
                    <span>
                      Revelar Próxima Etapa ({totalRevelados + 1}/{totalOcultaveis})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={revelarTudo}
                    className="px-3.5 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer min-h-[48px] shrink-0 touch-instant"
                  >
                    Ver Completo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 animate-card-reveal">
                  <button
                    type="button"
                    onClick={() => onAvaliarRevisao('errei')}
                    className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/85 text-rose-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600 mb-0.5" />
                    <span className="text-xs font-bold">Errei</span>
                    <span className="text-[10px] text-rose-600/90 font-medium">
                      {infoRodada ? formatarTempoMinutos(infoRodada.timers.erreiMinutos) : '2m'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAvaliarRevisao('dificil')}
                    className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/85 text-amber-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                    <span className="text-xs font-bold">Difícil</span>
                    <span className="text-[10px] text-amber-700/90 font-medium">
                      {infoRodada ? formatarTempoMinutos(infoRodada.timers.dificilMinutos) : '5m'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAvaliarRevisao('bom')}
                    className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-sky-50/85 hover:bg-sky-100/90 border border-sky-200/90 text-sky-900 font-semibold cursor-pointer min-h-[50px] touch-instant"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 mb-0.5" />
                    <span className="text-xs font-bold">Bom</span>
                    <span className="text-[10px] text-sky-700/90 font-medium">
                      {infoRodada ? formatarTempoMinutos(infoRodada.timers.bomMinutos) : '15m'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAvaliarRevisao('facil')}
                    className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-emerald-50/75 hover:bg-emerald-100/85 border border-emerald-200/85 text-emerald-800 font-semibold cursor-pointer min-h-[50px] touch-instant"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                    <span className="text-xs font-bold">Fácil</span>
                    <span className="text-[10px] text-emerald-700/90 font-medium">
                      {infoRodada ? formatarTempoMinutos(infoRodada.timers.facilMinutos) : '30m'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

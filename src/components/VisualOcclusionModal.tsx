import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Stethoscope, 
  Lightbulb, 
  Image as ImageIcon, 
  HelpCircle, 
  Split, 
  ArrowRight, 
  GitFork, 
  ChevronRight, 
  Sparkles,
  Pencil,
  FilePenLine,
  Trash2
} from 'lucide-react';
import { CardClinico, NoFluxogramaComplexo, FluxogramaComplexoDados } from '../types';
import { StorageService } from '../services/storage';
import { ComplexFlowchartViewer } from './ComplexFlowchartViewer';
import { FormattedClinicalText } from './FormattedClinicalText';
import { EixoEmojiBadge } from './EixoEmojiBadge';
import { obterPassosNormalizados, limparPerguntaNorteadora } from '../utils/flowchartNormalizer';

interface VisualOcclusionModalProps {
  card: CardClinico;
  onClose: () => void;
  onRegistrarRevisao: (cardId: string, avaliacao: 'errei' | 'dificil' | 'bom' | 'facil', tempoSegundos: number) => void;
  onEditarCard?: (card: CardClinico) => void;
  onExcluirCard?: (cardId: string) => void;
}

export const VisualOcclusionModal: React.FC<VisualOcclusionModalProps> = ({
  card,
  onClose,
  onRegistrarRevisao,
  onEditarCard,
  onExcluirCard,
}) => {
  const [blocosRevelados, setBlocosRevelados] = useState<Record<string, boolean>>({});
  const [tempoInicio] = useState<number>(Date.now());
  const [mascaraAtivaId, setMascaraAtivaId] = useState<string | null>(null);
  const [exibirDicas, setExibirDicas] = useState<boolean>(() => StorageService.getExibirDicas());

  const handleToggleExibirDicas = () => {
    setExibirDicas(prev => {
      const novo = !prev;
      StorageService.setExibirDicas(novo);
      return novo;
    });
  };

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

  // Estados específicos para Fluxograma Complexo (Navegação Interativa de Árvore)
  const isComplexFlowchart = card.tipoCard === 'fluxograma_complexo' && card.fluxogramaComplexo;
  const complexData = card.fluxogramaComplexo;
  const [caminhoPercorrido, setCaminhoPercorrido] = useState<string[]>(() => {
    if (complexData?.noInicialId) return [complexData.noInicialId];
    if (complexData?.nos && complexData.nos.length > 0) return [complexData.nos[0].id];
    return [];
  });

  const isImageOcclusion = card.tipoCard === 'image_occlusion' && card.imagemUrl;
  const mascaras = card.mascarasImagem || [];
  const passosNormalizados = React.useMemo(() => obterPassosNormalizados(card), [card]);

  const toggleMascara = (id: string) => {
    setBlocosRevelados(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
    setMascaraAtivaId(id);
  };

  const revelarTodos = () => {
    const todos: Record<string, boolean> = {};
    if (isImageOcclusion) {
      mascaras.forEach(m => { todos[m.id] = true; });
    } else if (isComplexFlowchart && complexData) {
      complexData.nos.forEach(n => { todos[n.id] = true; });
    } else {
      passosNormalizados.forEach(p => { todos[p.id] = true; });
    }
    setBlocosRevelados(todos);
  };

  const ocultarTodos = () => {
    setBlocosRevelados({});
    setMascaraAtivaId(null);
  };

  const handleRevelarProximoPasso = () => {
    if (isImageOcclusion) {
      const proximo = mascaras.find(m => !blocosRevelados[m.id]);
      if (proximo) toggleMascara(proximo.id);
    } else if (isComplexFlowchart && complexData) {
      const proximo = complexData.nos.find(n => !blocosRevelados[n.id]);
      if (proximo) toggleMascara(proximo.id);
    } else {
      const proximo = passosNormalizados.find(p => !blocosRevelados[p.id]);
      if (proximo) toggleMascara(proximo.id);
    }
  };

  const concluirRevisao = (avaliacao: 'errei' | 'dificil' | 'bom' | 'facil') => {
    const tempoGasto = Math.max(1, Math.round((Date.now() - tempoInicio) / 1000));
    const cardId = card.id;
    onClose();
    requestAnimationFrame(() => {
      setTimeout(() => {
        onRegistrarRevisao(cardId, avaliacao, tempoGasto);
      }, 0);
    });
  };

  const totalItens = isImageOcclusion 
    ? mascaras.length 
    : (isComplexFlowchart && complexData ? complexData.nos.length : passosNormalizados.length);
  const totalRevelados = Object.values(blocosRevelados).filter(Boolean).length;
  const todosRevelados = totalItens > 0 && totalRevelados >= totalItens;

  // Lógica do nó ativo na árvore interativa
  const noAtivoId = caminhoPercorrido[caminhoPercorrido.length - 1];
  const noAtivo = complexData?.nos.find(n => n.id === noAtivoId);

  const avancarParaNo = (destinoId: string) => {
    if (!destinoId) return;
    setCaminhoPercorrido(prev => [...prev, destinoId]);
  };

  const voltarParaNo = (index: number) => {
    setCaminhoPercorrido(prev => prev.slice(0, index + 1));
  };

  const reiniciarCaminho = () => {
    if (complexData?.noInicialId) {
      setCaminhoPercorrido([complexData.noInicialId]);
    } else if (complexData?.nos[0]) {
      setCaminhoPercorrido([complexData.nos[0].id]);
    }
  };

  // =========================================================================
  // RESOLUÇÃO IMERSIVA DEDICADA PARA FLUXOGRAMA COMPLEXO (TELA CHEIA TOTAL)
  // O usuário navega pela árvore visual personalizada, com blocos ocluídos
  // exceto o primeiro, clicando diretamente nas caixas para revelar.
  // =========================================================================
  if (isComplexFlowchart && complexData) {
    return (
      <ComplexFlowchartViewer
        fluxograma={complexData}
        initialFullScreen={true}
        onAvaliarRevisao={concluirRevisao}
        onClose={onClose}
        tituloContexto={card.titulo}
        perolaClinica={card.perolaClinica}
        perguntaGatilho={card.perguntaGatilho || (card as any).pergunta}
        badgeEspecialidade={card.especialidade}
        card={card}
        onEditarCard={onEditarCard}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto touch-pan-y">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-auto">
        
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isImageOcclusion ? 'bg-purple-100 text-purple-700' :
              isComplexFlowchart ? 'bg-emerald-100 text-emerald-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {isImageOcclusion ? <ImageIcon className="w-4 h-4" /> : 
               isComplexFlowchart ? <Split className="w-4 h-4" /> : 
               <GitFork className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                isImageOcclusion ? 'text-purple-700' :
                isComplexFlowchart ? 'text-emerald-700' :
                'text-blue-700'
              }`}>
                {isImageOcclusion ? 'Oclusão de Imagem' :
                 isComplexFlowchart ? 'Fluxograma Ramificado (Árvore de Decisão)' :
                 'Fluxograma Passo a Passo'}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <EixoEmojiBadge card={card} size="sm" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {card.titulo}
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditarCard && (
              <button
                type="button"
                onClick={() => onEditarCard(card)}
                title="Editar este flashcard"
                className="p-1.5 rounded-lg border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 transition-all cursor-pointer shadow-3xs active:scale-95 flex items-center justify-center"
              >
                <FilePenLine className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            )}

            <button
              onClick={() => setModalConfirmarExclusao(true)}
              title="Excluir este flashcard permanentemente"
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Interativo */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-slate-500 font-medium">
              {isImageOcclusion 
                ? 'Toque nas caixas sobre a imagem para revelar os termos ocluídos:'
                : isComplexFlowchart
                ? 'Navegue pelas ramificações da conduta ou toque nos blocos para revelar:'
                : 'Toque em cada etapa do fluxo para revelar a conduta ocluída:'}
            </p>
            <div className="flex items-center gap-2">
              {!todosRevelados && (
                <button
                  type="button"
                  onClick={handleRevelarProximoPasso}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-3xs"
                  title="Revelar o próximo passo sequencial"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>+ Próximo Passo</span>
                </button>
              )}

              {/* Botão de Habilitar / Ocultar 100% as Dicas */}
              <button
                type="button"
                onClick={handleToggleExibirDicas}
                title={exibirDicas ? "Dicas ativadas (clique para ocultar 100% das dicas)" : "Dicas 100% ocultas (clique para exibir)"}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
                  exibirDicas
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 line-through'
                }`}
              >
                <Lightbulb className={`w-3.5 h-3.5 ${exibirDicas ? 'text-amber-600 fill-amber-400' : 'text-slate-400'}`} />
                <span>{exibirDicas ? 'Dicas: ON' : 'Dicas: OFF'}</span>
              </button>

              <button
                type="button"
                onClick={todosRevelados ? ocultarTodos : revelarTodos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {todosRevelados ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{todosRevelados ? 'Ocultar Tudo' : 'Revelar Tudo'}</span>
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* MODO 1: FLUXOGRAMA COMPLEXO (ÁRVORE DE DECISÃO COM RAMIFICAÇÕES) */}
          {/* =============================================================== */}
          {isComplexFlowchart && complexData ? (
            <div className="space-y-4">
              {/* Trilha de Navegação (Breadcrumb de Decisões) */}
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1 min-w-0 text-xs font-bold text-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
                    Caminho:
                  </span>
                  {caminhoPercorrido.map((noId, idx) => {
                    const no = complexData.nos.find(n => n.id === noId);
                    const isLast = idx === caminhoPercorrido.length - 1;

                    return (
                      <React.Fragment key={noId}>
                        <button
                          type="button"
                          onClick={() => voltarParaNo(idx)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                            isLast
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {no?.titulo?.substring(0, 18) || `Etapa ${idx + 1}`}
                          {no?.titulo && no.titulo.length > 18 ? '...' : ''}
                        </button>
                        {!isLast && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={reiniciarCaminho}
                  title="Reiniciar do nó inicial"
                  className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bloco Ativo em Destaque */}
              {noAtivo && (
                <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-3 ${
                  noAtivo.tipo === 'inicio' ? 'bg-blue-50/80 border-blue-300' :
                  noAtivo.tipo === 'alerta' ? 'bg-rose-50/80 border-rose-300' :
                  noAtivo.tipo === 'decisao' ? 'bg-amber-50/80 border-amber-300' :
                  'bg-emerald-50/80 border-emerald-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      noAtivo.tipo === 'inicio' ? 'bg-blue-200 text-blue-900' :
                      noAtivo.tipo === 'alerta' ? 'bg-rose-200 text-rose-900' :
                      noAtivo.tipo === 'decisao' ? 'bg-amber-200 text-amber-900' :
                      'bg-emerald-200 text-emerald-900'
                    }`}>
                      {noAtivo.tipo}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleMascara(noAtivo.id)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      {blocosRevelados[noAtivo.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{blocosRevelados[noAtivo.id] ? 'Ocultar' : 'Revelar'}</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      {noAtivo.titulo}
                    </h4>

                    {/* Descrição com suporte a Oclusão */}
                    {noAtivo.descricao && (
                      <div className="mt-2">
                        {(!noAtivo.oculto || blocosRevelados[noAtivo.id]) ? (
                          <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium shadow-2xs animate-in fade-in">
                            <FormattedClinicalText text={noAtivo.descricao} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleMascara(noAtivo.id)}
                            className="w-full p-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>[ Toque para revelar a conduta / dosagem médica ]</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Opções de Ramificação (Próximos Passos) */}
                  {noAtivo.ramos.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Selecione a conduta clínica / resposta:
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {noAtivo.ramos.map((ramo) => {
                          const destino = complexData.nos.find(n => n.id === ramo.destinoNoId);

                          const corClasses = 
                            ramo.cor === 'vermelho' ? 'bg-rose-600 hover:bg-rose-700 text-white' :
                            ramo.cor === 'azul' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                            ramo.cor === 'amber' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                            'bg-emerald-600 hover:bg-emerald-700 text-white';

                          return (
                            <button
                              key={ramo.id}
                              type="button"
                              onClick={() => avancarParaNo(ramo.destinoNoId)}
                              className={`p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 shadow-xs transition-all cursor-pointer active:scale-98 ${corClasses}`}
                            >
                              <span className="leading-tight text-left">
                                {ramo.rotulo}
                              </span>
                              <div className="flex items-center gap-1 shrink-0 text-[10px] opacity-90">
                                <span>{destino?.titulo ? `➔ ${destino.titulo.substring(0, 14)}...` : 'Avançar'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Visão de Todos os Blocos do Algoritmo */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Visão Geral do Algoritmo ({complexData.nos.length} nós)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {complexData.nos.map((no, idx) => {
                    const revelado = blocosRevelados[no.id];
                    const isAtivo = no.id === noAtivoId;

                    return (
                      <div
                        key={no.id}
                        onClick={() => {
                          setCaminhoPercorrido(prev => [...prev, no.id]);
                        }}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isAtivo
                            ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500/20 font-bold'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9.5px] font-bold text-slate-500">
                            #{idx + 1} • {no.tipo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMascara(no.id);
                            }}
                            className="text-[9px] font-bold text-blue-600 hover:underline"
                          >
                            {revelado ? 'Ocultar' : 'Ver'}
                          </button>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5">
                          {no.titulo}
                        </div>
                        {revelado && no.descricao && (
                          <div className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                            <FormattedClinicalText text={no.descricao} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : isImageOcclusion ? (
            /* MODO 2: OCLUSÃO DE IMAGEM REAL */
            <div className="space-y-3">
              <div className="relative w-full rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1 sm:p-2 select-none shadow-inner">
                <div 
                  className="relative inline-block max-w-full select-none"
                  style={{ lineHeight: 0 }}
                >
                  <img
                    src={card.imagemUrl}
                    alt={card.titulo}
                    className="block max-w-full h-auto max-h-[60vh] sm:max-h-[480px] w-auto mx-auto select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />

                  {/* SVG Overlay para Máscaras Livres */}
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    {mascaras.filter(m => m.tipoForma === 'livre' && m.pontos && m.pontos.length > 2).map((m) => {
                      const revelado = blocosRevelados[m.id];
                      const selecionado = mascaraAtivaId === m.id;
                      const pontosString = m.pontos!.map(p => `${p.x},${p.y}`).join(' ');

                      return (
                        <g
                          key={m.id}
                          className="pointer-events-auto cursor-pointer"
                          onClick={() => toggleMascara(m.id)}
                        >
                          <polygon
                            points={pontosString}
                            fill={revelado 
                              ? 'transparent' 
                              : (selecionado ? '#2563eb' : '#4f46e5')
                            }
                            fillOpacity={revelado ? 0 : 1}
                            stroke={revelado ? 'rgba(16, 185, 129, 0.75)' : (selecionado ? '#ffffff' : '#e0e7ff')}
                            strokeWidth={selecionado ? '1.5' : '1'}
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
                              fontSize="3.6"
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

                  {/* Máscaras Retangulares Interativas sobre a Imagem */}
                  {mascaras.filter(m => !m.tipoForma || m.tipoForma === 'retangulo').map((m) => {
                    const revelado = blocosRevelados[m.id];
                    const selecionado = mascaraAtivaId === m.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMascara(m.id)}
                        className={`absolute rounded-lg transition-all flex items-center justify-center text-center p-1 text-xs cursor-pointer select-none active:scale-95 ${
                          revelado
                            ? 'bg-transparent border-2 border-dashed border-emerald-500/70 hover:bg-emerald-500/10 shadow-2xs animate-in fade-in'
                            : selecionado
                            ? 'bg-blue-600 text-white font-bold border-2 border-white ring-2 ring-blue-400 shadow-md opacity-100'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold border-2 border-indigo-300 shadow-md hover:scale-[1.02] opacity-100'
                        }`}
                        style={{
                          left: `${m.x}%`,
                          top: `${m.y}%`,
                          width: `${m.largura}%`,
                          height: `${m.altura}%`,
                          opacity: revelado ? undefined : 1,
                        }}
                        title={revelado ? `Estrutura revelada: ${m.textoOculto}` : `Estrutura #${m.numero}`}
                      >
                        {!revelado && (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-black tracking-wider bg-white/20 px-1.5 py-0.5 rounded-sm">
                              #{m.numero}
                            </span>
                            {exibirDicas && m.dica && (
                              <span className="text-[9px] opacity-80 mt-0.5 truncate max-w-full">
                                {m.dica}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quadrados a parte com os nomes/respostas de cada estrutura abaixo da imagem */}
              {mascaras.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Gabarito das Estruturas (Toque para revelar individualmente):</span>
                    <span className="text-[9px] font-semibold text-slate-400">
                      {totalRevelados} de {totalItens} revelados
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {mascaras.map((m) => {
                      const rev = blocosRevelados[m.id];
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMascara(m.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                            rev
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`shrink-0 w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center transition-colors ${
                              rev
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            #{m.numero}
                          </span>
                          <div className="flex-1 min-w-0">
                            {rev ? (
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
          ) : (
            /* MODO 3: PASSO A PASSO SEQUENCIAL (DESDE O PASSO 1 ATÉ O FIM) */
            <div className="space-y-3">
              {/* Pergunta / Tema Norteador Direto ao Ponto */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                  Tema / Pergunta Norteadora
                </span>
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  <FormattedClinicalText
                    text={limparPerguntaNorteadora(card.perguntaGatilho || (card as any).pergunta, card.titulo)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                {passosNormalizados.map((passo, idx) => {
                  const revelado = Boolean(blocosRevelados[passo.id]);
                  const proximoARevelar = passosNormalizados.find(p => !blocosRevelados[p.id]);
                  const ehProximoSugerido = !revelado && proximoARevelar?.id === passo.id;

                  return (
                    <div key={passo.id || `vo-passo-${idx}`} className="relative">
                      {idx > 0 && (
                        <div className="flex justify-center py-0.5 select-none">
                          <div className={`w-0.5 h-3 rounded-full transition-colors ${revelado ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleMascara(passo.id)}
                        className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.99] ${
                          revelado
                            ? 'bg-white border-emerald-300 shadow-2xs'
                            : ehProximoSugerido
                              ? 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-sm ring-2 ring-blue-400/30'
                              : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200/90 text-slate-600'
                        }`}
                      >
                        {revelado ? (
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                              {passo.numero}
                            </span>
                            <div className="flex-1 min-w-0 space-y-1">
                              {passo.titulo && (
                                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                  {passo.titulo}
                                </p>
                              )}
                              <div className={`text-xs sm:text-[13.5px] leading-relaxed ${passo.titulo ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                                <FormattedClinicalText text={passo.conteudo} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 py-0.5">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                ehProximoSugerido
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200/90 text-slate-600'
                              }`}>
                                {passo.numero}
                              </span>
                              <span className={`text-xs sm:text-sm font-bold ${
                                ehProximoSugerido ? 'text-white' : 'text-slate-600'
                              }`}>
                                Passo {passo.numero}
                              </span>
                            </div>
                            <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                              ehProximoSugerido ? 'text-blue-100' : 'text-slate-400'
                            }`}>
                              {ehProximoSugerido && (
                                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                              )}
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
          )}

          {/* Nota de Fixação Associada */}
          {card.perolaClinica && (
            <div className="bg-amber-100/95 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-300/95 space-y-1 shadow-2xs">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-700 fill-amber-500" />
                Dica
              </span>
              <div className="text-xs sm:text-sm text-slate-950 leading-relaxed font-medium">
                <FormattedClinicalText text={card.perolaClinica} />
              </div>
            </div>
          )}
        </div>

        {/* Avaliação Espaçada Médica (Intervalos Rápidos FSRS) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <span className="text-[11px] font-bold text-slate-500 block mb-2 text-center">
            Como foi sua retenção desse conteúdo?
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => concluirRevisao('errei')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold transition-transform duration-100 ease-out shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500 mb-0.5" strokeWidth={1.75} />
              <span className="text-xs">Errei</span>
              <span className="text-[9px] text-rose-500 font-normal">10 min</span>
            </button>
            <button
              onClick={() => concluirRevisao('dificil')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold transition-transform duration-100 ease-out shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mb-0.5" strokeWidth={1.75} />
              <span className="text-xs">Difícil</span>
              <span className="text-[9px] text-amber-500 font-normal">3 horas</span>
            </button>
            <button
              onClick={() => concluirRevisao('bom')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 font-bold transition-transform duration-100 ease-out shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mb-0.5" strokeWidth={1.75} />
              <span className="text-xs">Bom</span>
              <span className="text-[9px] text-blue-600 font-normal">1 dia</span>
            </button>
            <button
              onClick={() => concluirRevisao('facil')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold transition-transform duration-100 ease-out shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-500 mb-0.5" strokeWidth={1.75} />
              <span className="text-xs">Fácil</span>
              <span className="text-[9px] text-emerald-600 font-normal">2 dias</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Confirmação de Exclusão do Card */}
      {modalConfirmarExclusao && (
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

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GitFork,
  Split,
  ArrowRight,
  Sparkles,
  Eye,
  CornerDownRight
} from 'lucide-react';
import { FluxogramaComplexoDados, NoFluxogramaComplexo, RamoFluxogramaComplexo } from '../types';
import { ClinicalFormatToolbar } from './ClinicalFormatToolbar';
import { ComplexFlowchartViewer } from './ComplexFlowchartViewer';

interface ComplexFlowchartBuilderProps {
  dados: FluxogramaComplexoDados;
  onChange: (novosDados: FluxogramaComplexoDados) => void;
}

export const PRESETS_FLUXOGRAMAS_COMPLEXOS: {
  nome: string;
  descricao: string;
  dados: FluxogramaComplexoDados;
}[] = [
  {
    nome: 'Dor Torácica no PS (SCA com/sem Supra ST)',
    descricao: 'Fluxograma diagnóstico e de reperfusão imediata na SCA',
    dados: {
      id: 'fluxo-sca',
      titulo: 'Abordagem da Dor Torácica Aguda no PS',
      descricao: 'Estratificação por ECG em 10 min e conduta de reperfusão',
      noInicialId: 'no-1',
      nos: [
        {
          id: 'no-1',
          titulo: 'Dor Torácica no PS: ECG em ≤ 10 min',
          descricao: 'Monitorização, acesso venoso, O₂ se Sat < 90% e anamnese direcionada.',
          tipo: 'inicio',
          ramos: [
            { id: 'r1', rotulo: 'Com Supra de ST', destinoNoId: 'no-2', cor: 'vermelho' },
            { id: 'r2', rotulo: 'Sem Supra de ST', destinoNoId: 'no-3', cor: 'azul' },
          ],
        },
        {
          id: 'no-2',
          titulo: 'IAM com Supra de ST (IAMCSST)',
          descricao: '[azul]AAS 200mg[/azul] + [azul]Ticagrelor 180mg[/azul] (ou Clopidogrel 300mg) + Heparina. Avaliar tempo para CATE.',
          tipo: 'alerta',
          ramos: [
            { id: 'r3', rotulo: 'CATE ≤ 120 min', destinoNoId: 'no-4', cor: 'verde' },
            { id: 'r4', rotulo: 'CATE > 120 min', destinoNoId: 'no-5', cor: 'amber' },
          ],
        },
        {
          id: 'no-4',
          titulo: 'Angioplastia Primária',
          descricao: 'Encaminhar imediatamente à hemodinâmica. Meta Porta-Balão ≤ 90 min.',
          tipo: 'conduta',
          ramos: [],
        },
        {
          id: 'no-5',
          titulo: 'Fibrinólise Química Imediata',
          descricao: '[azul]Tenecteplase (TNK)[/azul] em até 30 min (Porta-Agulha). Se falha em 90 min: CATE de resgate.',
          tipo: 'conduta',
          ramos: [],
        },
        {
          id: 'no-3',
          titulo: 'Seriar Troponina + Escore HEART',
          descricao: 'Coletar Troponina US na admissão (0h) e em 1–2h.',
          tipo: 'decisao',
          ramos: [
            { id: 'r5', rotulo: 'Troponina + ou Alto Risco', destinoNoId: 'no-6', cor: 'vermelho' },
            { id: 'r6', rotulo: 'Troponina − e HEART ≤ 3', destinoNoId: 'no-7', cor: 'verde' },
          ],
        },
        {
          id: 'no-6',
          titulo: 'IAMSSST / Angina Instável',
          descricao: 'Internação coronariana + dupla antiagregação + anticoagulação + estratificação invasiva.',
          tipo: 'conduta',
          ramos: [],
        },
        {
          id: 'no-7',
          titulo: 'Baixo Risco Cardiovascular',
          descricao: 'Alta segura com investigação ambulatorial.',
          tipo: 'diagnostico',
          ramos: [],
        },
      ],
    },
  },
  {
    nome: 'Manejo de Potássio e Insulina na CAD',
    descricao: 'Fluxograma de tratamento da Cetoacidose Diabética segundo K+ sérico',
    dados: {
      id: 'fluxo-cad',
      titulo: 'Manejo do Potássio e Insulina na CAD',
      descricao: 'Checagem obrigatória do K+ sérico antes de iniciar insulinoterapia',
      noInicialId: 'no-cad-1',
      nos: [
        {
          id: 'no-cad-1',
          titulo: 'CAD Confirmada (Glicemia > 250, pH < 7.3, Cetonemia)',
          descricao: 'Hidratação inicial com ==SF 0,9% 1000–1500 mL na 1ª hora== e dosar K+ sérico.',
          tipo: 'inicio',
          ramos: [
            { id: 'rcad-1', rotulo: 'K+ < 3,3 mEq/L', destinoNoId: 'no-cad-k-baixo', cor: 'vermelho' },
            { id: 'rcad-2', rotulo: 'K+ 3,3 a 5,2 mEq/L', destinoNoId: 'no-cad-k-normal', cor: 'verde' },
            { id: 'rcad-3', rotulo: 'K+ > 5,2 mEq/L', destinoNoId: 'no-cad-k-alto', cor: 'amber' },
          ],
        },
        {
          id: 'no-cad-k-baixo',
          titulo: 'Suspender Insulina + Repor KCl 20–30 mEq/h',
          descricao: 'NÃO iniciar insulina até K+ ≥ 3,3 mEq/L pelo risco de arritmia fatal.',
          tipo: 'alerta',
          ramos: [],
        },
        {
          id: 'no-cad-k-normal',
          titulo: 'Insulina Regular 0,1 UI/kg/h + KCl 20–30 mEq/L',
          descricao: 'Iniciar bomba de insulina IV mantendo reposição de potássio no soro.',
          tipo: 'conduta',
          ramos: [],
        },
        {
          id: 'no-cad-k-alto',
          titulo: 'Insulina Regular 0,1 UI/kg/h sem KCl',
          descricao: 'Iniciar bomba de insulina IV sem repor K+ agora; reavaliar K+ a cada 2h.',
          tipo: 'conduta',
          ramos: [],
        },
      ],
    },
  },
];

export const ComplexFlowchartBuilder: React.FC<ComplexFlowchartBuilderProps> = ({
  dados,
  onChange,
}) => {
  const [mostrarPresets, setMostrarPresets] = useState(false);
  const [mostrarPrevia, setMostrarPrevia] = useState(true);

  const nos = dados.nos || [];

  const atualizarNos = (novosNos: NoFluxogramaComplexo[], novoInicialId?: string) => {
    onChange({
      ...dados,
      noInicialId: novoInicialId || dados.noInicialId || novosNos[0]?.id || 'no-1',
      nos: novosNos,
    });
  };

  const handleAtualizarNo = (noId: string, campos: Partial<NoFluxogramaComplexo>) => {
    atualizarNos(nos.map(n => (n.id === noId ? { ...n, ...campos } : n)));
  };

  const handleAdicionarCaixaSolta = () => {
    const novoId = `no-${Date.now().toString(36)}-${nos.length + 1}`;
    const novaCaixa: NoFluxogramaComplexo = {
      id: novoId,
      titulo: '',
      descricao: '',
      tipo: nos.length === 0 ? 'inicio' : 'conduta',
      ramos: [],
    };
    atualizarNos([...nos, novaCaixa]);
  };

  const handleRemoverCaixa = (noId: string) => {
    if (nos.length <= 1) return;
    const filtrados = nos
      .filter(n => n.id !== noId)
      .map(n => ({
        ...n,
        ramos: (n.ramos || []).filter(r => r.destinoNoId !== noId),
      }));
    const novoInicial = dados.noInicialId === noId ? filtrados[0]?.id : dados.noInicialId;
    atualizarNos(filtrados, novoInicial);
  };

  // Cria uma nova caixa já conectada a partir de `origemNoId` com 1 toque
  const handleCriarCaixaConectada = (origemNoId: string, rotuloInicial = '') => {
    const novoId = `no-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const novaCaixa: NoFluxogramaComplexo = {
      id: novoId,
      titulo: '',
      descricao: '',
      tipo: 'conduta',
      ramos: [],
    };
    const novoRamo: RamoFluxogramaComplexo = {
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      rotulo: rotuloInicial,
      destinoNoId: novoId,
      cor: 'azul',
    };

    const novosNos = nos.map(n =>
      n.id === origemNoId
        ? { ...n, ramos: [...(n.ramos || []), novoRamo] }
        : n
    );
    atualizarNos([...novosNos, novaCaixa]);
  };

  // Cria uma bifurcação (2 ramos + 2 novas caixas) com 1 toque
  const handleCriarBifurcacaoRapida = (origemNoId: string) => {
    const sufixo = Date.now().toString(36);
    const idSim = `no-${sufixo}-a`;
    const idNao = `no-${sufixo}-b`;

    const caixaA: NoFluxogramaComplexo = {
      id: idSim,
      titulo: '',
      descricao: '',
      tipo: 'conduta',
      ramos: [],
    };
    const caixaB: NoFluxogramaComplexo = {
      id: idNao,
      titulo: '',
      descricao: '',
      tipo: 'conduta',
      ramos: [],
    };

    const ramoA: RamoFluxogramaComplexo = {
      id: `r-${sufixo}-1`,
      rotulo: 'Se Positivo / Sim',
      destinoNoId: idSim,
      cor: 'verde',
    };
    const ramoB: RamoFluxogramaComplexo = {
      id: `r-${sufixo}-2`,
      rotulo: 'Se Negativo / Não',
      destinoNoId: idNao,
      cor: 'vermelho',
    };

    const novosNos = nos.map(n =>
      n.id === origemNoId
        ? { ...n, ramos: [...(n.ramos || []), ramoA, ramoB] }
        : n
    );
    atualizarNos([...novosNos, caixaA, caixaB]);
  };

  const handleAdicionarRamoExistente = (origemNoId: string) => {
    const outroNo = nos.find(n => n.id !== origemNoId);
    if (!outroNo) {
      handleCriarCaixaConectada(origemNoId, '');
      return;
    }
    const novoRamo: RamoFluxogramaComplexo = {
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      rotulo: '',
      destinoNoId: outroNo.id,
      cor: 'azul',
    };
    atualizarNos(
      nos.map(n => (n.id === origemNoId ? { ...n, ramos: [...(n.ramos || []), novoRamo] } : n))
    );
  };

  const handleAtualizarRamo = (
    origemNoId: string,
    ramoId: string,
    campos: Partial<RamoFluxogramaComplexo>
  ) => {
    atualizarNos(
      nos.map(n =>
        n.id === origemNoId
          ? {
              ...n,
              ramos: (n.ramos || []).map(r => (r.id === ramoId ? { ...r, ...campos } : r)),
            }
          : n
      )
    );
  };

  const handleRemoverRamo = (origemNoId: string, ramoId: string) => {
    atualizarNos(
      nos.map(n =>
        n.id === origemNoId
          ? { ...n, ramos: (n.ramos || []).filter(r => r.id !== ramoId) }
          : n
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de Topo Enxuta */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
            <Split className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Construtor de Fluxograma Clínico
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {nos.length} {nos.length === 1 ? 'caixa' : 'caixas'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ideal para revisão completa ou fluxogramas de diagnóstico, rastreio e tratamento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setMostrarPrevia(!mostrarPrevia)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
              mostrarPrevia
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{mostrarPrevia ? 'Ocultar Mapa Visual' : 'Ver Mapa Visual'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarPresets(!mostrarPresets)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Modelos</span>
          </button>

          <button
            type="button"
            onClick={handleAdicionarCaixaSolta}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Caixa</span>
          </button>
        </div>
      </div>

      {/* Modelos Prontos */}
      {mostrarPresets && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 animate-in fade-in">
          <span className="text-xs font-bold text-slate-700 block">
            Modelos de Fluxograma Clínico:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS_FLUXOGRAMAS_COMPLEXOS.map((preset) => (
              <button
                key={preset.nome}
                type="button"
                onClick={() => {
                  onChange(JSON.parse(JSON.stringify(preset.dados)));
                  setMostrarPresets(false);
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/40 text-left transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900">{preset.nome}</div>
                <p className="text-[10.5px] text-slate-500 mt-0.5">{preset.descricao}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prévia ao Vivo do Fluxograma Visual */}
      {mostrarPrevia && nos.some(n => n.titulo.trim() || (n.descricao || '').trim()) && (
        <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
              Prévia Automática do Fluxograma
            </span>
            <span className="text-[10.5px] text-slate-400">
              As conexões e bifurcações são desenhadas automaticamente
            </span>
          </div>
          <ComplexFlowchartViewer
            fluxograma={dados}
            initialFullScreen={false}
          />
        </div>
      )}

      {/* Lista Simples de Caixas e Conexões */}
      <div className="space-y-2.5">
        {nos.map((no, idx) => {
          const isRaiz = (dados.noInicialId || nos[0]?.id) === no.id;

          return (
            <div
              key={no.id}
              className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-2.5"
            >
              {/* Topo da Caixa */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black shrink-0 ${
                      isRaiz
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isRaiz ? `Início (#${idx + 1})` : `#${idx + 1}`}
                  </span>

                  <input
                    type="text"
                    value={no.titulo}
                    onChange={(e) => handleAtualizarNo(no.id, { titulo: e.target.value })}
                    placeholder={
                      idx === 0
                        ? 'Ponto de partida / Suspeita diagnóstica (ex: Dor Torácica no PS)'
                        : `Título ou conduta da caixa #${idx + 1}...`
                    }
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 text-xs sm:text-[13px] font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <ClinicalFormatToolbar
                    targetInputId={`textarea-no-desc-${no.id}`}
                    valorAtual={no.descricao || ''}
                    onValorChange={(val) => handleAtualizarNo(no.id, { descricao: val })}
                    compacto={true}
                    mostrarTopico={false}
                  />
                  {nos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoverCaixa(no.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Remover esta caixa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes / Conduta da Caixa */}
              <textarea
                id={`textarea-no-desc-${no.id}`}
                rows={2}
                value={no.descricao || ''}
                onChange={(e) => handleAtualizarNo(no.id, { descricao: e.target.value })}
                placeholder="Detalhes, doses, exames ou condutas desta etapa (opcional)..."
                className="w-full p-2.5 rounded-xl bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-emerald-500 text-xs text-slate-800 focus:outline-none leading-relaxed"
              />

              {/* Ramificações que saem desta caixa */}
              <div className="pt-1.5 border-t border-slate-100 space-y-2">
                {(no.ramos || []).length > 0 && (
                  <div className="space-y-1.5">
                    {(no.ramos || []).map((ramo) => (
                      <div
                        key={ramo.id}
                        className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/70"
                      >
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                        <input
                          type="text"
                          value={ramo.rotulo}
                          onChange={(e) =>
                            handleAtualizarRamo(no.id, ramo.id, { rotulo: e.target.value })
                          }
                          placeholder="Condição (ex: Se Positivo, K+ < 3.3 ou vazio)"
                          className="w-full sm:w-48 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden sm:inline" />
                        <select
                          value={ramo.destinoNoId}
                          onChange={(e) =>
                            handleAtualizarRamo(no.id, ramo.id, { destinoNoId: e.target.value })
                          }
                          className="flex-1 min-w-[140px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {nos
                            .filter(candidato => candidato.id !== no.id)
                            .map((candidato) => {
                              const numCandidato = nos.findIndex(x => x.id === candidato.id) + 1;
                              return (
                                <option key={candidato.id} value={candidato.id}>
                                  ➔ Caixa #{numCandidato}: {candidato.titulo || '(Sem título)'}
                                </option>
                              );
                            })}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoverRamo(no.id, ramo.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                          title="Remover seta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botões de 1 toque para ramificar ou continuar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCriarCaixaConectada(no.id, '')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Continuar para Nova Caixa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCriarBifurcacaoRapida(no.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <GitFork className="w-3 h-3" />
                    <span>+ Bifurcar (2 Caminhos)</span>
                  </button>

                  {nos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleAdicionarRamoExistente(no.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <span>Conectar a caixa existente</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

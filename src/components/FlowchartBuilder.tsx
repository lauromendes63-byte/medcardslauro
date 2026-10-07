import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GitFork,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowDown,
  ClipboardPaste,
  Check
} from 'lucide-react';
import { ClinicalFormatToolbar } from './ClinicalFormatToolbar';
import { FormattedClinicalText } from './FormattedClinicalText';

export interface BlocoFluxogramaItem {
  id: string;
  titulo: string;
  criterioSeta?: string;
  condutaOuAcao: string;
}

interface FlowchartBuilderProps {
  blocos: BlocoFluxogramaItem[];
  onChange: (novosBlocos: BlocoFluxogramaItem[]) => void;
}

const PRESETS_PASSO_A_PASSO: {
  nome: string;
  descricao: string;
  blocos: BlocoFluxogramaItem[];
}[] = [
  {
    nome: 'Sequência Rápida de Intubação (7 Ps)',
    descricao: 'Ordem cronológica dos 7 Ps na intubação de emergência',
    blocos: [
      {
        id: 'sri-1',
        titulo: 'Preparação',
        condutaOuAcao: 'Checar laringoscópio, ==tubo orotraqueal (7.5 a 8.5)==, fio-guia, aspirador a vácuo, monitorização multiparamétrica e [azul]acesso venoso calibroso[/azul].',
      },
      {
        id: 'sri-2',
        titulo: 'Pré-oxigenação',
        condutaOuAcao: 'Ofertar O₂ a 100% sob máscara não reinalante por ==3 a 5 minutos== (lavagem de nitrogênio alveolar sem ventilação com pressão positiva).',
      },
      {
        id: 'sri-3',
        titulo: 'Pré-tratamento / Otimização',
        condutaOuAcao: 'Estabilizar hemodinâmica (cristaloide/noradrenalina se hipotensão) e considerar [azul]Fentanil 1–3 mcg/kg[/azul] se HIC, dissecção aórtica ou SCA.',
      },
      {
        id: 'sri-4',
        titulo: 'Paralisia com Indução',
        condutaOuAcao: 'Hipnótico ([azul]Etomidato 0.3 mg/kg[/azul] ou [azul]Cetamina 1.5–2 mg/kg[/azul]) seguido imediatamente de bloqueador neuromuscular ([azul]Succinilcolina 1.5 mg/kg[/azul] ou [azul]Rocurônio 1.2 mg/kg[/azul]).',
      },
      {
        id: 'sri-5',
        titulo: 'Posicionamento e Passagem do Tubo',
        condutaOuAcao: 'Posição olfativa (sniffing), aguardar 45–60s para apneia/relaxamento e realizar laringoscopia com passagem do tubo sob visão direta.',
      },
      {
        id: 'sri-6',
        titulo: 'Pós-intubação',
        condutaOuAcao: 'Insuflar balonete (20–30 cmH₂O), confirmar com ==capnografia em onda== + ausculta epigástrica/pulmonar, fixar o tubo e iniciar sedoanalgesia contínua.',
      },
    ],
  },
  {
    nome: 'Abordagem Inicial da Anafilaxia Grave',
    descricao: 'Passos imediatos de estabilização na sala de emergência',
    blocos: [
      {
        id: 'anaf-1',
        titulo: 'Adrenalina IM Imediata',
        condutaOuAcao: '[azul]Adrenalina 1:1000 (1 mg/mL) 0,3 a 0,5 mg IM[/azul] na face anterolateral da coxa (vasto lateral). Pode repetir a cada 5–15 min.',
      },
      {
        id: 'anaf-2',
        titulo: 'Decúbito, O₂ e Acesso Calibroso',
        condutaOuAcao: 'Posicionar em decúbito dorsal com MMII elevados, suplementar ==O₂ a 100%== e avaliar necessidade de via aérea definitiva precoce se estridor.',
      },
      {
        id: 'anaf-3',
        titulo: 'Expansão Volêmica Rápida',
        condutaOuAcao: 'Infundir ==SF 0,9% ou Ringer Lactato 20 mL/kg== em bolus rápido se hipotensão persistente.',
      },
      {
        id: 'anaf-4',
        titulo: 'Terapia Adjuvante (2ª Linha)',
        condutaOuAcao: 'Anti-histamínico ([azul]Difenidramina 25–50 mg IV[/azul]), corticoide ([azul]Metilprednisolona 1–2 mg/kg IV[/azul] para prevenir reação bifásica) e broncodilatador se broncoespasmo.',
      },
    ],
  },
];

export const FlowchartBuilder: React.FC<FlowchartBuilderProps> = ({
  blocos,
  onChange,
}) => {
  const [mostrarPresets, setMostrarPresets] = useState(false);
  const [mostrarColarLote, setMostrarColarLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');

  const handleAdicionarPasso = () => {
    const novo: BlocoFluxogramaItem = {
      id: `passo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: '',
      condutaOuAcao: '',
    };
    onChange([...blocos, novo]);
  };

  const handleInserirPassoApos = (index: number) => {
    const novo: BlocoFluxogramaItem = {
      id: `passo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: '',
      condutaOuAcao: '',
    };
    const copia = [...blocos];
    copia.splice(index + 1, 0, novo);
    onChange(copia);
  };

  const handleMoverPasso = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index === 0) return;
    if (direcao === 'baixo' && index === blocos.length - 1) return;

    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    const copia = [...blocos];
    const [item] = copia.splice(index, 1);
    copia.splice(novoIndex, 0, item);
    onChange(copia);
  };

  const handleAtualizarPasso = (id: string, campos: Partial<BlocoFluxogramaItem>) => {
    onChange(blocos.map(b => (b.id === id ? { ...b, ...campos } : b)));
  };

  const handleRemoverPasso = (id: string) => {
    if (blocos.length <= 1) return;
    onChange(blocos.filter(b => b.id !== id));
  };

  const handleImportarTextoEmLote = () => {
    const linhas = textoLote
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (linhas.length === 0) return;

    const novosPassos: BlocoFluxogramaItem[] = linhas.map((linha, idx) => {
      const semPrefixo = linha
        .replace(/^(?:passo|etapa)\s*#?\d+[\s:\-\.)]*/i, '')
        .replace(/^\d+[\.\)\-]\s*/, '')
        .replace(/^[•\-\*]\s*/, '')
        .trim();

      // Se tiver "Título: descrição curta", separa opcionalmente se o título for curto
      const matchDoisPontos = semPrefixo.match(/^([^:]{3,42}):\s+(.+)$/);
      if (matchDoisPontos) {
        return {
          id: `passo-${Date.now()}-${idx}`,
          titulo: matchDoisPontos[1].trim(),
          condutaOuAcao: matchDoisPontos[2].trim(),
        };
      }

      return {
        id: `passo-${Date.now()}-${idx}`,
        titulo: '',
        condutaOuAcao: semPrefixo,
      };
    });

    onChange(novosPassos);
    setTextoLote('');
    setMostrarColarLote(false);
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho enxuto do Passo a Passo */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
            <GitFork className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Passos Sequenciais
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {blocos.length} {blocos.length === 1 ? 'passo' : 'passos'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Todos os passos (do Passo 1 ao fim) iniciam ocluídos na revisão para você lembrar na ordem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMostrarColarLote(!mostrarColarLote);
              setMostrarPresets(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
            <span>Colar Lista</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMostrarPresets(!mostrarPresets);
              setMostrarColarLote(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Modelos</span>
          </button>

          <button
            type="button"
            onClick={handleAdicionarPasso}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Passo</span>
          </button>
        </div>
      </div>

      {/* Colar passos em lote (1 linha = 1 passo) */}
      {mostrarColarLote && (
        <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Cole sua lista de passos (1 passo por linha):
            </span>
            <button
              type="button"
              onClick={() => setMostrarColarLote(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Fechar
            </button>
          </div>
          <textarea
            value={textoLote}
            onChange={(e) => setTextoLote(e.target.value)}
            rows={4}
            placeholder={"1. Preparação: separar laringo, tubo e drogas\n2. Pré-oxigenação: O2 100% por 3-5 min\n3. Indução e paralisia: Etomidato + Succinilcolina\n4. Passagem do tubo e confirmação com capnografia"}
            className="w-full p-2.5 rounded-xl bg-white border border-blue-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImportarTextoEmLote}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Gerar Passos Automaticamente</span>
            </button>
          </div>
        </div>
      )}

      {/* Modelos rápidos */}
      {mostrarPresets && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 animate-in fade-in">
          <span className="text-xs font-bold text-slate-700 block">
            Modelos de Passo a Passo:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS_PASSO_A_PASSO.map((preset) => (
              <button
                key={preset.nome}
                type="button"
                onClick={() => {
                  onChange(preset.blocos);
                  setMostrarPresets(false);
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 text-left transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900">{preset.nome}</div>
                <p className="text-[10.5px] text-slate-500 mt-0.5">{preset.descricao}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Passos */}
      <div className="space-y-1.5">
        {blocos.map((bloco, idx) => {
          const ehPrimeiro = idx === 0;
          const ehUltimo = idx === blocos.length - 1;

          return (
            <div key={bloco.id}>
              {!ehPrimeiro && (
                <div className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => handleInserirPassoApos(idx - 1)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Inserir passo intermediário aqui"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>+ inserir passo aqui</span>
                  </button>
                </div>
              )}

              <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={bloco.titulo}
                      onChange={(e) => handleAtualizarPasso(bloco.id, { titulo: e.target.value })}
                      placeholder={`Título curto do Passo ${idx + 1} (opcional — ex: Pré-oxigenação)`}
                      className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-slate-50/80 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ClinicalFormatToolbar
                      targetInputId={`textarea-passo-resposta-${bloco.id}`}
                      valorAtual={bloco.condutaOuAcao}
                      onValorChange={(val) => handleAtualizarPasso(bloco.id, { condutaOuAcao: val })}
                      compacto={true}
                      mostrarTopico={false}
                    />
                    <button
                      type="button"
                      disabled={ehPrimeiro}
                      onClick={() => handleMoverPasso(idx, 'cima')}
                      className={`p-1 rounded-lg border ${
                        ehPrimeiro
                          ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={ehUltimo}
                      onClick={() => handleMoverPasso(idx, 'baixo')}
                      className={`p-1 rounded-lg border ${
                        ehUltimo
                          ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {blocos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverPasso(bloco.id)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Remover passo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  id={`textarea-passo-resposta-${bloco.id}`}
                  rows={2}
                  value={bloco.condutaOuAcao}
                  onChange={(e) => handleAtualizarPasso(bloco.id, { condutaOuAcao: e.target.value })}
                  placeholder={`Descreva o Passo ${idx + 1} (conduta, dose ou ação)...`}
                  className="w-full p-2.5 rounded-xl bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 text-xs sm:text-[13px] text-slate-900 focus:outline-none leading-relaxed"
                />

                {bloco.condutaOuAcao.trim() && (
                  <div className="px-2.5 py-1.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <FormattedClinicalText text={bloco.condutaOuAcao} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAdicionarPasso}
        className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-600 hover:bg-blue-50/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar Passo {blocos.length + 1}</span>
      </button>
    </div>
  );
};

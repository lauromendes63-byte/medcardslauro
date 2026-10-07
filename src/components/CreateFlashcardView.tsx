import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft,
  Layers, 
  FileText, 
  Image as ImageIcon, 
  GitFork, 
  CheckCircle2, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Scissors, 
  ArrowRight, 
  FolderTree, 
  AlertCircle,
  ChevronDown,
  Check,
  Sparkles,
  Split,
  Save,
  BookOpen,
  HelpCircle,
  Stethoscope,
  XCircle,
  Wand2,
  Undo2,
  Eye,
  EyeOff,
  RotateCw,
  Play,
  RefreshCw
} from 'lucide-react';
import { CardClinico, EixoClinico, MascaraImagem, TipoCard, EtapaFluxograma, AlgoritmoDecisao, BlocoFluxogramaDecisao, RamificacaoFluxo, FluxogramaComplexoDados, BlocoOclusao } from '../types';
import { ImageOcclusionEditor } from './ImageOcclusionEditor';
import { VisualClozeEditor } from './VisualClozeEditor';
import { FlowchartBuilder } from './FlowchartBuilder';
import { ComplexFlowchartBuilder, PRESETS_FLUXOGRAMAS_COMPLEXOS } from './ComplexFlowchartBuilder';
import { ComplexFlowchartViewer } from './ComplexFlowchartViewer';
import { FormattedClinicalText } from './FormattedClinicalText';
import { ClinicalFormatToolbar } from './ClinicalFormatToolbar';
import { obterPassosNormalizados, limparPerguntaNorteadora } from '../utils/flowchartNormalizer';

interface CreateFlashcardViewProps {
  eixos: EixoClinico[];
  eixoPreselecionadoId?: string;
  topicoPreselecionadoId?: string;
  cardEmEdicao?: CardClinico | null;
  onVoltar: () => void;
  onCardCriado: (card: CardClinico) => void;
  onCardAtualizado?: (card: CardClinico) => void;
  onAbrirImportExport?: (options?: { tab?: 'importar' | 'exportar'; eixoId?: string }) => void;
}

const TIPOS_CARD_CONFIG: {
  id: TipoCard;
  rotuloCurto: string;
  rotuloCompleto: string;
  descricao: string;
  icone: React.ElementType;
  corBadge: string;
  corBorder: string;
  corAtiva: string;
}[] = [
  {
    id: 'conceito',
    rotuloCurto: 'Frente e Verso',
    rotuloCompleto: 'Frente e Verso (Básico)',
    descricao: 'Pergunta direta e resposta clínica tradicional',
    icone: FileText,
    corBadge: 'bg-blue-50 text-blue-800 border-blue-200',
    corBorder: 'border-blue-500 ring-blue-500/20',
    corAtiva: 'bg-blue-600 text-white',
  },
  {
    id: 'cloze',
    rotuloCurto: 'Cloze',
    rotuloCompleto: 'Oclusão de Texto (Cloze)',
    descricao: 'Lacunas com {{c1::termo}}',
    icone: Scissors,
    corBadge: 'bg-amber-50 text-amber-800 border-amber-200',
    corBorder: 'border-amber-500 ring-amber-500/20',
    corAtiva: 'bg-amber-600 text-white',
  },
  {
    id: 'image_occlusion',
    rotuloCurto: 'Oclusão Imagem',
    rotuloCompleto: 'Oclusão de Imagem (Image Occlusion)',
    descricao: 'Ocluir estruturas e termos em imagens',
    icone: ImageIcon,
    corBadge: 'bg-purple-50 text-purple-800 border-purple-200',
    corBorder: 'border-purple-500 ring-purple-500/20',
    corAtiva: 'bg-purple-600 text-white',
  },
  {
    id: 'caso_clinico',
    rotuloCurto: 'Caso Clínico',
    rotuloCompleto: 'Caso Clínico (Múltipla Escolha)',
    descricao: 'Questão de conduta com gabarito e justificativa',
    icone: CheckCircle2,
    corBadge: 'bg-teal-50 text-teal-800 border-teal-200',
    corBorder: 'border-teal-500 ring-teal-500/20',
    corAtiva: 'bg-teal-600 text-white',
  },
  {
    id: 'fluxograma_oclusao',
    rotuloCurto: 'Passo a Passo',
    rotuloCompleto: 'Passo a Passo Sequencial',
    descricao: 'Pergunta norteadora direta com revelação do Passo 1 até o fim',
    icone: GitFork,
    corBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    corBorder: 'border-indigo-500 ring-indigo-500/20',
    corAtiva: 'bg-indigo-600 text-white',
  },
  {
    id: 'fluxograma_complexo',
    rotuloCurto: 'Fluxograma',
    rotuloCompleto: 'Fluxograma (Diagnóstico / Rastreio / Tratamento)',
    descricao: 'Revisão completa ou fluxograma visual de decisão clínica',
    icone: Split,
    corBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    corBorder: 'border-emerald-500 ring-emerald-500/20',
    corAtiva: 'bg-emerald-600 text-white',
  },
];

// Modelos rápidos de pergunta para estudantes de medicina (1-tap prompt starters)
const PROMPT_STARTERS_MEDICOS = [
  { rotulo: 'Tratamento 1ª Linha', prefixo: 'Qual o tratamento de primeira linha para ' },
  { rotulo: 'Padrão-Ouro Diagnóstico', prefixo: 'Qual o exame padrão-ouro para confirmação de ' },
  { rotulo: 'Conduta Imediata', prefixo: 'Qual a conduta imediata na suspeita de ' },
  { rotulo: 'Critérios Diagnósticos', prefixo: 'Quais são os critérios diagnósticos clássicos de ' },
  { rotulo: 'Contraindicações', prefixo: 'Quais as principais contraindicações de ' },
  { rotulo: 'Dose / Posologia', prefixo: 'Qual a posologia e via de administração de ' },
];

export const CreateFlashcardView: React.FC<CreateFlashcardViewProps> = ({
  eixos,
  eixoPreselecionadoId,
  topicoPreselecionadoId,
  cardEmEdicao,
  onVoltar,
  onCardCriado,
  onCardAtualizado,
  onAbrirImportExport,
}) => {
  const [tipoCard, setTipoCard] = useState<TipoCard>(() => cardEmEdicao?.tipoCard || 'conceito');
  const [eixoId, setEixoId] = useState(() => cardEmEdicao?.eixoId || eixoPreselecionadoId || eixos[0]?.id || '');
  
  const eixoAtual = eixos.find(e => e.id === eixoId) || eixos[0];
  const topicosDisponiveis = eixoAtual?.topicos || [];
  
  const [topicoId, setTopicoId] = useState<string>(() => cardEmEdicao?.topicoId || topicoPreselecionadoId || topicosDisponiveis[0]?.id || '');
  const [novoTopicoNome, setNovoTopicoNome] = useState('');
  const [modoNovoTopico, setModoNovoTopico] = useState(false);

  // Sincronizar eixo e tópico se mudar por props
  useEffect(() => {
    if (cardEmEdicao) {
      setTipoCard(cardEmEdicao.tipoCard);
      setEixoId(cardEmEdicao.eixoId);
      setTopicoId(cardEmEdicao.topicoId || '');
      setTitulo(cardEmEdicao.titulo || '');
      setPergunta(cardEmEdicao.perguntaGatilho || (cardEmEdicao as any).pergunta || '');
      setResposta(cardEmEdicao.resposta || '');
      setDica(cardEmEdicao.mnemonicoOuDica || '');
      setNotaExplicativa(cardEmEdicao.perolaClinica || '');
      setImagemUrl(cardEmEdicao.imagemUrl || '');
      setMascarasImagem(cardEmEdicao.mascarasImagem || []);
      setTextoCloze(cardEmEdicao.textoCloze || '');
      if (cardEmEdicao.fluxogramaComplexo) {
        setFluxogramaComplexo(JSON.parse(JSON.stringify(cardEmEdicao.fluxogramaComplexo)));
      }
      const passosNorm = obterPassosNormalizados(cardEmEdicao);
      if (passosNorm.length > 0) {
        setBlocosDecisao(passosNorm.map((p, idx) => ({
          id: p.id || `b-${idx + 1}`,
          titulo: p.titulo || '',
          criterioSeta: '',
          condutaOuAcao: p.conteudo || '',
        })));
      }
      if (cardEmEdicao.casoClinicoDados) {
        setHistoriaClinica(cardEmEdicao.casoClinicoDados.historiaClinica || '');
        setExameFisicoSinais(cardEmEdicao.casoClinicoDados.exameFisicoSinais || '');
        setOpcoes(cardEmEdicao.casoClinicoDados.opcoes || ['', '', '', '']);
        setIndiceCorreto(cardEmEdicao.casoClinicoDados.indiceCorreto || 0);
        setJustificativaDetalhada(cardEmEdicao.casoClinicoDados.justificativaDetalhada || '');
      }
      return;
    }
    setTipoCard('conceito');
    if (eixoPreselecionadoId) setEixoId(eixoPreselecionadoId);
    if (topicoPreselecionadoId) setTopicoId(topicoPreselecionadoId);
  }, [eixoPreselecionadoId, topicoPreselecionadoId, cardEmEdicao]);

  useEffect(() => {
    if (eixoAtual && (!topicoId || !topicosDisponiveis.some(t => t.id === topicoId))) {
      setTopicoId(topicosDisponiveis[0]?.id || '');
    }
  }, [eixoId]);

  // Campos comuns
  const [titulo, setTitulo] = useState(() => cardEmEdicao?.titulo || '');
  const [pergunta, setPergunta] = useState(() => cardEmEdicao?.perguntaGatilho || (cardEmEdicao as any)?.pergunta || '');
  const [resposta, setResposta] = useState(() => cardEmEdicao?.resposta || '');
  const [dica, setDica] = useState(() => cardEmEdicao?.mnemonicoOuDica || '');
  const [notaExplicativa, setNotaExplicativa] = useState(() => cardEmEdicao?.perolaClinica || '');

  // Oclusão de Imagem
  const [imagemUrl, setImagemUrl] = useState(() => cardEmEdicao?.imagemUrl || '');
  const [mascarasImagem, setMascarasImagem] = useState<MascaraImagem[]>(() => cardEmEdicao?.mascarasImagem || []);

  // Oclusão de Texto (Cloze)
  const [textoCloze, setTextoCloze] = useState(() => cardEmEdicao?.textoCloze || '');

  // Fluxograma Complexo
  const [fluxogramaComplexo, setFluxogramaComplexo] = useState<FluxogramaComplexoDados>(() => {
    if (cardEmEdicao?.fluxogramaComplexo) {
      return JSON.parse(JSON.stringify(cardEmEdicao.fluxogramaComplexo));
    }
    return {
      id: `fluxo-${Date.now()}`,
      titulo: '',
      descricao: '',
      noInicialId: 'no-1',
      nos: [
        {
          id: 'no-1',
          titulo: '',
          descricao: '',
          tipo: 'inicio',
          ramos: []
        }
      ]
    };
  });

  // Passo a Passo Sequencial
  const [blocosDecisao, setBlocosDecisao] = useState<{
    id: string;
    titulo: string;
    criterioSeta?: string;
    condutaOuAcao: string;
  }[]>(() => {
    if (cardEmEdicao) {
      const passosNorm = obterPassosNormalizados(cardEmEdicao);
      if (passosNorm.length > 0) {
        return passosNorm.map((p, idx) => ({
          id: p.id || `b-${idx + 1}`,
          titulo: p.titulo || '',
          criterioSeta: '',
          condutaOuAcao: p.conteudo || '',
        }));
      }
    }
    return [
      { id: 'b-1', titulo: '', criterioSeta: '', condutaOuAcao: '' },
      { id: 'b-2', titulo: '', criterioSeta: '', condutaOuAcao: '' },
    ];
  });

  // Caso Clínico
  const [historiaClinica, setHistoriaClinica] = useState(() => cardEmEdicao?.casoClinicoDados?.historiaClinica || '');
  const [exameFisicoSinais, setExameFisicoSinais] = useState(() => cardEmEdicao?.casoClinicoDados?.exameFisicoSinais || '');
  const [opcoes, setOpcoes] = useState<string[]>(() => cardEmEdicao?.casoClinicoDados?.opcoes || ['', '', '', '']);
  const [indiceCorreto, setIndiceCorreto] = useState<number>(() => cardEmEdicao?.casoClinicoDados?.indiceCorreto || 0);
  const [justificativaDetalhada, setJustificativaDetalhada] = useState(() => cardEmEdicao?.casoClinicoDados?.justificativaDetalhada || '');

  // Estados para modo de edição inline vs teste de Active Recall em tempo real (para todos os formatos)
  const [modoVisualizacao, setModoVisualizacao] = useState<'editar' | 'testar'>('editar');
  const [ladoCardConceito, setLadoCardConceito] = useState<'frente' | 'verso'>('frente');
  const [opcaoSimulada, setOpcaoSimulada] = useState<number | null>(null);
  const [clozesRevelados, setClozesRevelados] = useState<Set<number>>(new Set());
  const [passosRevelados, setPassosRevelados] = useState<Set<number>>(new Set());

  // Helper para renderizar cloze com oclusões interativas clicáveis
  const renderClozeInterativo = (texto: string) => {
    if (!texto) return <span className="text-slate-400 italic">Nenhum texto de oclusão configurado ainda.</span>;
    const clozeRegex = /\{\{c(\d+)::([\s\S]+?)(?:::([\s\S]+?))?\}\}/g;
    const partes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = clozeRegex.exec(texto)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        partes.push(<span key={`txt-${lastIndex}`}>{texto.substring(lastIndex, matchIndex)}</span>);
      }
      const clozeNum = parseInt(match[1], 10);
      const clozeContent = match[2];
      const isRevelado = clozesRevelados.has(clozeNum);

      partes.push(
        <button
          key={`cloze-${clozeNum}-${matchIndex}`}
          type="button"
          onClick={() => {
            const novo = new Set(clozesRevelados);
            if (novo.has(clozeNum)) novo.delete(clozeNum);
            else novo.add(clozeNum);
            setClozesRevelados(novo);
          }}
          className={`inline-block mx-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
            isRevelado
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-3xs'
              : 'bg-blue-600 text-white shadow-3xs hover:bg-blue-700 animate-pulse'
          }`}
          title={isRevelado ? 'Clique para ocultar lacuna' : 'Clique para revelar termo'}
        >
          {isRevelado ? clozeContent : `[ ... c${clozeNum} ]`}
        </button>
      );
      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < texto.length) {
      partes.push(<span key={`txt-${lastIndex}`}>{texto.substring(lastIndex)}</span>);
    }

    return <div className="leading-relaxed text-xs sm:text-sm text-slate-800">{partes}</div>;
  };

  // Modal para preenchimento de exemplo por demanda
  const [modalConfirmarExemplo, setModalConfirmarExemplo] = useState(false);

  // Auxiliar para aplicar prefixo no input de pergunta
  const aplicarPromptStarter = (prefixo: string) => {
    if (!pergunta.trim()) {
      setPergunta(prefixo);
    } else {
      setPergunta(prev => `${prefixo}${prev}`);
    }
  };

  // Preencher exemplo de demonstração
  const aplicarExemplo = () => {
    if (tipoCard === 'fluxograma_complexo') {
      const preset = PRESETS_FLUXOGRAMAS_COMPLEXOS[0];
      setTitulo(preset.nome);
      setPergunta('Abordagem diagnóstica e conduta de reperfusão na dor torácica aguda no PS:');
      setFluxogramaComplexo(JSON.parse(JSON.stringify(preset.dados)));
    } else if (tipoCard === 'caso_clinico') {
      setTitulo('Choque Séptico Refratário a Volume no Idoso');
      setHistoriaClinica('Paciente de 68 anos, hipertenso e diabético, dá entrada no pronto-socorro torporoso, afebril, com história de tosse produtiva e dispneia há 4 dias. Já foram administrados 30 mL/kg de cristaloides na sala de emergência nas últimas 2 horas, mantendo hipotensão.');
      setExameFisicoSinais('PA 78/48 mmHg, FC 128 bpm, FR 28 irpm, SatO2 91% em ar ambiente, Lactato sérico 4.5 mmol/L');
      setPergunta('Considerando a falta de resposta pressórica à ressuscitação volêmica adequada, qual a conduta imediata mais indicada?');
      setOpcoes([
        'Iniciar expansão volêmica adicional com 30 mL/kg de albumina',
        'Iniciar Noradrenalina imediatamente para manter PAM ≥ 65 mmHg',
        'Indicar passagem de balão intra-aórtico de emergência',
        'Prescrever Dobutamina como primeira linha para choque refratário'
      ]);
      setIndiceCorreto(1);
      setJustificativaDetalhada('A noradrenalina é o vasopressor de 1ª escolha no choque séptico quando a PAM permanece < 65 mmHg após ressuscitação volêmica adequada.');
    } else if (tipoCard === 'cloze') {
      setTitulo('Tríade de Cushing na Hipertensão Intracraniana');
      setPergunta('Quais são os 3 sinais da Tríade de Cushing na hipertensão intracraniana?');
      setTextoCloze('A Tríade de Cushing, indicativa de {{c1::hipertensão intracraniana grave}} com risco iminente de herniação, é composta por: {{c2::Hipertensão arterial sistólica com aumento da pressão de pulso}}, {{c3::Bradicardia}} e {{c4::Irregularidade respiratória / respiração de Cheyne-Stokes}}.');
      setDica('Sinal tardio de comprometimento do tronco encefálico.');
      setNotaExplicativa('A tríade é um reflexo autonômico compensatório à isquemia cerebral difusa.');
    } else if (tipoCard === 'fluxograma_oclusao') {
      setTitulo('Sequência Rápida de Intubação (SRI) - 7 Ps');
      setPergunta('Qual a sequência cronológica dos 7 Ps na intubação orotraqueal de emergência?');
      setBlocosDecisao([
        { id: 'et-1', titulo: 'Preparação', condutaOuAcao: 'Checagem de material (laringo, tubo, aspiração, drogas e acesso venoso)' },
        { id: 'et-2', titulo: 'Pré-oxigenação', condutaOuAcao: 'Oxigênio a 100% por 3 a 5 minutos em máscara não reinalante' },
        { id: 'et-3', titulo: 'Pré-tratamento / Otimização', condutaOuAcao: 'Estabilizar hemodinâmica e considerar Fentanil se indicação específica' },
        { id: 'et-4', titulo: 'Paralisia com Indução', condutaOuAcao: 'Hipnótico (ex: Etomidato) seguido de bloqueador neuromuscular (ex: Succinilcolina/Rocurônio)' },
        { id: 'et-5', titulo: 'Posicionamento', condutaOuAcao: 'Posição olfativa (sniffing position) com coxim occipital' },
        { id: 'et-6', titulo: 'Passagem do Tubo', condutaOuAcao: 'Laringoscopia sob visão direta + insuflação do balonete' },
        { id: 'et-7', titulo: 'Pós-Intubação', condutaOuAcao: 'Capnografia, ausculta epigástrica/pulmonar, fixação do tubo e sedação contínua' }
      ]);
    } else {
      setTitulo('Critérios de Light para Derrame Pleural Exsudativo');
      setPergunta('Quais são os 3 critérios de Light e quantos bastam para definir exsudato pleural?');
      setResposta('Basta preencher pelo menos 1 dos 3 critérios:\n1. Relação Proteína pleural / Proteína sérica > 0,5\n2. Relação LDH pleural / LDH sérico > 0,6\n3. LDH pleural > 2/3 do limite superior da normalidade do LDH sérico.');
      setDica('Glicose e celularidade não entram na definição original de Light.');
      setNotaExplicativa('Critérios de Light possuem alta sensibilidade (~98%) para derrame pleural exsudativo.');
    }
    setModalConfirmarExemplo(false);
  };

  // Atalho de teclado Ctrl+Enter / Cmd+Enter para salvar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executarSalvar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    eixoId, topicoId, modoNovoTopico, novoTopicoNome, tipoCard, titulo, pergunta, resposta, dica, 
    notaExplicativa, imagemUrl, mascarasImagem, textoCloze, fluxogramaComplexo, blocosDecisao, 
    historiaClinica, exameFisicoSinais, opcoes, indiceCorreto, justificativaDetalhada
  ]);

  const executarSalvar = () => {
    const eixoSelecionado = eixos.find(ex => ex.id === eixoId) || eixos[0];
    if (!eixoSelecionado) return;

    let topicoFinalId = topicoId;
    let topicoFinalNome = topicosDisponiveis.find(t => t.id === topicoId)?.titulo || '';

    if (modoNovoTopico && novoTopicoNome.trim()) {
      topicoFinalId = `top-${Date.now()}`;
      topicoFinalNome = novoTopicoNome.trim();
    }

    let cardTitulo = titulo.trim();
    let cardPergunta = pergunta.trim();
    let cardResposta = resposta.trim();

    let algoritmoDecisaoData: AlgoritmoDecisao | undefined = undefined;
    let blocosOclusaoData: BlocoOclusao[] | undefined = undefined;

    if (tipoCard === 'fluxograma_complexo') {
      cardTitulo = cardTitulo || fluxogramaComplexo.titulo || 'Fluxograma Clínico';
      cardPergunta = cardPergunta || cardTitulo;
      cardResposta = (fluxogramaComplexo.nos || []).map(n => `• ${n.titulo}${n.descricao ? ': ' + n.descricao : ''}`).join('\n');
    } else if (tipoCard === 'image_occlusion') {
      if (!imagemUrl || mascarasImagem.length === 0) {
        alert('Por favor, carregue uma imagem e adicione pelo menos uma oclusão sobre ela.');
        return;
      }
      cardTitulo = cardTitulo || 'Oclusão de Imagem Anatômica / Clínica';
      cardPergunta = cardPergunta || `Identifique as ${mascarasImagem.length} estruturas ocluídas na imagem.`;
      cardResposta = mascarasImagem.map(m => `#${m.numero}: ${m.textoOculto}`).join('\n');
    } else if (tipoCard === 'cloze') {
      if (!textoCloze.trim()) {
        alert('Por favor, digite o texto com pelo menos uma lacuna {{c1::termo}}.');
        return;
      }
      cardTitulo = cardTitulo || 'Oclusão de Texto (Cloze)';
      cardPergunta = cardPergunta || cardTitulo;
      cardResposta = textoCloze.trim();
    } else if (tipoCard === 'fluxograma_oclusao') {
      cardTitulo = cardTitulo || cardPergunta || 'Passo a Passo Clínico';
      cardPergunta = cardPergunta || cardTitulo;
      cardResposta = blocosDecisao.map((b, i) => {
        return `${i + 1}. ${b.titulo ? `${b.titulo}: ` : ''}${b.condutaOuAcao}`;
      }).join('\n');

      const blocos: BlocoFluxogramaDecisao[] = blocosDecisao.map((b) => ({
        id: b.id,
        titulo: b.titulo,
        descricao: b.condutaOuAcao,
        tipo: 'conduta',
      }));

      blocosOclusaoData = blocosDecisao.map((b, idx) => ({
        id: b.id || `bo-${idx + 1}`,
        posicao: { x: 10, y: 15 + idx * 25, largura: 80, altura: 20 },
        textoOculto: b.condutaOuAcao || b.titulo,
        dica: b.titulo || undefined,
        revelado: false,
      }));

      const ramificacoes: RamificacaoFluxo[] = [];
      for (let i = 0; i < blocosDecisao.length - 1; i++) {
        ramificacoes.push({
          id: `ram-${i}`,
          origemId: blocosDecisao[i].id,
          destinoId: blocosDecisao[i + 1].id,
        });
      }

      algoritmoDecisaoData = {
        id: `alg-${Date.now()}`,
        titulo: cardTitulo,
        especialidade: eixoSelecionado.especialidade,
        eixoId: eixoSelecionado.id,
        topicoId: topicoFinalId,
        blocos,
        ramificacoes,
      };
    } else if (tipoCard === 'caso_clinico') {
      cardTitulo = cardTitulo || 'Caso Clínico / Questão';
      cardPergunta = cardPergunta || 'Qual a conduta mais adequada?';
      cardResposta = opcoes[indiceCorreto] || 'Opção Correta';
    }

    if (cardEmEdicao) {
      const cardAtualizado: CardClinico = {
        ...cardEmEdicao,
        eixoId: eixoSelecionado.id,
        topicoId: topicoFinalId || undefined,
        topicoNome: topicoFinalNome || undefined,
        especialidade: eixoSelecionado.especialidade,
        titulo: cardTitulo || 'Flashcard de Estudo',
        perguntaGatilho: cardPergunta || cardTitulo,
        resposta: cardResposta,
        perolaClinica: notaExplicativa.trim() || 'Ponto essencial para fixação e retenção.',
        mnemonicoOuDica: dica.trim() || undefined,
        tipoCard: tipoCard,
        textoCloze: tipoCard === 'cloze' ? textoCloze.trim() : undefined,
        imagemUrl: tipoCard === 'image_occlusion' ? imagemUrl : undefined,
        mascarasImagem: tipoCard === 'image_occlusion' ? mascarasImagem : undefined,
        algoritmoDecisao: tipoCard === 'fluxograma_oclusao' ? algoritmoDecisaoData : undefined,
        blocosOclusao: tipoCard === 'fluxograma_oclusao' ? blocosOclusaoData : undefined,
        fluxogramaComplexo: tipoCard === 'fluxograma_complexo' ? fluxogramaComplexo : undefined,
        casoClinicoDados: tipoCard === 'caso_clinico' ? {
          historiaClinica: historiaClinica.trim() || 'Paciente atendido no pronto-socorro...',
          exameFisicoSinais: exameFisicoSinais.trim(),
          opcoes: opcoes.filter(o => o.trim().length > 0),
          indiceCorreto,
          justificativaDetalhada: justificativaDetalhada.trim() || 'Conduta baseada nas diretrizes clínicas vigentes.'
        } : undefined
      };

      if (onCardAtualizado) {
        onCardAtualizado(cardAtualizado);
      } else {
        onCardCriado(cardAtualizado);
      }
      return;
    }

    const novoCard: CardClinico = {
      id: `card-custom-${Date.now()}`,
      eixoId: eixoSelecionado.id,
      topicoId: topicoFinalId || undefined,
      topicoNome: topicoFinalNome || undefined,
      especialidade: eixoSelecionado.especialidade,
      titulo: cardTitulo || 'Flashcard de Estudo',
      perguntaGatilho: cardPergunta || cardTitulo,
      resposta: cardResposta,
      perolaClinica: notaExplicativa.trim() || 'Ponto essencial para fixação e retenção.',
      mnemonicoOuDica: dica.trim() || undefined,
      repeticoes: 0,
      intervaloDias: 1,
      fatorFacilidade: 2.5,
      proximaRevisao: new Date().toISOString(),
      status: 'pendente',
      taxaAcerto: 0,
      historicoRespostas: [],
      tipoCard: tipoCard,
      textoCloze: tipoCard === 'cloze' ? textoCloze.trim() : undefined,
      imagemUrl: tipoCard === 'image_occlusion' ? imagemUrl : undefined,
      mascarasImagem: tipoCard === 'image_occlusion' ? mascarasImagem : undefined,
      algoritmoDecisao: tipoCard === 'fluxograma_oclusao' ? algoritmoDecisaoData : undefined,
      blocosOclusao: tipoCard === 'fluxograma_oclusao' ? blocosOclusaoData : undefined,
      fluxogramaComplexo: tipoCard === 'fluxograma_complexo' ? fluxogramaComplexo : undefined,
      casoClinicoDados: tipoCard === 'caso_clinico' ? {
        historiaClinica: historiaClinica.trim() || 'Paciente atendido no pronto-socorro...',
        exameFisicoSinais: exameFisicoSinais.trim(),
        opcoes: opcoes.filter(o => o.trim().length > 0),
        indiceCorreto,
        justificativaDetalhada: justificativaDetalhada.trim() || 'Conduta baseada nas diretrizes clínicas vigentes.'
      } : undefined
    };

    onCardCriado(novoCard);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    executarSalvar();
  };

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto pb-32 animate-in fade-in touch-pan-y">
      {/* =================================================================== */}
      {/* 1. CABEÇALHO ERGONÔMICO (VOLTAR, TÍTULO E INDICADOR DE EDIÇÃO)       */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onVoltar}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
            title="Voltar para a tela anterior"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                cardEmEdicao 
                  ? 'text-amber-800 bg-amber-50 border-amber-300 animate-pulse' 
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {cardEmEdicao ? 'Editando Flashcard' : 'Novo Card'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px] sm:max-w-xs">
                {eixoAtual?.titulo || 'Eixo Clínico'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate mt-0.5">
              {cardEmEdicao ? (titulo || 'Editar Conteúdo') : 'Criar Flashcard'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!cardEmEdicao && (
            <button
              type="button"
              onClick={() => setModalConfirmarExemplo(true)}
              title="Preencher com exemplo médico pronto"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px]">Exemplo</span>
            </button>
          )}

          {onAbrirImportExport && !cardEmEdicao && (
            <button
              type="button"
              onClick={() => onAbrirImportExport({ tab: 'importar', eixoId })}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
            >
              <Wand2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Importar</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-3.5">
        {/* =================================================================== */}
        {/* 2. LOCALIZAÇÃO: EIXO CLÍNICO & TÓPICO (COMPACTO E DIRETO)          */}
        {/* =================================================================== */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
            <FolderTree className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              Disciplina & Tópico Clínico
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Eixo Clínico */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 block">
                Eixo (Especialidade):
              </label>
              <select
                value={eixoId}
                onChange={(e) => {
                  setEixoId(e.target.value);
                  setModoNovoTopico(false);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-3xs"
              >
                {eixos.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.icone} {e.titulo} ({e.especialidade})
                  </option>
                ))}
              </select>
            </div>

            {/* Tópico / Doença */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-bold text-slate-600 block">
                  Tópico / Doença:
                </label>
                <button
                  type="button"
                  onClick={() => setModoNovoTopico(!modoNovoTopico)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {modoNovoTopico ? 'Selecionar existente' : '+ Novo Tópico'}
                </button>
              </div>

              {modoNovoTopico ? (
                <input
                  type="text"
                  value={novoTopicoNome}
                  onChange={(e) => setNovoTopicoNome(e.target.value)}
                  placeholder="Nome do novo tópico (ex: Síndrome Coronariana)"
                  className="w-full p-2.5 rounded-xl border border-blue-400 text-xs font-semibold text-slate-900 bg-blue-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-3xs"
                />
              ) : (
                <select
                  value={topicoId}
                  onChange={(e) => setTopicoId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-3xs"
                >
                  {topicosDisponiveis.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                  {topicosDisponiveis.length === 0 && (
                    <option value="">Geral / Sem tópicos específicos</option>
                  )}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. SELETOR ERGONÔMICO DE FORMATO (SLIDER HORIZONTAL GALAXY A54)     */}
        {/* =================================================================== */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Formato do Flashcard
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Deslize para ver os formatos
            </span>
          </div>

          {/* Segmented Pill Selector com Scroll Horizontal Macio no Mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
            {TIPOS_CARD_CONFIG.map((tipo) => {
              const Icone = tipo.icone;
              const isSelected = tipoCard === tipo.id;

              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => setTipoCard(tipo.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer border ${
                    isSelected
                      ? `${tipo.corAtiva} border-transparent shadow-xs scale-102 ring-2 ring-blue-500/20`
                      : 'bg-slate-50/90 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <Icone className="w-4 h-4 shrink-0" strokeWidth={isSelected ? 2.5 : 2} />
                  <span>{tipo.rotuloCurto}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. CANVAS DO CARTÃO DE ESTUDO (WYSIWYG & ACTIVE RECALL TESTER)      */}
        {/* =================================================================== */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
          
          {/* BARRA SUPERIOR DO CANVAS: FORMATO + ALTERNADOR EDITAR VS TESTAR RECALL */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-[10.5px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                TIPOS_CARD_CONFIG.find(t => t.id === tipoCard)?.corBadge || 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {TIPOS_CARD_CONFIG.find(t => t.id === tipoCard)?.rotuloCurto}
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-sm">
                {titulo.trim() || 'Cartão sem título'}
              </span>
            </div>

            {/* Alternador de Modo: [✏️ Editar] vs [👁️ Testar Active Recall] */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setModoVisualizacao('editar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  modoVisualizacao === 'editar'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>✏️ Editar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoVisualizacao('testar');
                  setOpcaoSimulada(null);
                  setClozesRevelados(new Set());
                  setPassosRevelados(new Set());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  modoVisualizacao === 'testar'
                    ? 'bg-blue-600 text-white shadow-3xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Testar Active Recall</span>
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* MODO TESTAR ACTIVE RECALL (SIMULAÇÃO REAL PARA TODOS OS FORMATOS)    */}
          {/* =================================================================== */}
          {modoVisualizacao === 'testar' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/90 space-y-3.5 shadow-3xs">
                
                {/* 1. TESTE CONCEITO (FRENTE E VERSO COM 1-TAP FLIP) */}
                {tipoCard === 'conceito' && (
                  <div className="space-y-3.5 text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider bg-blue-100/70 px-2 py-0.5 rounded-md">
                        {ladoCardConceito === 'frente' ? '👁️ Anverso (Frente do Cartão)' : '🔄 Reverso (Verso do Cartão)'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Toque no botão para alternar a resposta
                      </span>
                    </div>

                    {ladoCardConceito === 'frente' ? (
                      <div className="py-3 px-2 space-y-2">
                        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                          Pergunta Clínica:
                        </span>
                        <div className="text-sm sm:text-base font-normal text-slate-900 leading-relaxed">
                          {pergunta.trim() ? (
                            <FormattedClinicalText text={pergunta} />
                          ) : (
                            <span className="italic text-slate-400">Nenhuma pergunta preenchida ainda. Digite no modo "Editar".</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-2 space-y-3">
                        <span className="text-xs font-semibold text-emerald-800 block uppercase tracking-wider">
                          Resposta & Conduta Esperada:
                        </span>
                        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs font-normal">
                          {resposta.trim() ? (
                            <FormattedClinicalText text={resposta} />
                          ) : (
                            <span className="italic text-slate-400">Nenhuma resposta preenchida ainda.</span>
                          )}
                        </div>

                        {(dica.trim() || notaExplicativa.trim()) && (
                          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                            {dica.trim() && (
                              <div className="flex items-start gap-1.5 font-normal">
                                <span className="font-semibold shrink-0">💡 Mnemônico:</span>
                                <span>{dica}</span>
                              </div>
                            )}
                            {notaExplicativa.trim() && (
                              <div className="flex items-start gap-1.5 font-normal">
                                <span className="font-semibold shrink-0">⭐ Ponto-Chave / UFPA:</span>
                                <span>{notaExplicativa}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão de Virada de 1 Toque */}
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setLadoCardConceito(ladoCardConceito === 'frente' ? 'verso' : 'frente')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span>{ladoCardConceito === 'frente' ? 'Virar Cartão (Ver Resposta)' : 'Desvirar Cartão (Ver Pergunta)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. TESTE CASO CLÍNICO (MÚLTIPLA ESCOLHA INTERATIVA COM GABARITO) */}
                {tipoCard === 'caso_clinico' && (
                  <div className="space-y-3.5 text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-semibold text-teal-800 uppercase tracking-wider bg-teal-100/70 px-2 py-0.5 rounded-md">
                        Simulação de Prova • Questão Clínica
                      </span>
                      {opcaoSimulada !== null && (
                        <button
                          type="button"
                          onClick={() => setOpcaoSimulada(null)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reiniciar Teste</span>
                        </button>
                      )}
                    </div>

                    {/* Vinheta Clínica e Exame Físico */}
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs sm:text-[13px] text-slate-800 leading-relaxed shadow-3xs font-normal">
                        {historiaClinica.trim() ? (
                          <FormattedClinicalText text={historiaClinica.trim()} />
                        ) : (
                          <span className="italic text-slate-400">Preencha a história clínica no modo de edição...</span>
                        )}
                      </div>

                      {exameFisicoSinais.trim() && (
                        <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200/90 text-xs text-slate-700 font-normal">
                          <strong className="font-semibold text-slate-900">Exame Físico / Sinais Vitais:</strong>{' '}
                          <FormattedClinicalText text={exameFisicoSinais} />
                        </div>
                      )}

                      <div className="text-xs sm:text-sm font-semibold text-slate-900 pt-1">
                        <FormattedClinicalText text={pergunta.trim() || 'Qual a conduta mais adequada para o caso acima?'} />
                      </div>
                    </div>

                    {/* Alternativas Clicáveis */}
                    <div className="space-y-2 pt-1">
                      {opcoes.map((opcao, idx) => {
                        const letras = ['A', 'B', 'C', 'D', 'E'];
                        const isCorreta = idx === indiceCorreto;
                        const isSelecionada = opcaoSimulada === idx;
                        const jaRespondeu = opcaoSimulada !== null;

                        let estilo = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
                        if (jaRespondeu) {
                          if (isCorreta) {
                            estilo = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-300';
                          } else if (isSelecionada) {
                            estilo = 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-300';
                          } else {
                            estilo = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={jaRespondeu}
                            onClick={() => setOpcaoSimulada(idx)}
                            className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs sm:text-[13px] flex items-start gap-2.5 transition-all text-left shadow-3xs cursor-pointer ${estilo}`}
                          >
                            <span className={`w-6 h-6 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 ${
                              jaRespondeu && isCorreta
                                ? 'bg-emerald-600 text-white'
                                : jaRespondeu && isSelecionada
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {letras[idx]}
                            </span>
                            <span className="flex-1 leading-snug font-normal">
                              {opcao.trim() ? (
                                <FormattedClinicalText text={opcao.trim()} />
                              ) : (
                                `Alternativa ${letras[idx]}`
                              )}
                            </span>
                            {jaRespondeu && isCorreta && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 self-center" />
                            )}
                            {jaRespondeu && isSelecionada && !isCorreta && (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0 self-center" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback e Justificativa */}
                    {opcaoSimulada !== null && (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2 shadow-3xs animate-in fade-in">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {opcaoSimulada === indiceCorreto ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Parabéns! Você acertou a conduta.
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Resposta incorreta. O gabarito é a alternativa {['A', 'B', 'C', 'D', 'E'][indiceCorreto]}.
                            </span>
                          )}
                        </div>

                        {justificativaDetalhada.trim() && (
                          <div className="text-slate-700 leading-relaxed pt-1 border-t border-slate-100 font-normal">
                            <strong className="font-semibold text-slate-900">Comentário da Banca / Justificativa:</strong>
                            <div className="mt-1">
                              <FormattedClinicalText text={justificativaDetalhada} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TESTE CLOZE (OCLUSÃO DE TEXTO INTERATIVA) */}
                {tipoCard === 'cloze' && (
                  <div className="space-y-3.5 text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider bg-amber-100/70 px-2 py-0.5 rounded-md">
                        Oclusão Ativa de Texto • Toque nas lacunas
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const matches = Array.from(textoCloze.matchAll(/\{\{c(\d+)::/g));
                            const all = new Set(matches.map(m => parseInt(m[1], 10)));
                            setClozesRevelados(all);
                          }}
                          className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Revelar Todos
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setClozesRevelados(new Set())}
                          className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Ocultar Todos
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-3xs leading-relaxed font-normal">
                      {renderClozeInterativo(textoCloze)}
                    </div>

                    {(dica.trim() || notaExplicativa.trim()) && (
                      <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 text-xs font-normal">
                        {dica.trim() && <div><strong className="font-semibold">💡 Mnemônico:</strong> {dica}</div>}
                        {notaExplicativa.trim() && <div><strong className="font-semibold">⭐ Ponto-Chave:</strong> {notaExplicativa}</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TESTE PASSO A PASSO (OCLUSÃO SEQUENCIAL DESDE O PASSO 1) */}
                {tipoCard === 'fluxograma_oclusao' && (
                  <div className="space-y-3.5 text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider bg-indigo-100/70 px-2 py-0.5 rounded-md">
                        Passo a Passo • Do Passo 1 ao fim
                      </span>
                      <button
                        type="button"
                        onClick={() => setPassosRevelados(new Set())}
                        className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Ocultar Todos
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-900">
                      <FormattedClinicalText
                        text={limparPerguntaNorteadora(pergunta, titulo)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      {blocosDecisao.map((bloco, idx) => {
                        const revelado = passosRevelados.has(idx);
                        const proximoIdx = blocosDecisao.findIndex((_, i) => !passosRevelados.has(i));
                        const ehProximo = !revelado && proximoIdx === idx;

                        return (
                          <button
                            key={bloco.id || idx}
                            type="button"
                            onClick={() => {
                              const nov = new Set(passosRevelados);
                              if (nov.has(idx)) nov.delete(idx);
                              else nov.add(idx);
                              setPassosRevelados(nov);
                            }}
                            className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              revelado
                                ? 'bg-white border-emerald-300 shadow-3xs'
                                : ehProximo
                                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                            }`}
                          >
                            {revelado ? (
                              <div className="flex items-start gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0 space-y-1">
                                  {bloco.titulo.trim() && (
                                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                                      {bloco.titulo}
                                    </p>
                                  )}
                                  <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                                    <FormattedClinicalText text={bloco.condutaOuAcao || '(Sem conteúdo)'} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                                    ehProximo ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className={`text-xs sm:text-sm font-bold ${ehProximo ? 'text-white' : 'text-slate-600'}`}>
                                    Passo {idx + 1}
                                  </span>
                                </div>
                                <span className={`text-[11px] font-semibold ${ehProximo ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {ehProximo ? 'Toque para revelar' : 'Ocluído'}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. TESTE FLUXOGRAMA */}
                {tipoCard === 'fluxograma_complexo' && (
                  <div className="space-y-2.5 text-left">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Fluxograma Clínico Interativo
                    </span>
                    <ComplexFlowchartViewer
                      fluxograma={fluxogramaComplexo}
                      perguntaGatilho={pergunta || titulo}
                      tituloContexto={titulo}
                      initialFullScreen={false}
                    />
                  </div>
                )}

                {/* 6. TESTE OCLUSÃO DE IMAGEM */}
                {tipoCard === 'image_occlusion' && (
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider bg-purple-100/70 px-2 py-0.5 rounded-md">
                      Oclusão de Imagem
                    </span>
                    <ImageOcclusionEditor
                      imagemUrl={imagemUrl}
                      mascaras={mascarasImagem}
                      onImagemUrlChange={setImagemUrl}
                      onImagemChange={setImagemUrl}
                      onMascarasChange={setMascarasImagem}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setModoVisualizacao('editar')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                >
                  <span>Voltar para Modo de Edição</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* MODO EDIÇÃO INLINE (COM ABAS FRENTE/VERSO E FERRAMENTAS CLÍNICAS)   */}
          {/* =================================================================== */}
          {modoVisualizacao === 'editar' && (
            <div className="space-y-3.5">
              {/* FORMATO 1: CONCEITO BÁSICO (FRENTE E VERSO COM ABAS INLINE) */}
              {tipoCard === 'conceito' && (
                <div className="space-y-3.5">
                  {/* Título do Conceito */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Título / Conceito Central:
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Tríade de Virchow, Critérios de Jones, Cefaleia em Salvas"
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-3xs"
                    />
                  </div>

                  {/* Alternador Frente / Verso da Edição */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 gap-1">
                    <button
                      type="button"
                      onClick={() => setLadoCardConceito('frente')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        ladoCardConceito === 'frente'
                          ? 'bg-white text-blue-700 shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>👁️ Frente (Pergunta)</span>
                      {pergunta.trim() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLadoCardConceito('verso')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        ladoCardConceito === 'verso'
                          ? 'bg-white text-blue-700 shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🔄 Verso (Resposta & Conduta)</span>
                      {resposta.trim() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  </div>

                  {/* LADO FRENTE */}
                  {ladoCardConceito === 'frente' && (
                    <div className="space-y-3 animate-in fade-in">
                      {/* 1-Tap Prompt Starters Médicos */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Atalhos Rápidos de Pergunta:
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {PROMPT_STARTERS_MEDICOS.map((starter, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => aplicarPromptStarter(starter.prefixo)}
                              className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 whitespace-nowrap transition-colors shrink-0 active:scale-95 cursor-pointer"
                            >
                              + {starter.rotulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pergunta Gatilho */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-700 block">
                            Pergunta Clínica (Frente):
                          </label>
                          <ClinicalFormatToolbar
                            targetInputId="textarea-pergunta-conceito"
                            valorAtual={pergunta}
                            onValorChange={setPergunta}
                            mostrarTopico={false}
                            compacto={true}
                          />
                        </div>
                        <textarea
                          id="textarea-pergunta-conceito"
                          value={pergunta}
                          onChange={(e) => setPergunta(e.target.value)}
                          placeholder="Ex: Quais os 3 fatores fisiopatológicos da Tríade de Virchow e qual sua relevância clínica?"
                          rows={3}
                          className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs sm:text-[13px] text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-3xs leading-relaxed"
                        />
                      </div>

                      {pergunta.trim() && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Prévia da Frente do Cartão:
                          </span>
                          <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal">
                            <FormattedClinicalText text={pergunta} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LADO VERSO */}
                  {ladoCardConceito === 'verso' && (
                    <div className="space-y-3 animate-in fade-in">
                      {/* Resposta Completa */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-700 block">
                            Resposta Esperada (Verso):
                          </label>
                          <ClinicalFormatToolbar
                            targetInputId="textarea-resposta-conceito"
                            valorAtual={resposta}
                            onValorChange={setResposta}
                            mostrarTopico={true}
                            compacto={true}
                          />
                        </div>
                        <textarea
                          id="textarea-resposta-conceito"
                          value={resposta}
                          onChange={(e) => setResposta(e.target.value)}
                          placeholder="Ex: 1. [azul]Lesão Endotelial[/azul]&#10;2. [azul]Estase Sanguínea[/azul]&#10;3. [azul]Hipercoagulabilidade[/azul]&#10;Principal fator de risco para trombose venosa profunda (TVP)."
                          rows={4}
                          className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs sm:text-[13px] text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-3xs leading-relaxed"
                        />
                      </div>

                      {resposta.trim() && (
                        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-left space-y-1">
                          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block">
                            Prévia da Tipografia Clínica do Verso:
                          </span>
                          <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-normal">
                            <FormattedClinicalText text={resposta} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FORMATO 2: OCLUSÃO DE TEXTO (CLOZE) */}
              {tipoCard === 'cloze' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Título do Flashcard Cloze:
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Dose da Adrenalina na PCR ou Critérios de Jones"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-3xs"
                    />
                  </div>

                  <VisualClozeEditor
                    texto={textoCloze}
                    onChange={setTextoCloze}
                    placeholder="Digite o texto clínico e selecione as palavras que deseja ocultar..."
                  />
                </div>
              )}

              {/* FORMATO 3: OCLUSÃO DE IMAGEM */}
              {tipoCard === 'image_occlusion' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Título da Imagem / Estrutura:
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Polígono de Willis, Artérias Coronárias, ECG com Supra de ST"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-3xs"
                    />
                  </div>

                  <ImageOcclusionEditor
                    imagemUrl={imagemUrl}
                    mascaras={mascarasImagem}
                    onImagemUrlChange={setImagemUrl}
                    onImagemChange={setImagemUrl}
                    onMascarasChange={setMascarasImagem}
                  />
                </div>
              )}

              {/* FORMATO 4: CASO CLÍNICO (MÚLTIPLA ESCOLHA) */}
              {tipoCard === 'caso_clinico' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-semibold text-teal-900">
                      Estrutura da Questão Clínica
                    </span>
                  </div>

                  {/* Título da Questão */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Título do Caso:
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Manejo do Choque Anafilático Refratário"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-3xs"
                    />
                  </div>

                  {/* Vinheta Clínica */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      História Clínica (Idade, queixa e evolução):
                    </label>
                    <textarea
                      value={historiaClinica}
                      onChange={(e) => setHistoriaClinica(e.target.value)}
                      placeholder="Ex: Mulher de 32 anos dá entrada com prurido difuso, edema labial e estridor laríngeo 10 minutos após uso de amoxicilina..."
                      rows={3}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-3xs leading-relaxed"
                    />
                  </div>

                  {/* Sinais Vitais & Exame Físico (Opcional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Exame Físico & Sinais Vitais (Opcional):
                    </label>
                    <input
                      type="text"
                      value={exameFisicoSinais}
                      onChange={(e) => setExameFisicoSinais(e.target.value)}
                      placeholder="Ex: PA 80/40 mmHg, FC 135 bpm, SatO2 88%, estridor respiratório"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-3xs"
                    />
                  </div>

                  {/* Pergunta de Decisão */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Pergunta da Banca / Conduta Imediata:
                    </label>
                    <input
                      type="text"
                      value={pergunta}
                      onChange={(e) => setPergunta(e.target.value)}
                      placeholder="Ex: Qual a conduta farmacológica imediata mais adequada?"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-3xs"
                    />
                  </div>

                  {/* Alternativas de Múltipla Escolha */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Alternativas (Toque na letra para definir o gabarito correto):
                      </span>
                      {opcoes.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setOpcoes([...opcoes, ''])}
                          className="text-[10px] font-semibold text-teal-700 hover:underline cursor-pointer"
                        >
                          + Opção E
                        </button>
                      )}
                    </div>

                    {opcoes.map((opcao, idx) => {
                      const letras = ['A', 'B', 'C', 'D', 'E'];
                      const isCorreta = idx === indiceCorreto;

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIndiceCorreto(idx)}
                            className={`w-7 h-7 rounded-xl font-semibold text-xs flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-3xs active:scale-95 ${
                              isCorreta
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                            title={isCorreta ? 'Alternativa Correta (Gabarito)' : 'Clique para marcar como correta'}
                          >
                            {letras[idx]}
                          </button>
                          <input
                            type="text"
                            value={opcao}
                            onChange={(e) => {
                              const nov = [...opcoes];
                              nov[idx] = e.target.value;
                              setOpcoes(nov);
                            }}
                            placeholder={`Alternativa ${letras[idx]}...`}
                            className={`w-full p-2 rounded-xl border text-xs text-slate-900 shadow-3xs ${
                              isCorreta ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/40'
                            }`}
                          />
                          {opcoes.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nov = opcoes.filter((_, i) => i !== idx);
                                setOpcoes(nov);
                                if (indiceCorreto >= nov.length) setIndiceCorreto(0);
                              }}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Justificativa / Comentário */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Justificativa / Comentário da Banca:
                    </label>
                    <textarea
                      value={justificativaDetalhada}
                      onChange={(e) => setJustificativaDetalhada(e.target.value)}
                      placeholder="Ex: A adrenalina IM no vasto lateral é o único fármaco que reduz a mortalidade no choque anafilático..."
                      rows={2}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-3xs"
                    />
                  </div>
                </div>
              )}

              {/* FORMATO 5: PASSO A PASSO SEQUENCIAL */}
              {tipoCard === 'fluxograma_oclusao' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Título Curto do Card:
                      </label>
                      <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex: Sequência Rápida de Intubação (7 Ps)"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-3xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Tema / Pergunta Norteadora Direta (Opcional):
                      </label>
                      <input
                        type="text"
                        value={pergunta}
                        onChange={(e) => setPergunta(e.target.value)}
                        placeholder="Ex: Qual a ordem correta dos 7 Ps na SRI?"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-3xs"
                      />
                    </div>
                  </div>

                  <FlowchartBuilder
                    blocos={blocosDecisao}
                    onChange={setBlocosDecisao}
                  />
                </div>
              )}

              {/* FORMATO 6: FLUXOGRAMA (DIAGNÓSTICO / RASTREIO / TRATAMENTO) */}
              {tipoCard === 'fluxograma_complexo' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Título do Fluxograma:
                      </label>
                      <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex: Fluxograma Diagnóstico de Dor Torácica no PS"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-3xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Tema / Pergunta Norteadora Direta (Opcional):
                      </label>
                      <input
                        type="text"
                        value={pergunta}
                        onChange={(e) => setPergunta(e.target.value)}
                        placeholder="Ex: Abordagem diagnóstica e reperfusão na SCA:"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-3xs"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <ComplexFlowchartBuilder
                      dados={fluxogramaComplexo}
                      onChange={setFluxogramaComplexo}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAMPOS COMPLEMENTARES: DICA / PÉROLA CLÍNICA (COMPACTO) */}
          <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label htmlFor="input-dica" className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Mnemônico / Sigla (Opcional):</span>
              </label>
              <input
                id="input-dica"
                type="text"
                value={dica}
                onChange={(e) => setDica(e.target.value)}
                placeholder="Ex: Mnemônico MONABCHA..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-3xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="input-nota-explicativa" className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>Dica Prática / Ponto-Chave:</span>
              </label>
              <input
                id="input-nota-explicativa"
                type="text"
                value={notaExplicativa}
                onChange={(e) => setNotaExplicativa(e.target.value)}
                placeholder="Ex: Ponto de virada da conduta, regra de ouro ou diretriz..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-3xs"
              />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 5. BARRA DE AÇÃO FLUTUANTE INFERIOR (THUMB-ZONE PARA GALAXY A54)    */}
        {/* =================================================================== */}
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-3 sm:px-6 shadow-xl">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onVoltar}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer ${
                cardEmEdicao
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{cardEmEdicao ? 'Salvar Alterações' : 'Salvar Flashcard'}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">(Ctrl+Enter)</span>
            </button>
          </div>
        </div>
      </form>

      {/* MODAL: PREENCHER EXEMPLO */}
      {modalConfirmarExemplo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Preencher com Exemplo Médico?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja carregar um exemplo de estudo de alto rendimento para o formato{' '}
              <span className="font-bold text-slate-800">
                {TIPOS_CARD_CONFIG.find(t => t.id === tipoCard)?.rotuloCurto}
              </span>
              ? Os campos deste card serão preenchidos com o modelo.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfirmarExemplo(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarExemplo}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Preencher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Copy, 
  ClipboardCheck, 
  Stethoscope, 
  GitFork, 
  HelpCircle, 
  Search, 
  Plus, 
  Minus,
  BookOpen,
  ArrowRight,
  RefreshCw,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { CardClinico, EixoClinico, ProgressoDiario, EspecialidadeMedica, TODAS_ESPECIALIDADES_MEDICAS } from '../types';
import { AnkiService, ResultadoImportacao } from '../services/ankiService';
import { StorageService } from '../services/storage';
import { CORES_DISPONIVEIS } from './CreateEixoModal';

interface ImportExportModalProps {
  cards: CardClinico[];
  eixos: EixoClinico[];
  progresso: ProgressoDiario;
  onClose: () => void;
  onImportarConcluido: (resultado: ResultadoImportacao) => void;
  onExportarJson: () => void;
  initialTab?: 'importar' | 'exportar';
  initialEixoId?: string;
  initialCardId?: string;
  onAbrirCriacaoManual?: () => void;
  onEixoCriado?: (eixo: EixoClinico) => void;
  onNavegarParaEixo?: (eixoId: string) => void;
  onEstudarCardsImportados?: (cards: CardClinico[]) => void;
}

export type FocoInstitucional = 'ufpa' | 'enamed' | 'usp';

export interface InfoFocoInstitucional {
  id: FocoInstitucional;
  sigla: string;
  nomeCurto: string;
  nomeCompleto: string;
  descricao: string;
  corBadge: string;
  corFundoPill: string;
  iconeEmoji: string;
  instrucaoPrompt: string;
  regraOuroPrompt: string;
}

export const FOCOS_INSTITUCIONAIS: Record<FocoInstitucional, InfoFocoInstitucional> = {
  ufpa: {
    id: 'ufpa',
    sigla: 'UFPA',
    nomeCurto: 'Provas UFPA',
    nomeCompleto: 'Foco Provas & Aulas UFPA',
    descricao: 'Fidelidade estrita aos slides, apostilas e gravações de aula dos professores da UFPA.',
    corBadge: 'bg-blue-600 text-white',
    corFundoPill: 'bg-blue-600 text-white shadow-xs',
    iconeEmoji: '🏛️',
    instrucaoPrompt: `Você é um preceptor médico especialista em elaboração de flashcards de alto rendimento para o MedCards, com FOCO PRINCIPAL NAS PROVAS DA FACULDADE DE MEDICINA DA UFPA (Universidade Federal do Pará), módulos acadêmicos, internato e residência médica.
Com base no material médico, transcrições de aulas, slides de professores da UFPA, casos clínicos, apostilas, PDFs ou fotos fornecidos, elabore flashcards rigorosamente estruturados no formato JSON para o aplicativo MedCards.`,
    regraOuroPrompt: `REGRA DE OURO CRÍTICA — FIDELIDADE ESTRITA AO CONTEÚDO FORNECIDO (FOCO PROVAS UFPA):
1. ESTRITA ADERÊNCIA AO CONTEÚDO ENVIADO:
   - Seu foco primário e mandatório são as cobranças das provas e módulos da Faculdade de Medicina da UFPA.
   - Os flashcards devem se ater ESTRITAMENTE e EXCLUSIVAMENTE ao conteúdo que o aluno passar junto ao prompt (transcrições de aulas, slides de professores da UFPA, discussões clínicas de enfermaria/ambulatório, apostilas e resumos enviados).
   - NUNCA invente condutas, parâmetros ou diretrizes conflitantes com os slides ou materiais fornecidos pelo aluno. Se o professor da UFPA destacou uma conduta, dosagem, classificação ou pegadinha específica no material, essa informação TEM PRIORIDADE ABSOLUTA nos cartões.
   - NUNCA omita, resuma superficialmente, corte ou descarte informações presentes nos materiais enviados. Todos os dados, dosagens exatas de medicamentos, valores de corte laboratoriais, achados de imagem, sinais clínicos, condutas e contraindicações fornecidos são essenciais e devem ser integralmente aproveitados e distribuídos nos flashcards gerados.`
  },
  enamed: {
    id: 'enamed',
    sigla: 'ENAMED',
    nomeCurto: 'ENAMED / ENARE',
    nomeCompleto: 'Foco ENAMED & Residência Nacional (ENARE)',
    descricao: 'Matriz de competências do INEP, condutas prioritárias do SUS e pegadinhas de alto rendimento.',
    corBadge: 'bg-emerald-600 text-white',
    corFundoPill: 'bg-emerald-600 text-white shadow-xs',
    iconeEmoji: '🩺',
    instrucaoPrompt: `Você é um preceptor médico especialista em elaboração de flashcards de alto rendimento para o MedCards, com FOCO PRINCIPAL NO ENAMED (Exame Nacional de Medicina), ENARE (Exame Nacional de Residência Médica) e diretrizes nacionais do SUS / Ministério da Saúde.
Com base no material médico, apostilas, diretrizes, casos clínicos ou resumos fornecidos, elabore flashcards rigorosamente estruturados no formato JSON para o aplicativo MedCards.`,
    regraOuroPrompt: `REGRA DE OURO CRÍTICA — MATRIZ DE COMPETÊNCIAS DO ENAMED / ENARE:
1. FOCO NA TOMADA DE CONDUTA E DIRETRIZES DO SUS:
   - Seu foco primário e mandatório é a matriz oficial do ENAMED / INEP e as provas do ENARE.
   - Priorize cenários de pronto-socorro, atenção primária à saúde (APS) e grandes síndromes clínicas de alta prevalência (Cardiologia, Pediatria, GO, Preventiva e Cirurgia).
   - Formate condutas segundo os Protocolos Clínicos e Diretrizes Terapêuticas (PCDT) do Ministério da Saúde e consensos nacionais de referência.
   - Destaque pegadinhas clássicas de bancas de residência médica: critérios de gravidade, contraindicações imediatas e conduta diagnóstica inicial versus conduta definitiva.`
  },
  usp: {
    id: 'usp',
    sigla: 'USP',
    nomeCurto: 'Residência USP',
    nomeCompleto: 'Foco Residência Médica USP (FMUSP / USP-RP)',
    descricao: 'Diretrizes do Hospital das Clínicas (HCFMUSP), casos de alta complexidade e diagnósticos diferenciais.',
    corBadge: 'bg-amber-600 text-white',
    corFundoPill: 'bg-amber-600 text-white shadow-xs',
    iconeEmoji: '🏥',
    instrucaoPrompt: `Você é um preceptor médico especialista em elaboração de flashcards de alto rendimento para o MedCards, com FOCO PRINCIPAL NAS PROVAS DE RESIDÊNCIA MÉDICA DA USP (FMUSP - Hospital das Clínicas, FUVEST e USP Ribeirão Preto).
Com base no material médico, diretrizes institucionais, casos de alta complexidade, apostilas e consensos fornecidos, elabore flashcards rigorosamente estruturados no formato JSON para o aplicativo MedCards.`,
    regraOuroPrompt: `REGRA DE OURO CRÍTICA — PADRÃO DE EXCELÊNCIA E ALTA COMPLEXIDADE USP:
1. FOCO NO PADRÃO HCFMUSP E DIRETRIZES DE PONTA:
   - Seu foco primário e mandatório são as bancas da USP (FMUSP e USP-RP), reconhecidas pelo rigor clínico e alta complexidade.
   - Priorize diagnósticos diferenciais sutis, estratificação prognóstica e condutas baseadas nas publicações do Hospital das Clínicas da FMUSP e consensos internacionais de ponta.
   - Explore detalhadamente parâmetros hemodinâmicos de UTI, dosagens precisas de drogas vasoativas, achados tomográficos/radiológicos específicos e indicações cirúrgicas de urgência.
   - Valorize o raciocínio fisiopatológico que costuma ser o diferencial nas questões de alta discriminação da FUVEST/USP.`
  }
};

export type ModoQuantidadePrompt = 'fixo_20' | 'personalizado' | 'ideal';

export const gerarPromptCompleto = (
  foco: FocoInstitucional,
  quantidadeCards: number = 20,
  modoQuantidade: ModoQuantidadePrompt = 'fixo_20'
): string => {
  const f = FOCOS_INSTITUCIONAIS[foco];
  const qtdTotal = modoQuantidade === 'fixo_20'
    ? 20
    : Math.max(1, Math.min(150, Math.round(quantidadeCards || 20)));
  const qtdConceito = Math.max(1, Math.round(qtdTotal * 0.45));
  const qtdFluxogramaComplexo = Math.max(1, Math.round(qtdTotal * 0.20));
  const qtdFluxogramaOclusao = Math.max(1, Math.round(qtdTotal * 0.15));
  const qtdCaso = Math.max(1, Math.round(qtdTotal * 0.10));
  const qtdCloze = Math.max(0, qtdTotal - qtdConceito - qtdFluxogramaComplexo - qtdFluxogramaOclusao - qtdCaso);

  const cabecalhoQuantidadeECobertura = modoQuantidade === 'ideal'
    ? `IMPORTANTE — QUANTIDADE IDEAL DEFINIDA POR VOCÊ (GEMINI) PARA ABORDAR 100% DE TUDO:
- Analise minuciosamente toda a extensão e densidade clínica do material fornecido do início ao fim.
- Gere o NÚMERO EXATO DE FLASHCARDS QUE VOCÊ JULGAR "IDEAL" para abordar 100% DE TUDO (sejam 15, 25, 35, 50+ flashcards, sem limite engessado).
- REGRA DE COBERTURA INTEGRAL: Absolutamente NENHUM tópico, subtópico, critério diagnóstico, classificação, tabela, dose farmacológica, diagnóstico diferencial ou algoritmo de conduta do material pode ficar de fora!`
    : `IMPORTANTE — META DE ${qtdTotal} FLASHCARDS QUE ABORDEM 100% DE TUDO:
- Elabore rigorosamente um total exato de ${qtdTotal} flashcards de alto rendimento com base no material fornecido.
- REGRA DE COBERTURA INTEGRAL (ABORDAR TUDO): Estes ${qtdTotal} flashcards DEVEM ser estrategicamente distribuídos e estruturados para abordar 100% DE TODO O CONTEÚDO do material fornecido do início ao fim, sintetizando e agrupando os conceitos com inteligência clínica para que NENHUM tópico, classificação, critério diagnóstico, dose ou conduta fique de fora!`;

  const blocoDistribuicaoECota = modoQuantidade === 'ideal'
    ? `DISTRIBUIÇÃO PROPORCIONAL SUGERIDA (SOBRE O TOTAL "IDEAL" DEFINIDO POR VOCÊ PARA ABORDAR TUDO):
- ~45% Flashcards "conceito" (frente e verso direto ao ponto)
- ~20% Flashcards "fluxograma_complexo" (fluxogramas fiéis de diagnóstico, rastreio, tratamento ou revisão visual completa)
- ~15% Flashcards "fluxograma_oclusao" (passo a passo sequencial do Passo 1 até o fim, com todos os passos ocluídos)
- ~10% Flashcards "caso_clinico" (casos clínicos objetivos de múltipla escolha)
- ~10% Flashcards "cloze" (lacunas estratégicas {{c1::...}})

COBERTURA 100% EXAUSTIVA (MODO QUANTIDADE IDEAL):
- Você tem autonomia total para escolher a quantidade ideal de flashcards necessária para esgotar 100% da matéria fornecida sem deixar lacunas e sem criar cards "enche-linguiça".
- Ao final do array JSON "]", adicione uma linha curta informando:
  "✅ COBERTURA TOTAL CONCLUÍDA: Foram gerados [N] flashcards (quantidade ideal calculada para cobrir 100% de todos os tópicos deste material)."`
    : `DISTRIBUIÇÃO SUGERIDA PARA ESTE TEMA (TOTAL EXATO DE ${qtdTotal} FLASHCARDS ABORDANDO TUDO):
- ${qtdConceito} Flashcards "conceito" (frente e verso direto ao ponto)
- ${qtdFluxogramaComplexo} Flashcards "fluxograma_complexo" (fluxogramas fiéis de diagnóstico, rastreio, tratamento ou revisão visual completa)
- ${qtdFluxogramaOclusao} Flashcards "fluxograma_oclusao" (passo a passo sequencial do Passo 1 até o fim, com todos os passos ocluídos)
- ${qtdCaso} Flashcards "caso_clinico" (casos clínicos objetivos de múltipla escolha)
- ${qtdCloze} Flashcards "cloze" (lacunas estratégicas {{c1::...}})

QUANTIDADE EXATA (${qtdTotal} CARDS) + COBERTURA DE 100% DO MATERIAL:
- Você DEVE entregar EXATAMENTE o total solicitado de ${qtdTotal} flashcards no array JSON principal, garantindo que todos os tópicos do material sejam abordados do começo ao fim sem flashcards redundantes ou "enche-linguiça".
- Caso o material seja extremamente extenso e algum detalhe secundário mereça aprofundamento extra além dos ${qtdTotal} flashcards principais:
  1. Entregue rigorosamente os ${qtdTotal} flashcards cobrindo 100% dos pilares do tema no JSON.
  2. Logo após fechar o array JSON "]", adicione uma nota curta:
     "💡 SUGESTÃO DE COMPLEMENTAÇÃO: Os ${qtdTotal} flashcards acima cobrem todos os pilares da aula. Se desejar aprofundar detalhes extras, gere mais [X] flashcards focados em: [listar subtemas]."`;

  return `${f.instrucaoPrompt}
${cabecalhoQuantidadeECobertura}

${f.regraOuroPrompt}

REGRAS PERENES E UNIVERSAIS DE QUALIDADE E FORMATAÇÃO (VÁLIDAS PARA TODOS OS FLASHCARDS):
1. REGRA PERENE DE PERGUNTAS NORTEADORAS DIRETAS AO PONTO (ZERO ROBÓTICO / ZERO PROLIXIDADE / ZERO ENCHE-LINGUIÇA):
   - Esta regra é UNIVERSAL e OBRIGATÓRIA para TODOS os tipos de flashcard ("conceito", "fluxograma_oclusao", "fluxograma_complexo", "caso_clinico" e "cloze").
   - NUNCA crie flashcards desnecessários, malformulados, burocráticos ou "enche-linguiça". Cada flashcard deve ter um propósito clínico real de estudo.
   - O campo "perguntaGatilho" deve ser SEMPRE um tópico/tema ou pergunta norteadora DIRETA AO PONTO, natural, curta e clara.
   - ❌ PROIBIDO USAR COMANDOS META-ROBÓTICOS OU PROLIXOS como:
     • "Reconstrua o algoritmo de decisão propedêutica..."
     • "Navegue pelo algoritmo e determine..."
     • "Descreva o passo a passo cronológico..."
     • "Complete os passos do fluxograma..."
     • "Como se divide a taxonomia..."
   - ✅ USE SEMPRE PERGUNTAS OU TÓPICOS NORTEADORES DIRETOS E NATURAIS:
     • "Sequência Rápida de Intubação (SRI): qual a ordem dos 7 Ps e a conduta em cada passo?"
     • "Fluxograma diagnóstico e tratamento da Dor Torácica Aguda no PS:"
     • "Rastreio do Câncer do Colo do Útero (MS): população-alvo, periodicidade e conduta conforme resultado:"
     • "Quais os sinais da fase precoce da leptospirose e o achado semiológico clássico nas panturrilhas e olhos?"

2. PROIBIÇÃO ABSOLUTA DE COLCHETES PARA SEPARAR ITENS:
   - NUNCA use colchetes [...] para separar itens, títulos, categorias, etapas ou termos nas perguntas ou respostas.
   - Use colchetes APENAS para as tags oficiais de cor do MedCards ([azul], [vermelho], [verde], [roxo], [laranja], [amarelo]), para a sintaxe de cloze {{c1::termo}} ou para arrays JSON [].
   - Para listar ou separar elementos no texto clínico, use marcadores visuais (•), hífens (-), numeração (1., 2.) ou a seta clínica (--> ou ➔).

3. EVITAR PARÊNTESES AO MÁXIMO:
   - Evite o uso de parênteses (...) nas perguntas, respostas e justificativas.
   - Use parênteses APENAS quando estritamente necessário (ex: unidades de dosagem, siglas indispensáveis ou indicar "(opcional)").

4. REGRA DE OURO DO CAMPO "topico" (AGRUPAMENTO POR AULA/TEMA CENTRAL):
   - O campo "topico" deve ser SEMPRE o NOME DA AULA OU TEMA GERAL (ex: "topico": "Osteomielite e Artrite Séptica", "topico": "Síndrome Coronariana Aguda").
   - NUNCA crie micro-tópicos fragmentados para cada pergunta. Todos os cards do mesmo material devem pertencer ao MESMO "topico" (ou no máximo 2 a 3 grandes temas se a aula abordar doenças distintas).

5. REGRA DE OURO DO CAMPO "especialidade" (EIXO CLÍNICO PRINCIPAL):
   - Preencha "especialidade" com a especialidade médica exata do tema (ex: "Cardiologia", "Infectologia", "Ortopedia", "Pediatria", "Ginecologia e Obstetrícia", "Cirurgia Geral", "Neurologia", "Pneumologia", "Nefrologia", "Gastroenterologia", "Hematologia", "Reumatologia", "Endocrinologia", "Psiquiatria", "Dermatologia", "Medicina de Emergência", "Medicina Preventiva").

6. ARQUITETURA VISUAL, CORES E MARCAÇÕES MÉDICAS:
   Utilize ativamente as marcações nos campos "resposta", "perguntaGatilho", "justificativaDetalhada", nos passos e nos nós dos fluxogramas:
   • ==termo== ou [amarelo]termo[/amarelo]: Valores de corte numéricos, metas de tempo, doses críticas e escores.
   • [azul]termo[/azul]: Fármacos de 1ª escolha, condutas prioritárias imediatas e exames padrão-ouro.
   • [vermelho]termo[/vermelho]: Contraindicações formais absolutas, pegadinhas de prova e Red Flags.
   • [verde]termo[/verde]: Metas terapêuticas, profilaxias e critérios de alta.
   • [roxo]termo[/roxo]: Diagnósticos diferenciais e mecanismos fisiopatológicos.
   • [laranja]termo[/laranja]: Ajustes de dose (ex: insuficiência renal/gestantes) e avisos intermediários.
   • **negrito**, <u>sublinhado</u> e --> (seta ➔).
   • Separe blocos de texto por quebras de linha duplas (\\n\\n) — NUNCA gere "textão" corrido.

PAPEL E FORMATO SIMPLIFICADO DE CADA TIPO DE FLASHCARD:

1. CONCEITO DIRETO (tipoCard: "conceito"):
   - Pergunta clínica direta ("perguntaGatilho") e resposta estruturada em tópicos ("resposta").

2. PASSO A PASSO SEQUENCIAL (tipoCard: "fluxograma_oclusao"):
   - PAPEL: Revisar uma sequência ordenada desde o Passo 1 até o final (ex: etapas de um procedimento, sequência cronológica de atendimento, fases clínicas ou linha de tratamento em ordem: 1ª linha ➔ 2ª linha ➔ 3ª linha).
   - Na revisão, TODOS os passos (inclusive o Passo 1) iniciam ocluídos e são revelados um por um na ordem correta.
   - ESTRUTURA SIMPLES E DIRETA (sem campos "enche-linguiça"):
     • "perguntaGatilho": Tópico/tema ou pergunta norteadora direta ao ponto (NUNCA robótica).
     • "passos": Array ordenado do Passo 1 até o último passo, onde cada item tem apenas "titulo" (subtítulo curto opcional da etapa) e "conduta" (conteúdo objetivo daquele passo).

3. FLUXOGRAMA CLÍNICO (tipoCard: "fluxograma_complexo"):
   - PAPEL: Serve para uma REVISÃO VISUAL COMPLETA de um tema OU para representar com fidelidade FLUXOGRAMAS DIAGNÓSTICOS, DE RASTREIO (SCREENING) E DE TRATAMENTO (quando há bifurcações "Se Positivo vs Se Negativo", valores de corte, estratificação de risco ou múltiplos caminhos).
   - ESTRUTURA SIMPLES E FIEL (sem coordenadas X/Y e sem campos burocráticos):
     • "perguntaGatilho": Tópico ou pergunta norteadora direta (ex: "Fluxograma diagnóstico e de reperfusão na Dor Torácica Aguda:").
     • "fluxogramaComplexo": contém "noInicialId" e "nos".
     • Cada nó em "nos" tem apenas: "id", "titulo" (título curto e claro da caixa), "descricao" (conduta/detalhes objetivos da caixa) e "ramos" (array de setas com "rotulo" da condição, "destinoNoId" e "cor": "verde"|"vermelho"|"azul"|"amber"|"roxo").

4. OCLUSÃO DE TEXTO / CLOZE (tipoCard: "cloze"):
   - Campo "textoCloze" contendo {{c1::termo_oculto}}.

5. CASO CLÍNICO COM MÚLTIPLA ESCOLHA (tipoCard: "caso_clinico"):
   - "casoClinicoDados" contendo "historiaClinica", "exameFisicoSinais", "opcoes" (4 alternativas), "indiceCorreto" (0 a 3) e "justificativaDetalhada".

${blocoDistribuicaoECota}

ESTRUTURA JSON EXATA (Retorne APENAS o JSON válido sem nenhum texto explicativo fora dele, exceto a nota final se aplicável):
[
  {
    "tipoCard": "conceito",
    "topico": "Síndrome Coronariana Aguda",
    "titulo": "Critérios Eletrocardiográficos e Metas no IAMCSST",
    "especialidade": "Cardiologia",
    "perguntaGatilho": "Quais os critérios eletrocardiográficos do IAMCSST e as metas de tempo para reperfusão imediata?",
    "resposta": "• **Derivações gerais:** ==Elevação ≥ 1 mm== no ponto J em ≥ 2 derivações contíguas (exceto V2-V3).\\n\\n• <u>Derivações V2-V3</u>: Homens < 40 anos ==≥ 2,5 mm==; Homens ≥ 40 anos ==≥ 2,0 mm==; Mulheres ==≥ 1,5 mm==.\\n\\n• **Conduta Imediata:** [azul]AAS 200 mg + Ticagrelor 180 mg[/azul] e anticoagulação.\\n\\n⚠️ [vermelho]Contraindicação formal a nitratos:[/vermelho] Infarto de VD (V3R/V4R), PAS < 90 mmHg ou uso de Sildenafila.",
    "perolaClinica": "Meta porta-balão ==< 90 min== (ou ==< 120 min== se transferência); meta porta-agulha ==< 30 min==."
  },
  {
    "tipoCard": "fluxograma_oclusao",
    "topico": "Manejo de Via Aérea na Emergência",
    "titulo": "Sequência Rápida de Intubação (7 Ps)",
    "especialidade": "Medicina de Emergência",
    "perguntaGatilho": "Qual a ordem correta dos 7 Ps na Sequência Rápida de Intubação (SRI) e o que fazer em cada passo?",
    "passos": [
      {
        "titulo": "Preparação",
        "conduta": "Checar laringoscópio, ==tubo orotraqueal 7.5 a 8.5==, fio-guia, aspirador a vácuo, monitorização e [azul]acesso venoso calibroso[/azul]."
      },
      {
        "titulo": "Pré-oxigenação",
        "conduta": "Ofertar O2 a 100% sob máscara não reinalante por ==3 a 5 minutos== sem ventilar com pressão positiva."
      },
      {
        "titulo": "Pré-tratamento / Otimização",
        "conduta": "Estabilizar hemodinâmica com cristaloide ou [azul]Noradrenalina[/azul] se hipotensão; considerar [azul]Fentanil 1-3 mcg/kg[/azul] se HIC ou dissecção."
      },
      {
        "titulo": "Paralisia com Indução",
        "conduta": "Hipnótico [azul]Etomidato 0.3 mg/kg[/azul] ou [azul]Cetamina 1.5-2 mg/kg[/azul] seguido de bloqueador [azul]Succinilcolina 1.5 mg/kg[/azul] ou [azul]Rocurônio 1.2 mg/kg[/azul]."
      },
      {
        "titulo": "Posicionamento e Passagem do Tubo",
        "conduta": "Posição olfativa (sniffing), aguardar ==45 a 60 segundos== de relaxamento e inserir o tubo sob visualização direta das pregas vocais."
      },
      {
        "titulo": "Pós-intubação",
        "conduta": "Insuflar balonete, confirmar posição com [verde]capnografia em onda[/verde] e ausculta (epigástrio e bases/ápices), fixar tubo e iniciar sedação contínua."
      }
    ],
    "perolaClinica": "Na SRI, não se ventila com bolsa-válvula-máscara antes da intubação, salvo se SatO2 cair para [vermelho]< 90%[/vermelho]."
  },
  {
    "tipoCard": "fluxograma_complexo",
    "topico": "Síndrome Coronariana Aguda",
    "titulo": "Fluxograma de Reperfusão no IAM com Supra de ST",
    "especialidade": "Cardiologia",
    "perguntaGatilho": "Fluxograma de decisão de reperfusão no IAM com Supra de ST (Angioplastia vs Fibrinólise):",
    "fluxogramaComplexo": {
      "id": "fluxo-iamcsst",
      "titulo": "Fluxograma de Reperfusão no IAMCSST",
      "noInicialId": "no-1",
      "nos": [
        {
          "id": "no-1",
          "titulo": "IAMCSST confirmado no ECG em ≤ 10 min",
          "descricao": "Iniciar [azul]AAS 200 mg + Ticagrelor 180 mg[/azul] (ou Clopidogrel 300 mg) e avaliar tempo até hemodinâmica.",
          "ramos": [
            { "id": "r1", "rotulo": "Hemodinâmica ≤ 120 min", "destinoNoId": "no-cate", "cor": "verde" },
            { "id": "r2", "rotulo": "Hemodinâmica > 120 min", "destinoNoId": "no-trombolise", "cor": "amber" }
          ]
        },
        {
          "id": "no-cate",
          "titulo": "Angioplastia Primária Imediata",
          "descricao": "Padrão-ouro. Meta porta-balão ==≤ 90 min== (ou ==≤ 120 min== se hospital sem hemodinâmica).",
          "ramos": []
        },
        {
          "id": "no-trombolise",
          "titulo": "Fibrinólise Química na Emergência",
          "descricao": "Checar contraindicações e administrar [azul]Tenecteplase (TNK)[/azul] com meta porta-agulha ==≤ 30 min==.",
          "ramos": [
            { "id": "r3", "rotulo": "Queda do supra ≥ 50% em 90 min", "destinoNoId": "no-sucesso", "cor": "verde" },
            { "id": "r4", "rotulo": "Sem reperfusão em 90 min", "destinoNoId": "no-resgate", "cor": "vermelho" }
          ]
        },
        {
          "id": "no-sucesso",
          "titulo": "Estratégia Fármaco-Invasiva",
          "descricao": "Transferir para coronariografia eletiva precoce entre ==2 e 24 horas==.",
          "ramos": []
        },
        {
          "id": "no-resgate",
          "titulo": "Angioplastia de Resgate Imediata",
          "descricao": "[vermelho]Falha de trombólise:[/vermelho] encaminhar imediatamente para hemodinâmica de urgência.",
          "ramos": []
        }
      ]
    },
    "perolaClinica": "Após fibrinólise com sucesso, o paciente ainda deve realizar CATE entre 2 e 24 horas (estratégia fármaco-invasiva)."
  }
]

MATERIAL / AULA / DIRETRIZ / PRINT PARA CONVERTER:
[COLE AQUI SEU TEXTO, RESUMO OU TRANSCRIÇÃO]`;
};

export const normalizarTextoBusca = (txt: string): string => {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
};

export const encontrarEixoCorrespondente = (
  termoDetectado: string,
  listaEixos: EixoClinico[]
): EixoClinico | null => {
  if (!termoDetectado || !listaEixos.length) return null;
  const termoNorm = normalizarTextoBusca(termoDetectado);
  if (!termoNorm) return null;

  // 1. Busca exata por especialidade ou título
  const matchExato = listaEixos.find(e => {
    const espNorm = normalizarTextoBusca(e.especialidade);
    const titNorm = normalizarTextoBusca(e.titulo);
    return espNorm === termoNorm || titNorm === termoNorm;
  });
  if (matchExato) return matchExato;

  // 2. Busca por contenção direta
  const matchInclusao = listaEixos.find(e => {
    const titNorm = normalizarTextoBusca(e.titulo);
    const espNorm = normalizarTextoBusca(e.especialidade);
    return titNorm.includes(termoNorm) || termoNorm.includes(titNorm) || espNorm.includes(termoNorm) || termoNorm.includes(espNorm);
  });
  if (matchInclusao) return matchInclusao;

  // 3. Palavras-chave significativas (>= 4 caracteres)
  const palavras = termoNorm.split(/\s+/).filter(p => p.length >= 4);
  if (palavras.length > 0) {
    const matchPalavra = listaEixos.find(e => {
      const titNorm = normalizarTextoBusca(e.titulo);
      const espNorm = normalizarTextoBusca(e.especialidade);
      return palavras.some(p => titNorm.includes(p) || espNorm.includes(p));
    });
    if (matchPalavra) return matchPalavra;
  }

  return null;
};

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  cards,
  eixos,
  progresso,
  onClose,
  onImportarConcluido,
  onExportarJson,
  initialTab = 'importar',
  initialEixoId,
  initialCardId,
  onAbrirCriacaoManual,
  onEixoCriado,
  onNavegarParaEixo,
  onEstudarCardsImportados,
}) => {
  const [tabAtiva, setTabAtiva] = useState<'importar' | 'exportar'>(initialTab);
  
  // Submodos de importação
  const [modoImportacao, setModoImportacao] = useState<'texto' | 'arquivo'>('texto');
  const [textoColado, setTextoColado] = useState('');
  const [promptCopiado, setPromptCopiado] = useState(false);
  const [jsonCardCopiado, setJsonCardCopiado] = useState(false);
  const [jsonEixoCopiado, setJsonEixoCopiado] = useState(false);
  const [jsonColecaoCopiado, setJsonColecaoCopiado] = useState(false);
  
  // Eixo selecionado para importar (padrão '__auto__' para auto-detecção inteligente pelo JSON)
  const [eixoDestinoId, setEixoDestinoId] = useState<string>(
    initialEixoId && eixos.some(e => e.id === initialEixoId) 
      ? initialEixoId 
      : '__auto__'
  );

  // Eixo selecionado para exportar na aba Exportar
  const [eixoExportarId, setEixoExportarId] = useState<string>(
    initialEixoId && eixos.some(e => e.id === initialEixoId)
      ? initialEixoId
      : (eixos[0]?.id || '')
  );

  // Criar novo eixo inline na importação
  const [novoEixoTitulo, setNovoEixoTitulo] = useState('');
  const [novoEixoEspecialidade, setNovoEixoEspecialidade] = useState<EspecialidadeMedica>('Clínica Médica');

  // Seleção e criação de Tópico na importação
  const [topicoSelecionadoModo, setTopicoSelecionadoModo] = useState<string>('__auto__');
  const [novoTopicoTitulo, setNovoTopicoTitulo] = useState('');

  // Submodos de exportação: 'eixo' | 'conjunto' | 'individual'
  const [modoExportacao, setModoExportacao] = useState<'eixo' | 'conjunto' | 'individual'>('eixo');
  const [cardSelecionadoId, setCardSelecionadoId] = useState<string>(
    initialCardId && cards.some(c => c.id === initialCardId)
      ? initialCardId
      : (cards[0]?.id || '')
  );
  const [filtroBuscaCard, setFiltroBuscaCard] = useState('');
  const [verPromptDetalhado, setVerPromptDetalhado] = useState(false);

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  // Pré-visualização interativa com seleção antes de salvar
  const [cardsPrevia, setCardsPrevia] = useState<CardClinico[]>([]);
  const [idsSelecionados, setIdsSelecionados] = useState<Set<string>>(new Set());

  // Pop-up detalhado pós-importação
  const [sucessoPopUp, setSucessoPopUp] = useState<{
    totalCards: number;
    eixoId: string;
    eixoNome: string;
    especialidade: string;
    topicoNome: string;
    tiposContagem: Record<string, number>;
    cardsCriados: CardClinico[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focoInstitucional, setFocoInstitucional] = useState<FocoInstitucional>('ufpa');
  const [quantidadePrompt, setQuantidadePrompt] = useState<number>(20);
  const [modoQuantidadePrompt, setModoQuantidadePrompt] = useState<ModoQuantidadePrompt>('fixo_20');

  const ajustarQuantidadePersonalizada = (delta: number) => {
    setModoQuantidadePrompt('personalizado');
    setQuantidadePrompt(prev => Math.max(5, Math.min(150, prev + delta)));
  };

  const handleCopiarPrompt = async () => {
    const qtdEfetiva = modoQuantidadePrompt === 'fixo_20' ? 20 : quantidadePrompt;
    const promptTexto = gerarPromptCompleto(focoInstitucional, qtdEfetiva, modoQuantidadePrompt);
    const ok = await AnkiService.copiarParaClipboard(promptTexto);
    if (ok) {
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 3000);
    }
  };

  // =========================================================================
  // ANÁLISE EM TEMPO REAL DEBOUNCED DO TEXTO COLADO (PREVINE TRAVAMENTOS NO CELULAR)
  // =========================================================================
  const [analiseTextoColado, setAnaliseTextoColado] = useState<any | null>(null);
  const [analisandoTexto, setAnalisandoTexto] = useState(false);

  React.useEffect(() => {
    const raw = textoColado.trim();
    if (!raw) {
      setAnaliseTextoColado(null);
      setCardsPrevia([]);
      setIdsSelecionados(new Set());
      setAnalisandoTexto(false);
      return;
    }

    setAnalisandoTexto(true);
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const targetEixo = (eixoDestinoId && eixoDestinoId !== '__novo_eixo__' && eixoDestinoId !== '__auto__')
          ? eixoDestinoId
          : ((initialEixoId && eixos.some(e => e.id === initialEixoId)) ? initialEixoId : (eixos[0]?.id || 'eixo-1'));
        // Processamento 100% local e assíncrono (fatiado em lotes de 15 cards, mantendo 60fps)
        const res = await AnkiService.processarTextoAssincrono(raw, targetEixo, 'Gemini / MedCards');

        if (isCancelled) return;

        if (res.cardsImportados.length > 0) {
          const tiposContagem: Record<string, number> = {
            caso_clinico: 0,
            fluxograma_complexo: 0,
            fluxograma_oclusao: 0,
            cloze: 0,
            conceito: 0,
            image_occlusion: 0,
          };
          const topicosDetectados = new Set<string>();
          const especialidadesDetectadas = new Set<string>();
          const eixosDetectados = new Set<string>();

          res.cardsImportados.forEach(c => {
            tiposContagem[c.tipoCard] = (tiposContagem[c.tipoCard] || 0) + 1;
            const top = c.topicoNome || (c as any).topico;
            if (top && typeof top === 'string' && top.trim()) {
              topicosDetectados.add(top.trim());
            }
            const esp = c.especialidade || (c as any).especialidadeMedica;
            if (esp && typeof esp === 'string' && esp.trim() && esp.trim().toLowerCase() !== 'geral / outros') {
              especialidadesDetectadas.add(esp.trim());
            }
            const ex = (c as any).eixo;
            if (ex && typeof ex === 'string' && ex.trim()) {
              eixosDetectados.add(ex.trim());
            }
          });

          let especialidadeDetectada = Array.from(especialidadesDetectadas)[0] || Array.from(eixosDetectados)[0] || '';
          if (!especialidadeDetectada) {
            const matchEsp = raw.match(/"(?:especialidade|eixo|area|grandeArea)"\s*:\s*"([^"]+)"/i);
            if (matchEsp && matchEsp[1]) {
              especialidadeDetectada = matchEsp[1].trim();
            }
          }

          const eixoCorrespondente = especialidadeDetectada
            ? encontrarEixoCorrespondente(especialidadeDetectada, eixos)
            : null;

          setAnaliseTextoColado({
            valido: true,
            formato: res.eixosCriados.length > 0 ? 'Pacote MedCards (Eixos + Tópicos)' : (raw.startsWith('[') || raw.startsWith('{') || raw.includes('```') ? 'JSON Estruturado (Gemini / UFPA)' : 'Texto Tabulado / Anki'),
            totalCards: res.cardsImportados.length,
            tiposContagem,
            topicos: Array.from(topicosDetectados),
            especialidades: Array.from(especialidadesDetectadas),
            especialidadeDetectada,
            eixoCorrespondente,
            eixosCount: res.eixosCriados.length,
          });
          setCardsPrevia(res.cardsImportados);
          setIdsSelecionados(new Set(res.cardsImportados.map(c => c.id)));
          setAnalisandoTexto(false);
          return;
        }

        if (!isCancelled) {
          setAnaliseTextoColado({
            valido: false,
            erroJson: true,
            mensagem: 'Aguardando formato JSON válido ou texto tabulado...',
          });
          setCardsPrevia([]);
          setIdsSelecionados(new Set());
        }
      } catch (err: any) {
        if (!isCancelled) {
          setAnaliseTextoColado({
            valido: false,
            erroJson: true,
            mensagem: err?.message || 'Aguardando fechamento do JSON ou texto tabulado...',
          });
          setCardsPrevia([]);
          setIdsSelecionados(new Set());
        }
      } finally {
        if (!isCancelled) {
          setAnalisandoTexto(false);
        }
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [textoColado, eixoDestinoId, eixos, initialEixoId]);

  // Destino unificado calculado dinamicamente para visualização e confirmação antes de salvar
  const destinoCalculado = useMemo(() => {
    let eixoFinalNome = '';
    let eixoFinalId = eixoDestinoId;
    let eixoOrigemTexto: 'auto' | 'manual' | 'novo' = 'manual';
    let topicoFinalNome = '';
    let topicoOrigemTexto: 'auto' | 'manual' | 'novo' = 'manual';

    // 1. Resolver Eixo
    if (eixoDestinoId === '__auto__') {
      eixoOrigemTexto = 'auto';
      if (analiseTextoColado?.eixoCorrespondente) {
        eixoFinalId = analiseTextoColado.eixoCorrespondente.id;
        eixoFinalNome = analiseTextoColado.eixoCorrespondente.titulo;
      } else if (analiseTextoColado?.especialidadeDetectada) {
        eixoFinalNome = analiseTextoColado.especialidadeDetectada;
      } else if (initialEixoId && eixos.some(e => e.id === initialEixoId)) {
        const eInit = eixos.find(e => e.id === initialEixoId);
        eixoFinalId = eInit!.id;
        eixoFinalNome = eInit!.titulo;
      } else if (eixos[0]) {
        eixoFinalId = eixos[0].id;
        eixoFinalNome = eixos[0].titulo;
      } else {
        eixoFinalNome = 'Clínica Médica';
      }
    } else if (eixoDestinoId === '__novo_eixo__') {
      eixoOrigemTexto = 'novo';
      eixoFinalNome = novoEixoTitulo.trim() || 'Novo Eixo Clínico';
    } else {
      const eixoObj = eixos.find(e => e.id === eixoDestinoId);
      eixoFinalNome = eixoObj ? eixoObj.titulo : 'Eixo Selecionado';
    }

    // 2. Resolver Tópico
    if (topicoSelecionadoModo === '__auto__') {
      topicoOrigemTexto = 'auto';
      if (analiseTextoColado?.topicos && analiseTextoColado.topicos.length > 0) {
        topicoFinalNome = analiseTextoColado.topicos[0];
      } else {
        topicoFinalNome = 'Conceitos Gerais (Auto)';
      }
    } else if (topicoSelecionadoModo === '__novo_topico__') {
      topicoOrigemTexto = 'novo';
      topicoFinalNome = novoTopicoTitulo.trim() || 'Novo Tópico';
    } else {
      const targetEixoObj = eixos.find(e => e.id === (eixoFinalId !== '__auto__' ? eixoFinalId : eixos[0]?.id));
      const topObj = targetEixoObj?.topicos?.find(t => t.id === topicoSelecionadoModo);
      topicoFinalNome = topObj?.titulo || 'Tópico Selecionado';
    }

    return {
      eixoFinalId,
      eixoFinalNome,
      eixoOrigemTexto,
      topicoFinalNome,
      topicoOrigemTexto,
    };
  }, [eixoDestinoId, topicoSelecionadoModo, analiseTextoColado, eixos, initialEixoId, novoEixoTitulo, novoTopicoTitulo]);

  // =========================================================================
  // PROCESSAMENTO DE IMPORTAÇÃO COM DESTINO ROBUSTO E POP-UP DE SUCESSO
  // =========================================================================
  const processarArquivo = async (file: File) => {
    setProcessando(true);
    setErro(null);

    try {
      let finalEixoId = eixoDestinoId;
      if (eixoDestinoId === '__auto__') {
        finalEixoId = (initialEixoId && eixos.find(e => e.id === initialEixoId))?.id || eixos[0]?.id || 'eixo-1';
      }
      const res = await AnkiService.importarArquivo(file, finalEixoId, eixos);
      onImportarConcluido(res);

      const contagem: Record<string, number> = {};
      res.cardsImportados.forEach(c => {
        contagem[c.tipoCard] = (contagem[c.tipoCard] || 0) + 1;
      });

      const eixoCriadoPrincipal = res.eixosCriados && res.eixosCriados.length > 0 ? res.eixosCriados[0] : null;
      const eixoRef = eixoCriadoPrincipal || eixos.find(e => e.id === finalEixoId);

      const topicosQtd = (eixoCriadoPrincipal?.topicos || []).length;
      const topicoDescricao = topicosQtd > 0
        ? `${topicosQtd} tópico${topicosQtd > 1 ? 's' : ''} estruturado${topicosQtd > 1 ? 's' : ''}`
        : 'Tópicos sincronizados';

      setSucessoPopUp({
        totalCards: res.totalCards,
        eixoId: eixoRef?.id || finalEixoId,
        eixoNome: res.eixosCriados.length > 1 ? `${res.eixosCriados.length} Eixos Clínicos` : (eixoRef?.titulo || 'Eixo Importado'),
        especialidade: eixoRef?.especialidade || 'Geral / Outros',
        topicoNome: topicoDescricao,
        tiposContagem: contagem,
        cardsCriados: res.cardsImportados,
      });
    } catch (e: any) {
      console.error('Falha ao processar arquivo:', e);
      setErro(`Erro ao processar ${file.name}: ${e?.message || 'Arquivo corrompido ou formato incompatível'}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleProcessarTextoColado = () => {
    if (!textoColado.trim()) {
      setErro('Cole o JSON ou texto dos flashcards antes de clicar em adicionar.');
      return;
    }
    setProcessando(true);
    setErro(null);

    setTimeout(async () => {
      try {
        const raw = textoColado.trim();

        // 1. Verificar se é pacote exportado completo (Eixo ou Coleção com metadados)
        if (raw.startsWith('{')) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (parsed.eixo && Array.isArray(parsed.cards)) {
                // Pacote de Eixo Completo exportado
                const res = {
                  cardsImportados: parsed.cards,
                  eixosCriados: [parsed.eixo],
                  totalCards: parsed.cards.length,
                  nomeDeck: parsed.eixo.titulo,
                  mensagem: `Eixo "${parsed.eixo.titulo}" e seus tópicos importados com sucesso!`,
                };
                onImportarConcluido(res);

                const contagem: Record<string, number> = {};
                parsed.cards.forEach((c: any) => {
                  contagem[c.tipoCard || 'conceito'] = (contagem[c.tipoCard || 'conceito'] || 0) + 1;
                });

                setSucessoPopUp({
                  totalCards: parsed.cards.length,
                  eixoId: parsed.eixo.id,
                  eixoNome: parsed.eixo.titulo,
                  especialidade: parsed.eixo.especialidade || 'Clínica Médica',
                  topicoNome: `${(parsed.eixo.topicos || []).length} tópicos estruturados`,
                  tiposContagem: contagem,
                  cardsCriados: parsed.cards,
                });
                setTextoColado('');
                setProcessando(false);
                return;
              } else if (Array.isArray(parsed.eixos) && Array.isArray(parsed.cards)) {
                // Backup Completo de Coleção exportado
                const res = {
                  cardsImportados: parsed.cards,
                  eixosCriados: parsed.eixos,
                  totalCards: parsed.cards.length,
                  nomeDeck: 'Backup Completo',
                  mensagem: `Coleção completa com ${parsed.cards.length} cards e ${parsed.eixos.length} eixos importada com sucesso!`,
                };
                onImportarConcluido(res);

                const contagem: Record<string, number> = {};
                parsed.cards.forEach((c: any) => {
                  contagem[c.tipoCard || 'conceito'] = (contagem[c.tipoCard || 'conceito'] || 0) + 1;
                });

                setSucessoPopUp({
                  totalCards: parsed.cards.length,
                  eixoId: parsed.eixos[0]?.id || 'eixo-1',
                  eixoNome: `${parsed.eixos.length} Eixos Clínicos`,
                  especialidade: 'Diversas Especialidades',
                  topicoNome: 'Todos os tópicos sincronizados',
                  tiposContagem: contagem,
                  cardsCriados: parsed.cards,
                });
                setTextoColado('');
                setProcessando(false);
                return;
              }
            }
          } catch {
            // Continua para o fluxo padrão de processamento direto
          }
        }

        let finalEixoId = eixoDestinoId;
        let finalEixoTitulo = '';
        let finalEixoEspecialidade: string = 'Clínica Médica';
        let finalTopicoId: string | undefined = undefined;
        let finalTopicoNome: string | undefined = undefined;

        // 2. Resolução do Eixo Clínico de Destino (Auto vs Novo vs Existente)
        if (eixoDestinoId === '__auto__') {
          const detectadoNome = analiseTextoColado?.especialidadeDetectada || '';
          const match = detectadoNome ? encontrarEixoCorrespondente(detectadoNome, eixos) : null;
          if (match) {
            finalEixoId = match.id;
            finalEixoTitulo = match.titulo;
            finalEixoEspecialidade = match.especialidade;
          } else if (detectadoNome) {
            // Se o eixo correspondente ainda não existir, cria o novo eixo clínico automaticamente
            const novoId = `eixo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const espValida = (TODAS_ESPECIALIDADES_MEDICAS as readonly string[]).includes(detectadoNome)
              ? (detectadoNome as EspecialidadeMedica)
              : 'Clínica Médica';
            const novoEixo: EixoClinico = {
              id: novoId,
              titulo: detectadoNome,
              subtitulo: 'Tópicos essenciais de alto rendimento',
              especialidade: espValida,
              descricao: 'Criado automaticamente via IA / MedCards',
              icone: 'Stethoscope',
              corTema: CORES_DISPONIVEIS[eixos.length % CORES_DISPONIVEIS.length],
              totalCards: 0,
              cardsDominados: 0,
              pendentesHoje: 0,
              ultimaAtividade: 'Agora',
              topicos: [],
            };
            StorageService.adicionarEixo(novoEixo);
            if (onEixoCriado) onEixoCriado(novoEixo);
            finalEixoId = novoId;
            finalEixoTitulo = novoEixo.titulo;
            finalEixoEspecialidade = novoEixo.especialidade;
          } else {
            const fallbackEixo = (initialEixoId && eixos.find(e => e.id === initialEixoId)) || eixos[0];
            if (fallbackEixo) {
              finalEixoId = fallbackEixo.id;
              finalEixoTitulo = fallbackEixo.titulo;
              finalEixoEspecialidade = fallbackEixo.especialidade;
            } else {
              finalEixoId = 'eixo-1';
              finalEixoTitulo = 'Clínica Médica';
              finalEixoEspecialidade = 'Clínica Médica';
            }
          }

          if (topicoSelecionadoModo === '__novo_topico__' && novoTopicoTitulo.trim()) {
            finalTopicoId = `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            finalTopicoNome = novoTopicoTitulo.trim();
            StorageService.adicionarTopico(finalEixoId, finalTopicoNome, undefined, finalTopicoId);
          } else if (topicoSelecionadoModo !== '__auto__' && topicoSelecionadoModo) {
            const eixoAlvo = eixos.find(e => e.id === finalEixoId);
            const topObj = eixoAlvo?.topicos?.find(t => t.id === topicoSelecionadoModo);
            finalTopicoId = topicoSelecionadoModo;
            finalTopicoNome = topObj?.titulo || 'Tópico Selecionado';
          }
        } else if (eixoDestinoId === '__novo_eixo__') {
          finalEixoTitulo = novoEixoTitulo.trim() || 'Novo Eixo Clínico';
          finalEixoId = `eixo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          finalEixoEspecialidade = novoEixoEspecialidade;

          const topicosIniciais = [];
          if (novoTopicoTitulo.trim()) {
            finalTopicoId = `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            finalTopicoNome = novoTopicoTitulo.trim();
            topicosIniciais.push({
              id: finalTopicoId,
              titulo: finalTopicoNome,
              descricao: 'Tópico importado',
              eixoId: finalEixoId,
              totalCards: 0,
            });
          }

          const novoEixo: EixoClinico = {
            id: finalEixoId,
            titulo: finalEixoTitulo,
            subtitulo: 'Tópicos essenciais de alto rendimento',
            especialidade: novoEixoEspecialidade,
            descricao: 'Importado via Gemini / MedCards',
            icone: 'Stethoscope',
            corTema: CORES_DISPONIVEIS[0],
            totalCards: 0,
            cardsDominados: 0,
            pendentesHoje: 0,
            ultimaAtividade: 'Agora',
            topicos: topicosIniciais,
          };

          StorageService.adicionarEixo(novoEixo);
          if (onEixoCriado) onEixoCriado(novoEixo);
        } else {
          // Eixo existente selecionado
          const eixoExistente = eixos.find(e => e.id === eixoDestinoId);
          if (eixoExistente) {
            finalEixoTitulo = eixoExistente.titulo;
            finalEixoEspecialidade = eixoExistente.especialidade;
          }

          // Tópico manual novo
          if (topicoSelecionadoModo === '__novo_topico__' && novoTopicoTitulo.trim()) {
            finalTopicoId = `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            finalTopicoNome = novoTopicoTitulo.trim();
            StorageService.adicionarTopico(finalEixoId, finalTopicoNome, undefined, finalTopicoId);
          } else if (topicoSelecionadoModo !== '__auto__' && topicoSelecionadoModo) {
            // Tópico existente selecionado no dropdown
            const topObj = eixoExistente?.topicos?.find(t => t.id === topicoSelecionadoModo);
            finalTopicoId = topicoSelecionadoModo;
            finalTopicoNome = topObj?.titulo || 'Tópico Selecionado';
          }
        }

        // 3. Processar texto e normalizar cards (100% offline, local e assíncrono)
        const res = await AnkiService.processarTextoAssincrono(
          textoColado, 
          finalEixoId, 
          'Gemini / MedCards', 
          finalTopicoId, 
          finalTopicoNome, 
          finalEixoEspecialidade
        );

        // Filtrar de acordo com a seleção na prévia interativa
        if (idsSelecionados.size > 0 && cardsPrevia.length > 0) {
          const indicesSelecionados = new Set<number>();
          cardsPrevia.forEach((cp, idx) => {
            if (idsSelecionados.has(cp.id)) {
              indicesSelecionados.add(idx);
            }
          });
          res.cardsImportados = res.cardsImportados.filter((_, idx) => indicesSelecionados.has(idx));
          res.totalCards = res.cardsImportados.length;
        }

        if (res.cardsImportados.length === 0) {
          setErro('Nenhum flashcard selecionado para adicionar. Marque ao menos um cartão na prévia.');
          setProcessando(false);
          return;
        }

        // 4. Se modo for __auto__ e o card trouxer seu próprio tópico no JSON, garantir no Storage
        if (topicoSelecionadoModo === '__auto__') {
          res.cardsImportados = res.cardsImportados.map(card => {
            const nomeTop = card.topicoNome || (card as any).topico;
            if (nomeTop && nomeTop !== 'Conceitos Gerais' && !card.topicoId) {
              const { topicoId, topicoNome } = StorageService.garantirTopico(finalEixoId, nomeTop);
              return {
                ...card,
                topicoId,
                topicoNome,
              };
            }
            if (!card.topicoId) {
              return {
                ...card,
                topicoId: 'top-geral',
                topicoNome: 'Conceitos Gerais',
              };
            }
            return card;
          });
        }

        onImportarConcluido(res);

        // 5. Preparar resumo detalhado para o Pop-up de Sucesso
        const contagem: Record<string, number> = {};
        res.cardsImportados.forEach(c => {
          contagem[c.tipoCard] = (contagem[c.tipoCard] || 0) + 1;
        });

        const topicoResumo = finalTopicoNome || (analiseTextoColado?.topicos?.[0] || 'Tópicos sincronizados');

        setSucessoPopUp({
          totalCards: res.totalCards,
          eixoId: finalEixoId,
          eixoNome: finalEixoTitulo || 'Eixo Selecionado',
          especialidade: finalEixoEspecialidade,
          topicoNome: topicoResumo,
          tiposContagem: contagem,
          cardsCriados: res.cardsImportados,
        });

        setTextoColado('');
      } catch (e: any) {
        setErro(e?.message || 'Falha ao processar texto.');
      } finally {
        setProcessando(false);
      }
    }, 20);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = () => {
    setArrastando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  // =========================================================================
  // EXPORTAÇÕES
  // =========================================================================
  const eixoExportar = eixos.find(e => e.id === eixoExportarId) || eixos[0];
  const cardsDoEixoExportar = cards.filter(c => c.eixoId === (eixoExportar?.id || ''));
  const cardIndividualExportar = cards.find(c => c.id === cardSelecionadoId) || cards[0];

  const handleBaixarEixoJson = () => {
    if (!eixoExportar) return;
    const jsonStr = AnkiService.exportarEixoJson(eixoExportar, cardsDoEixoExportar);
    const nomeLimpo = eixoExportar.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AnkiService.baixarArquivo(jsonStr, `eixo_${nomeLimpo}.json`);
  };

  const handleCopiarEixoJson = async () => {
    if (!eixoExportar) return;
    const jsonStr = AnkiService.exportarEixoJson(eixoExportar, cardsDoEixoExportar);
    const ok = await AnkiService.copiarParaClipboard(jsonStr);
    if (ok) {
      setJsonEixoCopiado(true);
      setTimeout(() => setJsonEixoCopiado(false), 3000);
    }
  };

  const handleBaixarEixoAnki = () => {
    if (!eixoExportar) return;
    const tsvContent = AnkiService.exportarParaAnkiTSV(cardsDoEixoExportar);
    const nomeLimpo = eixoExportar.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_');
    AnkiService.baixarArquivo(tsvContent, `eixo_${nomeLimpo}_anki.txt`, 'text/tab-separated-values');
  };

  const handleBaixarColecaoJson = () => {
    onExportarJson();
  };

  const handleCopiarColecaoJson = async () => {
    const jsonStr = AnkiService.exportarColecaoJson(cards, eixos, progresso);
    const ok = await AnkiService.copiarParaClipboard(jsonStr);
    if (ok) {
      setJsonColecaoCopiado(true);
      setTimeout(() => setJsonColecaoCopiado(false), 3000);
    }
  };

  const handleBaixarColecaoAnki = () => {
    const tsvContent = AnkiService.exportarParaAnkiTSV(cards);
    AnkiService.baixarArquivo(tsvContent, `medcards_todos_anki_${new Date().toISOString().split('T')[0]}.txt`, 'text/tab-separated-values');
  };

  const handleBaixarCardJson = () => {
    if (!cardIndividualExportar) return;
    const jsonStr = AnkiService.exportarCardIndividualJson(cardIndividualExportar);
    const nomeLimpo = cardIndividualExportar.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    AnkiService.baixarArquivo(jsonStr, `card_${nomeLimpo}.json`);
  };

  const handleCopiarCardJson = async () => {
    if (!cardIndividualExportar) return;
    const jsonStr = AnkiService.exportarCardIndividualJson(cardIndividualExportar);
    const ok = await AnkiService.copiarParaClipboard(jsonStr);
    if (ok) {
      setJsonCardCopiado(true);
      setTimeout(() => setJsonCardCopiado(false), 3000);
    }
  };

  const cardsFiltradosBusca = cards.filter(c => {
    if (!filtroBuscaCard.trim()) return true;
    const q = filtroBuscaCard.toLowerCase();
    return c.titulo.toLowerCase().includes(q) || c.especialidade.toLowerCase().includes(q);
  });

  const renderDestinoFlashcards = () => {
    const eixoSelecionadoObj = eixoDestinoId === '__auto__'
      ? (analiseTextoColado?.eixoCorrespondente || (initialEixoId ? eixos.find(e => e.id === initialEixoId) : null))
      : eixos.find(e => e.id === eixoDestinoId);

    return (
      <div className="relative overflow-hidden p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/50 via-white to-slate-50/70 border border-blue-200/80 shadow-xs space-y-2.5 sm:space-y-3.5 transition-all">
        {/* Luz ambiente sutil decorativa */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/25 shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                <span>Destino dos Flashcards</span>
              </h4>
              <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium truncate max-w-[180px] sm:max-w-none">
                Organização de eixo e tópico dos cartões
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {eixoDestinoId === '__auto__' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200/80 shadow-3xs">
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="sm:hidden">Auto IA</span>
                <span className="hidden sm:inline">Auto-detecção Ativa</span>
              </span>
            ) : eixoDestinoId === '__novo_eixo__' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200/80 shadow-3xs">
                <Plus className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Novo Eixo</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200/80 shadow-3xs">
                <Stethoscope className="w-3 h-3 text-slate-500 shrink-0" />
                <span>Eixo Manual</span>
              </span>
            )}
          </div>
        </div>

        {/* Grid de Seleção Eixo & Tópico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-0.5 relative z-10">
          {/* Coluna 1: Eixo Clínico */}
          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
                <span>Eixo Clínico:</span>
              </span>
              <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium">
                {eixoDestinoId === '__auto__' ? 'Automático por IA' : 'Destino fixo'}
              </span>
            </label>

            <div className="relative">
              <select
                value={eixoDestinoId}
                onChange={e => setEixoDestinoId(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-[11.5px] sm:text-xs font-semibold focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 bg-white text-slate-900 shadow-3xs transition-all cursor-pointer"
              >
                <option value="__auto__">✨ Auto pelo JSON (Recomendado)</option>
                <option disabled value="">──────── Eixos Existentes ────────</option>
                {eixos.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    📁 {ex.titulo} ({ex.especialidade})
                  </option>
                ))}
                <option disabled value="">────────────────────────────</option>
                <option value="__novo_eixo__">➕ Criar Novo Eixo Clínico...</option>
              </select>
            </div>

            {/* Feedback contextual de auto-detecção do Eixo */}
            {eixoDestinoId === '__auto__' && (
              analiseTextoColado?.especialidadeDetectada ? (
                <div className="p-2 rounded-xl bg-blue-50/90 border border-blue-200/80 text-[10.5px] sm:text-[11px] font-bold text-blue-900 flex items-center gap-1.5 shadow-3xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span>IA detectou: </span>
                    <strong className="text-blue-700">{analiseTextoColado.especialidadeDetectada}</strong>
                    {analiseTextoColado.eixoCorrespondente ? (
                      <span className="text-slate-600 font-medium ml-1">
                        ➔ "{analiseTextoColado.eixoCorrespondente.titulo}"
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium ml-1">
                        ➔ Criará novo eixo
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium flex items-center gap-1 pt-0.5 leading-snug">
                  <span className="shrink-0">💡</span>
                  <span className="truncate sm:whitespace-normal">Identifica o eixo pela especialidade no JSON</span>
                </p>
              )
            )}
          </div>

          {/* Coluna 2: Tópico / Aula */}
          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />
                <span>Tópico / Aula:</span>
              </span>
              <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium">
                (Agrupamento)
              </span>
            </label>

            {eixoDestinoId !== '__novo_eixo__' ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    value={topicoSelecionadoModo}
                    onChange={e => setTopicoSelecionadoModo(e.target.value)}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-[11.5px] sm:text-xs font-semibold focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 bg-white text-slate-900 shadow-3xs transition-all cursor-pointer"
                  >
                    <option value="__auto__">✨ Auto pelo JSON (ou Geral)</option>
                    {eixoSelecionadoObj?.topicos && eixoSelecionadoObj.topicos.length > 0 && (
                      <>
                        <option disabled value="">── Tópicos em {eixoSelecionadoObj.titulo} ──</option>
                        {eixoSelecionadoObj.topicos.map(top => (
                          <option key={top.id} value={top.id}>
                            📚 {top.titulo}
                          </option>
                        ))}
                      </>
                    )}
                    <option disabled value="">────────────────────────────</option>
                    <option value="__novo_topico__">➕ Criar Novo Tópico...</option>
                  </select>
                </div>

                {topicoSelecionadoModo === '__novo_topico__' && (
                  <input
                    type="text"
                    value={novoTopicoTitulo}
                    onChange={e => setNovoTopicoTitulo(e.target.value)}
                    placeholder="Nome do novo tópico (ex: Manejo de Sepse)"
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                )}

                {topicoSelecionadoModo === '__auto__' && (
                  analiseTextoColado?.topicos && analiseTextoColado.topicos.length > 0 ? (
                    <div className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-[10.5px] sm:text-[11px] font-bold text-indigo-900 flex items-center gap-1.5 shadow-3xs truncate">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        Tópico detectado: <strong className="text-indigo-700">{analiseTextoColado.topicos[0]}</strong>
                        {analiseTextoColado.topicos.length > 1 && ` (+${analiseTextoColado.topicos.length - 1})`}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium flex items-center gap-1 pt-0.5 leading-snug">
                      <span className="shrink-0">📌</span>
                      <span className="truncate sm:whitespace-normal">Agrupa cartões pelo "topico" no JSON</span>
                    </p>
                  )
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={novoTopicoTitulo}
                  onChange={e => setNovoTopicoTitulo(e.target.value)}
                  placeholder="Nome do Tópico inicial (ex: Manejo de Sepse)"
                  className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Formulário Inline se for Novo Eixo */}
        {eixoDestinoId === '__novo_eixo__' && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 mt-2 relative z-10">
            <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              Configurar Novo Eixo Clínico:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Título do Novo Eixo:
                </label>
                <input
                  type="text"
                  value={novoEixoTitulo}
                  onChange={e => setNovoEixoTitulo(e.target.value)}
                  placeholder="Ex: Infectologia & Antimicrobianos"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Especialidade Médica:
                </label>
                <select
                  value={novoEixoEspecialidade}
                  onChange={e => setNovoEixoEspecialidade(e.target.value as EspecialidadeMedica)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  {TODAS_ESPECIALIDADES_MEDICAS.map(esp => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.28)] border border-slate-200/90 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        
        {/* Cabeçalho Executivo Clean */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 truncate">
                Central de Integração
              </h3>
              <p className="text-[10.5px] sm:text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-none">
                Importação estruturada de flashcards clínicos e sincronização
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onAbrirCriacaoManual && (
              <button
                id="btn-modal-alternar-manual"
                type="button"
                onClick={onAbrirCriacaoManual}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Criar Flashcard Manualmente"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Criar Manual</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navegador de Abas Segmentado (Pill Bar estilo iOS / Linear) */}
        <div className="px-4 sm:px-6 pt-2.5 pb-2 bg-slate-50/60 border-b border-slate-100">
          <div className="p-1 rounded-2xl bg-slate-200/70 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTabAtiva('importar')}
              className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                tabAtiva === 'importar'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Upload className={`w-3.5 h-3.5 shrink-0 ${tabAtiva === 'importar' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="sm:hidden">Importar</span>
              <span className="hidden sm:inline">Importar Flashcards</span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva('exportar')}
              className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                tabAtiva === 'exportar'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Download className={`w-3.5 h-3.5 shrink-0 ${tabAtiva === 'exportar' ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="sm:hidden">Exportar</span>
              <span className="hidden sm:inline">Exportar Dados</span>
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
          {tabAtiva === 'importar' ? (
            <div className="space-y-3 sm:space-y-3.5">
              {/* Alternador de Modo: Prompt Gemini & IA vs Arquivo */}
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-2xl border border-zinc-200/70">
                <button
                  type="button"
                  onClick={() => setModoImportacao('texto')}
                  className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer touch-instant ${
                    modoImportacao === 'texto'
                      ? 'bg-white text-zinc-900 shadow-2xs ring-1 ring-black/5'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="sm:hidden">Prompt Gemini & IA</span>
                  <span className="hidden sm:inline">Prompt ao Gemini & Colar IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoImportacao('arquivo')}
                  className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer touch-instant ${
                    modoImportacao === 'arquivo'
                      ? 'bg-white text-zinc-900 shadow-2xs ring-1 ring-black/5'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="sm:hidden">Arquivo (Anki/JSON)</span>
                  <span className="hidden sm:inline">Arquivo (.apkg / .json / .txt)</span>
                </button>
              </div>

              {modoImportacao === 'arquivo' ? (
                <div className="space-y-3 sm:space-y-3.5">
                  {/* Seletor de Destino dos Flashcards Repaginado */}
                  {renderDestinoFlashcards()}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 sm:p-7 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                      arrastando
                        ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
                        : 'border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                      <Package className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Toque ou arraste seu arquivo aqui
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                        Aceita pacotes Anki <strong>.apkg</strong>, textos <strong>.txt / .tsv</strong> ou backups <strong>.json</strong>
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".apkg,.colpkg,.zip,.json,.txt,.tsv,.csv"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-3.5">
                  {/* Card Minimalista do Prompt ao Gemini com Foco Institucional e 3 Opções de Quantidade */}
                  <div className="p-3.5 sm:p-5 bg-[#F7F7F5] border border-zinc-200/90 rounded-2xl sm:rounded-3xl space-y-3.5">
                    
                    {/* 1. Linha de Seleção do Foco: UFPA | ENAMED | USP */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 tracking-tight flex items-center gap-1.5 text-xs sm:text-[13px]">
                          <span>🎯</span>
                          <span>1. Perfil da Banca no Prompt ao Gemini:</span>
                        </span>
                        <span className="text-[10.5px] font-medium text-zinc-500 shrink-0">
                          {FOCOS_INSTITUCIONAIS[focoInstitucional].sigla}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-200/75 rounded-xl">
                        {(['ufpa', 'enamed', 'usp'] as FocoInstitucional[]).map(focoId => {
                          const info = FOCOS_INSTITUCIONAIS[focoId];
                          const ativo = focoInstitucional === focoId;
                          return (
                            <button
                              key={focoId}
                              type="button"
                              onClick={() => setFocoInstitucional(focoId)}
                              className={`py-1.5 sm:py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-instant ${
                                ativo
                                  ? `${info.corBadge} shadow-xs ring-1 ring-black/5`
                                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/60'
                              }`}
                            >
                              <span className="text-[11px] sm:text-xs shrink-0">{info.iconeEmoji}</span>
                              <span className="tracking-tight">{info.sigla}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Seletor Rápido de Quantidade de Flashcards (20 Tudo | Personalizado +/-5 | Ideal pelo Gemini) */}
                    <div className="space-y-2 pt-1 border-t border-zinc-200/70">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 tracking-tight flex items-center gap-1.5 text-xs sm:text-[13px]">
                          <span>⚡</span>
                          <span>2. Quantidade de Flashcards (Abordando 100% de Tudo):</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* OPÇÃO A: 20 Flashcards (que abordem TUDO) */}
                        <button
                          type="button"
                          onClick={() => {
                            setModoQuantidadePrompt('fixo_20');
                            setQuantidadePrompt(20);
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between gap-1 cursor-pointer touch-instant ${
                            modoQuantidadePrompt === 'fixo_20'
                              ? 'bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                              : 'bg-white/75 hover:bg-white border-zinc-200/90 text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs sm:text-[13px] font-bold text-zinc-900">
                              20 Flashcards
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              modoQuantidadePrompt === 'fixo_20'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              Abordar Tudo
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 leading-snug">
                            Sintetiza e cobre 100% da matéria em 20 cards de alto rendimento.
                          </p>
                        </button>

                        {/* OPÇÃO B: Número Personalizado (-5 / +5 ou digitar direto) */}
                        <div
                          onClick={() => {
                            if (modoQuantidadePrompt !== 'personalizado') {
                              setModoQuantidadePrompt('personalizado');
                            }
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 cursor-pointer transition-colors ${
                            modoQuantidadePrompt === 'personalizado'
                              ? 'bg-white border-blue-600 ring-1 ring-blue-600 shadow-2xs'
                              : 'bg-white/75 hover:bg-white border-zinc-200/90 text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-[13px] font-bold text-zinc-900">
                              Nº Personalizado
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              modoQuantidadePrompt === 'personalizado'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              -5 / +5 ou Digitar
                            </span>
                          </div>

                          {/* Controles rápidos: -5 | Input Numérico | +5 */}
                          <div
                            className="flex items-center justify-between gap-1.5 pt-0.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => ajustarQuantidadePersonalizada(-5)}
                              title="Diminuir 5 flashcards"
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-0.5 cursor-pointer touch-instant border border-zinc-200/80"
                            >
                              <Minus className="w-3 h-3" />
                              <span>5</span>
                            </button>

                            <div className="flex items-center gap-1 flex-1 justify-center">
                              <input
                                id="input-qtd-prompt"
                                type="number"
                                min={1}
                                max={150}
                                value={quantidadePrompt}
                                onFocus={() => setModoQuantidadePrompt('personalizado')}
                                onChange={e => {
                                  setModoQuantidadePrompt('personalizado');
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) {
                                    setQuantidadePrompt(20);
                                  } else {
                                    setQuantidadePrompt(Math.max(1, Math.min(150, val)));
                                  }
                                }}
                                className="w-14 text-center text-xs sm:text-[13px] font-bold text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-lg py-1 px-1 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                              />
                              <span className="text-[10.5px] text-zinc-500 font-medium">cards</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => ajustarQuantidadePersonalizada(5)}
                              title="Aumentar 5 flashcards"
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-0.5 cursor-pointer touch-instant border border-zinc-200/80"
                            >
                              <Plus className="w-3 h-3" />
                              <span>5</span>
                            </button>
                          </div>
                        </div>

                        {/* OPÇÃO C: Número "Ideal" julgado pelo Gemini para abordar TUDO */}
                        <button
                          type="button"
                          onClick={() => setModoQuantidadePrompt('ideal')}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between gap-1 cursor-pointer touch-instant ${
                            modoQuantidadePrompt === 'ideal'
                              ? 'bg-white border-emerald-600 ring-1 ring-emerald-600 shadow-2xs'
                              : 'bg-white/75 hover:bg-white border-zinc-200/90 text-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs sm:text-[13px] font-bold text-zinc-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Nº Ideal (Gemini)</span>
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              modoQuantidadePrompt === 'ideal'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              100% Exaustivo
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 leading-snug">
                            O Gemini avalia a aula e cria a quantidade ideal para abordar tudo.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* 3. Barra de Ação Principal: Resumo do Perfil + Botão de Copiar Prompt */}
                    <div className="p-3 bg-white rounded-2xl border border-zinc-200/85 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${FOCOS_INSTITUCIONAIS[focoInstitucional].corBadge} flex flex-col items-center justify-center font-black tracking-tight shrink-0`}>
                          <span className="text-[8px] opacity-80 uppercase leading-none font-bold">Foco</span>
                          <span className="text-[11px] font-black leading-tight">{FOCOS_INSTITUCIONAIS[focoInstitucional].sigla}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-[13px] font-bold text-zinc-900 leading-snug truncate">
                            {FOCOS_INSTITUCIONAIS[focoInstitucional].nomeCompleto}
                          </h4>
                          <p className="text-[10.5px] text-zinc-500 font-medium leading-snug mt-0.5 truncate">
                            {modoQuantidadePrompt === 'ideal'
                              ? 'Modo Ideal: o Gemini define quantos cards criar para cobrir 100% de tudo'
                              : modoQuantidadePrompt === 'fixo_20'
                                ? 'Modo 20 Cards: aborda 100% de todo o conteúdo em 20 flashcards'
                                : `Modo Personalizado: gera exatos ${quantidadePrompt} flashcards abordando 100% de tudo`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopiarPrompt}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-[13px] font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer touch-instant shrink-0 shadow-xs"
                        title="Copiar prompt completo formatado para colar no Gemini"
                      >
                        {promptCopiado ? (
                          <>
                            <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Prompt Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-white shrink-0" />
                            <span>
                              {modoQuantidadePrompt === 'ideal'
                                ? 'Copiar Prompt (Nº Ideal • Tudo)'
                                : modoQuantidadePrompt === 'fixo_20'
                                  ? 'Copiar Prompt (20 Cards • Tudo)'
                                  : `Copiar Prompt (${quantidadePrompt} Cards • Tudo)`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Acordeão de Prévia do Prompt */}
                    <div className="pt-0.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setVerPromptDetalhado(!verPromptDetalhado)}
                        className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 cursor-pointer touch-instant"
                      >
                        <span className="truncate">
                          {verPromptDetalhado
                            ? 'Ocultar texto do prompt'
                            : `Inspecionar prompt (${FOCOS_INSTITUCIONAIS[focoInstitucional].sigla} • ${
                                modoQuantidadePrompt === 'ideal'
                                  ? 'Quantidade Ideal pelo Gemini'
                                  : `${modoQuantidadePrompt === 'fixo_20' ? 20 : quantidadePrompt} cards`
                              })`}
                        </span>
                        {verPromptDetalhado ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                      <span className="text-[10.5px] text-zinc-400 hidden sm:inline">
                        1. Copie o prompt ➔ 2. Envie ao Gemini com a aula ➔ 3. Cole o JSON abaixo
                      </span>
                    </div>

                    {verPromptDetalhado && (
                      <div className="p-3 sm:p-3.5 bg-zinc-950 text-zinc-200 rounded-xl border border-zinc-800 text-[10.5px] sm:text-[11px] font-mono max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {gerarPromptCompleto(
                          focoInstitucional,
                          modoQuantidadePrompt === 'fixo_20' ? 20 : quantidadePrompt,
                          modoQuantidadePrompt
                        )}
                      </div>
                    )}
                  </div>

                  {/* Seletor de Destino dos Flashcards Repaginado posicionado logo abaixo do Prompt Mestre */}
                  {renderDestinoFlashcards()}

                  {/* Textarea do JSON Espaçosa e Clean */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Cole o JSON gerado pela IA:</span>
                      </label>
                      {textoColado.trim() && (
                        <button
                          type="button"
                          onClick={() => setTextoColado('')}
                          className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                          title="Limpar texto colado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Limpar</span>
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={6}
                        value={textoColado}
                        onChange={e => setTextoColado(e.target.value)}
                        placeholder='Cole aqui o JSON gerado... (ex: [{"tipoCard": "conceito", "titulo": "...", "topico": "..."}, ...])'
                        className="w-full min-h-[140px] sm:min-h-[220px] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xs sm:text-[12.5px] font-mono bg-slate-50/50 focus:bg-white transition-all resize-y shadow-inner text-slate-800 placeholder:text-slate-400 leading-relaxed"
                      />
                      {analisandoTexto && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-blue-50/95 border border-blue-200 text-blue-700 text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 shadow-2xs animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Identificando cards...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL ANTES DE CLICAR NO OK */}
                  {analiseTextoColado && analiseTextoColado.valido && (
                    <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ✨ {analiseTextoColado.totalCards} Flashcards Identificados!
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                          {analiseTextoColado.formato}
                        </span>
                      </div>

                      {/* Badges de Tipos */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {analiseTextoColado.tiposContagem.image_occlusion > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            {analiseTextoColado.tiposContagem.image_occlusion} Oclusão Imagem
                          </span>
                        )}
                        {analiseTextoColado.tiposContagem.caso_clinico > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            {analiseTextoColado.tiposContagem.caso_clinico} Casos Clínicos
                          </span>
                        )}
                        {analiseTextoColado.tiposContagem.fluxograma_complexo > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {analiseTextoColado.tiposContagem.fluxograma_complexo} Árvores de Decisão
                          </span>
                        )}
                        {analiseTextoColado.tiposContagem.fluxograma_oclusao > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                            {analiseTextoColado.tiposContagem.fluxograma_oclusao} Fluxogramas
                          </span>
                        )}
                        {analiseTextoColado.tiposContagem.cloze > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                            {analiseTextoColado.tiposContagem.cloze} Cloze
                          </span>
                        )}
                        {analiseTextoColado.tiposContagem.conceito > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            {analiseTextoColado.tiposContagem.conceito} Conceitos
                          </span>
                        )}
                      </div>

                      {/* Tópicos Identificados */}
                      {analiseTextoColado.topicos && analiseTextoColado.topicos.length > 0 && (
                        <div className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60 flex items-start gap-1.5">
                          <span className="font-bold shrink-0">📌 Tópicos detectados:</span>
                          <span className="font-semibold underline line-clamp-2">
                            {analiseTextoColado.topicos.join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRÉ-VISUALIZAÇÃO INTERATIVA COM SELEÇÃO INDIVIDUAL */}
                  {cardsPrevia.length > 0 && (
                    <div className="surface-clean rounded-2xl p-3 space-y-2 border border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          Prévia dos Cartões ({idsSelecionados.size} de {cardsPrevia.length} selecionados)
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setIdsSelecionados(new Set(cardsPrevia.map(c => c.id)))}
                            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                          >
                            Marcar todos
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setIdsSelecionados(new Set())}
                            className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                          >
                            Desmarcar
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {cardsPrevia.map((c, idx) => {
                          const selecionado = idsSelecionados.has(c.id);
                          const tipoLabel = 
                            c.tipoCard === 'caso_clinico' ? 'Caso Clínico' :
                            c.tipoCard === 'fluxograma_complexo' ? 'Árvore Decisão' :
                            c.tipoCard === 'fluxograma_oclusao' ? 'Fluxograma' :
                            c.tipoCard === 'image_occlusion' ? 'Oclusão Imagem' :
                            c.tipoCard === 'cloze' ? 'Cloze' : 'Conceito';
                          
                          const tipoCor = 
                            c.tipoCard === 'caso_clinico' ? 'bg-purple-100 text-purple-700' :
                            c.tipoCard === 'fluxograma_complexo' ? 'bg-emerald-100 text-emerald-700' :
                            c.tipoCard === 'fluxograma_oclusao' ? 'bg-indigo-100 text-indigo-700' :
                            c.tipoCard === 'image_occlusion' ? 'bg-teal-100 text-teal-700' :
                            c.tipoCard === 'cloze' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700';

                          return (
                            <div
                              key={c.id || idx}
                              onClick={() => {
                                const novo = new Set(idsSelecionados);
                                if (novo.has(c.id)) novo.delete(c.id);
                                else novo.add(c.id);
                                setIdsSelecionados(novo);
                              }}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                selecionado 
                                  ? 'bg-blue-50/40 border-blue-200 text-slate-900' 
                                  : 'bg-slate-50/60 border-slate-200/60 opacity-60 text-slate-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() => {}}
                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tipoCor}`}>
                                    {tipoLabel}
                                  </span>
                                  {c.topicoNome && (
                                    <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                      • {c.topicoNome}
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-xs leading-snug line-clamp-2">
                                  {c.perguntaGatilho || c.titulo}
                                </p>
                                {c.perolaClinica && c.perolaClinica !== 'Fixação clínica de alto rendimento.' && (
                                  <p className="text-[11px] text-amber-800 line-clamp-1 flex items-center gap-1">
                                    <span>💡</span>
                                    <span className="font-medium">Dica:</span>
                                    <span>{c.perolaClinica}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analisandoTexto && (
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-800 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      <span>⚡ Analisando texto e identificando tópicos com alta velocidade...</span>
                    </div>
                  )}

                  {analiseTextoColado && analiseTextoColado.erroJson && !analisandoTexto && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span>{analiseTextoColado.mensagem}</span>
                    </div>
                  )}

                  {/* Destino Confirmado Ribbon (Confirmação Dinâmica e Clara para evitar importação no eixo errado) */}
                  {analiseTextoColado && analiseTextoColado.valido && (
                    <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold text-white shrink-0 border border-white/20">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-blue-200">
                              Destino Confirmado
                            </span>
                            <span className="text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.2 rounded bg-white/20 text-white truncate">
                              {destinoCalculado.eixoOrigemTexto === 'auto' ? '✨ Auto-identificado' : '🎯 Selecionado'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                            <span>{destinoCalculado.eixoFinalNome}</span>
                            <span className="text-blue-200 font-normal mx-1 sm:mx-1.5">➔</span>
                            <span className="text-blue-100 font-extrabold">{destinoCalculado.topicoFinalNome}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 text-right shrink-0 border-t sm:border-t-0 border-white/10 pt-1.5 sm:pt-0">
                        <div>
                          <span className="text-xs font-black text-white block">
                            {idsSelecionados.size} de {cardsPrevia.length} cards
                          </span>
                          <span className="text-[9.5px] sm:text-[10px] text-blue-200 font-medium">prontos para salvar</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botão de Confirmação com Destino em Destaque */}
                  <button
                    type="button"
                    onClick={handleProcessarTextoColado}
                    disabled={processando || !textoColado.trim() || (cardsPrevia.length > 0 && idsSelecionados.size === 0)}
                    className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      {cardsPrevia.length > 0 && idsSelecionados.size > 0 ? (
                        <>
                          <span className="sm:hidden">Salvar {idsSelecionados.size} Flashcard{idsSelecionados.size > 1 ? 's' : ''}</span>
                          <span className="hidden sm:inline">Salvar {idsSelecionados.size} Flashcard{idsSelecionados.size > 1 ? 's' : ''} em "{destinoCalculado.eixoFinalNome}"</span>
                        </>
                      ) : (
                        'Adicionar Flashcards ao MedCards'
                      )}
                    </span>
                  </button>
                </div>
              )}

              {processando && (
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-700 text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <HardDrive className="w-4 h-4 animate-spin" />
                  <span>Processando e estruturando flashcards...</span>
                </div>
              )}

              {erro && (
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Erro ao importar</span>
                  </div>
                  <p>{erro}</p>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================================
             * ABA EXPORTAR: SELETOR DE ESCOPO (EIXO, CONJUNTO OU INDIVIDUAL)
             * ========================================================================= */
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Selecione o que deseja exportar:
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl sm:rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setModoExportacao('eixo')}
                    className={`py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                      modoExportacao === 'eixo'
                        ? 'bg-white text-blue-700 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Por Eixo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoExportacao('conjunto')}
                    className={`py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                      modoExportacao === 'conjunto'
                        ? 'bg-white text-blue-700 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">Completo</span>
                    <span className="hidden sm:inline">Coleção Completa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoExportacao('individual')}
                    className={`py-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                      modoExportacao === 'individual'
                        ? 'bg-white text-blue-700 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Individual</span>
                  </button>
                </div>
              </div>

              {/* OPÇÃO 1: EXPORTAR POR EIXO */}
              {modoExportacao === 'eixo' && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Escolha o Eixo Clínico:
                    </label>
                    <select
                      value={eixoExportarId}
                      onChange={e => setEixoExportarId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white"
                    >
                      {eixos.map(ex => (
                        <option key={ex.id} value={ex.id}>
                          {ex.titulo} • {cards.filter(c => c.eixoId === ex.id).length} cards
                        </option>
                      ))}
                    </select>
                  </div>

                  {eixoExportar && (
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-blue-900 block">{eixoExportar.titulo}</span>
                        <span className="text-[11px] text-blue-700">
                          {cardsDoEixoExportar.length} flashcards • {eixoExportar.especialidade}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-800">
                        {eixoExportar.topicos?.length || 0} tópicos
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBaixarEixoJson}
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopiarEixoJson}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {jsonEixoCopiado ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copiar JSON</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBaixarEixoAnki}
                      className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Anki TXT</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OPÇÃO 2: EXPORTAR CONJUNTO / COLEÇÃO COMPLETA */}
              {modoExportacao === 'conjunto' && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Coleção Completa MedCards</span>
                      <span className="text-[11px] text-slate-500">
                        {cards.length} flashcards em {eixos.length} eixos clínicos
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Backup Integral
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBaixarColecaoJson}
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Backup</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopiarColecaoJson}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {jsonColecaoCopiado ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copiar Tudo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBaixarColecaoAnki}
                      className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Anki Geral</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OPÇÃO 3: EXPORTAR CARD INDIVIDUAL */}
              {modoExportacao === 'individual' && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Localizar e Selecionar Flashcard:
                    </label>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={filtroBuscaCard}
                        onChange={e => setFiltroBuscaCard(e.target.value)}
                        placeholder="Filtrar card pelo título ou afecção..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-blue-600 bg-slate-50/60"
                      />
                    </div>

                    <select
                      value={cardSelecionadoId}
                      onChange={e => setCardSelecionadoId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white"
                    >
                      {cardsFiltradosBusca.map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.especialidade}] {c.titulo} ({c.tipoCard})
                        </option>
                      ))}
                    </select>
                  </div>

                  {cardIndividualExportar && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          {cardIndividualExportar.tipoCard} • {cardIndividualExportar.especialidade}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cardIndividualExportar.repeticoes} revisões
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {cardIndividualExportar.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {cardIndividualExportar.perguntaGatilho}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopiarCardJson}
                      className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {jsonCardCopiado ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                          <span>JSON Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white" />
                          <span>Copiar JSON do Card</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBaixarCardJson}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Baixar Arquivo (.json)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
       * POP-UP MODAL DE SUCESSO PÓS-IMPORTAÇÃO (CONFIRMAÇÃO DETALHADA)
       * ========================================================================= */}
      {sucessoPopUp && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
                  Importação Concluída
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {sucessoPopUp.totalCards} Flashcards Adicionados!
                </h3>
              </div>
            </div>

            {/* Caixa com o Eixo e Tópico de Destino */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Eixo Clínico:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {sucessoPopUp.eixoNome}
                  </p>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    {sucessoPopUp.especialidade}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Tópico / Aula:
                </span>
                <p className="font-bold text-slate-800 text-xs">
                  📚 {sucessoPopUp.topicoNome}
                </p>
              </div>

              {/* Contagem por tipo */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                {sucessoPopUp.tiposContagem.image_occlusion > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                    {sucessoPopUp.tiposContagem.image_occlusion} Oclusão Imagem
                  </span>
                )}
                {sucessoPopUp.tiposContagem.caso_clinico > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                    {sucessoPopUp.tiposContagem.caso_clinico} Casos Clínicos
                  </span>
                )}
                {sucessoPopUp.tiposContagem.fluxograma_complexo > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {sucessoPopUp.tiposContagem.fluxograma_complexo} Árvores de Decisão
                  </span>
                )}
                {sucessoPopUp.tiposContagem.fluxograma_oclusao > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {sucessoPopUp.tiposContagem.fluxograma_oclusao} Fluxogramas
                  </span>
                )}
                {sucessoPopUp.tiposContagem.cloze > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                    {sucessoPopUp.tiposContagem.cloze} Cloze
                  </span>
                )}
                {sucessoPopUp.tiposContagem.conceito > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    {sucessoPopUp.tiposContagem.conceito} Conceitos
                  </span>
                )}
              </div>
            </div>

            {/* Ações pós-importação */}
            <div className="space-y-2 pt-1">
              {onEstudarCardsImportados && (
                <button
                  type="button"
                  onClick={() => {
                    const cardsToStudy = sucessoPopUp.cardsCriados;
                    setSucessoPopUp(null);
                    onClose();
                    onEstudarCardsImportados(cardsToStudy);
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Estudar Estes Flashcards Agora</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {onNavegarParaEixo && (
                  <button
                    type="button"
                    onClick={() => {
                      const eixoId = sucessoPopUp.eixoId;
                      setSucessoPopUp(null);
                      onClose();
                      onNavegarParaEixo(eixoId);
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Ver no Eixo</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSucessoPopUp(null)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Importar Mais
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

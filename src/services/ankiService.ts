import JSZip from 'jszip';
import { CardClinico, EixoClinico, MascaraImagem, ProgressoDiario, AlgoritmoDecisao, BlocoOclusao } from '../types';

export interface ResultadoImportacao {
  cardsImportados: CardClinico[];
  eixosCriados: EixoClinico[];
  totalCards: number;
  nomeDeck?: string;
  mensagem: string;
}

export const AnkiService = {
  /**
   * Helper para normalizar e construir um CardClinico completo a partir de JSON
   * Suporta: conceito, cloze, caso_clinico (múltipla escolha) e fluxograma_oclusao (algoritmo de decisão)
   */
  normalizarCardImportado(
    c: any, 
    eixoPadraoId: string, 
    index: number,
    topicoPadraoId?: string,
    topicoPadraoNome?: string,
    especialidadePadrao?: string
  ): CardClinico {
    const frente = c.perguntaGatilho || c.frente || c.pergunta || c.questao || c.enunciado || c.titulo || 'Pergunta';
    let verso = c.resposta || c.verso || c.gabarito || c.conteudo || '';
    const isImageOcclusion = c.tipoCard === 'image_occlusion' || c.tipoCard === 'oclusao_imagem' || (!!c.imagemUrl && Array.isArray(c.mascarasImagem) && c.mascarasImagem.length > 0);
    const isCloze = !isImageOcclusion && (c.tipoCard === 'cloze' || (typeof c.textoCloze === 'string') || (typeof frente === 'string' && frente.includes('{{c')));
    const isCasoClinico = !isImageOcclusion && (c.tipoCard === 'caso_clinico' || !!c.casoClinicoDados || Array.isArray(c.opcoes) || Array.isArray(c.alternativas));
    const isFluxogramaComplexo = !isImageOcclusion && (c.tipoCard === 'fluxograma_complexo' || !!c.fluxogramaComplexo || !!c.arvoreDecisao || (c.tipoCard === 'fluxograma' && Array.isArray(c.nos)));
    const isFluxograma = !isImageOcclusion && !isFluxogramaComplexo && (c.tipoCard === 'fluxograma_oclusao' || (c.tipoCard === 'fluxograma' && !Array.isArray(c.nos)) || !!c.algoritmoDecisao || Array.isArray(c.etapas) || Array.isArray(c.passos));

    let tipoCardFinal = c.tipoCard || 'conceito';
    if (isImageOcclusion) tipoCardFinal = 'image_occlusion';
    else if (isFluxogramaComplexo) tipoCardFinal = 'fluxograma_complexo';
    else if (isCloze) tipoCardFinal = 'cloze';
    else if (isCasoClinico) tipoCardFinal = 'caso_clinico';
    else if (isFluxograma) tipoCardFinal = 'fluxograma_oclusao';

    if (isImageOcclusion && !verso && Array.isArray(c.mascarasImagem) && c.mascarasImagem.length > 0) {
      verso = c.mascarasImagem.map((m: any) => `#${m.numero || ''}: ${m.textoOculto || ''}`).join('\n');
    }

    // Normalização de Caso Clínico (Múltipla Escolha)
    let casoClinicoDados = c.casoClinicoDados;
    if (isCasoClinico && !casoClinicoDados) {
      const opcoes = c.opcoes || c.alternativas || c.itens || [];
      let indiceCorreto = 0;
      if (typeof c.indiceCorreto === 'number') {
        indiceCorreto = c.indiceCorreto;
      } else if (typeof c.correta === 'number') {
        indiceCorreto = c.correta;
      } else if (typeof c.indiceCorreto === 'string' || typeof c.correta === 'string') {
        const rawStr = String(c.indiceCorreto || c.correta).trim().toLowerCase();
        const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
        if (letterMap[rawStr] !== undefined) {
          indiceCorreto = letterMap[rawStr];
        } else {
          const parsed = parseInt(rawStr, 10);
          if (!isNaN(parsed)) indiceCorreto = parsed;
        }
      }

      const dicaTexto = c.dica || c.dicaPratica || c.pontoChave || c.perolaClinica || c.perola || c.justificativaDetalhada || c.justificativa || c.explicacao || 'Resposta correta baseada nas diretrizes clínicas.';
      const historiaClinica = c.historiaClinica || c.enunciado || frente;
      const exameFisicoSinais = c.exameFisicoSinais || '';

      casoClinicoDados = {
        historiaClinica,
        exameFisicoSinais,
        opcoes: Array.isArray(opcoes) ? opcoes : [],
        indiceCorreto,
        justificativaDetalhada: dicaTexto,
      };
    }

    // Normalização de Passo a Passo (fluxograma_oclusao)
    let algoritmoDecisao: AlgoritmoDecisao | undefined = c.algoritmoDecisao;
    let blocosOclusao: BlocoOclusao[] | undefined = c.blocosOclusao;

    if (isFluxograma && !algoritmoDecisao) {
      const etapas = c.passos || c.etapas || c.blocos || [];
      if (Array.isArray(etapas) && etapas.length > 0) {
        const blocos = etapas.map((et: any, idx: number) => {
          if (typeof et === 'string') {
            return {
              id: `b-${Date.now()}-${idx + 1}`,
              titulo: '',
              descricao: et.trim(),
              tipo: 'conduta' as const,
            };
          }
          return {
            id: et.id || `b-${Date.now()}-${idx + 1}`,
            titulo: et.titulo || '',
            descricao: et.conduta || et.condutaOuAcao || et.descricao || et.texto || et.acao || et.conteudo || '',
            tipo: 'conduta' as const,
            criterioEntrada: et.criterio || et.criterioEntrada || et.criterioSeta || undefined,
          };
        });

        const ramificacoes = [];
        for (let i = 0; i < blocos.length - 1; i++) {
          ramificacoes.push({
            id: `ram-${Date.now()}-${i}`,
            origemId: blocos[i].id,
            destinoId: blocos[i + 1].id,
            criterioCondicional: blocos[i + 1].criterioEntrada || undefined,
          });
        }

        algoritmoDecisao = {
          id: `alg-${Date.now()}-${index + 1}`,
          titulo: c.titulo || 'Passo a Passo Clínico',
          especialidade: c.especialidade || especialidadePadrao || 'Geral / Outros',
          eixoId: c.eixoId || eixoPadraoId,
          topicoId: topicoPadraoId || c.topicoId,
          blocos,
          ramificacoes,
        };

        if (!verso) {
          verso = blocos
            .map((b, i) => `${i + 1}. ${b.titulo ? `${b.titulo}: ` : ''}${b.descricao}`)
            .join('\n');
        }
      }
    }

    if (algoritmoDecisao && Array.isArray(algoritmoDecisao.blocos)) {
      // Garante que o Passo 1 nunca venha pré-revelado por causa de tipo === 'inicio'
      algoritmoDecisao = {
        ...algoritmoDecisao,
        blocos: algoritmoDecisao.blocos.map((b) => ({
          ...b,
          tipo: 'conduta',
        })),
      };

      if (!blocosOclusao || blocosOclusao.length === 0) {
        blocosOclusao = algoritmoDecisao.blocos.map((b, idx) => ({
          id: b.id || `bo-${idx + 1}`,
          posicao: { x: 10, y: 15 + idx * 25, largura: 80, altura: 20 },
          textoOculto: (b.descricao || b.titulo || '').replace(/^\[.*?\]:\s*/, ''),
          dica: b.titulo || undefined,
          revelado: false,
        }));
      }
    }

    // Normalização de Fluxograma (Diagnóstico / Rastreio / Tratamento / Revisão Completa)
    let fluxogramaComplexo = c.fluxogramaComplexo || c.arvoreDecisao || c.fluxoComplexo;
    if (isFluxogramaComplexo && !fluxogramaComplexo && Array.isArray(c.nos)) {
      fluxogramaComplexo = {
        id: c.id || `fluxo-${Date.now()}-${index + 1}`,
        titulo: c.titulo || 'Fluxograma Clínico',
        descricao: c.descricao || c.perolaClinica || '',
        noInicialId: c.noInicialId || c.nos[0]?.id || 'no-1',
        nos: c.nos,
      };
    }
    if (fluxogramaComplexo && Array.isArray(fluxogramaComplexo.nos)) {
      fluxogramaComplexo = {
        ...fluxogramaComplexo,
        noInicialId: fluxogramaComplexo.noInicialId || fluxogramaComplexo.nos[0]?.id || 'no-1',
        nos: fluxogramaComplexo.nos.map((n: any, idx: number) => ({
          id: n.id || `no-${idx + 1}`,
          titulo: n.titulo || n.conduta || `Etapa ${idx + 1}`,
          descricao: n.descricao || n.detalhes || '',
          tipo: n.tipo || (idx === 0 ? 'inicio' : 'conduta'),
          ramos: Array.isArray(n.ramos)
            ? n.ramos.map((r: any, rIdx: number) => ({
                id: r.id || `r-${idx + 1}-${rIdx + 1}`,
                rotulo: r.rotulo || r.condicao || r.criterio || '',
                destinoNoId: r.destinoNoId || r.destinoId || r.para || '',
                cor: r.cor || 'azul',
              }))
            : [],
        })),
      };
    }

    const finalTopicoNome = c.topicoNome || (c as any).topico || (c as any).aula || (c as any).assunto || (c as any).tema || topicoPadraoNome;
    const finalTopicoId = c.topicoId || topicoPadraoId;
    const finalEspecialidade = c.especialidade || especialidadePadrao || 'Geral / Outros';

    return {
      id: c.id || `card-ai-${Date.now()}-${index + 1}`,
      eixoId: c.eixoId || eixoPadraoId,
      topicoId: finalTopicoId,
      topicoNome: finalTopicoNome,
      especialidade: finalEspecialidade,
      titulo: c.titulo || (frente.length > 50 ? frente.substring(0, 47) + '...' : frente),
      perguntaGatilho: frente,
      resposta: verso || (casoClinicoDados ? casoClinicoDados.opcoes[casoClinicoDados.indiceCorreto] : ''),
      perolaClinica: c.dica || c.dicaPratica || c.pontoChave || c.perolaClinica || c.perola || 'Fixação clínica de alto rendimento.',
      mnemonicoOuDica: c.mnemonicoOuDica || c.mnemonico,
      diretrizReferencia: c.diretrizReferencia || c.referencia || c.fonte,
      repeticoes: typeof c.repeticoes === 'number' ? c.repeticoes : 0,
      intervaloDias: typeof c.intervaloDias === 'number' ? c.intervaloDias : 1,
      fatorFacilidade: typeof c.fatorFacilidade === 'number' ? c.fatorFacilidade : 2.5,
      proximaRevisao: c.proximaRevisao || new Date().toISOString(),
      status: c.status || 'pendente',
      taxaAcerto: typeof c.taxaAcerto === 'number' ? c.taxaAcerto : 0,
      historicoRespostas: Array.isArray(c.historicoRespostas) ? c.historicoRespostas : [],
      tipoCard: tipoCardFinal,
      textoCloze: c.textoCloze || (isCloze ? frente : undefined),
      casoClinicoDados,
      algoritmoDecisao,
      fluxogramaComplexo,
      blocosOclusao,
      imagemUrl: c.imagemUrl,
      mascarasImagem: c.mascarasImagem,
      origemAnki: !!c.origemAnki,
    };
  },

  /**
   * Processa arquivo de importação (.apkg, .txt, .tsv, .csv ou .json)
   */
  async importarArquivo(
    file: File,
    eixoPadraoId: string,
    eixosExistentes: EixoClinico[]
  ): Promise<ResultadoImportacao> {
    const nomeArquivo = file.name.toLowerCase();

    if (nomeArquivo.endsWith('.apkg') || nomeArquivo.endsWith('.colpkg') || nomeArquivo.endsWith('.zip')) {
      return this.importarApkg(file, eixoPadraoId, eixosExistentes);
    } else if (nomeArquivo.endsWith('.json')) {
      return this.importarJson(file, eixoPadraoId);
    } else {
      // Trata como texto tabulado/delimitado (TSV, CSV, TXT do Anki)
      return this.importarTexto(file, eixoPadraoId, eixosExistentes);
    }
  },

  /**
   * Extrai e importa cards de um pacote Anki (.apkg)
   */
  async importarApkg(
    file: File,
    eixoPadraoId: string,
    eixosExistentes: EixoClinico[]
  ): Promise<ResultadoImportacao> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const nomeDeck = file.name.replace(/\.(apkg|colpkg|zip)$/i, '');
    let eixoDestino = eixosExistentes.find(e => e.id === eixoPadraoId);

    if (!eixoDestino) {
      eixoDestino = {
        id: `eixo-anki-${Date.now()}`,
        titulo: `Anki: ${nomeDeck}`,
        subtitulo: 'Baralho importado via APKG',
        especialidade: 'Geral / Outros',
        descricao: `Coleção de cartões importada de ${file.name}`,
        icone: 'FolderPlus',
        corTema: {
          bgTag: 'bg-indigo-50',
          textTag: 'text-indigo-700',
          borderTag: 'border-indigo-200',
          accent: '#4F46E5',
        },
        totalCards: 0,
        cardsDominados: 0,
        pendentesHoje: 0,
        ultimaAtividade: 'Importado agora',
      };
    }

    const cardsExtraidos: CardClinico[] = [];
    const ankiDbFile = contents.file('collection.anki21') || contents.file('collection.anki2');

    if (ankiDbFile) {
      const buffer = await ankiDbFile.async('uint8array');
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = textDecoder.decode(buffer);

      const regexCampos = /([^\x00-\x08\x0b\x0c\x0e-\x1f]{2,})\x1f([^\x00-\x08\x0b\x0c\x0e-\x1f]{2,})/g;
      let match;
      const seenFld = new Set<string>();

      while ((match = regexCampos.exec(rawText)) !== null) {
        let f1 = match[1].trim();
        let f2 = match[2].trim();

        if (f1.length < 3 || f2.length < 2) continue;
        if (f1.includes('sqlite_') || f1.includes('CREATE TABLE') || f1.includes('indices')) continue;
        
        const frenteLimpa = f1.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const versoLimpo = f2.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        if (frenteLimpa.length > 2 && !seenFld.has(frenteLimpa)) {
          seenFld.add(frenteLimpa);
          const isCloze = frenteLimpa.includes('{{c') || f1.includes('{{c');
          
          cardsExtraidos.push({
            id: `card-apkg-${Date.now()}-${cardsExtraidos.length + 1}`,
            eixoId: eixoDestino.id,
            especialidade: 'Geral / Outros',
            titulo: frenteLimpa.length > 50 ? frenteLimpa.substring(0, 47) + '...' : frenteLimpa,
            perguntaGatilho: frenteLimpa,
            resposta: versoLimpo || frenteLimpa,
            perolaClinica: 'Cartão importado via pacote Anki (.apkg).',
            repeticoes: 0,
            intervaloDias: 1,
            fatorFacilidade: 2.5,
            proximaRevisao: new Date().toISOString(),
            status: 'pendente',
            taxaAcerto: 0,
            historicoRespostas: [],
            tipoCard: isCloze ? 'cloze' : 'conceito',
            textoCloze: isCloze ? f1 : undefined,
            origemAnki: true,
          });
        }
      }
    }

    return {
      cardsImportados: cardsExtraidos,
      eixosCriados: [eixoDestino],
      totalCards: cardsExtraidos.length,
      nomeDeck,
      mensagem: `${cardsExtraidos.length} cartões importados do Anki!`,
    };
  },

  /**
   * Importa arquivo de texto tabulado (.txt, .tsv, .csv)
   */
  async importarTexto(
    file: File,
    eixoPadraoId: string,
    eixosExistentes: EixoClinico[]
  ): Promise<ResultadoImportacao> {
    const texto = await file.text();
    const cards = this.parseTextoCards(texto, eixoPadraoId);

    return {
      cardsImportados: cards,
      eixosCriados: [],
      totalCards: cards.length,
      nomeDeck: file.name,
      mensagem: `${cards.length} cartões de texto importados com sucesso!`,
    };
  },

  /**
   * Faz o parser de linhas TSV/CSV estilo Anki
   */
  parseTextoCards(texto: string, eixoId: string): CardClinico[] {
    const linhas = texto.split(/\r?\n/);
    const cards: CardClinico[] = [];

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha || linha.startsWith('#')) continue;

      let colunas = linha.split('\t');
      if (colunas.length < 2) colunas = linha.split(';');
      if (colunas.length < 2) colunas = linha.split(',');

      if (colunas.length >= 2) {
        const frente = colunas[0].trim().replace(/^["']|["']$/g, '');
        const verso = colunas[1].trim().replace(/^["']|["']$/g, '');
        const tag = colunas[2]?.trim().replace(/^["']|["']$/g, '');

        if (frente && verso) {
          const isCloze = frente.includes('{{c');

          cards.push({
            id: `card-txt-${Date.now()}-${cards.length + 1}`,
            eixoId,
            especialidade: 'Geral / Outros',
            titulo: frente.length > 50 ? frente.substring(0, 47) + '...' : frente,
            perguntaGatilho: frente,
            resposta: verso,
            perolaClinica: tag ? `Tags: ${tag}` : 'Importado via Anki Text Export.',
            repeticoes: 0,
            intervaloDias: 1,
            fatorFacilidade: 2.5,
            proximaRevisao: new Date().toISOString(),
            status: 'pendente',
            taxaAcerto: 0,
            historicoRespostas: [],
            tipoCard: isCloze ? 'cloze' : 'conceito',
            textoCloze: isCloze ? frente : undefined,
            origemAnki: true,
          });
        }
      }
    }

    return cards;
  },

  /**
   * Importa arquivo JSON de backup ou gerado por IA (Gemini)
   */
  async importarJson(file: File, eixoPadraoId: string): Promise<ResultadoImportacao> {
    const texto = await file.text();
    return this.processarTextoDireto(texto, eixoPadraoId, file.name);
  },

  /**
   * Processa texto colado diretamente (JSON ou TSV/Delimitado)
   */
  /**
   * Extrai e interpreta JSON de forma ultra-resiliente, suportando:
   * 1. Arquivos JSON válidos diretos (.json de eixos e backups completos do MedCards)
   * 2. Blocos de código Markdown (```json ... ```)
   * 3. Texto livre contendo um array ou objeto JSON (respeitando o delimitador de abertura real)
   * 4. JSONs com trailing commas comuns de respostas de LLMs (Gemini / ChatGPT)
   */
  interpretarJsonResiliente(texto: string): any {
    const limpo = texto.trim();
    if (!limpo) {
      throw new Error('O conteúdo fornecido está vazio.');
    }

    // Tentativa 1: Parse direto do texto completo (caso padrão de arquivos .json)
    try {
      return JSON.parse(limpo);
    } catch {
      // Continua para extração
    }

    // Tentativa 2: Extrair de bloco markdown ```json ... ``` se presente
    const markdownMatch = limpo.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      const candidatoMarkdown = markdownMatch[1].trim();
      try {
        return JSON.parse(candidatoMarkdown);
      } catch {
        try {
          const reparado = candidatoMarkdown.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(reparado);
        } catch {}
      }
    }

    // Tentativa 3: Identificar se o JSON raiz mais externo é um Objeto {...} ou Array [...]
    const firstSquare = limpo.indexOf('[');
    const lastSquare = limpo.lastIndexOf(']');
    const firstCurly = limpo.indexOf('{');
    const lastCurly = limpo.lastIndexOf('}');

    const temObjeto = firstCurly !== -1 && lastCurly > firstCurly;
    const temArray = firstSquare !== -1 && lastSquare > firstSquare;

    const candidatos: string[] = [];

    if (temObjeto && (!temArray || firstCurly < firstSquare)) {
      // O objeto raiz começa antes do primeiro array (ex: { "eixo": ..., "cards": [...] })
      candidatos.push(limpo.substring(firstCurly, lastCurly + 1).trim());
      if (temArray) {
        candidatos.push(limpo.substring(firstSquare, lastSquare + 1).trim());
      }
    } else if (temArray && (!temObjeto || firstSquare < firstCurly)) {
      // O array raiz começa antes do primeiro objeto (ex: [ { "tipoCard": ... } ])
      candidatos.push(limpo.substring(firstSquare, lastSquare + 1).trim());
      if (temObjeto) {
        candidatos.push(limpo.substring(firstCurly, lastCurly + 1).trim());
      }
    } else {
      if (temObjeto) candidatos.push(limpo.substring(firstCurly, lastCurly + 1).trim());
      if (temArray) candidatos.push(limpo.substring(firstSquare, lastSquare + 1).trim());
    }

    let ultimoErro: any = null;

    for (const cand of candidatos) {
      try {
        return JSON.parse(cand);
      } catch (e) {
        ultimoErro = e;
        try {
          const reparado = cand.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(reparado);
        } catch (e2) {
          ultimoErro = e2;
        }
      }
    }

    throw new Error(`Erro ao interpretar JSON: ${ultimoErro?.message || 'Formato JSON inválido ou corrompido.'}`);
  },

  /**
   * Processa texto colado diretamente ou lido de arquivo (JSON ou TSV/Delimitado)
   */
  processarTextoDireto(
    texto: string, 
    eixoPadraoId: string, 
    nomeOrigem: string = 'Gemini / Backup',
    topicoDestinoId?: string,
    topicoDestinoNome?: string,
    especialidadePadrao?: string
  ): ResultadoImportacao {
    const textoLimpo = texto.trim();
    if (!textoLimpo) {
      throw new Error('O texto fornecido está vazio.');
    }

    // 1. Tenta interpretar como JSON resiliente
    try {
      const dados = this.interpretarJsonResiliente(textoLimpo);
      if (dados) {
        let listaBruta: any[] = [];
        let eixos: EixoClinico[] = [];

        if (Array.isArray(dados)) {
          listaBruta = dados;
        } else if (dados && typeof dados === 'object') {
          if (Array.isArray(dados.cards)) {
            listaBruta = dados.cards;
          } else if (Array.isArray(dados.flashcards)) {
            listaBruta = dados.flashcards;
          } else if (Array.isArray(dados.questoes)) {
            listaBruta = dados.questoes;
          } else if (dados.perguntaGatilho || dados.frente || dados.pergunta || dados.titulo || dados.tipoCard) {
            listaBruta = [dados];
          }

          if (Array.isArray(dados.eixos)) {
            eixos = dados.eixos;
          } else if (dados.eixo) {
            eixos = [dados.eixo];
          }
        }

        if (listaBruta.length === 0) {
          throw new Error('Nenhum cartão válido foi encontrado na estrutura JSON.');
        }

        const targetEixoId = eixos[0]?.id || eixoPadraoId;
        const targetEsp = eixos[0]?.especialidade || especialidadePadrao;

        const cards: CardClinico[] = listaBruta.map((c: any, index: number) => 
          this.normalizarCardImportado(
            c, 
            targetEixoId, 
            index, 
            topicoDestinoId, 
            topicoDestinoNome, 
            targetEsp
          )
        );

        return {
          cardsImportados: cards,
          eixosCriados: eixos,
          totalCards: cards.length,
          nomeDeck: eixos[0]?.titulo || nomeOrigem,
          mensagem: `${cards.length} flashcards importados com sucesso!`,
        };
      }
    } catch (err: any) {
      // Se parece com JSON explícito, repassa o erro detalhado
      const pareceJson = textoLimpo.startsWith('{') || textoLimpo.startsWith('[') || textoLimpo.includes('```json') || textoLimpo.includes('{"') || textoLimpo.includes('[{');
      if (pareceJson) {
        throw new Error(`Erro ao interpretar JSON: ${err?.message || 'Verifique se o arquivo JSON está completo e não foi corrompido ao transferir.'}`);
      }
    }

    // Se não for JSON ou falhou, tenta como texto tabulado / estilo Anki
    const cards = this.parseTextoCards(textoLimpo, eixoPadraoId);
    if (cards.length === 0) {
      throw new Error('Nenhum flashcard reconhecido. Use arquivos .json exportados pelo MedCards, pacotes .apkg do Anki ou texto delimitado por tabulações.');
    }

    // Aplica tópico se especificado
    const cardsComTopico = cards.map(c => ({
      ...c,
      topicoId: topicoDestinoId || c.topicoId,
      topicoNome: topicoDestinoNome || c.topicoNome,
      especialidade: (especialidadePadrao as any) || c.especialidade,
    }));

    return {
      cardsImportados: cardsComTopico,
      eixosCriados: [],
      totalCards: cardsComTopico.length,
      nomeDeck: 'Texto Importado',
      mensagem: `${cardsComTopico.length} flashcards importados a partir do texto!`,
    };
  },

  /**
   * Processa texto de forma 100% local e assíncrona (fatiada no tempo)
   * Garante que mesmo payloads gigantes de 100+ cards ou com imagens em base64 não travem a UI.
   * Funciona 100% offline, sem nenhuma dependência de rede ou API externa.
   */
  async processarTextoAssincrono(
    texto: string,
    eixoPadraoId: string,
    nomeOrigem: string = 'Gemini / Backup',
    topicoDestinoId?: string,
    topicoDestinoNome?: string,
    especialidadePadrao?: string
  ): Promise<ResultadoImportacao> {
    await new Promise((resolve) => setTimeout(resolve, 10));

    const textoLimpo = texto.trim();
    if (!textoLimpo) {
      throw new Error('O texto fornecido está vazio.');
    }

    // 1. Tenta interpretar como JSON resiliente
    try {
      const dados = this.interpretarJsonResiliente(textoLimpo);
      if (dados) {
        let listaBruta: any[] = [];
        let eixos: EixoClinico[] = [];

        if (Array.isArray(dados)) {
          listaBruta = dados;
        } else if (dados && typeof dados === 'object') {
          if (Array.isArray(dados.cards)) listaBruta = dados.cards;
          else if (Array.isArray(dados.flashcards)) listaBruta = dados.flashcards;
          else if (Array.isArray(dados.questoes)) listaBruta = dados.questoes;
          else if (dados.perguntaGatilho || dados.frente || dados.pergunta || dados.titulo || dados.tipoCard) {
            listaBruta = [dados];
          }

          if (Array.isArray(dados.eixos)) eixos = dados.eixos;
          else if (dados.eixo) eixos = [dados.eixo];
        }

        if (listaBruta.length === 0) {
          throw new Error('Nenhum cartão válido foi encontrado na estrutura JSON.');
        }

        const targetEixoId = eixos[0]?.id || eixoPadraoId;
        const targetEsp = eixos[0]?.especialidade || especialidadePadrao;

        // Processamento fatiado em lotes de 15 cards para manter 60fps na tela
        const cards: CardClinico[] = [];
        const BATCH_SIZE = 15;
        for (let i = 0; i < listaBruta.length; i += BATCH_SIZE) {
          const batch = listaBruta.slice(i, i + BATCH_SIZE);
          const normalizedBatch = batch.map((c: any, subIdx: number) =>
            this.normalizarCardImportado(
              c,
              targetEixoId,
              i + subIdx,
              topicoDestinoId,
              topicoDestinoNome,
              targetEsp
            )
          );
          cards.push(...normalizedBatch);
          if (i + BATCH_SIZE < listaBruta.length) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        return {
          cardsImportados: cards,
          eixosCriados: eixos,
          totalCards: cards.length,
          nomeDeck: eixos[0]?.titulo || nomeOrigem,
          mensagem: `${cards.length} flashcards processados localmente com sucesso!`,
        };
      }
    } catch (err: any) {
      const pareceJson = textoLimpo.startsWith('{') || textoLimpo.startsWith('[') || textoLimpo.includes('```json') || textoLimpo.includes('{"') || textoLimpo.includes('[{');
      if (pareceJson) {
        throw new Error(`Erro ao interpretar JSON: ${err?.message || 'Verifique se copiou a resposta completa do Gemini.'}`);
      }
    }

    // Fallback síncrono para texto tabulado
    return this.processarTextoDireto(texto, eixoPadraoId, nomeOrigem, topicoDestinoId, topicoDestinoNome, especialidadePadrao);
  },

  /**
   * Exporta cards para o formato Anki TSV/TXT tab-delimited
   * Compatível diretamente com o Anki desktop e AnkiDroid
   */
  exportarParaAnkiTSV(cards: CardClinico[]): string {
    const cabecalho = '#separator:tab\n#html:true\n#tags column:3\n';
    const linhas = cards.map(c => {
      let frente = c.perguntaGatilho || c.titulo;
      let verso = c.resposta;

      if (c.tipoCard === 'cloze' && c.textoCloze) {
        frente = c.textoCloze;
      } else if (c.tipoCard === 'caso_clinico' && c.casoClinicoDados) {
        frente = `${c.casoClinicoDados.historiaClinica}\n\n${c.casoClinicoDados.opcoes.join('\n')}`;
        verso = `<strong>Gabarito:</strong> ${c.resposta}<br><br><strong>Comentário:</strong> ${c.casoClinicoDados.justificativaDetalhada}`;
      } else if (c.tipoCard === 'fluxograma_oclusao' && c.algoritmoDecisao) {
        frente = `${c.titulo}\nReconstrua a sequência de conduta clínica:`;
        verso = c.algoritmoDecisao.blocos.map((b, i) => `${i + 1}. [Critério: ${b.criterioEntrada || 'Entrada'}] ➔ ${b.titulo}: ${b.descricao}`).join('<br>');
      }

      if (c.perolaClinica) {
        verso += `<br><br><small><strong>Nota:</strong> ${c.perolaClinica}</small>`;
      }

      const frenteLimpa = frente.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const versoLimpo = verso.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const tag = (c.especialidade || 'Geral').replace(/\s+/g, '_');

      return `${frenteLimpa}\t${versoLimpo}\t${tag}`;
    });

    return cabecalho + linhas.join('\n');
  },

  /**
   * Exporta um único card em JSON estruturado
   */
  exportarCardIndividualJson(card: CardClinico): string {
    return JSON.stringify(card, null, 2);
  },

  /**
   * Exporta um eixo completo com seus metadados, tópicos e todos os seus cards
   */
  exportarEixoJson(eixo: EixoClinico, cardsDoEixo: CardClinico[]): string {
    const topicosSet = new Map<string, any>();
    (eixo.topicos || []).forEach(t => topicosSet.set(t.titulo.toLowerCase(), t));

    cardsDoEixo.forEach(c => {
      const nome = (c.topicoNome || (c as any).topico || '').trim();
      if (nome && nome !== 'Conceitos Gerais' && !topicosSet.has(nome.toLowerCase())) {
        const topObj = {
          id: c.topicoId || `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          titulo: nome,
          descricao: 'Tópico de estudo',
          eixoId: eixo.id,
          totalCards: 0
        };
        topicosSet.set(nome.toLowerCase(), topObj);
      }
    });

    const topicosAtualizados = Array.from(topicosSet.values()).map(t => ({
      ...t,
      totalCards: cardsDoEixo.filter(c => c.topicoId === t.id || (c.topicoNome && c.topicoNome.toLowerCase() === t.titulo.toLowerCase())).length
    }));

    const eixoCompleto: EixoClinico = {
      ...eixo,
      topicos: topicosAtualizados,
      totalCards: cardsDoEixo.length
    };

    const pacote = {
      versao: '1.0',
      dataExportacao: new Date().toISOString(),
      origem: 'MedCards App',
      tipo: 'eixo_completo',
      eixo: eixoCompleto,
      cards: cardsDoEixo.map(c => ({
        ...c,
        topicoNome: c.topicoNome || (c as any).topico || undefined
      })),
    };
    return JSON.stringify(pacote, null, 2);
  },

  /**
   * Exporta a coleção completa ou filtrada (cards, eixos e progresso) com todos os tópicos de cada eixo
   */
  exportarColecaoJson(cards: CardClinico[], eixos: EixoClinico[], progresso?: ProgressoDiario): string {
    const eixosCompletos = eixos.map(eixo => {
      const cardsDoEixo = cards.filter(c => c.eixoId === eixo.id);
      const topicosSet = new Map<string, any>();
      (eixo.topicos || []).forEach(t => topicosSet.set(t.titulo.toLowerCase(), t));

      cardsDoEixo.forEach(c => {
        const nome = (c.topicoNome || (c as any).topico || '').trim();
        if (nome && nome !== 'Conceitos Gerais' && !topicosSet.has(nome.toLowerCase())) {
          const topObj = {
            id: c.topicoId || `top-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            titulo: nome,
            descricao: 'Tópico de estudo',
            eixoId: eixo.id,
            totalCards: 0
          };
          topicosSet.set(nome.toLowerCase(), topObj);
        }
      });

      const topicosAtualizados = Array.from(topicosSet.values()).map(t => ({
        ...t,
        totalCards: cardsDoEixo.filter(c => c.topicoId === t.id || (c.topicoNome && c.topicoNome.toLowerCase() === t.titulo.toLowerCase())).length
      }));

      return {
        ...eixo,
        topicos: topicosAtualizados,
        totalCards: cardsDoEixo.length
      };
    });

    const backup = {
      versao: '1.0',
      dataExportacao: new Date().toISOString(),
      origem: 'MedCards App',
      tipo: 'backup_completo',
      progresso,
      eixos: eixosCompletos,
      cards: cards.map(c => ({
        ...c,
        topicoNome: c.topicoNome || (c as any).topico || undefined
      })),
    };
    return JSON.stringify(backup, null, 2);
  },

  /**
   * Dispara o download nativo de um arquivo no navegador
   */
  baixarArquivo(conteudo: string, nomeArquivo: string, mimeType: string = 'application/json'): void {
    const blob = new Blob([conteudo], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Copia texto para a área de transferência do usuário com fallback
   */
  async copiarParaClipboard(conteudo: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(conteudo);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = conteudo;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (e) {
      console.error('Erro ao copiar para clipboard:', e);
      return false;
    }
  },
};

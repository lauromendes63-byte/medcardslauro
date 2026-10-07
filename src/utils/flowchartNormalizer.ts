import { CardClinico, FluxogramaComplexoDados, NoFluxogramaComplexo } from '../types';

export interface PassoNormalizado {
  id: string;
  numero: number;
  titulo?: string;
  conteudo: string;
}

const REGEX_COMANDOS_ROBOTICOS = /^(reconstrua\s+(o\s+algoritmo|a\s+sequ[êe]ncia|o\s+fluxograma)[^:.\n]*[:.]?\s*|navegue\s+pelo\s+(algoritmo|fluxograma)[^:.\n]*[:.]?\s*|complete\s+(os\s+passos|as\s+etapas|o\s+fluxograma)[^:.\n]*[:.]?\s*|percorra\s+a\s+[áa]rvore[^:.\n]*[:.]?\s*|identifique\s+as\s+etapas\s+e\s+condutas\s+do\s+algoritmo\s+cl[íi]nico[:.]?\s*|descreva\s+o\s+passo\s+a\s+passo\s+cronol[óo]gico\s+(de|do|da)\s*)/i;

const REGEX_ROTULO_GENERICO = /^(in[íi]cio|fim|final|etapa\s*#?\d+|passo\s*#?\d+|bloco\s*#?\d+|conduta|decis[ãa]o|alerta|diagn[óo]stico|pr[óo]xima\s+etapa|pr[óo]xima\s+conduta|crit[ée]rio\s*\d*|ponto\s+de\s+partida)$/i;

/**
 * Remove prefixos numerados redundantes ("1. ", "Passo 1: ", "Etapa #2 - ")
 */
export function limparPrefixoNumeradoPasso(texto: string): string {
  return (texto || '')
    .trim()
    .replace(/^(\d+[\.\)\-:]\s*|passo\s*#?\d+[\.\)\-:]?\s*|etapa\s*#?\d+[\.\)\-:]?\s*)/i, '')
    .replace(/^\[(in[íi]cio|conduta|decis[ãa]o|alerta|diagn[óo]stico)\]:\s*/i, '')
    .trim();
}

/**
 * Garante que a pergunta/tema norteador seja direto ao ponto, sem comandos meta-robóticos
 */
export function limparPerguntaNorteadora(perguntaRaw?: string, tituloFallback?: string): string {
  const p = (perguntaRaw || '').trim();
  const t = (tituloFallback || '').trim();

  if (!p) return t || 'Qual a sequência correta de condutas?';

  const limpa = p.replace(REGEX_COMANDOS_ROBOTICOS, '').trim();
  if (!limpa || limpa.length < 4) {
    return t || p;
  }

  // Capitaliza primeira letra caso tenha sido cortada pelo regex
  return limpa.charAt(0).toUpperCase() + limpa.slice(1);
}

/**
 * Converte qualquer formato legado ou novo de "Passo a Passo" (algoritmoDecisao, etapasFluxograma, blocosOclusao)
 * em uma lista limpa, ordenada e 100% padronizada onde TODOS os passos (incluindo o Passo 1) começam ocluídos.
 */
export function obterPassosNormalizados(card: CardClinico): PassoNormalizado[] {
  const resultado: PassoNormalizado[] = [];

  // 1. Prioridade: algoritmoDecisao.blocos
  if (card.algoritmoDecisao?.blocos && Array.isArray(card.algoritmoDecisao.blocos) && card.algoritmoDecisao.blocos.length > 0) {
    card.algoritmoDecisao.blocos.forEach((b, idx) => {
      const rawTitulo = limparPrefixoNumeradoPasso(b.titulo || '');
      const rawDesc = (b.descricao || '').replace(/^\[.*?\]:\s*/, '').trim();
      const tituloEhGenerico = !rawTitulo || REGEX_ROTULO_GENERICO.test(rawTitulo);

      if (rawDesc && !tituloEhGenerico && rawTitulo.toLowerCase() !== rawDesc.toLowerCase()) {
        resultado.push({
          id: b.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: rawTitulo,
          conteudo: rawDesc,
        });
      } else {
        resultado.push({
          id: b.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: undefined,
          conteudo: rawDesc || rawTitulo || `Passo ${idx + 1}`,
        });
      }
    });
    return resultado;
  }

  // 2. Fallback: etapasFluxograma
  if (card.etapasFluxograma && Array.isArray(card.etapasFluxograma) && card.etapasFluxograma.length > 0) {
    card.etapasFluxograma.forEach((et, idx) => {
      const rawTitulo = limparPrefixoNumeradoPasso(et.titulo || '');
      const rawConteudo = (et.conteudoOculto || '').replace(/^\[.*?\]:\s*/, '').trim();
      const tituloEhGenerico = !rawTitulo || REGEX_ROTULO_GENERICO.test(rawTitulo);

      if (rawConteudo && !tituloEhGenerico && rawTitulo.toLowerCase() !== rawConteudo.toLowerCase()) {
        resultado.push({
          id: et.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: rawTitulo,
          conteudo: rawConteudo,
        });
      } else {
        resultado.push({
          id: et.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: undefined,
          conteudo: rawConteudo || rawTitulo || `Passo ${idx + 1}`,
        });
      }
    });
    return resultado;
  }

  // 3. Fallback: blocosOclusao
  if (card.blocosOclusao && Array.isArray(card.blocosOclusao) && card.blocosOclusao.length > 0) {
    card.blocosOclusao.forEach((bo, idx) => {
      const rawTitulo = limparPrefixoNumeradoPasso(bo.dica || '');
      const rawConteudo = (bo.textoOculto || '').replace(/^\[.*?\]:\s*/, '').trim();
      const tituloEhGenerico = !rawTitulo || REGEX_ROTULO_GENERICO.test(rawTitulo);

      if (rawConteudo && !tituloEhGenerico && rawTitulo.toLowerCase() !== rawConteudo.toLowerCase()) {
        resultado.push({
          id: bo.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: rawTitulo,
          conteudo: rawConteudo,
        });
      } else {
        resultado.push({
          id: bo.id || `passo-${idx + 1}`,
          numero: idx + 1,
          titulo: undefined,
          conteudo: rawConteudo || rawTitulo || `Passo ${idx + 1}`,
        });
      }
    });
    return resultado;
  }

  // 4. Último fallback: extrair linhas da resposta caso seja um card antigo sem array estruturado
  if (card.resposta && card.resposta.trim()) {
    const linhas = card.resposta
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean);

    linhas.forEach((linha, idx) => {
      resultado.push({
        id: `passo-fallback-${idx + 1}`,
        numero: idx + 1,
        conteudo: limparPrefixoNumeradoPasso(linha) || linha,
      });
    });
  }

  return resultado;
}

/**
 * Normaliza qualquer card de Fluxograma (fluxograma_complexo) garantindo estrutura íntegra,
 * sem rótulos "enche-linguiça" e totalmente compatível com fluxogramas passados.
 */
export function obterFluxogramaNormalizado(
  cardOuFluxo: CardClinico | FluxogramaComplexoDados,
  tituloFallback?: string
): FluxogramaComplexoDados {
  const isCard = 'tipoCard' in cardOuFluxo || 'perguntaGatilho' in cardOuFluxo;
  const rawFluxo: FluxogramaComplexoDados | undefined = isCard
    ? (cardOuFluxo as CardClinico).fluxogramaComplexo
    : (cardOuFluxo as FluxogramaComplexoDados);

  if (rawFluxo && Array.isArray(rawFluxo.nos) && rawFluxo.nos.length > 0) {
    const nosLimpos: NoFluxogramaComplexo[] = rawFluxo.nos.map((no, idx) => {
      const tituloLimpo = (no.titulo || '').replace(/^\[(in[íi]cio|conduta|decis[ãa]o|alerta|diagn[óo]stico)\]:\s*/i, '').trim();
      const descLimpa = (no.descricao || no.respostaOculta || '').replace(/^\[.*?\]:\s*/, '').trim();

      return {
        ...no,
        id: no.id || `no-${idx + 1}`,
        titulo: tituloLimpo || descLimpa || `Etapa ${idx + 1}`,
        descricao: tituloLimpo ? descLimpa : '',
        tipo: no.tipo || (idx === 0 ? 'inicio' : (no.ramos && no.ramos.length > 1 ? 'decisao' : 'conduta')),
        ramos: Array.isArray(no.ramos)
          ? no.ramos.map((r, rIdx) => ({
              ...r,
              id: r.id || `r-${idx}-${rIdx}`,
              rotulo: (r.rotulo || '').trim(),
              destinoNoId: r.destinoNoId || '',
              cor: r.cor || (rIdx === 0 ? 'verde' : rIdx === 1 ? 'vermelho' : 'azul'),
            }))
          : [],
      };
    });

    const primeiroId = rawFluxo.noInicialId && nosLimpos.some(n => n.id === rawFluxo.noInicialId)
      ? rawFluxo.noInicialId
      : nosLimpos[0].id;

    return {
      id: rawFluxo.id || 'fluxo-1',
      titulo: rawFluxo.titulo || tituloFallback || (isCard ? (cardOuFluxo as CardClinico).titulo : 'Fluxograma Clínico'),
      descricao: rawFluxo.descricao || '',
      noInicialId: primeiroId,
      nos: nosLimpos,
    };
  }

  // Fallback caso um card marcado como fluxograma_complexo tenha dados em algoritmoDecisao
  if (isCard) {
    const card = cardOuFluxo as CardClinico;
    const passos = obterPassosNormalizados(card);
    if (passos.length > 0) {
      const nosConvertidos: NoFluxogramaComplexo[] = passos.map((p, idx) => ({
        id: p.id,
        titulo: p.titulo || p.conteudo,
        descricao: p.titulo ? p.conteudo : '',
        tipo: idx === 0 ? 'inicio' : 'conduta',
        oculto: true,
        ramos: idx < passos.length - 1
          ? [{
              id: `ram-${idx}`,
              rotulo: '',
              destinoNoId: passos[idx + 1].id,
              cor: 'azul',
            }]
          : [],
      }));

      return {
        id: `fluxo-conv-${card.id}`,
        titulo: card.titulo,
        noInicialId: nosConvertidos[0].id,
        nos: nosConvertidos,
      };
    }

    return {
      id: `fluxo-vazio-${card.id}`,
      titulo: card.titulo || 'Fluxograma Clínico',
      noInicialId: 'no-1',
      nos: [
        {
          id: 'no-1',
          titulo: card.titulo || 'Conduta Clínica',
          descricao: card.resposta || '',
          tipo: 'inicio',
          ramos: [],
        },
      ],
    };
  }

  return {
    id: 'fluxo-padrao',
    titulo: tituloFallback || 'Fluxograma Clínico',
    noInicialId: 'no-1',
    nos: [],
  };
}

import React from 'react';

interface FormattedClinicalTextProps {
  text: string;
  className?: string;
}

/**
 * Componente que renderiza texto clínico de alto rendimento com suporte a:
 * - Aninhamento recursivo e acumulação de edições (ex: **[azul]termo[/azul]**, [azul]**termo**[/azul], ==**termo**==)
 * - Texto base em contraste agradável e descansado (peso normal 400, text-slate-700)
 * - Negrito com contraste pronunciado e nítido (peso black 900, text-slate-950)
 * - Marca-texto amarelo vibrante com alto contraste interno para negrito
 * - Destaques clínicos azul e vermelho
 * - Quebras de parágrafo e espaçamento visual (Enter duplo / tópicos)
 * - Linhas de Alerta (⚠️) e Pontos de Ouro (⭐) destacados em caixas de foco
 * - Tópicos e marcadores (•, -, *, 1., 2.) com recuo e tipografia nítida
 */
export const FormattedClinicalText: React.FC<FormattedClinicalTextProps> = React.memo(({
  text,
  className = '',
}) => {
  if (!text) return null;

  // Função recursiva para renderizar tags inline com suporte a aninhamento e acumulação
  const renderInlineFormatted = (rawStr: string, depth: number = 0): React.ReactNode => {
    if (!rawStr) return null;
    if (depth > 6) return rawStr; // Previne recursão infinita

    // Regex de captura de blocos delimitados no nível atual
    const tokenRegex = /(==[\s\S]+?==|<mark>[\s\S]+?<\/mark>|\[amarelo\][\s\S]+?\[\/amarelo\]|\[yellow\][\s\S]+?\[\/yellow\]|\[azul\][\s\S]+?\[\/azul\]|\[blue\][\s\S]+?\[\/blue\]|<blue>[\s\S]+?<\/blue>|<azul>[\s\S]+?<\/azul>|::azul::[\s\S]+?::|\[verde\][\s\S]+?\[\/verde\]|\[green\][\s\S]+?\[\/green\]|<green>[\s\S]+?<\/green>|<verde>[\s\S]+?<\/verde>|::verde::[\s\S]+?::|\[vermelho\][\s\S]+?\[\/vermelho\]|\[red\][\s\S]+?\[\/red\]|<red>[\s\S]+?<\/red>|<vermelho>[\s\S]+?<\/vermelho>|::vermelho::[\s\S]+?::|\[roxo\][\s\S]+?\[\/roxo\]|\[purple\][\s\S]+?\[\/purple\]|\[laranja\][\s\S]+?\[\/laranja\]|\[orange\][\s\S]+?\[\/orange\]|`[\s\S]+?`|\*\*(?:[\s\S]+?)\*\*|<b>[\s\S]+?<\/b>|<strong>[\s\S]+?<\/strong>|<u>[\s\S]+?<\/u>|__[\s\S]+?__|<em>[\s\S]+?<\/em>|\*(?:[^\*\n]+?)\*|_(?:[^_\n]+?)_{1,}|(?:\s+-->\s+|\s+->\s+))/g;

    const parts = rawStr.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;
      const key = `node-${depth}-${idx}`;

      // 0. Seta de Sequência Clínica: --> ou ->
      if (/^\s*(-->|->)\s*$/.test(part)) {
        return (
          <span key={key} className="text-slate-400 font-semibold mx-1.5 select-none text-xs sm:text-sm inline-block">
            ➔
          </span>
        );
      }

      // 1. Grifado / Marca-texto Amarelo Suave: ==texto==, <mark>texto</mark>, [amarelo]texto[/amarelo]
      if (
        (part.startsWith('==') && part.endsWith('==') && part.length >= 4) ||
        (part.startsWith('<mark>') && part.endsWith('</mark>')) ||
        (part.startsWith('[amarelo]') && part.endsWith('[/amarelo]')) ||
        (part.startsWith('[yellow]') && part.endsWith('[/yellow]'))
      ) {
        let clean = part;
        if (part.startsWith('==')) clean = part.slice(2, -2);
        else if (part.startsWith('<mark>')) clean = part.slice(6, -7);
        else if (part.startsWith('[amarelo]')) clean = part.slice(9, -10);
        else if (part.startsWith('[yellow]')) clean = part.slice(8, -9);

        return (
          <mark
            key={key}
            className="bg-amber-100/90 text-amber-950 font-medium px-1.5 py-0.5 rounded-[5px] tracking-normal mx-0.5 border border-amber-200/70 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-amber-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </mark>
        );
      }

      // 2. Destaque Azul (Exames / Escalas): [azul]texto[/azul], <blue>texto</blue>, etc.
      if (
        (part.startsWith('[azul]') && part.endsWith('[/azul]')) ||
        (part.startsWith('[blue]') && part.endsWith('[/blue]')) ||
        (part.startsWith('<blue>') && part.endsWith('</blue>')) ||
        (part.startsWith('<azul>') && part.endsWith('</azul>')) ||
        (part.startsWith('::azul::') && part.endsWith('::'))
      ) {
        let clean = part;
        if (part.startsWith('[azul]')) clean = part.slice(6, -7);
        else if (part.startsWith('[blue]')) clean = part.slice(6, -7);
        else if (part.startsWith('<blue>')) clean = part.slice(6, -7);
        else if (part.startsWith('<azul>')) clean = part.slice(6, -7);
        else if (part.startsWith('::azul::')) clean = part.slice(8, -2);

        return (
          <span
            key={key}
            className="font-medium text-sky-900 bg-sky-50/90 px-1.5 py-0.5 rounded-[5px] border border-sky-200/60 mx-0.5 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-sky-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 3. Destaque Verde (Fármacos / Doses / Condutas): [verde]texto[/verde], <green>texto</green>, etc.
      if (
        (part.startsWith('[verde]') && part.endsWith('[/verde]')) ||
        (part.startsWith('[green]') && part.endsWith('[/green]')) ||
        (part.startsWith('<green>') && part.endsWith('</green>')) ||
        (part.startsWith('<verde>') && part.endsWith('</verde>')) ||
        (part.startsWith('::verde::') && part.endsWith('::'))
      ) {
        let clean = part;
        if (part.startsWith('[verde]')) clean = part.slice(7, -8);
        else if (part.startsWith('[green]')) clean = part.slice(7, -8);
        else if (part.startsWith('<green>')) clean = part.slice(7, -8);
        else if (part.startsWith('<verde>')) clean = part.slice(7, -8);
        else if (part.startsWith('::verde::')) clean = part.slice(9, -2);

        return (
          <span
            key={key}
            className="font-medium text-emerald-900 bg-emerald-50/90 px-1.5 py-0.5 rounded-[5px] border border-emerald-200/60 mx-0.5 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-emerald-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 4. Destaque Vermelho (Red Flags / Contraindicações): [vermelho]texto[/vermelho], <red>texto</red>, etc.
      if (
        (part.startsWith('[vermelho]') && part.endsWith('[/vermelho]')) ||
        (part.startsWith('[red]') && part.endsWith('[/red]')) ||
        (part.startsWith('<red>') && part.endsWith('</red>')) ||
        (part.startsWith('<vermelho>') && part.endsWith('</vermelho>')) ||
        (part.startsWith('::vermelho::') && part.endsWith('::'))
      ) {
        let clean = part;
        if (part.startsWith('[vermelho]')) clean = part.slice(10, -11);
        else if (part.startsWith('[red]')) clean = part.slice(5, -6);
        else if (part.startsWith('<red>')) clean = part.slice(5, -6);
        else if (part.startsWith('<vermelho>')) clean = part.slice(10, -11);
        else if (part.startsWith('::vermelho::')) clean = part.slice(12, -2);

        return (
          <span
            key={key}
            className="font-medium text-rose-900 bg-rose-50/90 px-1.5 py-0.5 rounded-[5px] border border-rose-200/60 mx-0.5 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-rose-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 5. Destaque Roxo / Purple: [roxo]texto[/roxo], [purple]texto[/purple]
      if (
        (part.startsWith('[roxo]') && part.endsWith('[/roxo]')) ||
        (part.startsWith('[purple]') && part.endsWith('[/purple]'))
      ) {
        let clean = part.startsWith('[roxo]') ? part.slice(6, -7) : part.slice(8, -9);
        return (
          <span
            key={key}
            className="font-medium text-purple-900 bg-purple-50/90 px-1.5 py-0.5 rounded-[5px] border border-purple-200/60 mx-0.5 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-purple-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 6. Destaque Laranja / Orange: [laranja]texto[/laranja], [orange]texto[/orange]
      if (
        (part.startsWith('[laranja]') && part.endsWith('[/laranja]')) ||
        (part.startsWith('[orange]') && part.endsWith('[/orange]'))
      ) {
        let clean = part.startsWith('[laranja]') ? part.slice(9, -10) : part.slice(8, -9);
        return (
          <span
            key={key}
            className="font-medium text-amber-900 bg-orange-50/90 px-1.5 py-0.5 rounded-[5px] border border-orange-200/60 mx-0.5 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [&_strong]:font-semibold [&_strong]:text-amber-950"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 7. Código / Monospace Inline: `texto`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        const clean = part.slice(1, -1);
        return (
          <code
            key={key}
            className="font-mono text-[11.5px] bg-slate-100/90 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70 mx-0.5 font-semibold"
          >
            {clean}
          </code>
        );
      }

      // 8. Negrito Elegante e Nítido (Semibold 600): **texto**, <b>texto</b>, <strong>texto</strong>
      if (
        (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('<b>') && part.endsWith('</b>')) ||
        (part.startsWith('<strong>') && part.endsWith('</strong>'))
      ) {
        let clean = part;
        if (part.startsWith('**')) clean = part.slice(2, -2);
        else if (part.startsWith('<b>')) clean = part.slice(3, -4);
        else if (part.startsWith('<strong>')) clean = part.slice(8, -9);

        const leadingSpaces = clean.match(/^\s*/)?.[0] || '';
        const trailingSpaces = clean.match(/\s*$/)?.[0] || '';
        const innerText = clean.trim();

        return (
          <React.Fragment key={key}>
            {leadingSpaces}
            <strong className="font-semibold text-zinc-900 tracking-tight [&_*]:font-semibold">
              {renderInlineFormatted(innerText, depth + 1)}
            </strong>
            {trailingSpaces}
          </React.Fragment>
        );
      }

      // 9. Sublinhado: <u>texto</u> ou __texto__
      if (
        (part.startsWith('<u>') && part.endsWith('</u>')) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
      ) {
        const clean = part.startsWith('<u>') ? part.slice(3, -4) : part.slice(2, -2);
        return (
          <span
            key={key}
            className="underline decoration-slate-400 decoration-[1.5px] underline-offset-3 font-medium text-zinc-900"
          >
            {renderInlineFormatted(clean, depth + 1)}
          </span>
        );
      }

      // 10. Itálico: *texto*, _texto_, <em>texto</em>
      if (
        (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2) ||
        (part.startsWith('<em>') && part.endsWith('</em>'))
      ) {
        let clean = part;
        if (part.startsWith('*')) clean = part.slice(1, -1);
        else if (part.startsWith('_')) clean = part.slice(1, -1);
        else if (part.startsWith('<em>')) clean = part.slice(4, -5);
        return (
          <em key={key} className="italic text-zinc-700 font-normal">
            {renderInlineFormatted(clean, depth + 1)}
          </em>
        );
      }

      // Texto plano
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  // Pré-normalização para quebrar itens enumerados (1., 2., 3.) e marcadores (•, -, *) que venham na mesma linha
  let textoProcessado = text;
  // Quebra "1. " se vier logo após dois-pontos ou ponto:
  textoProcessado = textoProcessado.replace(/([.:;])\s+(1\.\s+)/g, '$1\n$2');
  // Quebra "2. ", "3. ", "4. " etc. no meio do texto quando precedido de pontuação ou parênteses:
  textoProcessado = textoProcessado.replace(/([.!?;\)])\s+(\d+[\.\)]\s+)/g, '$1\n$2');
  // Quebra marcadores de tópico "• " ou "- " ou "* " no meio da linha precedidos de pontuação ou no fluxo:
  textoProcessado = textoProcessado.replace(/([.!?;\)])\s+([•\-\*]\s+)/g, '$1\n$2');
  // Quebra itens iniciados com traço ou asterisco isolado após espaço com letra maiúscula (ex: "...testadas. - Lâmina..."):
  textoProcessado = textoProcessado.replace(/\s+-\s+([A-ZÀ-Ú0-9])/g, '\n- $1');
  textoProcessado = textoProcessado.replace(/\s+•\s+([A-ZÀ-Ú0-9])/g, '\n• $1');

  // Divide o texto por quebras duplas (parágrafos/seções distintas)
  const blocos = textoProcessado.split(/\n\n+/);

  return (
    <div className={`space-y-3 text-left font-sans ${className}`}>
      {blocos.map((bloco, blocoIdx) => {
        const linhas = bloco.split('\n');

        return (
          <div key={`bloco-${blocoIdx}`} className="space-y-2">
            {linhas.map((linha, linhaIdx) => {
              const linhaLimpa = linha.trim();
              if (!linhaLimpa) return null;

              // Linha de Alerta / Perigo / Red Flag (⚠️ ou 🚨)
              if (linhaLimpa.startsWith('⚠️') || linhaLimpa.startsWith('🚨') || /^(atenção|alerta|contraindicação|red flag):/i.test(linhaLimpa)) {
                return (
                  <div
                    key={`alerta-${linhaIdx}`}
                    className="p-3 bg-rose-50/75 rounded-xl border border-rose-200/70 text-rose-900 text-[13.5px] sm:text-[14.5px] leading-[1.62] flex items-start gap-2.5 [&_strong]:font-semibold [&_strong]:text-rose-950"
                  >
                    <span className="text-sm leading-none shrink-0 select-none mt-1">⚠️</span>
                    <div className="flex-1 font-normal">
                      {renderInlineFormatted(linhaLimpa.replace(/^[⚠️🚨]\s*/, ''))}
                    </div>
                  </div>
                );
              }

              // Linha de Ponto de Ouro / Regra Essencial (⭐ ou ★ ou 📌)
              if (linhaLimpa.startsWith('⭐') || linhaLimpa.startsWith('★') || linhaLimpa.startsWith('📌') || /^(ponto de ouro|regra de ouro|essencial):/i.test(linhaLimpa)) {
                return (
                  <div
                    key={`ouro-${linhaIdx}`}
                    className="p-3 bg-amber-50/75 rounded-xl border border-amber-200/70 text-amber-900 text-[13.5px] sm:text-[14.5px] leading-[1.62] flex items-start gap-2.5 [&_strong]:font-semibold [&_strong]:text-amber-950"
                  >
                    <span className="text-sm leading-none shrink-0 select-none mt-1">⭐</span>
                    <div className="flex-1 font-normal">
                      {renderInlineFormatted(linhaLimpa.replace(/^[⭐★📌]\s*/, ''))}
                    </div>
                  </div>
                );
              }

              // Linha de Dica Rápida / Mnemônico (💡)
              if (linhaLimpa.startsWith('💡') || /^(dica|mnemônico):/i.test(linhaLimpa)) {
                return (
                  <div
                    key={`dica-${linhaIdx}`}
                    className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/60 text-indigo-900 text-[13.5px] sm:text-[14.5px] leading-[1.62] flex items-start gap-2.5 [&_strong]:font-semibold [&_strong]:text-indigo-950"
                  >
                    <span className="text-sm leading-none shrink-0 select-none mt-1">💡</span>
                    <div className="flex-1 font-normal">
                      {renderInlineFormatted(linhaLimpa.replace(/^[💡]\s*/, ''))}
                    </div>
                  </div>
                );
              }

              // Linha com seta de conduta (➔ ou ->)
              if (linhaLimpa.startsWith('➔') || linhaLimpa.startsWith('->') || linhaLimpa.startsWith('—>')) {
                return (
                  <div
                    key={`conduta-${linhaIdx}`}
                    className="flex items-start gap-2 pl-1 text-[13.5px] sm:text-[14.5px] font-normal text-zinc-700 leading-[1.65]"
                  >
                    <span className="text-slate-400 font-semibold text-sm shrink-0 leading-normal mt-0.5">➔</span>
                    <div className="flex-1">
                      {renderInlineFormatted(linhaLimpa.replace(/^(➔|->|—>)\s*/, ''))}
                    </div>
                  </div>
                );
              }

              // Linha com marcador de tópico (•, -, *, 1., 2., etc.)
              const matchMarcador = linhaLimpa.match(/^([•\-\*]|\d+[\.\)])\s+(.*)$/);
              if (matchMarcador) {
                const marcador = matchMarcador[1];
                const conteudo = matchMarcador[2];

                return (
                  <div
                    key={`topico-${linhaIdx}`}
                    className="flex items-start gap-2 pl-1 text-[13.5px] sm:text-[14.5px] text-zinc-700 font-normal leading-[1.65]"
                  >
                    <span className="text-slate-400 font-semibold text-xs sm:text-sm shrink-0 select-none leading-normal mt-1">
                      {marcador === '-' || marcador === '*' ? '•' : marcador}
                    </span>
                    <div className="flex-1 text-zinc-700">
                      {renderInlineFormatted(conteudo)}
                    </div>
                  </div>
                );
              }

              // Subtítulo destacado (ex: "Critérios Diagnósticos:", "### Título" ou "**ANTIBIOTICOTERAPIA IMEDIATA:**")
              const semAsteriscosHeader = linhaLimpa.replace(/^\*\*([\s\S]+?)\*\*$/, '$1').trim();
              const isSubtitulo =
                linhaLimpa.startsWith('###') ||
                (semAsteriscosHeader.endsWith(':') && semAsteriscosHeader.length < 80 && !semAsteriscosHeader.slice(0, -1).includes('.'));

              if (isSubtitulo) {
                const cleanHeader = semAsteriscosHeader.replace(/^###\s*/, '');
                return (
                  <h4
                    key={`hdr-${linhaIdx}`}
                    className="text-[11.5px] sm:text-xs font-bold text-zinc-800 tracking-wider uppercase mt-3 mb-1 pb-1 border-b border-zinc-200/70"
                  >
                    {cleanHeader}
                  </h4>
                );
              }

              // Parágrafo regular de texto clínico com contraste equilibrado e leitura confortável
              return (
                <p
                  key={`p-${linhaIdx}`}
                  className="clinical-prose text-[13.5px] sm:text-[14.5px] text-zinc-700 font-normal leading-[1.66] [text-align-last:left]"
                >
                  {renderInlineFormatted(linhaLimpa)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});


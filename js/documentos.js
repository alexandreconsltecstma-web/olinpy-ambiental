/* Olinpy – documentos automáticos (modelos preenchidos com os dados da empresa, em Word .docx ou PDF, um a um ou em lote)
   e painel de conversão (Word → PDF, PDF → Word, juntar PDFs, fotos → PDF). Tudo roda no navegador: nenhum arquivo
   sai do computador. Bibliotecas abertas carregadas só quando a tela abre. */
"use strict";

const LIBS = {
  jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdflib: "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
  html2pdf: "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
};
const libCarregada = {};
function carregarLib(nome) {
  if (!libCarregada[nome]) libCarregada[nome] = new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = LIBS[nome]; s.onload = ok; s.onerror = () => erro(new Error(`não carregou ${nome}`)); document.head.appendChild(s);
  });
  return libCarregada[nome];
}

/* ── texto simples (markdown curto) → blocos → .docx ou HTML ───────── */
// # título  |  ## subtítulo  |  **negrito**  |  - lista  |  | tabela | com | barras |  |  >> texto à direita  |  ^^ texto centralizado
function blocos(texto) {
  const out = [];
  let tabela = null;
  for (const l of String(texto).split("\n")) {
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const c = l.trim().slice(1, -1).split("|").map((x) => x.trim());
      if (c.every((x) => /^:?-{2,}:?$/.test(x))) continue;
      if (!tabela) { tabela = { t: "tab", linhas: [] }; out.push(tabela); }
      tabela.linhas.push(c); continue;
    }
    tabela = null;
    const m = l.match(/^(#{1,2})\s+(.*)/);
    if (m) out.push({ t: m[1].length === 1 ? "h1" : "h2", texto: m[2] });
    else if (/^\s*[-•]\s+/.test(l)) out.push({ t: "li", texto: l.replace(/^\s*[-•]\s+/, "") });
    else if (/^>>\s?/.test(l)) out.push({ t: "p", texto: l.replace(/^>>\s?/, ""), alinhar: "right" });
    else if (/^\^\^\s?/.test(l)) out.push({ t: "p", texto: l.replace(/^\^\^\s?/, ""), alinhar: "center" });
    else if (!l.trim()) out.push({ t: "vazio" });
    else out.push({ t: "p", texto: l, alinhar: "both" });
  }
  return out;
}
const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function runs(texto, base = {}) {
  return String(texto).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((parte) => {
    const neg = /^\*\*.*\*\*$/.test(parte) || base.negrito, t = parte.replace(/^\*\*|\*\*$/g, "");
    return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${neg ? "<w:b/>" : ""}<w:sz w:val="${base.tam || 22}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
  }).join("");
}
const par = (texto, o = {}) => `<w:p><w:pPr>${o.alinhar ? `<w:jc w:val="${o.alinhar}"/>` : ""}<w:spacing w:after="${o.depois ?? 120}" w:line="300" w:lineRule="auto"/>${o.recuo ? `<w:ind w:left="360" w:hanging="240"/>` : ""}</w:pPr>${runs(texto, o)}</w:p>`;
async function gerarDocx(texto, cab = "") {
  await carregarLib("jszip");
  const corpo = (cab ? par(cab, { alinhar: "center", tam: 18, depois: 240 }) : "") + blocos(texto).map((b) => {
    if (b.t === "h1") return par(b.texto, { alinhar: "center", negrito: true, tam: 28, depois: 240 });
    if (b.t === "h2") return par(b.texto, { negrito: true, tam: 24, depois: 120 });
    if (b.t === "li") return par(`• ${b.texto}`, { recuo: true, alinhar: "both" });
    if (b.t === "vazio") return par("", { depois: 60 });
    if (b.t === "tab") {
      const cel = (t, cabecalho) => `<w:tc><w:tcPr>${cabecalho ? '<w:shd w:val="clear" w:color="auto" w:fill="E6EFE9"/>' : ""}</w:tcPr>${par(t, { negrito: cabecalho, tam: 20, depois: 0 })}</w:tc>`;
      const borda = ["top", "left", "bottom", "right", "insideH", "insideV"].map((x) => `<w:${x} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join("");
      return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${borda}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>
        ${b.linhas.map((l, i) => `<w:tr>${l.map((c) => cel(c, i === 0)).join("")}</w:tr>`).join("")}</w:tbl>${par("", { depois: 60 })}`;
    }
    return par(b.texto, { alinhar: b.alinhar });
  }).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
function docHTML(texto, cab = "") {
  const inl = (s) => h(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  return (cab ? `<p class="cabdoc">${inl(cab)}</p>` : "") + blocos(texto).map((b) => b.t === "h1" ? `<h1>${inl(b.texto)}</h1>` : b.t === "h2" ? `<h2>${inl(b.texto)}</h2>`
    : b.t === "li" ? `<p class="li">• ${inl(b.texto)}</p>` : b.t === "vazio" ? `<p class="vz">&nbsp;</p>`
    : b.t === "tab" ? `<table>${b.linhas.map((l, i) => `<tr>${l.map((c) => i ? `<td>${inl(c)}</td>` : `<th>${inl(c)}</th>`).join("")}</tr>`).join("")}</table>`
    : `<p style="text-align:${b.alinhar === "both" ? "justify" : b.alinhar || "left"}">${inl(b.texto)}</p>`).join("");
}
const CSS_DOC = `.folha{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#111;padding:28mm 20mm 20mm 30mm;background:#fff}
  .folha h1{font-size:14pt;text-align:center;margin:0 0 14px}.folha h2{font-size:12pt;margin:14px 0 6px}.folha p{margin:0 0 8px}.folha .vz{margin:0;line-height:.8}
  .folha .li{padding-left:14px}.folha .cabdoc{text-align:center;font-size:9pt;color:#555;border-bottom:1px solid #999;padding-bottom:6px;margin-bottom:16px}
  .folha table{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:10pt}.folha td,.folha th{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}.folha th{background:#e6efe9}`;
async function gerarPDF(html, nome) {
  await carregarLib("html2pdf");
  const el = document.createElement("div"); el.className = "folha"; el.innerHTML = `<style>${CSS_DOC}</style>${html}`;
  el.style.width = "210mm";
  return html2pdf().set({ margin: 0, filename: nome, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" }, pagebreak: { mode: ["css", "legacy"] } }).from(el).outputPdf("blob");
}

/* ── PDF com texto de verdade (pdf-lib, Helvetica): selecionável, leve e convertível de volta para Word ── */
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const limpa = (t) => [...String(t)].map((ch) => (ch.charCodeAt(0) < 256 && ch.charCodeAt(0) !== 0x7f ? ch : WINANSI_EXTRA.includes(ch) ? ch : ch === "⇄" ? "<->" : "-")).join("");
async function gerarPDFTexto(texto, cab = "") {
  await carregarLib("pdflib");
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  const F = { n: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold) };
  const W = 595.28, H = 841.89, ML = 85, MR = 57, MT = 71, MB = 57, LARG = W - ML - MR;
  let pg = doc.addPage([W, H]), y = H - MT;
  const nova = () => { pg = doc.addPage([W, H]); y = H - MT; };
  const garante = (alt) => { if (y - alt < MB) nova(); };
  const tokens = (t, negrito) => limpa(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean).flatMap((parte) => {
    const b = negrito || /^\*\*.*\*\*$/.test(parte); return parte.replace(/^\*\*|\*\*$/g, "").split(/(\s+)/).filter((x) => x !== "").map((w) => ({ w, b })); });
  const quebra = (toks, larg, tam) => { const linhas = [[]]; let x = 0;
    for (const tk of toks) { const wd = F[tk.b ? "b" : "n"].widthOfTextAtSize(tk.w, tam);
      if (/^\s+$/.test(tk.w)) { if (linhas[linhas.length - 1].length) { linhas[linhas.length - 1].push(tk); x += wd; } continue; }
      if (x + wd > larg && linhas[linhas.length - 1].length) { const l = linhas[linhas.length - 1]; while (l.length && /^\s+$/.test(l[l.length - 1].w)) l.pop(); linhas.push([]); x = 0; }
      linhas[linhas.length - 1].push(tk); x += wd; }
    return linhas.map((l) => { while (l.length && /^\s+$/.test(l[l.length - 1].w)) l.pop(); return l; }); };
  const larguraLinha = (l, tam) => l.reduce((s, tk) => s + F[tk.b ? "b" : "n"].widthOfTextAtSize(tk.w, tam), 0);
  const escreve = (texto, o = {}) => {
    const tam = o.tam || 11, alt = tam * 1.42, x0 = ML + (o.recuo || 0), larg = LARG - (o.recuo || 0);
    for (const l of quebra(tokens(texto, o.negrito), larg, tam)) {
      garante(alt); const lw = larguraLinha(l, tam);
      let x = o.alinhar === "center" ? ML + (LARG - lw) / 2 : o.alinhar === "right" ? ML + LARG - lw : x0;
      for (const tk of l) { const f = F[tk.b ? "b" : "n"]; pg.drawText(tk.w, { x, y: y - tam, size: tam, font: f, color: rgb(0.07, 0.07, 0.07) }); x += f.widthOfTextAtSize(tk.w, tam); }
      y -= alt;
    }
    y -= o.depois ?? 5;
  };
  if (cab) { escreve(cab, { alinhar: "center", tam: 8.5, depois: 2 }); pg.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) }); y -= 16; }
  for (const b of blocos(texto)) {
    if (b.t === "h1") escreve(b.texto, { alinhar: "center", negrito: true, tam: 14, depois: 10 });
    else if (b.t === "h2") { y -= 4; escreve(b.texto, { negrito: true, tam: 12, depois: 4 }); }
    else if (b.t === "li") { escreve(`•  ${b.texto}`, { recuo: 12 }); }
    else if (b.t === "vazio") y -= 7;
    else if (b.t === "tab") {
      const nc = Math.max(...b.linhas.map((l) => l.length)), tam = 9.5;
      const pesos = Array.from({ length: nc }, (_, c) => Math.max(4, Math.min(40, Math.max(...b.linhas.map((l) => limpa(l[c] || "").length)))));
      const soma = pesos.reduce((a, v) => a + v, 0), larg = pesos.map((p) => (p / soma) * LARG);
      b.linhas.forEach((l, i) => {
        const cel = larg.map((w, c) => quebra(tokens(l[c] || "", i === 0), w - 8, tam));
        const alt = Math.max(1, ...cel.map((x) => x.length)) * tam * 1.3 + 7;
        garante(alt);
        let x = ML;
        cel.forEach((linhas, c) => {
          pg.drawRectangle({ x, y: y - alt, width: larg[c], height: alt, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.6, color: i === 0 ? rgb(0.9, 0.94, 0.91) : undefined });
          linhas.forEach((ln, k) => { let xx = x + 4; for (const tk of ln) { const f = F[tk.b ? "b" : "n"]; pg.drawText(tk.w, { x: xx, y: y - 4 - tam - k * tam * 1.3, size: tam, font: f }); xx += f.widthOfTextAtSize(tk.w, tam); } });
          x += larg[c];
        });
        y -= alt;
      });
      y -= 8;
    } else escreve(b.texto, { alinhar: b.alinhar === "both" ? "left" : b.alinhar });
  }
  return new Blob([await doc.save()], { type: "application/pdf" });
}
// HTML do Word (mammoth) → texto marcado, para gerar o PDF com texto
function htmlParaMarcado(html) {
  const d = document.createElement("div"); d.innerHTML = html;
  const inl = (el) => [...el.childNodes].map((n) => n.nodeType === 3 ? n.textContent : /^(STRONG|B)$/.test(n.nodeName) ? `**${n.textContent.trim()}**` : inl(n)).join("").replace(/\s+/g, " ").trim();
  const out = [];
  for (const el of d.children) {
    if (/^H1$/.test(el.nodeName)) out.push(`# ${inl(el)}`);
    else if (/^H[2-6]$/.test(el.nodeName)) out.push(`## ${inl(el)}`);
    else if (/^(UL|OL)$/.test(el.nodeName)) [...el.querySelectorAll("li")].forEach((li) => out.push(`- ${inl(li)}`));
    else if (el.nodeName === "TABLE") [...el.querySelectorAll("tr")].forEach((tr) => out.push(`| ${[...tr.children].map((td) => inl(td).replace(/\|/g, "/")).join(" | ")} |`));
    else { const t = inl(el); out.push(t ? t.replace(/^([#>|^-])/, " $1") : ""); }
  }
  return out.join("\n");
}

/* ── modelos ───────────────────────────────────────────────────────── */
const CAMPOS_EMPRESA = "{{empresa}}, {{cnpj}}, {{endereco}}, {{municipio}}, {{uf}}, {{representante}}, {{escritorio}}, {{rt}}, {{registro}}, {{cidade}}, {{data_extenso}}";
const MODELOS = [
  { id: "req", area: "ma", nome: "Requerimento de licença ambiental", campos: [["orgao", "Órgão ambiental", "Secretaria Municipal de Meio Ambiente"], ["tipo", "Tipo de licença", "Licença de Operação (LO)"], ["atividade", "Atividade"], ["processo", "Nº do processo (se houver)", ""]],
    texto: `# REQUERIMENTO
Ao(À) {{orgao}}

**{{empresa}}**, inscrita no CNPJ sob o nº {{cnpj}}, com endereço em {{endereco}}, {{municipio}}/{{uf}}, neste ato representada por {{representante}}, vem requerer a concessão de **{{tipo}}** para a atividade de **{{atividade}}**{{processo_txt}}, apresentando em anexo a documentação exigida.

Nestes termos, pede deferimento.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{empresa}}
^^CNPJ {{cnpj}}` },
  { id: "oficio", area: "ma", nome: "Ofício de entrega de condicionante", campos: [["numero", "Nº do ofício", "001/2026"], ["orgao", "Órgão ambiental", "Secretaria Municipal de Meio Ambiente"], ["licenca", "Licença (tipo e nº)", "LO nº ___/____"], ["condicionante", "Condicionante (nº e texto)"], ["anexo", "Documento entregue em anexo"]],
    texto: `>>Ofício nº {{numero}}
>>{{cidade}}, {{data_extenso}}.

Ao(À) {{orgao}}

**Assunto:** cumprimento de condicionante – {{licenca}}

Prezados(as),

A empresa **{{empresa}}**, CNPJ {{cnpj}}, por intermédio de sua consultoria ambiental, vem apresentar o cumprimento da condicionante **{{condicionante}}** da {{licenca}}, encaminhando em anexo: {{anexo}}.

Colocamo-nos à disposição para quaisquer esclarecimentos.

Atenciosamente,


^^_______________________________________
^^{{rt}}
^^{{registro}}
^^{{escritorio}}` },
  { id: "rcc", area: "ma", nome: "Relatório de cumprimento de condicionantes", campos: [["orgao", "Órgão ambiental", "Secretaria Municipal de Meio Ambiente"], ["licenca", "Licença (tipo e nº)", "LO nº ___/____"], ["periodo", "Período de referência", "____ a ____"],
    ["linhas", "Condicionantes (uma por linha: nº ; descrição ; situação ; evidência)", "1 ; Apresentar PGRS ; Cumprida ; Protocolo nº ___\n2 ; Relatório fotográfico ; Em andamento ; Previsto para __/__", "area"]],
    texto: `# RELATÓRIO DE CUMPRIMENTO DE CONDICIONANTES
**Empreendimento:** {{empresa}} – CNPJ {{cnpj}}
**Endereço:** {{endereco}}, {{municipio}}/{{uf}}
**Licença:** {{licenca}} – **Órgão:** {{orgao}}
**Período:** {{periodo}}

## Situação das condicionantes
| Nº | Condicionante | Situação | Evidência |
{{linhas_tabela}}

## Responsável técnico
{{rt}} – {{registro}}

>>{{cidade}}, {{data_extenso}}.` },
  { id: "procuracao", area: "reg", nome: "Procuração (órgãos ambientais e de fiscalização)", campos: [["outorgado", "Outorgado (quem recebe os poderes)"], ["doc_outorgado", "CPF/registro do outorgado"], ["poderes", "Poderes", "representar a outorgante perante órgãos ambientais, de vigilância sanitária, Corpo de Bombeiros e prefeituras, podendo requerer licenças, protocolar e retirar documentos, prestar informações, assinar requerimentos e acompanhar processos administrativos", "area"]],
    texto: `# PROCURAÇÃO
**OUTORGANTE:** {{empresa}}, inscrita no CNPJ nº {{cnpj}}, com sede em {{endereco}}, {{municipio}}/{{uf}}, neste ato representada por {{representante}}.

**OUTORGADO(A):** {{outorgado}}, {{doc_outorgado}}.

**PODERES:** {{poderes}}.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{empresa}}
^^{{representante}}` },
  { id: "declaracao", area: "reg", nome: "Declaração (texto livre)", campos: [["titulo", "Título", "DECLARAÇÃO"], ["texto", "O que se declara", "que exerce suas atividades em conformidade com a legislação ambiental vigente", "area"]],
    texto: `# {{titulo}}
**{{empresa}}**, inscrita no CNPJ sob o nº {{cnpj}}, com endereço em {{endereco}}, {{municipio}}/{{uf}}, por seu representante legal {{representante}}, **DECLARA**, para os devidos fins, {{texto}}.

Por ser expressão da verdade, firma a presente declaração.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{empresa}}` },
  { id: "termo", area: "ma", nome: "Termo de ciência e responsabilidade", campos: [["licenca", "Licença ou processo", "LO nº ___/____"]],
    texto: `# TERMO DE CIÊNCIA E RESPONSABILIDADE
A empresa **{{empresa}}**, CNPJ {{cnpj}}, representada por {{representante}}, declara estar ciente das condicionantes, prazos e obrigações estabelecidos na **{{licenca}}**, comprometendo-se a cumpri-los integralmente e a comunicar ao órgão competente qualquer alteração em suas atividades.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{empresa}}` },
  { id: "os_nr01", area: "sst", nome: "Ordem de serviço de segurança (NR-01)", campos: [["trabalhador", "Trabalhador"], ["funcao", "Função"], ["setor", "Setor"], ["riscos", "Riscos da função (um por linha)", "", "area"], ["medidas", "Medidas de prevenção (uma por linha)", "", "area"], ["epis", "EPIs obrigatórios", "", "area"]],
    texto: `# ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO
**Empresa:** {{empresa}} – CNPJ {{cnpj}}
**Trabalhador:** {{trabalhador}}  **Função:** {{funcao}}  **Setor:** {{setor}}

## Riscos ocupacionais
{{riscos_lista}}
## Medidas de prevenção
{{medidas_lista}}
## Equipamentos de proteção individual
{{epis_lista}}
## Obrigações do trabalhador
- Cumprir as normas de segurança e esta ordem de serviço.
- Usar os EPIs fornecidos, conservá-los e comunicar danos.
- Comunicar ao responsável qualquer situação de risco ou acidente.

Declaro ter recebido e compreendido esta ordem de serviço.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________          _______________________________
^^{{trabalhador}}                                        {{empresa}}` },
  { id: "ficha_epi", area: "sst", nome: "Ficha de entrega de EPI (NR-06)", campos: [["trabalhador", "Trabalhador"], ["funcao", "Função"], ["itens", "EPIs (um por linha: EPI ; nº do CA ; quantidade)", "Protetor auricular ; ______ ; 1\nLuva de proteção ; ______ ; 1", "area"]],
    texto: `# FICHA DE CONTROLE DE ENTREGA DE EPI
**Empresa:** {{empresa}} – CNPJ {{cnpj}}
**Trabalhador:** {{trabalhador}} – **Função:** {{funcao}}

| Data | EPI | Nº do CA | Qtd. | Assinatura do trabalhador |
{{itens_tabela_epi}}

Declaro ter recebido gratuitamente os EPIs acima, ter sido orientado(a) sobre o uso correto, guarda e conservação, e estar ciente de que devo usá-los durante a jornada (NR-06).

>>{{cidade}}, {{data_extenso}}.` },
  { id: "presenca", area: "sst", nome: "Lista de presença de treinamento", campos: [["treinamento", "Treinamento", "Uso correto de EPI (NR-06)"], ["carga", "Carga horária", "2 h"], ["instrutor", "Instrutor"], ["linhas_n", "Quantidade de linhas", "15"]],
    texto: `# LISTA DE PRESENÇA – TREINAMENTO
**Empresa:** {{empresa}} – CNPJ {{cnpj}}
**Treinamento:** {{treinamento}}  **Carga horária:** {{carga}}  **Data:** {{data_curta}}
**Instrutor:** {{instrutor}}

| Nº | Nome do participante | Função | Assinatura |
{{linhas_presenca}}

^^_______________________________________
^^{{instrutor}} – Instrutor(a)` },
  { id: "nc", area: "sg", nome: "Notificação de não conformidade", campos: [["itens", "Não conformidades (uma por linha)", "", "area"], ["prazo", "Prazo para correção", "15 dias"]],
    texto: `# NOTIFICAÇÃO DE NÃO CONFORMIDADE
**Empresa:** {{empresa}} – CNPJ {{cnpj}}
**Data da verificação:** {{data_curta}}

Durante vistoria técnica foram identificadas as seguintes não conformidades:
{{itens_lista}}
Solicitamos a correção no prazo de **{{prazo}}**, com envio de evidências (fotos ou documentos) à consultoria.

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{rt}} – {{escritorio}}` },
  { id: "recibo", area: "reg", nome: "Recibo de entrega de documentos", campos: [["docs", "Documentos recebidos (um por linha)", "", "area"], ["recebedor", "Quem recebeu", ""]],
    texto: `# RECIBO DE ENTREGA DE DOCUMENTOS
Recebemos de **{{empresa}}**, CNPJ {{cnpj}}, os seguintes documentos:
{{docs_lista}}

>>{{cidade}}, {{data_extenso}}.


^^_______________________________________
^^{{recebedor}}
^^{{escritorio}}` },
];

function valoresBase(e) {
  const C = Olinpy.dados.config, hoje = new Date();
  return { empresa: e?.nome || "[EMPRESA]", cnpj: e?.cnpj ? fmtCNPJ(e.cnpj) : "[CNPJ]", endereco: e?.endereco || "[ENDEREÇO]", municipio: e?.municipio || "[MUNICÍPIO]", uf: e?.uf || "[UF]",
    representante: e?.contato || "[REPRESENTANTE LEGAL]", escritorio: C.escritorio || "", rt: C.rt || "[RESPONSÁVEL TÉCNICO]", registro: C.registro || "[REGISTRO PROFISSIONAL]",
    cidade: (C.cidade || "").split("/")[0] || "[CIDADE]", data_extenso: hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }), data_curta: hoje.toLocaleDateString("pt-BR") };
}
function preencher(modelo, e, v) {
  const padroes = Object.fromEntries((modelo.campos || []).filter((c) => c[2]).map((c) => [c[0], c[2]]));
  const val = { ...valoresBase(e), ...padroes, ...v };
  const linhas = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const lista = (t) => linhas(t).map((x) => `- ${x}`).join("\n") || "- [preencher]";
  val.processo_txt = val.processo ? `, referente ao processo nº ${val.processo}` : "";
  for (const [k] of modelo.campos || []) val[`${k}_lista`] = lista(val[k]);
  if (val.linhas !== undefined) val.linhas_tabela = linhas(val.linhas).map((l) => `| ${l.split(";").map((x) => x.trim()).concat(["", "", "", ""]).slice(0, 4).join(" | ")} |`).join("\n");
  if (val.itens !== undefined) val.itens_tabela_epi = linhas(val.itens).map((l) => { const c = l.split(";").map((x) => x.trim()); return `| ${val.data_curta} | ${c[0] || ""} | ${c[1] || ""} | ${c[2] || ""} |  |`; }).join("\n");
  val.linhas_presenca = Array.from({ length: Math.min(60, Number(val.linhas_n) || 15) }, (_, i) => `| ${i + 1} |  |  |  |`).join("\n");
  return modelo.texto.replace(/\{\{(\w+)\}\}/g, (m, k) => (val[k] !== undefined && val[k] !== "" ? val[k] : `[${k.replace(/_/g, " ").toUpperCase()}]`));
}
const nomeArq = (m, e, ext) => `${m.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").slice(0, 40)}_${(e ? curto(e.nome) : "modelo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_")}.${ext}`;

/* ── telas ─────────────────────────────────────────────────────────── */
Object.assign(OlinpyTelas, {
  documentos(c) {
    const D0 = Olinpy.dados; D0.modelos ||= [];
    const todos = () => [...MODELOS, ...D0.modelos.map((m) => ({ ...m, proprio: true }))];
    let atual = todos()[0], emp = "", vals = {};
    const desenhar = () => {
      const e = Olinpy.empresa(emp);
      c.innerHTML = `<div class="largura"><div class="grade">
        <div class="card c3"><div class="card-cab"><h3>Modelos</h3></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:6px">
          ${todos().map((m, i) => `<button class="atalho" data-m="${i}" style="${m === atual || m.id === atual.id ? "border-color:var(--verde-2);background:var(--verde-claro)" : ""}"><div><b>${h(m.nome)}</b><span>${h(AREAS[m.area]?.curto || "Meus modelos")}${m.proprio ? " · meu modelo" : ""}</span></div></button>`).join("")}
          ${Olinpy.pode("editar") ? `<button class="btn claro peq" id="bNovoModelo" style="margin-top:6px">${ico("mais")} Criar meu modelo</button>` : ""}</div></div>
        <div class="card c4"><div class="card-cab"><h3>Preencher</h3></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:10px">
          <label>Empresa (preenche sozinho)<select id="dEmp">${Olinpy.opcoesEmpresas(emp, "— escolher —")}</select></label>
          ${(atual.campos || []).map(([k, rot, pad, tipo]) => `<label>${h(rot)}${tipo === "area" ? `<textarea data-v="${k}" rows="4">${h(vals[k] ?? pad ?? "")}</textarea>` : `<input data-v="${k}" value="${h(vals[k] ?? pad ?? "")}">`}</label>`).join("")}
          <p class="mut" style="margin:0">Dados da empresa e do escritório entram automaticamente. O que faltar aparece [ENTRE COLCHETES].</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bDocx">Baixar Word (.docx)</button><button class="btn claro" id="bPdf">Baixar PDF</button></div>
          <details><summary class="mut" style="cursor:pointer">Gerar em lote (várias empresas)</summary><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:220px;overflow:auto">
            ${Olinpy.empresas().map((x) => `<label class="check"><input type="checkbox" data-lote="${h(x.id)}"> ${h(curto(x.nome))}</label>`).join("") || `<span class="mut">Cadastre empresas primeiro.</span>`}</div>
            <div style="display:flex;gap:8px;margin-top:8px"><button class="btn claro peq" id="bLoteDocx">ZIP com Word</button><button class="btn claro peq" id="bLotePdf">ZIP com PDF</button></div></details>
          ${atual.proprio ? `<button class="btn perigo peq" id="bDelModelo">Excluir este modelo</button>` : ""}</div></div>
        <div class="card c5"><div class="card-cab"><h3>Pré-visualização</h3><span class="mut">minuta: revise antes de assinar</span></div>
          <div class="card-corpo"><div id="prev" style="border:1px solid var(--borda);border-radius:8px;max-height:640px;overflow:auto;background:#fff"></div></div></div>
      </div></div>`;
      const prev = () => { $("#prev").innerHTML = `<style>${CSS_DOC}.folha{padding:24px 26px}</style><div class="folha">${docHTML(preencher(atual, Olinpy.empresa(emp), vals), cabecalho())}</div>`; };
      $$("[data-m]").forEach((b) => b.addEventListener("click", () => { atual = todos()[+b.dataset.m]; vals = {}; desenhar(); }));
      $("#dEmp").addEventListener("change", (ev) => { emp = ev.target.value; prev(); });
      $$("[data-v]").forEach((i) => i.addEventListener("input", () => { vals[i.dataset.v] = i.value; prev(); }));
      $("#bDocx").addEventListener("click", async () => { const e = Olinpy.empresa(emp); Olinpy.baixar(nomeArq(atual, e, "docx"), await gerarDocx(preencher(atual, e, vals), cabecalho())); Olinpy.registrar(`Documento gerado (Word): ${atual.nome}`, emp); });
      $("#bPdf").addEventListener("click", async () => { const e = Olinpy.empresa(emp); Olinpy.toast("Gerando PDF…");
        Olinpy.baixar(nomeArq(atual, e, "pdf"), await gerarPDFTexto(preencher(atual, e, vals), cabecalho())); Olinpy.registrar(`Documento gerado (PDF): ${atual.nome}`, emp); });
      const lote = async (tipo) => { const ids = $$("[data-lote]:checked").map((x) => x.dataset.lote); if (!ids.length) { Olinpy.toast("Marque as empresas."); return; }
        await carregarLib("jszip"); const zip = new JSZip(); Olinpy.toast(`Gerando ${ids.length} documento(s)…`);
        for (const id of ids) { const e = Olinpy.empresa(id), t = preencher(atual, e, vals);
          zip.file(nomeArq(atual, e, tipo), tipo === "docx" ? await gerarDocx(t, cabecalho()) : await gerarPDFTexto(t, cabecalho())); }
        Olinpy.baixar(`${atual.id}_lote_${HOJE_ISO}.zip`, await zip.generateAsync({ type: "blob" })); Olinpy.registrar(`Lote de ${ids.length} documento(s): ${atual.nome}`); };
      $("#bLoteDocx").addEventListener("click", () => lote("docx")); $("#bLotePdf").addEventListener("click", () => lote("pdf"));
      $("#bDelModelo")?.addEventListener("click", () => { if (!confirm("Excluir este modelo?")) return; D0.modelos = D0.modelos.filter((m) => m.id !== atual.id); Olinpy.salvar(); atual = todos()[0]; desenhar(); });
      $("#bNovoModelo")?.addEventListener("click", () => {
        Olinpy.dialogo("Criar meu modelo", `<form id="fMod" style="display:flex;flex-direction:column;gap:10px">
          <label>Nome do modelo<input id="mNome" required></label><label>Área<select id="mArea">${Olinpy.opcoesAreas("ma")}</select></label>
          <label>Texto do modelo<textarea id="mTexto" rows="12" required placeholder="# TÍTULO&#10;A empresa **{{empresa}}**, CNPJ {{cnpj}}, … {{meu_campo}} …&#10;>>{{cidade}}, {{data_extenso}}."></textarea></label>
          <p class="mut" style="margin:0">Campos automáticos: ${h(CAMPOS_EMPRESA)}. Qualquer outro {{nome_do_campo}} vira um campo para preencher. Use # para título, **negrito**, - lista, | tabela |, >> à direita e ^^ centralizado.</p>
          <div class="rodape-form"><button class="btn">Salvar modelo</button></div></form>`);
        $("#fMod").addEventListener("submit", (ev) => { ev.preventDefault(); const texto = $("#mTexto").value;
          const auto = new Set(CAMPOS_EMPRESA.match(/\w+/g).concat(["data_curta"]));
          const campos = [...new Set([...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].filter((k) => !auto.has(k)).map((k) => [k, k.replace(/_/g, " "), "", "area"]);
          const m = { id: uid(), nome: $("#mNome").value.trim(), area: $("#mArea").value, campos, texto };
          D0.modelos.push(m); Olinpy.salvar(); Olinpy.registrar(`Modelo criado: ${m.nome}`); $("#dlg").close(); atual = { ...m, proprio: true }; desenhar(); });
      });
      prev();
    };
    const cabecalho = () => { const C = Olinpy.dados.config; return [C.escritorio, C.cidade, C.whatsapp && `WhatsApp ${C.whatsapp}`].filter(Boolean).join(" · "); };
    desenhar();
  },

  conversor(c) {
    c.innerHTML = `<div class="largura">
      <div class="aviso verde" style="margin-bottom:16px">${ico("info")}<div>As conversões rodam <b>no seu navegador</b>: os arquivos não são enviados para nenhum servidor.</div></div>
      <div class="grade">
        <div class="card c6"><div class="card-cab"><h3>Word → PDF</h3></div><div class="card-corpo">
          <label class="btn claro" style="width:fit-content">Escolher .docx<input type="file" id="cvDocx" accept=".docx" hidden></label>
          <p class="mut">Mantém textos, títulos, listas, tabelas e imagens. Fontes e espaçamentos podem mudar um pouco.</p><p class="mut" id="cvDocxMsg"></p></div></div>
        <div class="card c6"><div class="card-cab"><h3>PDF → Word</h3></div><div class="card-corpo">
          <label class="btn claro" style="width:fit-content">Escolher .pdf<input type="file" id="cvPdf" accept="application/pdf" hidden></label>
          <p class="mut">Extrai o texto de cada página para um .docx editável. O desenho da página e as imagens não vêm junto. PDF escaneado (foto do papel) não tem texto para extrair.</p><p class="mut" id="cvPdfMsg"></p></div></div>
        <div class="card c6"><div class="card-cab"><h3>Juntar PDFs</h3></div><div class="card-corpo">
          <label class="btn claro" style="width:fit-content">Escolher vários .pdf<input type="file" id="cvJuntar" accept="application/pdf" multiple hidden></label>
          <p class="mut">Junta na ordem escolhida (bom para montar o arquivo único do protocolo).</p><ol id="cvLista" class="mut"></ol>
          <button class="btn" id="cvJuntarOk" disabled>Juntar e baixar</button><p class="mut" id="cvJuntarMsg"></p></div></div>
        <div class="card c6"><div class="card-cab"><h3>Fotos → PDF</h3></div><div class="card-corpo">
          <label class="btn claro" style="width:fit-content">Escolher fotos<input type="file" id="cvFotos" accept="image/*" multiple hidden></label>
          <p class="mut">Uma foto por página A4, na ordem escolhida (documentos fotografados, comprovantes).</p><p class="mut" id="cvFotosMsg"></p></div></div>
      </div></div>`;
    const base = (n) => n.replace(/\.[^.]+$/, "");
    $("#cvDocx").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; const msg = $("#cvDocxMsg"); msg.textContent = "Convertendo…";
      try { await carregarLib("mammoth"); const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
        const comImagem = /<img/i.test(r.value);
        Olinpy.baixar(base(f.name) + ".pdf", comImagem ? await gerarPDF(r.value, base(f.name) + ".pdf") : await gerarPDFTexto(htmlParaMarcado(r.value)));
        msg.textContent = `Pronto: ${base(f.name)}.pdf${comImagem ? " (tem imagens: o PDF sai como imagem da página)" : " (texto selecionável)"}`; Olinpy.registrar(`Conversão Word → PDF: ${f.name}`); }
      catch (err) { msg.textContent = "Não foi possível converter: " + err.message; } e.target.value = ""; });
    $("#cvPdf").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; const msg = $("#cvPdfMsg"); msg.textContent = "Lendo o PDF…";
      try { await carregarLib("pdfjs"); pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfjs.replace("pdf.min.js", "pdf.worker.min.js");
        const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; const paginas = [];
        for (let i = 1; i <= pdf.numPages; i++) { const tc = await (await pdf.getPage(i)).getTextContent(); let ultimoY = null, linha = "", linhas = [];
          for (const it of tc.items) { const y = Math.round(it.transform[5]); if (ultimoY !== null && Math.abs(y - ultimoY) > 3) { linhas.push(linha); linha = ""; } linha += it.str; ultimoY = y; }
          if (linha) linhas.push(linha); paginas.push(linhas.map((l) => l.replace(/\s+/g, " ").trim()).join("\n")); }
        const texto = paginas.join("\n\n").replace(/\n{3,}/g, "\n\n").replace(/^[#>|^-]/gm, (m) => " " + m);
        if (!texto.replace(/\s/g, "")) { msg.textContent = "Este PDF não tem texto (deve ser escaneado)."; return; }
        Olinpy.baixar(base(f.name) + ".docx", await gerarDocx(texto)); msg.textContent = `Pronto: ${pdf.numPages} página(s) → ${base(f.name)}.docx`; Olinpy.registrar(`Conversão PDF → Word: ${f.name}`); }
      catch (err) { msg.textContent = "Não foi possível converter: " + err.message; } e.target.value = ""; });
    let pdfs = [];
    $("#cvJuntar").addEventListener("change", (e) => { pdfs = [...e.target.files]; $("#cvLista").innerHTML = pdfs.map((f) => `<li>${h(f.name)}</li>`).join(""); $("#cvJuntarOk").disabled = pdfs.length < 2; });
    $("#cvJuntarOk").addEventListener("click", async () => { const msg = $("#cvJuntarMsg"); msg.textContent = "Juntando…";
      try { await carregarLib("pdflib"); const out = await PDFLib.PDFDocument.create();
        for (const f of pdfs) { const d = await PDFLib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true }); (await out.copyPages(d, d.getPageIndices())).forEach((p) => out.addPage(p)); }
        Olinpy.baixar(`juntado_${HOJE_ISO}.pdf`, new Blob([await out.save()], { type: "application/pdf" })); msg.textContent = `Pronto: ${out.getPageCount()} páginas.`; Olinpy.registrar(`PDFs juntados: ${pdfs.length} arquivos`); }
      catch (err) { msg.textContent = "Não foi possível juntar: " + err.message; } });
    $("#cvFotos").addEventListener("change", async (e) => { const fs = [...e.target.files]; if (!fs.length) return; const msg = $("#cvFotosMsg"); msg.textContent = "Montando o PDF…";
      try { await carregarLib("pdflib"); const out = await PDFLib.PDFDocument.create();
        for (const f of fs) { const jpg = await reduzirFoto(f); const img = await out.embedJpg(await jpg.arrayBuffer()); const pg = out.addPage([595.28, 841.89]);
          const k = Math.min(555 / img.width, 800 / img.height); pg.drawImage(img, { x: (595.28 - img.width * k) / 2, y: (841.89 - img.height * k) / 2, width: img.width * k, height: img.height * k }); }
        Olinpy.baixar(`fotos_${HOJE_ISO}.pdf`, new Blob([await out.save()], { type: "application/pdf" })); msg.textContent = `Pronto: ${fs.length} página(s).`; Olinpy.registrar(`Fotos → PDF: ${fs.length}`); }
      catch (err) { msg.textContent = "Não foi possível montar: " + err.message; } e.target.value = ""; });
  },
});

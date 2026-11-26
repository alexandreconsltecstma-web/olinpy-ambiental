/* Olinpy – assistente de IA (Groq ou Gemini, chave gratuita do usuário, chamada direta do navegador).
   O modelo pode usar ferramentas: consultar prazos e empresas do escritório, CNPJ (Receita), CNAE (IBGE),
   dias úteis (feriados nacionais) e criar tarefas. Tudo o que ele escreve é minuta: o técnico revisa. */
"use strict";

const OlinpyIA = (() => {
  let CFG = { provedor: "groq", chave: "" };
  let carregado = false;
  const MODELOS = { groq: "openai/gpt-oss-120b", gemini: "gemini-2.5-flash" };

  async function carregar() { CFG = Object.assign({ provedor: "groq", chave: "" }, await OlinpyCripto.ler("ia", {})); carregado = true; }
  const config = () => ({ provedor: CFG.provedor, temChave: !!CFG.chave });
  async function salvarConfig({ provedor, chave }) {
    if (!carregado) await carregar();
    CFG.provedor = provedor || CFG.provedor;
    if (chave) CFG.chave = chave;
    await OlinpyCripto.guardar("ia", CFG);
  }

  /* ── ferramentas ───────────────────────────────────────────────────── */
  const FERRAMENTAS = [
    { name: "consultar_prazos", description: "Lista prazos do escritório (documentos, licenças e condicionantes) que vencem nos próximos N dias ou estão atrasados.",
      parameters: { type: "object", properties: { dias: { type: "integer", description: "janela em dias a partir de hoje (padrão 30)" },
        incluir_atrasados: { type: "boolean" }, area: { type: "string", enum: ["ma", "sst", "reg", "sg"] }, empresa: { type: "string", description: "parte do nome da empresa" } } } },
    { name: "consultar_empresas", description: "Busca empresas cadastradas no escritório e mostra segmento, município, CNPJ e quantos prazos abertos têm.",
      parameters: { type: "object", properties: { busca: { type: "string" } } } },
    { name: "consultar_cnpj", description: "Consulta dados públicos de um CNPJ na Receita Federal (razão social, situação, CNAE, endereço, porte).",
      parameters: { type: "object", properties: { cnpj: { type: "string" } }, required: ["cnpj"] } },
    { name: "consultar_cnae", description: "Descrição oficial de uma subclasse CNAE no IBGE (7 dígitos).",
      parameters: { type: "object", properties: { codigo: { type: "string" } }, required: ["codigo"] } },
    { name: "calcular_prazo", description: "Soma dias corridos ou úteis a uma data, considerando feriados nacionais (BrasilAPI).",
      parameters: { type: "object", properties: { inicio: { type: "string", description: "AAAA-MM-DD" }, dias: { type: "integer" }, uteis: { type: "boolean" } }, required: ["inicio", "dias"] } },
    { name: "obrigacoes_do_segmento", description: "Obrigações periódicas que o catálogo do Olinpy sugere para um segmento de empresa, com base legal e periodicidade.",
      parameters: { type: "object", properties: { segmento: { type: "string", enum: Object.keys(SEGMENTOS) } }, required: ["segmento"] } },
    { name: "criar_tarefa", description: "Cria uma tarefa no quadro do escritório. Use só quando o usuário pedir para criar/agendar algo.",
      parameters: { type: "object", properties: { titulo: { type: "string" }, prazo: { type: "string", description: "AAAA-MM-DD" }, empresa: { type: "string" },
        area: { type: "string", enum: ["ma", "sst", "reg", "sg"] }, responsavel: { type: "string" } }, required: ["titulo"] } },
  ];
  const ROTULO = { consultar_prazos: "prazos do escritório", consultar_empresas: "empresas", consultar_cnpj: "Receita Federal", consultar_cnae: "IBGE (CNAE)",
    calcular_prazo: "calendário de feriados", obrigacoes_do_segmento: "catálogo de obrigações", criar_tarefa: "tarefa criada" };

  const achaEmpresa = (nome) => { const q = String(nome || "").toLowerCase(); return q ? Olinpy.empresas().find((e) => e.nome.toLowerCase().includes(q) || (e.fantasia || "").toLowerCase().includes(q)) : null; };

  async function executar(nome, a = {}) {
    try {
      if (nome === "consultar_prazos") {
        const janela = Number(a.dias ?? 30), q = String(a.empresa || "").toLowerCase();
        const ps = Olinpy.prazos().filter((p) => !p.feito && (p.d <= janela) && (a.incluir_atrasados !== false || p.d >= 0) && p.d >= -400
          && (!a.area || p.area === a.area) && (!q || p.empresa.toLowerCase().includes(q)));
        return { hoje: HOJE_ISO, total: ps.length, prazos: ps.slice(0, 45).map((p) => ({ data: p.data, dias: p.d, empresa: curto(p.empresa), o_que: p.titulo.slice(0, 120), area: p.area, origem: p.fonte })) };
      }
      if (nome === "consultar_empresas") {
        const q = String(a.busca || "").toLowerCase(), ps = Olinpy.prazos().filter((p) => !p.feito);
        return Olinpy.empresas().filter((e) => !q || `${e.nome} ${e.cnpj} ${e.municipio}`.toLowerCase().includes(q)).slice(0, 30)
          .map((e) => ({ nome: e.nome, cnpj: e.cnpj, segmento: SEGMENTOS[e.segmento]?.nome || "", municipio: e.municipio, cnae: e.cnae,
            prazos_atrasados: ps.filter((p) => p.empresaId === e.id && p.d < 0).length, prazos_30_dias: ps.filter((p) => p.empresaId === e.id && p.d >= 0 && p.d <= 30).length }));
      }
      if (nome === "consultar_cnpj") {
        const d = await Olinpy.buscarCNPJ(a.cnpj);
        return { razao_social: d.razao_social, fantasia: d.nome_fantasia, situacao: d.descricao_situacao_cadastral, abertura: d.data_inicio_atividade, porte: d.porte,
          cnae_principal: `${d.cnae_fiscal} – ${d.cnae_fiscal_descricao}`, cnaes_secundarios: (d.cnaes_secundarios || []).slice(0, 8).map((c) => `${c.codigo} – ${c.descricao}`),
          endereco: [d.logradouro, d.numero, d.bairro, d.municipio, d.uf, d.cep].filter(Boolean).join(", "), simples: d.opcao_pelo_simples, mei: d.opcao_pelo_mei };
      }
      if (nome === "consultar_cnae") {
        const r = await fetch(`https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/${soDig(a.codigo).padEnd(7, "0").slice(0, 7)}`); const d = await r.json();
        return { codigo: d.id, descricao: d.descricao, classe: d.classe?.descricao, grupo: d.classe?.grupo?.descricao, divisao: d.classe?.grupo?.divisao?.descricao, observacoes: (d.observacoes || []).slice(0, 4) };
      }
      if (nome === "calcular_prazo") {
        let d = D(a.inicio), n = Number(a.dias), passos = 0;
        if (!a.uteis) { d.setDate(d.getDate() + n); return { resultado: isoD(d), tipo: "dias corridos" }; }
        const fer = new Set(); for (const ano of [d.getFullYear(), d.getFullYear() + 1]) (await Olinpy.feriados(ano)).forEach((f) => fer.add(f.date));
        while (passos < n) { d.setDate(d.getDate() + 1); const s = isoD(d); if (d.getDay() % 6 !== 0 && !fer.has(s)) passos++; }
        return { resultado: isoD(d), tipo: "dias úteis (sem feriados estaduais/municipais)" };
      }
      if (nome === "obrigacoes_do_segmento") {
        const s = SEGMENTOS[a.segmento]; if (!s) return { erro: "segmento desconhecido" };
        return { segmento: s.nome, obrigacoes: s.sug.map((id) => { const o = OBR[id]; return { nome: o.nome, area: AREAS[o.area].nome, base: o.base, periodicidade_meses: o.meses, conferir: !!o.conferir }; }) };
      }
      if (nome === "criar_tarefa") {
        if (!Olinpy.pode("editar")) return { erro: "usuário sem permissão para criar tarefas" };
        const e = achaEmpresa(a.empresa);
        const t = { id: uid(), titulo: String(a.titulo).slice(0, 160), prazo: /^\d{4}-\d{2}-\d{2}$/.test(a.prazo || "") ? a.prazo : "", empresaId: e?.id || "", area: a.area || "ma",
          responsavel: a.responsavel || Olinpy.sessao.nome, status: "afazer", criada: new Date().toISOString(), minutos: 0, origem: "ia" };
        Olinpy.dados.tarefas.push(t); Olinpy.registrar(`Tarefa criada pelo assistente: ${t.titulo}`, t.empresaId); Olinpy.salvar();
        return { ok: true, tarefa: t.titulo, prazo: t.prazo, empresa: e?.nome || "(sem empresa)" };
      }
      return { erro: "ferramenta desconhecida" };
    } catch (e) { return { erro: e.message }; }
  }

  function sistema() {
    const C = Olinpy.dados.config, S = Olinpy.sessao;
    return `Você é a Olinpy, assistente de IA de um escritório de consultoria (${C.escritorio}, ${C.cidade}) que atende empresas de todos os tipos nas áreas de meio ambiente/licenciamento, segurança e saúde do trabalho (NRs, PGR, PCMSO, eSocial SST), regularização (alvarás, vigilância sanitária, bombeiros, certidões) e sistemas de gestão ISO. Hoje é ${HOJE_ISO}. Quem fala com você: ${S.nome} (${S.papel}).
Regras:
- Responda em português do Brasil, direto e organizado (títulos curtos, listas, tabelas quando ajudar).
- Você APOIA o técnico; não decide por ele. Em textos para órgãos ou clientes, entregue uma MINUTA com campos [entre colchetes] e lembre de revisar.
- Cite a base legal (lei, resolução, NR) só quando tiver certeza do número; se houver dúvida ou se o prazo variar por órgão/município, diga claramente "confirmar no órgão / na norma vigente". Nunca invente números de normas, artigos, prazos ou valores de taxas.
- Para dados do escritório (prazos, empresas, condicionantes) use as ferramentas; não suponha. Para CNPJ, CNAE e contagem de dias úteis, use as ferramentas.
- Só crie tarefas quando o usuário pedir.
- Em Alagoas, o órgão estadual é o IMA/AL e a SMDUMA é a secretaria de meio ambiente de Arapiraca.`;
  }

  /* ── chamada aos provedores ────────────────────────────────────────── */
  async function chamar(historico, usouFerramentas) {
    if (!carregado) await carregar();
    if (!CFG.chave) throw new Error("SEM_CHAVE");
    return CFG.provedor === "gemini" ? chamarGemini(historico, usouFerramentas) : chamarGroq(historico, usouFerramentas);
  }

  async function chamarGroq(historico, usou) {
    const msgs = [{ role: "system", content: sistema() }, ...historico.map((m) => ({ role: m.papel === "eu" ? "user" : "assistant", content: m.texto.slice(0, 6000) }))];
    const tools = FERRAMENTAS.map((f) => ({ type: "function", function: f }));
    for (let volta = 0; volta < 5; volta++) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.chave}` },
        body: JSON.stringify({ model: MODELOS.groq, messages: msgs, tools, tool_choice: "auto", temperature: 0.3, max_completion_tokens: 2500 }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(erroProvedor(r.status, d?.error?.message));
      const m = d.choices[0].message;
      if (!m.tool_calls?.length) return m.content || "";
      msgs.push({ role: "assistant", content: m.content || null, tool_calls: m.tool_calls });
      for (const tc of m.tool_calls) {
        let args = {}; try { args = JSON.parse(tc.function.arguments || "{}"); } catch (e) { /* vazio */ }
        usou.push(ROTULO[tc.function.name] || tc.function.name);
        const res = await executar(tc.function.name, args);
        msgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(res).slice(0, 7000) });
      }
    }
    return "Não consegui concluir a consulta. Tente reformular a pergunta.";
  }

  async function chamarGemini(historico, usou) {
    const contents = historico.map((m) => ({ role: m.papel === "eu" ? "user" : "model", parts: [{ text: m.texto.slice(0, 8000) }] }));
    for (let volta = 0; volta < 5; volta++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELOS.gemini}:generateContent`, { method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": CFG.chave },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema() }] }, contents, tools: [{ functionDeclarations: FERRAMENTAS }], generationConfig: { temperature: 0.3 } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(erroProvedor(r.status, d?.error?.message));
      const parts = d.candidates?.[0]?.content?.parts || [];
      const chamadas = parts.filter((p) => p.functionCall);
      if (!chamadas.length) return parts.map((p) => p.text || "").join("");
      contents.push({ role: "model", parts });
      const respostas = [];
      for (const p of chamadas) { usou.push(ROTULO[p.functionCall.name] || p.functionCall.name);
        respostas.push({ functionResponse: { name: p.functionCall.name, response: { resultado: await executar(p.functionCall.name, p.functionCall.args || {}) } } }); }
      contents.push({ role: "user", parts: respostas });
    }
    return "Não consegui concluir a consulta. Tente reformular a pergunta.";
  }
  function erroProvedor(st, msg) {
    if (st === 401 || st === 403) return "A chave da IA foi recusada. Confira em Configurações.";
    if (st === 429) return "Limite gratuito da IA atingido por agora. Espere um minuto e tente de novo (ou troque de provedor em Configurações).";
    return `A IA não respondeu (${st}${msg ? `: ${msg.slice(0, 140)}` : ""}).`;
  }

  /* ── markdown simples → HTML seguro ────────────────────────────────── */
  function md(t) {
    const linhas = h(t).split("\n"), out = [];
    let lista = null, tabela = null, codigo = null;
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const fechar = () => { if (lista) { out.push(`</${lista}>`); lista = null; } if (tabela) { out.push(tabela + "</tbody></table>"); tabela = null; } };
    for (const l of linhas) {
      if (codigo !== null) { if (/^```/.test(l)) { out.push(`<pre>${codigo}</pre>`); codigo = null; } else codigo += l + "\n"; continue; }
      if (/^```/.test(l)) { fechar(); codigo = ""; continue; }
      if (/^\s*\|.*\|\s*$/.test(l)) {
        const cels = l.trim().slice(1, -1).split("|").map((c) => inline(c.trim()));
        if (cels.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        if (!tabela) { fechar(); tabela = `<table><thead><tr>${cels.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>`; } else tabela += `<tr>${cels.map((c) => `<td>${c}</td>`).join("")}</tr>`;
        continue;
      }
      const ul = l.match(/^\s*[-*•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/), hd = l.match(/^(#{1,4})\s+(.*)/);
      if (ul || ol) { const tp = ul ? "ul" : "ol"; if (lista !== tp) { fechar(); out.push(`<${tp}>`); lista = tp; } out.push(`<li>${inline((ul || ol)[1])}</li>`); continue; }
      fechar();
      if (hd) out.push(`<h${hd[1].length < 3 ? 3 : 4}>${inline(hd[2])}</h${hd[1].length < 3 ? 3 : 4}>`);
      else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    }
    if (codigo !== null) out.push(`<pre>${codigo}</pre>`);
    fechar();
    return out.join("");
  }

  /* ── tela ──────────────────────────────────────────────────────────── */
  let conversas = [], atual = null, ocupado = false;
  async function tela(c) {
    if (!carregado) await carregar();
    conversas = await OlinpyCripto.ler("conversas", []);
    c.className = "conteudo cheio";
    c.innerHTML = `<div class="chat"><aside class="chat-hist"><div class="topo-hist"><button class="btn" id="bNovaConv" style="width:100%">${ico("mais")} Nova conversa</button></div>
        <small>Conversas recentes</small><ul id="listaConv"></ul></aside>
      <section class="chat-main"><div class="mensagens" id="msgs"><div class="larg" id="msgsL"></div></div>
        <div class="compor"><form class="caixa" id="fChat"><textarea id="entrada" rows="1" placeholder="Pergunte algo, peça um ofício, um checklist, um resumo dos prazos…"></textarea>
          <button class="btn icone" id="bEnviar" aria-label="Enviar" title="Enviar (Enter)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
          <div class="opcoes-chat"><span>${CFG.chave ? `Modelo: ${CFG.provedor === "gemini" ? "Gemini 2.5 Flash" : "GPT-OSS 120B (Groq)"} · consulta os dados do escritório e fontes públicas` : `<a href="#config">Configure a chave gratuita da IA</a> para começar`}</span>
            <span style="margin-left:auto">Respostas da IA são minutas: revise antes de usar.</span></div></div></section></div>`;
    $("#bNovaConv").addEventListener("click", () => { atual = null; desenhar(); $("#entrada").focus(); });
    const ent = $("#entrada");
    ent.addEventListener("input", () => { ent.style.height = "auto"; ent.style.height = Math.min(200, ent.scrollHeight) + "px"; });
    ent.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#fChat").requestSubmit(); } });
    $("#fChat").addEventListener("submit", (e) => { e.preventDefault(); enviar(ent.value); });
    const pre = sessionStorage.getItem("olinpy_pergunta");
    if (pre) { sessionStorage.removeItem("olinpy_pergunta"); atual = null; desenhar(); enviar(pre); } else { atual = conversas[0] || null; desenhar(); }
  }

  function desenhar() {
    $("#listaConv").innerHTML = conversas.map((cv) => `<li><button data-cv="${cv.id}" class="${atual?.id === cv.id ? "on" : ""}" title="${h(cv.titulo)}">${h(cv.titulo)}</button></li>`).join("") || `<li class="fraco" style="padding:8px 12px;font-size:.8rem">Nenhuma ainda.</li>`;
    $$("[data-cv]").forEach((b) => b.addEventListener("click", () => { atual = conversas.find((x) => x.id === b.dataset.cv); desenhar(); }));
    const L = $("#msgsL");
    if (!atual || !atual.msgs.length) {
      const sug = ATALHOS_IA.slice(0, 6);
      L.innerHTML = `<div class="boas-vindas"><svg viewBox="0 0 40 40" width="54" height="54" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#1f4d3a"/><path d="M20 8c-6.5 4.3-9.5 9.4-9.5 14.4a9.5 9.5 0 0 0 19 0C29.5 17.4 26.5 12.3 20 8z" fill="#c49a2c"/><path d="M20 32V17.5M20 23l-4-3M20 27l4.5-3.5" stroke="#1f4d3a" stroke-width="2.2" stroke-linecap="round"/></svg>
        <h2>Como posso ajudar, ${h(Olinpy.sessao.nome.split(" ")[0])}?</h2><p>Licenciamento, segurança do trabalho, alvarás, documentos, prazos do escritório e consultas à Receita. Eu preparo; você revisa e decide.</p>
        <div class="sugestoes">${sug.map((s, i) => `<button data-sug="${i}"><b>${h(s.t)}</b><span>${h(AREAS[s.area]?.nome || "Geral")}</span></button>`).join("")}</div></div>`;
      $$("[data-sug]").forEach((b) => b.addEventListener("click", () => { const s = sug[+b.dataset.sug]; if (/\[/.test(s.p)) { $("#entrada").value = s.p; $("#entrada").focus(); $("#entrada").dispatchEvent(new Event("input")); } else enviar(s.p); }));
      return;
    }
    L.innerHTML = atual.msgs.map((m, i) => `<div class="msg ${m.papel}"><span class="quem">${m.papel === "eu" ? h(Olinpy.sessao.nome[0]) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4c-4 2.7-6 5.9-6 9a6 6 0 0 0 12 0c0-3.1-2-6.3-6-9z"/></svg>'}</span>
      <div class="bolha">${m.usou?.length ? `<div class="usou">Consultou: ${[...new Set(m.usou)].map((u) => `<span>${h(u)}</span>`).join("")}</div>` : ""}
      <div class="texto">${m.papel === "eu" ? h(m.texto) : m.erro ? `<div class="aviso">${ico("alerta")}<div>${h(m.texto)}${m.texto.includes("chave") || m.semChave ? ` <a href="#config">Abrir Configurações</a>` : ""}</div></div>` : md(m.texto)}</div>
      ${m.papel === "ia" && !m.erro ? `<div class="ferr"><button data-copiar="${i}">Copiar</button><button data-word="${i}">Baixar Word</button><button data-pdf="${i}">Imprimir / PDF</button></div>` : ""}</div></div>`).join("")
      + (ocupado ? `<div class="msg ia"><span class="quem">…</span><div class="bolha"><div class="pensando"><i></i><i></i><i></i></div></div></div>` : "");
    $$("[data-copiar]").forEach((b) => b.addEventListener("click", () => { navigator.clipboard.writeText(atual.msgs[+b.dataset.copiar].texto); Olinpy.toast("Copiado."); }));
    $$("[data-word]").forEach((b) => b.addEventListener("click", () => exportar(atual.msgs[+b.dataset.word].texto, "word")));
    $$("[data-pdf]").forEach((b) => b.addEventListener("click", () => exportar(atual.msgs[+b.dataset.pdf].texto, "pdf")));
    const box = $("#msgs"); box.scrollTop = box.scrollHeight;
  }

  async function enviar(texto) {
    texto = String(texto || "").trim();
    if (!texto || ocupado) return;
    $("#entrada").value = ""; $("#entrada").style.height = "auto";
    if (!atual) { atual = { id: uid(), titulo: texto.slice(0, 60), criada: new Date().toISOString(), msgs: [] }; conversas.unshift(atual); }
    atual.msgs.push({ papel: "eu", texto });
    ocupado = true; desenhar();
    const usou = [];
    try {
      const resp = await chamar(atual.msgs.filter((m) => !m.erro).slice(-10), usou);
      atual.msgs.push({ papel: "ia", texto: resp || "(sem resposta)", usou });
    } catch (e) {
      atual.msgs.push({ papel: "ia", erro: true, semChave: e.message === "SEM_CHAVE", texto: e.message === "SEM_CHAVE" ? "Para conversar, cadastre a chave gratuita da IA (Groq ou Gemini) em Configurações." : e.message });
    }
    ocupado = false;
    conversas = conversas.slice(0, 40);
    await OlinpyCripto.guardar("conversas", conversas);
    if (document.getElementById("msgsL")) desenhar();
  }

  function documentoHTML(texto) {
    const C = Olinpy.dados.config;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${h(C.escritorio)}</title><style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.45;color:#222;margin:2cm}
      h3{font-size:13pt;color:#1f4d3a}h4{font-size:11.5pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#eef2ef}
      .cab{border-bottom:2px solid #1f4d3a;padding-bottom:6px;margin-bottom:18px;color:#1f4d3a;font-weight:bold}.min{color:#a33;font-size:9pt;margin-top:24px}</style></head>
      <body><div class="cab">${h(C.escritorio)} · ${h(C.cidade)}</div>${md(texto)}<p class="min">Minuta gerada com apoio do assistente Olinpy em ${fd(HOJE_ISO)} – revisar e validar antes de usar.</p></body></html>`;
  }
  function exportar(texto, tipo) {
    const html = documentoHTML(texto);
    if (tipo === "word") {
      const C = Olinpy.dados.config, aviso = `\n\nMinuta gerada com apoio do assistente Olinpy em ${fd(HOJE_ISO)} – revisar e validar antes de usar.`;
      const doc = () => Olinpy.baixar(`minuta-${HOJE_ISO}.doc`, "\ufeff" + html, "application/msword");
      if (typeof gerarDocx === "function") gerarDocx(texto + aviso, [C.escritorio, C.cidade].filter(Boolean).join(" · ")).then((b) => Olinpy.baixar(`minuta-${HOJE_ISO}.docx`, b)).catch(doc);
      else doc();
      return;
    }
    const w = window.open("", "_blank"); if (!w) { Olinpy.toast("Permita pop-ups para imprimir."); return; }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  }

  return { carregar, config, salvarConfig, tela, md, documentoHTML, exportar };
})();

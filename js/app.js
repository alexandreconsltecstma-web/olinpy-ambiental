/* Olinpy – núcleo: sessão, dados, rotas, início, empresas, prazos, tarefas, automações, histórico,
   indicadores, usuários e configurações. Módulos extras: ia.js (assistente) e ferramentas.js. */
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const HOJE = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const HOJE_ISO = isoD(HOJE);
const D = (s) => { const [a, b, c] = String(s).slice(0, 10).split("-"); return new Date(+a, +b - 1, +c); };
const fd = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join("/") : "—");
const dias = (s) => Math.round((D(s) - HOJE) / 864e5);
const addMeses = (s, n) => { const d = D(s), dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return isoD(d); };
const addDias = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return isoD(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const soDig = (s) => String(s || "").replace(/\D/g, "");
const fmtCNPJ = (s) => { const d = soDig(s); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : s || ""; };
const curto = (n) => { const ps = String(n || "").replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/); const o = [];
  for (const p of ps) { if (o.length && (o.join(" ") + " " + p).length > 28) break; o.push(p); } return o.join(" "); };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

const ICONES = {
  inicio: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  assistente: '<path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5L12 14.5 7.5 16.8l.9-5L4.8 8.3l5-.7z"/><path d="M19 17l1 2 2 .5-2 .5-1 2-1-2-2-.5 2-.5z"/>',
  empresas: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18"/>',
  prazos: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 14v3l2 1"/>',
  tarefas: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  automacoes: '<path d="M13 3 4 14h7l-1 7 9-11h-7z"/>',
  condicionantes: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
  mapas: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  vistoria: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  propostas: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  calculadoras: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h4"/>',
  legislacao: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h6"/>',
  indicadores: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>', alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>', relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  externo: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};
const ico = (n, c = "") => `<svg ${c ? `class="${c}" ` : ""}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || AREAS[n]?.icone || ""}</svg>`;

const PAPEIS = { admin: "Administrador", tecnico: "Técnico", consulta: "Somente consulta", equipe: "Técnico" };

const Olinpy = (() => {
  let S = null;            // sessão
  let BASE = [];           // licenças do escritório (dados/escritorio.enc)
  let DADOS = null;        // empresas, itens, tarefas, historico, medicoes, config (local, cifrado)
  let rotaAtual = "inicio";
  const PADRAO = () => ({ versao: 1, empresas: [], itens: [], tarefas: [], historico: [], medicoes: [], propostas: [],
    config: { escritorio: "PA Consultoria Ambiental", cidade: "Arapiraca/AL", auto: { tarefas: true, antecedencia: 30, proximo: true, cnpj: true } } });

  const pode = (acao) => {
    const p = S?.papel === "equipe" ? "tecnico" : S?.papel;
    if (p === "admin") return true;
    if (p === "tecnico") return acao !== "usuarios";
    return acao === "ver";
  };

  /* ── dados ─────────────────────────────────────────────────────────── */
  async function carregar() {
    try { BASE = await OlinpyCripto.jsonProtegido("dados/escritorio.enc"); } catch (e) { BASE = []; console.warn("escritório:", e.message); }
    DADOS = await OlinpyCripto.ler("dados", null);
    if (!DADOS) {
      try { DADOS = await OlinpyCripto.jsonProtegido("dados/equipe.enc"); toast("Dados da equipe carregados."); } catch (e) { DADOS = PADRAO(); }
    }
    DADOS = Object.assign(PADRAO(), DADOS);
    DADOS.config = Object.assign(PADRAO().config, DADOS.config);
    DADOS.config.auto = Object.assign(PADRAO().config.auto, DADOS.config.auto);
  }
  let salvando = null;
  function salvar() {
    clearTimeout(salvando);
    salvando = setTimeout(() => OlinpyCripto.guardar("dados", DADOS).catch((e) => toast("Não foi possível salvar: " + e.message)), 250);
  }
  function registrar(acao, empresaId = "") {
    DADOS.historico.unshift({ quando: new Date().toISOString(), quem: S.nome, empresaId, acao });
    DADOS.historico = DADOS.historico.slice(0, 1500);
    salvar();
  }

  // empresas: cadastradas + derivadas das licenças do escritório (sem duplicar pelo CNPJ)
  function empresas() {
    const lista = DADOS.empresas.map((e) => ({ ...e }));
    const porCnpj = new Map(lista.filter((e) => soDig(e.cnpj)).map((e) => [soDig(e.cnpj), e]));
    BASE.forEach((l) => {
      const c = soDig(l.cnpj);
      const id = c ? `lic${c}` : `lic${l.nome.toLowerCase().replace(/\W+/g, "")}`;
      if ((c && porCnpj.has(c)) || lista.some((e) => e.id === id)) return;
      const e = { id, nome: l.nome, cnpj: l.cnpj, cnae: l.cnae || "", segmento: "", municipio: "Arapiraca", uf: "AL", origem: "licencas", areas: ["ma"] };
      lista.push(e); if (c) porCnpj.set(c, e);
    });
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  const empresa = (id) => empresas().find((e) => e.id === id);
  const licencasDa = (e) => BASE.filter((l) => (soDig(e.cnpj) && soDig(l.cnpj) === soDig(e.cnpj)) || l.nome === e.nome);

  // condicionantes do escritório (as mesmas marcações "entregue" do Painel)
  function entregas() {
    let done = {}; try { done = JSON.parse(localStorage.getItem("pa_done") || "{}"); } catch (e) { /* vazio */ }
    const out = [];
    BASE.forEach((l, i) => l.rows.forEach((r, j) => { const id = `${i}_${j}`; out.push({ id, emp: l.nome, cnpj: l.cnpj, lic: `${l.tipo} ${l.num}`, cond: r.cond, texto: r.texto, data: r.data, feito: !!done[id], d: dias(r.data) }); }));
    return out.sort((a, b) => a.data.localeCompare(b.data));
  }

  // todos os prazos (itens cadastrados + licenças + condicionantes) num formato só
  function prazos() {
    const emps = empresas(), nomeEmp = (id) => emps.find((e) => e.id === id)?.nome || "—";
    const out = DADOS.itens.filter((i) => i.validade).map((i) => {
      const o = OBR[i.tipo] || {};
      return { fonte: "item", id: i.id, area: i.area || o.area || "ma", titulo: i.titulo || o.nome || "Documento", empresaId: i.empresaId, empresa: nomeEmp(i.empresaId),
        data: i.validade, feito: i.status === "feito", conferir: !!o.conferir, antes: i.antes ?? o.antes ?? 30, resp: i.responsavel || "", item: i };
    });
    BASE.forEach((l) => {
      const e = emps.find((x) => (soDig(x.cnpj) && soDig(x.cnpj) === soDig(l.cnpj)) || x.nome === l.nome);
      if (l.ren) out.push({ fonte: "licenca", id: `ren-${l.num}`, area: "ma", titulo: `Pedir renovação da ${l.tipo} ${l.num}`, empresaId: e?.id, empresa: l.nome, data: l.ren, antes: 60, feito: false });
      out.push({ fonte: "licenca", id: `ven-${l.num}`, area: "ma", titulo: `Vencimento da ${l.tipo} ${l.num}`, empresaId: e?.id, empresa: l.nome, data: l.ven, antes: 150, feito: false });
    });
    entregas().forEach((x) => {
      const e = emps.find((y) => (soDig(y.cnpj) && soDig(y.cnpj) === soDig(x.cnpj)) || y.nome === x.emp);
      out.push({ fonte: "condicionante", id: `cond-${x.id}`, area: "ma", titulo: `Cond. ${x.cond} – ${x.texto}`, empresaId: e?.id, empresa: x.emp, data: x.data, antes: 30, feito: x.feito });
    });
    return out.map((p) => ({ ...p, d: dias(p.data) })).sort((a, b) => a.data.localeCompare(b.data));
  }
  const situacao = (p) => (p.feito ? ["Concluído", "t-ent"] : p.d < 0 ? ["Atrasado", "t-atr"] : p.d <= 7 ? ["Nesta semana", "t-sem"]
    : p.d <= (p.antes || 30) ? ["Em breve", "t-30"] : ["No prazo", "t-ok"]);

  /* ── automações ────────────────────────────────────────────────────── */
  function automatizar() {
    if (!DADOS.config.auto.tarefas || !pode("editar")) return 0;
    const ant = Number(DADOS.config.auto.antecedencia) || 30;
    let n = 0;
    for (const p of prazos()) {
      if (p.feito || p.d > Math.max(ant, p.fonte === "item" ? p.antes : 0)) continue;
      if (p.fonte !== "item" && p.d < -30) continue;  // atrasos antigos de licenças/condicionantes ficam nos Prazos, sem inundar as tarefas
      const chave = `auto:${p.id}`;
      if (DADOS.tarefas.some((t) => t.origem === chave)) continue;
      DADOS.tarefas.push({ id: uid(), titulo: p.titulo, empresaId: p.empresaId || "", area: p.area, prazo: p.data, responsavel: p.resp || "",
        status: "afazer", origem: chave, criada: new Date().toISOString(), auto: true, minutos: 0 });
      n++;
    }
    if (n) { registrar(`Automação: ${plural(n, "tarefa criada", "tarefas criadas")} a partir dos prazos`); }
    return n;
  }
  function concluirItem(it) {
    it.status = "feito"; it.concluido = HOJE_ISO;
    const o = OBR[it.tipo];
    const meses = it.meses ?? o?.meses;
    if (DADOS.config.auto.proximo && meses && it.validade) {
      const novo = { ...it, id: uid(), status: "pendente", concluido: null, validade: addMeses(it.validade, meses), emissao: it.validade };
      DADOS.itens.push(novo);
      registrar(`Concluído: ${it.titulo || o?.nome}. Próximo prazo criado para ${fd(novo.validade)}`, it.empresaId);
    } else registrar(`Concluído: ${it.titulo || o?.nome}`, it.empresaId);
    DADOS.tarefas.filter((t) => t.origem === `auto:${it.id}` && t.status !== "feito").forEach((t) => { t.status = "feito"; t.concluida = new Date().toISOString(); });
    salvar();
  }

  /* ── consultas externas (fontes públicas, sem chave) ───────────────── */
  async function buscarCNPJ(cnpj) {
    const c = soDig(cnpj);
    if (c.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");
    for (const u of [`https://brasilapi.com.br/api/cnpj/v1/${c}`, `https://minhareceita.org/${c}`]) {
      try { const r = await fetch(u); if (r.ok) return await r.json(); } catch (e) { /* tenta a próxima */ }
    }
    throw new Error("Receita indisponível agora");
  }
  async function buscarCEP(cep) {
    const c = soDig(cep);
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`); const d = await r.json();
    if (d.erro) throw new Error("CEP não encontrado");
    return d;
  }
  const feriadosCache = {};
  async function feriados(ano) {
    if (!feriadosCache[ano]) feriadosCache[ano] = fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`).then((r) => r.json()).catch(() => []);
    return feriadosCache[ano];
  }

  /* ── interface: utilitários ────────────────────────────────────────── */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 3200); }
  function dialogo(titulo, html, sub = "") { $("#dlgT").textContent = titulo; $("#dlgS").textContent = sub; $("#dlgB").innerHTML = html; const d = $("#dlg"); if (!d.open) d.showModal(); return d; }
  function baixar(nome, conteudo, tipo = "application/octet-stream") {
    const url = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
    const a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const opcoesEmpresas = (sel = "", vazio = "Sem empresa") => `<option value="">${vazio}</option>` +
    empresas().map((e) => `<option value="${h(e.id)}"${e.id === sel ? " selected" : ""}>${h(curto(e.nome))}</option>`).join("");
  const opcoesAreas = (sel = "") => Object.entries(AREAS).map(([k, a]) => `<option value="${k}"${k === sel ? " selected" : ""}>${h(a.nome)}</option>`).join("");
  const tagArea = (a) => `<span class="tag" style="background:${AREAS[a]?.cor}1f;color:${AREAS[a]?.cor}">${h(AREAS[a]?.curto || a)}</span>`;
  const somenteLeitura = () => (pode("editar") ? "" : `<div class="aviso info" style="margin-bottom:14px">${ico("info")}<div>Seu acesso é <b>somente consulta</b>: você vê tudo, mas não altera.</div></div>`);

  /* ── menu e rotas ──────────────────────────────────────────────────── */
  const MENU = [
    ["Principal", [["inicio", "Início"], ["assistente", "Assistente IA"], ["empresas", "Empresas"], ["prazos", "Prazos e vencimentos"], ["tarefas", "Tarefas"], ["automacoes", "Automações"]]],
    ["Áreas", [["area-ma", "Meio Ambiente"], ["area-sst", "Segurança do Trabalho"], ["area-reg", "Regularização e alvarás"], ["area-sg", "Sistemas de gestão"]]],
    ["Ferramentas", [["condicionantes", "Condicionantes"], ["mapas", "Mapas (GeoMapa)"], ["vistoria", "Vistoria de campo"], ["propostas", "Propostas"], ["calculadoras", "Calculadoras"], ["legislacao", "Legislação"]]],
    ["Gestão", [["indicadores", "Indicadores"], ["historico", "Histórico"], ["usuarios", "Usuários"], ["config", "Configurações"]]],
  ];
  const TITULOS = { inicio: ["Início", ""], assistente: ["Assistente IA", "Pergunte, peça textos e consulte os dados do escritório"], empresas: ["Empresas", "Clientes e empreendimentos"],
    prazos: ["Prazos e vencimentos", "Todas as áreas num só lugar"], tarefas: ["Tarefas", "Quem faz o quê e até quando"], automacoes: ["Automações", "O que o Olinpy faz sozinho"],
    condicionantes: ["Condicionantes", "Painel de licenças e entregas"], mapas: ["Mapas", "GeoMapa: mapas técnicos e pacote para o QGIS"], vistoria: ["Vistoria de campo", "Checklist e relatório fotográfico"],
    propostas: ["Propostas", "Orçamentos de serviços"], calculadoras: ["Calculadoras", "Ferramentas técnicas rápidas"], legislacao: ["Legislação", "Normas e consultas oficiais"],
    indicadores: ["Indicadores", "Tempo economizado e produtividade"], historico: ["Histórico", "Registro de alterações"], usuarios: ["Usuários", "Acesso da equipe"], config: ["Configurações", "Escritório, IA e dados"] };

  function montarMenu() {
    const atr = prazos().filter((p) => !p.feito && p.d < 0).length;
    const tar = DADOS.tarefas.filter((t) => t.status !== "feito" && t.prazo && dias(t.prazo) < 0).length;
    $("#menu").innerHTML = MENU.map(([sec, itens]) => `<div class="secao">${sec}</div>` + itens.filter(([r]) => r !== "usuarios" || pode("usuarios")).map(([r, n]) => {
      const ic = r.startsWith("area-") ? ico(r.slice(5)) : ico(r);
      const cont = r === "prazos" && atr ? `<span class="cont">${atr}</span>` : r === "tarefas" && tar ? `<span class="cont">${tar}</span>` : "";
      return `<a href="#${r}" data-r="${r}">${ic}<span>${n}</span>${cont}</a>`;
    }).join("")).join("");
    marcarMenu();
  }
  const marcarMenu = () => $$("#menu a").forEach((a) => a.classList.toggle("on", a.dataset.r === rotaAtual.split("/")[0]));

  function rotear() {
    const r = decodeURIComponent(location.hash.slice(1)) || "inicio";
    rotaAtual = r;
    const [base, arg] = r.split("/");
    const c = $("#conteudo");
    c.className = "conteudo"; c.innerHTML = ""; $("#acoesBarra").innerHTML = "";
    let [t, s] = TITULOS[base] || ["", ""];
    if (base.startsWith("area-")) { t = AREAS[base.slice(5)]?.nome; s = "Obrigações, prazos, checklist e legislação da área"; }
    if (base === "empresa") { t = "Empresa"; s = ""; }
    if (base === "inicio") s = `${HOJE.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`;
    $("#titulo").textContent = t; $("#subtitulo").textContent = s;
    document.title = `${t || "Olinpy"} – Olinpy`;
    $("#app").classList.remove("menu-aberto");
    marcarMenu();
    const telas = { inicio, empresas: telaEmpresas, empresa: () => telaEmpresa(arg), prazos: telaPrazos, tarefas: telaTarefas, automacoes: telaAutomacoes,
      historico: telaHistorico, indicadores: telaIndicadores, usuarios: telaUsuarios, config: telaConfig };
    try {
      if (base.startsWith("area-")) telaArea(base.slice(5));
      else if (telas[base]) telas[base]();
      else if (typeof OlinpyTelas !== "undefined" && OlinpyTelas[base]) OlinpyTelas[base](c, arg);
      else inicio();
    } catch (e) { console.error(e); c.innerHTML = `<div class="aviso">${ico("alerta")}<div>Erro ao abrir esta tela: ${h(e.message)}</div></div>`; }
  }

  /* ── início ────────────────────────────────────────────────────────── */
  function inicio() {
    const ps = prazos().filter((p) => !p.feito);
    const atr = ps.filter((p) => p.d < 0), sem = ps.filter((p) => p.d >= 0 && p.d <= 7), mes = ps.filter((p) => p.d >= 0 && p.d <= 30);
    const tarefas = DADOS.tarefas.filter((t) => t.status !== "feito");
    const minhas = tarefas.filter((t) => !t.responsavel || t.responsavel === S.nome).sort((a, b) => (a.prazo || "9").localeCompare(b.prazo || "9")).slice(0, 6);
    const hora = new Date().getHours(), cump = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const porArea = Object.keys(AREAS).map((a) => [a, ps.filter((p) => p.area === a && p.d <= 30).length]);
    const linha = (p) => { const [st, cls] = situacao(p); return `<li><div class="data"><b>${fd(p.data)}</b><span class="fraco">${p.d < 0 ? `${-p.d} d atraso` : p.d === 0 ? "hoje" : `em ${p.d} d`}</span></div>
      <div class="txt"><b title="${h(p.titulo)}">${h(p.titulo)}</b><span>${h(curto(p.empresa))} · ${h(AREAS[p.area]?.curto)}</span></div><span class="tag ${cls}">${st}</span></li>`; };
    $("#conteudo").innerHTML = `<div class="largura">
      <div class="ola"><div><h2>${cump}, ${h(S.nome.split(" ")[0])}</h2><p>${atr.length || sem.length ? `Há ${[atr.length && plural(atr.length, "prazo atrasado", "prazos atrasados"), sem.length && `${plural(sem.length, "prazo", "prazos")} nesta semana`].filter(Boolean).join(" e ")}.` : "Nenhum prazo urgente. Bom trabalho!"}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn claro" href="#empresas">${ico("mais")} Nova empresa</a><a class="btn" href="#assistente">${ico("assistente")} Perguntar à IA</a></div></div>
      <div class="kpis">
        <button class="k r" data-ir="prazos/atrasados"><b>${atr.length}</b><span>prazos atrasados</span></button>
        <button class="k l" data-ir="prazos/semana"><b>${sem.length}</b><span>vencem em 7 dias</span></button>
        <button class="k a" data-ir="prazos/30"><b>${mes.length}</b><span>vencem em 30 dias</span></button>
        <button class="k" data-ir="tarefas"><b>${tarefas.length}</b><span>tarefas abertas</span></button>
        <button class="k o" data-ir="empresas"><b>${empresas().length}</b><span>empresas acompanhadas</span></button>
      </div>
      <div class="grade">
        <div class="card c7"><div class="card-cab"><h3>Atenção agora</h3><a class="mut" href="#prazos">ver todos</a></div><div class="card-corpo">
          ${atr.length + sem.length ? `<ul class="lista">${[...atr.slice(-6).reverse(), ...sem].slice(0, 9).map(linha).join("")}</ul>` : `<p class="vazio">Nada atrasado nem vencendo nesta semana.</p>`}</div></div>
        <div class="card c5"><div class="card-cab"><h3>Minhas tarefas</h3><a class="mut" href="#tarefas">abrir</a></div><div class="card-corpo">
          ${minhas.length ? `<ul class="lista">${minhas.map((t) => `<li><div class="data"><b>${t.prazo ? fd(t.prazo) : "—"}</b></div><div class="txt"><b>${h(t.titulo)}</b><span>${h(curto(empresa(t.empresaId)?.nome || ""))}${t.auto ? " · automática" : ""}</span></div></li>`).join("")}</ul>` : `<p class="vazio">Sem tarefas para você.</p>`}</div></div>
        <div class="card c4"><div class="card-cab"><h3>Próximos 30 dias por área</h3></div><div class="card-corpo">
          ${porArea.map(([a, n]) => `<a class="atalho" href="#area-${a}" style="margin-bottom:8px"><span class="ic" style="background:${AREAS[a].cor}1a;color:${AREAS[a].cor}">${ico(a)}</span><div><b>${h(AREAS[a].nome)}</b><span>${plural(n, "prazo", "prazos")}</span></div></a>`).join("")}</div></div>
        <div class="card c8"><div class="card-cab"><h3>Atalhos</h3></div><div class="card-corpo"><div class="atalhos">
          ${[["assistente", "Assistente IA", "Textos, dúvidas e dados"], ["condicionantes", "Condicionantes", "Agenda e calendário das licenças"], ["mapas", "Mapas", "Localização, AID/AII, hidrografia…"],
             ["vistoria", "Vistoria de campo", "Checklist e fotos com GPS"], ["propostas", "Proposta", "Orçamento em PDF"], ["calculadoras", "Calculadoras", "APP, fossa, prazos, coordenadas"]]
            .map(([r, b, s]) => `<a class="atalho" href="#${r}"><span class="ic">${ico(r)}</span><div><b>${b}</b><span>${s}</span></div></a>`).join("")}
        </div></div></div>
      </div></div>`;
    $$("[data-ir]").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.ir; }));
  }

  /* ── empresas ──────────────────────────────────────────────────────── */
  function telaEmpresas() {
    const F = telaEmpresas.F || (telaEmpresas.F = { q: "", seg: "" });
    $("#acoesBarra").innerHTML = pode("editar") ? `<button class="btn" id="bNovaEmp">${ico("mais")} Nova empresa</button>` : "";
    const ps = prazos().filter((p) => !p.feito);
    const desenhar = () => {
      const q = F.q.toLowerCase();
      const lista = empresas().filter((e) => (!q || `${e.nome} ${e.cnpj} ${e.municipio}`.toLowerCase().includes(q)) && (!F.seg || e.segmento === F.seg));
      $("#tabEmp").innerHTML = lista.length ? lista.map((e) => {
        const p = ps.filter((x) => x.empresaId === e.id);
        const a = p.filter((x) => x.d < 0).length, b = p.filter((x) => x.d >= 0 && x.d <= 30).length;
        return `<tr class="clica" data-id="${h(e.id)}"><td><b>${h(e.nome)}</b><br><span class="mut">${h(fmtCNPJ(e.cnpj))}</span></td>
          <td>${h(SEGMENTOS[e.segmento]?.nome || "—")}</td><td>${h([e.municipio, e.uf].filter(Boolean).join("/"))}</td>
          <td>${(e.areas || []).map(tagArea).join(" ")}</td>
          <td>${a ? `<span class="tag t-atr">${a} atrasado(s)</span> ` : ""}${b ? `<span class="tag t-30">${b} em 30 d</span>` : ""}${!a && !b ? `<span class="tag t-ok">em dia</span>` : ""}</td></tr>`;
      }).join("") : `<tr><td colspan="5" class="vazio">Nenhuma empresa encontrada.</td></tr>`;
      $$("#tabEmp tr[data-id]").forEach((tr) => tr.addEventListener("click", () => { location.hash = `empresa/${tr.dataset.id}`; }));
    };
    $("#conteudo").innerHTML = `<div class="largura">${somenteLeitura()}
      <div class="filtros"><input type="search" id="fq" placeholder="Buscar por nome, CNPJ ou cidade" value="${h(F.q)}">
        <select id="fseg"><option value="">Todos os segmentos</option>${Object.entries(SEGMENTOS).map(([k, s]) => `<option value="${k}"${F.seg === k ? " selected" : ""}>${h(s.nome)}</option>`).join("")}</select></div>
      <div class="card"><table class="t"><thead><tr><th>Empresa</th><th>Segmento</th><th>Município</th><th>Áreas</th><th>Situação</th></tr></thead><tbody id="tabEmp"></tbody></table></div></div>`;
    $("#fq").addEventListener("input", (e) => { F.q = e.target.value; desenhar(); });
    $("#fseg").addEventListener("change", (e) => { F.seg = e.target.value; desenhar(); });
    $("#bNovaEmp")?.addEventListener("click", () => formEmpresa());
    desenhar();
  }

  function formEmpresa(e = {}) {
    const novo = !e.id;
    dialogo(novo ? "Nova empresa" : "Editar empresa", `<form id="fEmp" class="form">
      <label class="w">CNPJ<div style="display:flex;gap:8px"><input id="eCnpj" value="${h(e.cnpj || "")}" inputmode="numeric" placeholder="00.000.000/0000-00">
        <button type="button" class="btn claro" id="bBuscaCnpj">${ico("busca")} Buscar na Receita</button></div></label>
      <p class="mut w" id="eMsg" style="margin:-4px 0 0"></p>
      <label class="w">Razão social / nome<input id="eNome" required value="${h(e.nome || "")}"></label>
      <label>Nome fantasia<input id="eFant" value="${h(e.fantasia || "")}"></label>
      <label>Segmento<select id="eSeg"><option value="">Escolha…</option>${Object.entries(SEGMENTOS).map(([k, s]) => `<option value="${k}"${e.segmento === k ? " selected" : ""}>${h(s.nome)}</option>`).join("")}</select></label>
      <label class="w">CNAE principal<input id="eCnae" value="${h(e.cnae || "")}"></label>
      <label>CEP<input id="eCep" value="${h(e.cep || "")}" inputmode="numeric"></label>
      <label>Porte<input id="ePorte" value="${h(e.porte || "")}"></label>
      <label class="w">Endereço<input id="eEnd" value="${h(e.endereco || "")}"></label>
      <label>Município<input id="eMun" value="${h(e.municipio || "")}"></label><label>UF<input id="eUf" maxlength="2" value="${h(e.uf || "")}"></label>
      <label>Contato<input id="eCont" value="${h(e.contato || "")}"></label><label>Telefone / WhatsApp<input id="eTel" value="${h(e.telefone || "")}"></label>
      <label>E-mail<input id="eMail" type="email" value="${h(e.email || "")}"></label><label>Técnico responsável<input id="eResp" value="${h(e.responsavel || S.nome)}"></label>
      <fieldset class="w" style="border:1px solid var(--borda);border-radius:8px;padding:10px 12px"><legend class="mut">Áreas atendidas</legend><div class="pilulas">
        ${Object.entries(AREAS).map(([k, a]) => `<label class="check"><input type="checkbox" name="area" value="${k}"${(e.areas || ["ma"]).includes(k) ? " checked" : ""}> ${h(a.nome)}</label>`).join("")}</div></fieldset>
      ${novo ? `<label class="check w"><input type="checkbox" id="eSug" checked> Sugerir as obrigações do segmento (você confirma depois em cada item)</label>` : ""}
      <label class="w">Observações<textarea id="eObs">${h(e.obs || "")}</textarea></label>
      <div class="rodape-form w"><button type="button" class="btn claro" onclick="this.closest('dialog').close()">Cancelar</button><button class="btn">Salvar</button></div></form>`);
    const msg = (t) => { $("#eMsg").textContent = t; };
    $("#bBuscaCnpj").addEventListener("click", async () => {
      msg("Consultando a Receita…");
      try {
        const d = await buscarCNPJ($("#eCnpj").value);
        $("#eCnpj").value = fmtCNPJ(d.cnpj); $("#eNome").value = d.razao_social || ""; $("#eFant").value = d.nome_fantasia || "";
        $("#eCnae").value = d.cnae_fiscal ? `${d.cnae_fiscal} – ${d.cnae_fiscal_descricao || ""}` : "";
        $("#eCep").value = d.cep || ""; $("#ePorte").value = d.porte || d.descricao_porte || "";
        $("#eEnd").value = [d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.complemento, d.bairro].filter(Boolean).join(" ").replace(/\s+/g, " ");
        $("#eMun").value = d.municipio || ""; $("#eUf").value = d.uf || "";
        if (!$("#eTel").value && d.ddd_telefone_1) $("#eTel").value = d.ddd_telefone_1;
        if (!$("#eMail").value && d.email) $("#eMail").value = String(d.email).toLowerCase();
        if (!$("#eSeg").value) $("#eSeg").value = segmentoPorCnae(String(d.cnae_fiscal || ""), d.cnae_fiscal_descricao || "");
        msg(`Situação na Receita: ${d.descricao_situacao_cadastral || "—"}. Confira os dados antes de salvar.`);
      } catch (err) { msg(err.message); }
    });
    $("#fEmp").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const dados = { id: e.id && e.origem !== "licencas" ? e.id : e.id || uid(), nome: $("#eNome").value.trim(), fantasia: $("#eFant").value.trim(), cnpj: fmtCNPJ($("#eCnpj").value),
        segmento: $("#eSeg").value, cnae: $("#eCnae").value.trim(), cep: $("#eCep").value.trim(), porte: $("#ePorte").value.trim(), endereco: $("#eEnd").value.trim(),
        municipio: $("#eMun").value.trim(), uf: $("#eUf").value.trim().toUpperCase(), contato: $("#eCont").value.trim(), telefone: $("#eTel").value.trim(),
        email: $("#eMail").value.trim(), responsavel: $("#eResp").value.trim(), areas: $$('input[name=area]:checked').map((x) => x.value), obs: $("#eObs").value.trim(),
        criada: e.criada || new Date().toISOString() };
      DADOS.empresas = DADOS.empresas.filter((x) => x.id !== dados.id).concat(dados);
      if (novo && $("#eSug")?.checked && dados.segmento) {
        const sug = SEGMENTOS[dados.segmento].sug.filter((id) => dados.areas.includes(OBR[id].area) && !["condic", "cat"].includes(id));
        sug.forEach((id) => { const o = OBR[id];
          DADOS.itens.push({ id: uid(), empresaId: dados.id, tipo: id, area: o.area, titulo: o.nome, validade: o.mesFixo ? proxFixa(o.mesFixo) : "", status: "pendente", sugerido: true, responsavel: dados.responsavel }); });
        registrar(`Empresa cadastrada com ${sug.length} obrigações sugeridas pelo segmento`, dados.id);
      } else registrar(novo ? "Empresa cadastrada" : "Dados da empresa atualizados", dados.id);
      salvar(); $("#dlg").close(); location.hash = `empresa/${dados.id}`; rotear();
    });
  }
  const proxFixa = (mmdd) => { let d = `${HOJE.getFullYear()}-${mmdd}`; if (d < HOJE_ISO) d = `${HOJE.getFullYear() + 1}-${mmdd}`; return d; };
  function segmentoPorCnae(cod, desc) {
    const c = cod.slice(0, 2), t = desc.toLowerCase();
    if (/combust/.test(t)) return "posto";
    if (/reparação|manutenção de veículos|lavagem/.test(t)) return "oficina";
    if (/restaurante|lanchonete|padaria|alimenta|bar/.test(t)) return "alimentos";
    if (/sucata|resíduo|reciclagem/.test(t)) return "residuos";
    if (/festa|evento|hotel|pousada/.test(t)) return "eventos";
    if (+c >= 10 && +c <= 33) return "industria";
    if (+c >= 41 && +c <= 43) return "construcao";
    if (+c >= 1 && +c <= 3) return "agro";
    if (+c >= 49 && +c <= 53) return "transporte";
    if (+c >= 86 && +c <= 88 || /farm|clínica|odonto|veterin/.test(t)) return "saude";
    if (c === "85") return "educacao";
    if (+c >= 45 && +c <= 47) return "comercio";
    return "servicos";
  }

  function telaEmpresa(id) {
    const e = empresa(id);
    if (!e) { $("#conteudo").innerHTML = `<p class="vazio">Empresa não encontrada.</p>`; return; }
    $("#titulo").textContent = curto(e.nome);
    $("#subtitulo").textContent = [fmtCNPJ(e.cnpj), SEGMENTOS[e.segmento]?.nome].filter(Boolean).join(" · ");
    const ed = pode("editar");
    $("#acoesBarra").innerHTML = `${ed ? `<button class="btn claro" id="bEdit">Editar</button><button class="btn" id="bItem">${ico("mais")} Documento / prazo</button>` : ""}`;
    const lics = licencasDa(e);
    const itens = DADOS.itens.filter((i) => i.empresaId === e.id);
    const ps = prazos().filter((p) => p.empresaId === e.id);
    const tars = DADOS.tarefas.filter((t) => t.empresaId === e.id && t.status !== "feito");
    const hist = DADOS.historico.filter((x) => x.empresaId === e.id).slice(0, 12);
    const linhaItem = (i) => { const o = OBR[i.tipo] || {}; const p = ps.find((x) => x.id === i.id);
      const [st, cls] = p ? situacao(p) : i.status === "feito" ? ["Concluído", "t-ent"] : ["Sem data", "t-cinza"];
      return `<tr><td>${tagArea(i.area || o.area)}</td><td><b>${h(i.titulo || o.nome)}</b>${o.conferir ? ` <span class="tag t-30" title="${h(o.dica || "Prazo varia por órgão/fonte: confirme")}">conferir</span>` : ""}<br><span class="mut">${h(o.base || i.obs || "")}</span></td>
        <td>${fd(i.validade)}</td><td><span class="tag ${cls}">${st}</span>${i.sugerido && !i.validade ? `<br><span class="mut">sugerido: informe a data ou exclua</span>` : ""}</td>
        <td style="white-space:nowrap">${ed ? `<button class="btn claro peq" data-edit="${i.id}">Editar</button>${i.status !== "feito" && i.validade ? ` <button class="btn peq" data-ok="${i.id}">Concluir</button>` : ""}` : ""}</td></tr>`; };
    const end = [e.endereco, e.municipio && `${e.municipio}/${e.uf}`, e.cep && `CEP ${e.cep}`].filter(Boolean).join(" – ");
    $("#conteudo").innerHTML = `<div class="largura"><div class="grade">
      <div class="card c4"><div class="card-cab"><h3>Cadastro</h3></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:8px;font-size:.86rem">
        <div><span class="mut">Razão social</span><br><b>${h(e.nome)}</b></div>
        ${e.cnae ? `<div><span class="mut">CNAE</span><br>${h(e.cnae)}</div>` : ""}${end ? `<div><span class="mut">Endereço</span><br>${h(end)}</div>` : ""}
        ${e.contato || e.telefone ? `<div><span class="mut">Contato</span><br>${h([e.contato, e.telefone, e.email].filter(Boolean).join(" · "))}</div>` : ""}
        <div><span class="mut">Responsável</span><br>${h(e.responsavel || "—")}</div>
        <div>${(e.areas || []).map(tagArea).join(" ")}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <a class="btn claro peq" href="#mapas/${encodeURIComponent(e.nome)}">${ico("mapas")} Fazer mapas</a>
          <button class="btn claro peq" id="bIA">${ico("assistente")} Perguntar à IA</button>
          <a class="btn claro peq" target="_blank" rel="noopener" href="https://www.gov.br/pt-br/servicos/consultar-autuacoes-ambientais-e-embargos">${ico("externo")} Embargos IBAMA</a>
          <a class="btn claro peq" href="#vistoria/${h(e.id)}">${ico("vistoria")} Nova vistoria</a></div></div></div>
      <div class="card c8"><div class="card-cab"><h3>Documentos, licenças e prazos</h3><span class="mut">${plural(itens.length, "item", "itens")}</span></div><div class="card-corpo" style="overflow-x:auto">
        ${itens.length ? `<table class="t"><thead><tr><th>Área</th><th>Documento / obrigação</th><th>Validade</th><th>Situação</th><th></th></tr></thead><tbody>${itens.sort((a, b) => (a.validade || "9").localeCompare(b.validade || "9")).map(linhaItem).join("")}</tbody></table>`
          : `<p class="vazio">Nenhum documento cadastrado. ${ed ? "Use “Documento / prazo” ou edite a empresa escolhendo o segmento." : ""}</p>`}
        ${lics.length ? `<h4 style="margin:16px 0 6px">Licenças ambientais (escritório)</h4><ul class="lista">${lics.map((l) => `<li><div class="txt"><b>${h(l.tipoLong || l.tipo)} nº ${h(l.num)}</b><span>Emissão ${fd(l.emi)} · vence ${fd(l.ven)} · pedir renovação até ${fd(l.ren)} · ${plural(l.rows.length, "condicionante", "condicionantes")}</span></div><a class="btn claro peq" href="#condicionantes">Abrir</a></li>`).join("")}</ul>` : ""}
      </div></div>
      <div class="card c6"><div class="card-cab"><h3>Tarefas abertas</h3><a class="mut" href="#tarefas">todas</a></div><div class="card-corpo">
        ${tars.length ? `<ul class="lista">${tars.map((t) => `<li><div class="data"><b>${fd(t.prazo)}</b></div><div class="txt"><b>${h(t.titulo)}</b><span>${h(t.responsavel || "sem responsável")}</span></div></li>`).join("")}</ul>` : `<p class="vazio">Sem tarefas abertas.</p>`}</div></div>
      <div class="card c6"><div class="card-cab"><h3>Histórico</h3></div><div class="card-corpo">
        ${hist.length ? `<ul class="lista">${hist.map((x) => `<li><div class="data"><b>${fd(x.quando)}</b></div><div class="txt"><span>${h(x.acao)} — ${h(x.quem)}</span></div></li>`).join("")}</ul>` : `<p class="vazio">Sem registros.</p>`}</div></div>
      ${e.obs ? `<div class="card c12"><div class="card-cab"><h3>Observações</h3></div><div class="card-corpo">${h(e.obs)}</div></div>` : ""}
    </div></div>`;
    $("#bEdit")?.addEventListener("click", () => formEmpresa(e));
    $("#bItem")?.addEventListener("click", () => formItem({ empresaId: e.id, area: (e.areas || ["ma"])[0] }));
    $("#bIA").addEventListener("click", () => { sessionStorage.setItem("olinpy_pergunta", `Sobre a empresa ${e.nome} (CNPJ ${fmtCNPJ(e.cnpj)}, segmento ${SEGMENTOS[e.segmento]?.nome || "não informado"}, CNAE ${e.cnae || "não informado"}): quais obrigações ambientais, de segurança do trabalho e de regularização normalmente se aplicam e o que devo conferir?`); location.hash = "assistente"; });
    $$("[data-edit]").forEach((b) => b.addEventListener("click", () => formItem(DADOS.itens.find((i) => i.id === b.dataset.edit))));
    $$("[data-ok]").forEach((b) => b.addEventListener("click", () => { concluirItem(DADOS.itens.find((i) => i.id === b.dataset.ok)); toast("Concluído."); rotear(); }));
  }

  function formItem(i = {}) {
    const novo = !i.id;
    const area0 = i.area || "ma";
    const opTipos = (a) => OBRIGACOES.filter((o) => o.area === a).map((o) => `<option value="${o.id}"${o.id === i.tipo ? " selected" : ""}>${h(o.nome)}</option>`).join("") + `<option value="outro"${i.tipo === "outro" ? " selected" : ""}>Outro documento…</option>`;
    dialogo(novo ? "Novo documento / prazo" : "Editar documento / prazo", `<form id="fIt" class="form">
      <label class="w">Empresa<select id="iEmp" required>${opcoesEmpresas(i.empresaId, "Escolha…")}</select></label>
      <label>Área<select id="iArea">${opcoesAreas(area0)}</select></label>
      <label>Tipo<select id="iTipo">${opTipos(area0)}</select></label>
      <label class="w">Título (aparece nos prazos)<input id="iTit" value="${h(i.titulo || "")}"></label>
      <p class="mut w" id="iDica" style="margin:-4px 0 0"></p>
      <label>Emissão<input id="iEmi" type="date" value="${h(i.emissao || "")}"></label>
      <label>Validade / prazo<input id="iVal" type="date" value="${h(i.validade || "")}"></label>
      <label>Repetir a cada (meses)<input id="iMeses" type="number" min="0" placeholder="não repete" value="${h(i.meses ?? "")}"></label>
      <label>Avisar com antecedência (dias)<input id="iAntes" type="number" min="0" value="${h(i.antes ?? "")}"></label>
      <label>Responsável<input id="iResp" value="${h(i.responsavel || S.nome)}"></label>
      <label>Nº do documento / processo<input id="iNum" value="${h(i.numero || "")}"></label>
      <label class="w">Link do arquivo (Drive) ou observação<input id="iObs" value="${h(i.obs || "")}"></label>
      <div class="rodape-form w">${!novo ? `<button type="button" class="btn perigo" id="iDel">Excluir</button>` : ""}<span style="flex:1"></span>
        <button type="button" class="btn claro" onclick="this.closest('dialog').close()">Cancelar</button><button class="btn">Salvar</button></div></form>`);
    const dica = () => { const o = OBR[$("#iTipo").value]; $("#iDica").innerHTML = o ? `${h(o.base)}${o.meses ? ` · periodicidade sugerida: ${o.meses} meses` : ""}${o.conferir ? " · <b>conferir prazo no órgão</b>" : ""}${o.dica ? `<br>${h(o.dica)}` : ""}` : "";
      if (o && !$("#iTit").value) $("#iTit").placeholder = o.nome; if (o?.meses && $("#iMeses").value === "") $("#iMeses").placeholder = `${o.meses} (sugerido)`;
      if (o && $("#iEmi").value && !$("#iVal").value && o.meses) $("#iVal").value = addMeses($("#iEmi").value, o.meses); };
    $("#iArea").addEventListener("change", () => { $("#iTipo").innerHTML = opTipos($("#iArea").value); dica(); });
    $("#iTipo").addEventListener("change", dica); $("#iEmi").addEventListener("change", dica); dica();
    $("#iDel")?.addEventListener("click", () => { if (!confirm("Excluir este item?")) return; DADOS.itens = DADOS.itens.filter((x) => x.id !== i.id); registrar(`Item excluído: ${i.titulo || OBR[i.tipo]?.nome}`, i.empresaId); salvar(); $("#dlg").close(); rotear(); });
    $("#fIt").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const tipo = $("#iTipo").value, o = OBR[tipo];
      const it = { ...i, id: i.id || uid(), empresaId: $("#iEmp").value, area: $("#iArea").value, tipo, titulo: $("#iTit").value.trim() || o?.nome || "Documento",
        emissao: $("#iEmi").value, validade: $("#iVal").value, meses: $("#iMeses").value === "" ? (o?.meses ?? null) : Number($("#iMeses").value),
        antes: $("#iAntes").value === "" ? undefined : Number($("#iAntes").value), responsavel: $("#iResp").value.trim(), numero: $("#iNum").value.trim(),
        obs: $("#iObs").value.trim(), status: i.status === "feito" ? "feito" : "pendente", sugerido: false };
      DADOS.itens = DADOS.itens.filter((x) => x.id !== it.id).concat(it);
      registrar(`${novo ? "Cadastrado" : "Atualizado"}: ${it.titulo}${it.validade ? ` (validade ${fd(it.validade)})` : ""}`, it.empresaId);
      automatizar(); salvar(); $("#dlg").close(); rotear(); montarMenu();
    });
  }

  /* ── prazos ────────────────────────────────────────────────────────── */
  function telaPrazos(filtroArea) {
    const F = telaPrazos.F || (telaPrazos.F = { q: "", area: "", st: "abertos", fonte: "" });
    const arg = rotaAtual.split("/")[1];
    if (arg === "atrasados") F.st = "atrasados"; else if (arg === "semana") F.st = "semana"; else if (arg === "30") F.st = "30";
    if (filtroArea) F.area = filtroArea;
    $("#acoesBarra").innerHTML = pode("editar") ? `<button class="btn" id="bNovoP">${ico("mais")} Novo prazo</button>` : "";
    const desenhar = () => {
      const q = F.q.toLowerCase();
      const lista = prazos().filter((p) => (!F.area || p.area === F.area) && (!F.fonte || p.fonte === F.fonte) && (!q || `${p.titulo} ${p.empresa}`.toLowerCase().includes(q))
        && ({ abertos: !p.feito && p.d >= -730, atrasados: !p.feito && p.d < 0, semana: !p.feito && p.d >= 0 && p.d <= 7, 30: !p.feito && p.d >= 0 && p.d <= 30, feitos: p.feito, todos: true })[F.st]);
      $("#tabP").innerHTML = lista.length ? lista.slice(0, 400).map((p) => { const [st, cls] = situacao(p);
        return `<tr class="${p.empresaId ? "clica" : ""}" data-emp="${h(p.empresaId || "")}"><td><b>${fd(p.data)}</b><br><span class="mut">${p.feito ? "" : p.d < 0 ? `${-p.d} d de atraso` : p.d === 0 ? "hoje" : `em ${p.d} d`}</span></td>
          <td>${h(p.titulo)}${p.conferir ? ` <span class="tag t-30">conferir</span>` : ""}<br><span class="mut">${h(p.empresa)}</span></td><td>${tagArea(p.area)}</td>
          <td><span class="mut">${({ item: "Documento", licenca: "Licença", condicionante: "Condicionante" })[p.fonte]}</span></td><td><span class="tag ${cls}">${st}</span></td></tr>`; }).join("")
        : `<tr><td colspan="5" class="vazio">Nada com esses filtros.</td></tr>`;
      $("#contP").textContent = plural(lista.length, "prazo", "prazos");
      $$("#tabP tr.clica").forEach((tr) => tr.addEventListener("click", () => { location.hash = `empresa/${tr.dataset.emp}`; }));
    };
    $("#conteudo").innerHTML = `<div class="largura">
      <div class="filtros"><input type="search" id="pq" placeholder="Buscar prazo ou empresa" value="${h(F.q)}">
        <select id="pst">${[["abertos", "Em aberto"], ["atrasados", "Atrasados"], ["semana", "Próximos 7 dias"], ["30", "Próximos 30 dias"], ["feitos", "Concluídos"], ["todos", "Todos"]].map(([k, n]) => `<option value="${k}"${F.st === k ? " selected" : ""}>${n}</option>`).join("")}</select>
        <select id="parea"><option value="">Todas as áreas</option>${opcoesAreas(F.area)}</select>
        <select id="pfonte"><option value="">Todas as origens</option>${[["item", "Documentos"], ["licenca", "Licenças"], ["condicionante", "Condicionantes"]].map(([k, n]) => `<option value="${k}"${F.fonte === k ? " selected" : ""}>${n}</option>`).join("")}</select>
        <span class="mut" id="contP"></span></div>
      <div class="card" style="overflow-x:auto"><table class="t"><thead><tr><th>Data</th><th>O quê</th><th>Área</th><th>Origem</th><th>Situação</th></tr></thead><tbody id="tabP"></tbody></table></div>
      <p class="mut" style="margin-top:10px">As condicionantes são marcadas como entregues no módulo <a href="#condicionantes">Condicionantes</a>. “Conferir” indica prazo que varia por órgão ou com divergência entre fontes.</p></div>`;
    $("#pq").addEventListener("input", (e) => { F.q = e.target.value; desenhar(); });
    $("#pst").addEventListener("change", (e) => { F.st = e.target.value; desenhar(); });
    $("#parea").addEventListener("change", (e) => { F.area = e.target.value; desenhar(); });
    $("#pfonte").addEventListener("change", (e) => { F.fonte = e.target.value; desenhar(); });
    $("#bNovoP")?.addEventListener("click", () => formItem({ area: F.area || "ma" }));
    desenhar();
  }

  /* ── áreas ─────────────────────────────────────────────────────────── */
  function telaArea(a) {
    const A = AREAS[a];
    if (!A) return inicio();
    const ps = prazos().filter((p) => p.area === a && !p.feito);
    const obrs = OBRIGACOES.filter((o) => o.area === a);
    const leis = LEGISLACAO.filter((l) => l.area === a);
    const atalhos = ATALHOS_IA.filter((x) => x.area === a);
    $("#conteudo").innerHTML = `<div class="largura">
      <div class="kpis"><button class="k r" data-f="atrasados"><b>${ps.filter((p) => p.d < 0).length}</b><span>atrasados</span></button>
        <button class="k l" data-f="semana"><b>${ps.filter((p) => p.d >= 0 && p.d <= 7).length}</b><span>em 7 dias</span></button>
        <button class="k a" data-f="30"><b>${ps.filter((p) => p.d >= 0 && p.d <= 30).length}</b><span>em 30 dias</span></button>
        <button class="k o" data-f="abertos"><b>${new Set(ps.map((p) => p.empresaId)).size}</b><span>empresas com prazos</span></button></div>
      <div class="grade">
        <div class="card c8"><div class="card-cab"><h3>Obrigações e documentos da área</h3><span class="mut">periodicidade de referência</span></div><div class="card-corpo" style="overflow-x:auto">
          <table class="t"><thead><tr><th>Obrigação</th><th>Base</th><th>Periodicidade</th></tr></thead><tbody>
          ${obrs.map((o) => `<tr><td><b>${h(o.nome)}</b>${o.conferir ? ` <span class="tag t-30">conferir</span>` : ""}${o.dica ? `<br><span class="mut">${h(o.dica)}</span>` : ""}</td><td class="mut">${h(o.base)}</td>
            <td>${o.meses ? `${o.meses === 12 ? "anual" : o.meses === 24 ? "a cada 2 anos" : o.meses === 36 ? "a cada 3 anos" : `${o.meses} meses`}${o.mesFixo ? ` (até ${o.mesFixo.split("-").reverse().join("/")})` : ""}` : "conforme documento"}${o.por === "trabalhador" ? "<br><span class='mut'>por trabalhador</span>" : o.por === "equipamento" ? "<br><span class='mut'>por equipamento</span>" : ""}</td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="c4" style="display:flex;flex-direction:column;gap:16px">
          <div class="card"><div class="card-cab"><h3>Perguntar à IA</h3></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:8px">
            ${atalhos.map((x, i) => `<button class="atalho" data-ia="${i}"><span class="ic" style="background:${A.cor}1a;color:${A.cor}">${ico("assistente")}</span><div><b>${h(x.t)}</b></div></button>`).join("")}</div></div>
          <div class="card"><div class="card-cab"><h3>Checklist de vistoria</h3></div><div class="card-corpo"><ul style="margin:0;padding-left:18px;font-size:.84rem">${(CHECKLISTS[a] || []).map((c) => `<li>${h(c)}</li>`).join("")}</ul>
            <a class="btn claro peq" style="margin-top:10px" href="#vistoria">Usar numa vistoria</a></div></div>
          <div class="card"><div class="card-cab"><h3>Legislação</h3><a class="mut" href="#legislacao">toda</a></div><div class="card-corpo">
            ${leis.map((l) => `<div class="lei"><div><b><a href="${h(l.url)}" target="_blank" rel="noopener">${h(l.nome)}</a></b><p>${h(l.resumo)}</p></div></div>`).join("")}</div></div>
        </div></div></div>`;
    $$("[data-f]").forEach((b) => b.addEventListener("click", () => { telaPrazos.F = { q: "", area: a, st: b.dataset.f, fonte: "" }; location.hash = "prazos"; }));
    $$("[data-ia]").forEach((b) => b.addEventListener("click", () => { sessionStorage.setItem("olinpy_pergunta", atalhos[+b.dataset.ia].p); location.hash = "assistente"; }));
  }

  /* ── tarefas (com cronômetro para medir o tempo gasto) ─────────────── */
  let cronometro = null;
  function telaTarefas() {
    const F = telaTarefas.F || (telaTarefas.F = { quem: "", area: "" });
    const ed = pode("editar");
    $("#acoesBarra").innerHTML = ed ? `<button class="btn claro" id="bAuto">${ico("automacoes")} Gerar pelos prazos</button><button class="btn" id="bNovaT">${ico("mais")} Nova tarefa</button>` : "";
    const cols = [["afazer", "A fazer"], ["fazendo", "Em andamento"], ["revisao", "Em revisão"], ["feito", "Concluídas"]];
    const resp = [...new Set(DADOS.tarefas.map((t) => t.responsavel).filter(Boolean))];
    const desenhar = () => {
      const ts = DADOS.tarefas.filter((t) => (!F.quem || t.responsavel === F.quem) && (!F.area || t.area === F.area));
      $("#kanban").innerHTML = cols.map(([k, n]) => {
        const lista = ts.filter((t) => t.status === k).sort((a, b) => (a.prazo || "9").localeCompare(b.prazo || "9"));
        const mostra = k === "feito" ? lista.slice(-15).reverse() : lista;
        return `<div class="card" style="min-width:0"><div class="card-cab"><h3>${n}</h3><span class="mut">${lista.length}</span></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:8px">
          ${mostra.map((t) => { const d = t.prazo ? dias(t.prazo) : null; const atr = d !== null && d < 0 && k !== "feito";
            return `<div class="atalho" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default;${atr ? "border-color:#efc2bc" : ""}">
              <div style="display:flex;gap:6px;align-items:center">${tagArea(t.area || "ma")}${t.auto ? `<span class="tag t-cinza">automática</span>` : ""}${atr ? `<span class="tag t-atr">atrasada</span>` : ""}</div>
              <b style="font-size:.86rem">${h(t.titulo)}</b><span class="mut">${h(curto(empresa(t.empresaId)?.nome || ""))}${t.prazo ? ` · ${fd(t.prazo)}` : ""}${t.responsavel ? ` · ${h(t.responsavel)}` : ""}${t.minutos ? ` · ${t.minutos} min` : ""}</span>
              ${ed ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${k !== "feito" ? `<button class="btn claro peq" data-cron="${t.id}">${cronometro?.id === t.id ? "Parar ⏱" : "Iniciar ⏱"}</button>` : ""}
                <select class="peq" data-st="${t.id}" style="width:auto;padding:4px 6px;font-size:.76rem">${cols.map(([c, cn]) => `<option value="${c}"${c === t.status ? " selected" : ""}>${cn}</option>`).join("")}</select>
                <button class="btn claro peq" data-et="${t.id}">Editar</button></div>` : ""}</div>`; }).join("") || `<p class="vazio" style="padding:8px 0">—</p>`}</div></div>`;
      }).join("");
      $$("[data-st]").forEach((s) => s.addEventListener("change", () => { const t = DADOS.tarefas.find((x) => x.id === s.dataset.st); t.status = s.value;
        if (s.value === "feito") { t.concluida = new Date().toISOString(); const it = DADOS.itens.find((i) => t.origem === `auto:${i.id}`); if (it && it.status !== "feito") concluirItem(it); }
        registrar(`Tarefa “${t.titulo}” → ${cols.find((c) => c[0] === s.value)[1]}`, t.empresaId); salvar(); desenhar(); montarMenu(); }));
      $$("[data-et]").forEach((b) => b.addEventListener("click", () => formTarefa(DADOS.tarefas.find((x) => x.id === b.dataset.et))));
      $$("[data-cron]").forEach((b) => b.addEventListener("click", () => {
        const t = DADOS.tarefas.find((x) => x.id === b.dataset.cron);
        if (cronometro?.id === t.id) { const min = Math.max(1, Math.round((Date.now() - cronometro.ini) / 60000)); t.minutos = (t.minutos || 0) + min; cronometro = null;
          toast(`${min} min registrados em “${curto(t.titulo)}”.`); salvar(); }
        else { cronometro = { id: t.id, ini: Date.now() }; if (t.status === "afazer") t.status = "fazendo"; toast("Cronômetro iniciado."); salvar(); }
        desenhar(); }));
    };
    $("#conteudo").innerHTML = `<div style="max-width:1400px;margin:0 auto">
      <div class="filtros"><select id="tq"><option value="">Todos os responsáveis</option>${resp.map((r) => `<option${F.quem === r ? " selected" : ""}>${h(r)}</option>`).join("")}</select>
        <select id="ta"><option value="">Todas as áreas</option>${opcoesAreas(F.area)}</select>
        <span class="mut">O cronômetro registra o tempo gasto em cada tarefa (alimenta os Indicadores).</span></div>
      <div id="kanban" style="display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:14px;overflow-x:auto"></div></div>`;
    $("#tq").addEventListener("change", (e) => { F.quem = e.target.value; desenhar(); });
    $("#ta").addEventListener("change", (e) => { F.area = e.target.value; desenhar(); });
    $("#bNovaT")?.addEventListener("click", () => formTarefa());
    $("#bAuto")?.addEventListener("click", () => { const n = automatizar(); toast(n ? `${plural(n, "tarefa criada", "tarefas criadas")} a partir dos prazos.` : "Nenhuma tarefa nova: os prazos próximos já têm tarefa."); desenhar(); montarMenu(); });
    desenhar();
  }
  function formTarefa(t = {}) {
    const novo = !t.id;
    dialogo(novo ? "Nova tarefa" : "Editar tarefa", `<form id="fT" class="form">
      <label class="w">O que fazer<input id="tTit" required value="${h(t.titulo || "")}"></label>
      <label>Empresa<select id="tEmp">${opcoesEmpresas(t.empresaId)}</select></label><label>Área<select id="tArea">${opcoesAreas(t.area || "ma")}</select></label>
      <label>Prazo<input id="tPrazo" type="date" value="${h(t.prazo || "")}"></label><label>Responsável<input id="tResp" value="${h(t.responsavel || S.nome)}"></label>
      <label class="w">Detalhes<textarea id="tDet">${h(t.detalhes || "")}</textarea></label>
      <div class="rodape-form w">${!novo ? `<button type="button" class="btn perigo" id="tDel">Excluir</button>` : ""}<span style="flex:1"></span>
        <button type="button" class="btn claro" onclick="this.closest('dialog').close()">Cancelar</button><button class="btn">Salvar</button></div></form>`);
    $("#tDel")?.addEventListener("click", () => { if (!confirm("Excluir esta tarefa?")) return; DADOS.tarefas = DADOS.tarefas.filter((x) => x.id !== t.id); salvar(); $("#dlg").close(); rotear(); });
    $("#fT").addEventListener("submit", (ev) => { ev.preventDefault();
      const n = { ...t, id: t.id || uid(), titulo: $("#tTit").value.trim(), empresaId: $("#tEmp").value, area: $("#tArea").value, prazo: $("#tPrazo").value,
        responsavel: $("#tResp").value.trim(), detalhes: $("#tDet").value.trim(), status: t.status || "afazer", criada: t.criada || new Date().toISOString(), minutos: t.minutos || 0 };
      DADOS.tarefas = DADOS.tarefas.filter((x) => x.id !== n.id).concat(n);
      registrar(`${novo ? "Tarefa criada" : "Tarefa atualizada"}: ${n.titulo}`, n.empresaId); salvar(); $("#dlg").close(); rotear(); montarMenu(); });
  }

  /* ── automações ────────────────────────────────────────────────────── */
  function telaAutomacoes() {
    const A = DADOS.config.auto, ed = pode("editar");
    const ativas = [
      ["tarefas", "Criar tarefas a partir dos prazos", `Quando um documento, licença ou condicionante estiver a menos de <input type="number" id="aAnt" min="1" max="365" value="${A.antecedencia}" style="width:70px;display:inline-block;padding:3px 6px" ${ed ? "" : "disabled"}> dias do vencimento, o Olinpy cria uma tarefa para o responsável.`],
      ["proximo", "Gerar o próximo prazo ao concluir", "Ao concluir um item periódico (PGR, ASO, alvará, RAPP…), o próximo vencimento é criado com a periodicidade do item."],
      ["cnpj", "Cadastro automático pelo CNPJ", "Busca razão social, CNAE, porte, endereço e contato na Receita (BrasilAPI / Minha Receita), sugere o segmento e as obrigações daquele tipo de empresa."],
    ];
    $("#conteudo").innerHTML = `<div class="largura">${somenteLeitura()}
      <div class="aviso verde" style="margin-bottom:16px">${ico("info")}<div>As automações <b>ajudam</b>, mas não decidem: tarefas, prazos e textos gerados ficam marcados para o técnico revisar e validar.</div></div>
      <div class="grade"><div class="card c7"><div class="card-cab"><h3>Automações do escritório</h3></div><div class="card-corpo">
        ${ativas.map(([k, t, d]) => `<div class="lei"><label class="check" style="align-self:flex-start;margin-top:3px"><input type="checkbox" data-auto="${k}"${A[k] ? " checked" : ""}${ed ? "" : " disabled"}></label><div><b>${t}</b><p>${d}</p></div></div>`).join("")}
        <div class="rodape-form">${ed ? `<button class="btn" id="bRodar">${ico("automacoes")} Rodar agora</button>` : ""}</div></div></div>
      <div class="card c5"><div class="card-cab"><h3>Fontes externas usadas</h3></div><div class="card-corpo"><ul class="lista">
        ${[["Receita Federal (CNPJ)", "BrasilAPI e Minha Receita: dados cadastrais e CNAE"], ["ViaCEP", "Endereço pelo CEP"], ["IBGE", "Descrição de CNAE e malhas dos municípios (mapas)"],
           ["BrasilAPI – feriados", "Contagem de dias úteis nas calculadoras"], ["OpenStreetMap / OSRM", "Localização e rotas de acesso nos mapas"],
           ["ANA, ICMBio, SGB, IBGE, CAR, MMA", "Camadas oficiais do GeoMapa"], ["Groq / Gemini", "Modelos de IA do assistente (chave gratuita)"]]
          .map(([t, d]) => `<li><div class="txt"><b>${t}</b><span>${d}</span></div></li>`).join("")}</ul></div></div></div></div>`;
    $$("[data-auto]").forEach((c) => c.addEventListener("change", () => { A[c.dataset.auto] = c.checked; salvar(); registrar(`Automação “${c.dataset.auto}” ${c.checked ? "ligada" : "desligada"}`); }));
    $("#aAnt")?.addEventListener("change", (e) => { A.antecedencia = Number(e.target.value) || 30; salvar(); });
    $("#bRodar")?.addEventListener("click", () => { const n = automatizar(); toast(n ? `${plural(n, "tarefa criada", "tarefas criadas")}.` : "Tudo em dia: nenhuma tarefa nova."); montarMenu(); });
  }

  /* ── histórico ─────────────────────────────────────────────────────── */
  function telaHistorico() {
    const emps = empresas();
    $("#conteudo").innerHTML = `<div class="largura"><div class="card"><div class="card-corpo" style="padding-top:16px">
      ${DADOS.historico.length ? `<table class="t"><thead><tr><th>Quando</th><th>Quem</th><th>Empresa</th><th>O que aconteceu</th></tr></thead><tbody>
      ${DADOS.historico.slice(0, 300).map((x) => `<tr><td style="white-space:nowrap">${new Date(x.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td>${h(x.quem)}</td>
        <td>${h(curto(emps.find((e) => e.id === x.empresaId)?.nome || ""))}</td><td>${h(x.acao)}</td></tr>`).join("")}</tbody></table>` : `<p class="vazio">Ainda não há registros.</p>`}</div></div></div>`;
  }

  /* ── indicadores (medição para o PII: manual x Olinpy) ─────────────── */
  function telaIndicadores() {
    const M = DADOS.medicoes;
    const porTarefa = {};
    M.forEach((m) => { (porTarefa[m.tarefa] ||= { manual: [], olinpy: [] })[m.modo].push(m); });
    const media = (a, k) => (a.length ? a.reduce((s, x) => s + Number(x[k] || 0), 0) / a.length : 0);
    const linhas = Object.entries(porTarefa).map(([t, v]) => { const mm = media(v.manual, "minutos"), mo = media(v.olinpy, "minutos");
      const econ = mm && mo ? Math.round((1 - mo / mm) * 100) : null;
      return { t, mm, mo, econ, erM: media(v.manual, "erros"), erO: media(v.olinpy, "erros"), n: v.manual.length + v.olinpy.length }; });
    const tempoTarefas = DADOS.tarefas.reduce((s, t) => s + (t.minutos || 0), 0);
    const concl = DADOS.tarefas.filter((t) => t.status === "feito");
    const noPrazo = concl.filter((t) => !t.prazo || (t.concluida || "").slice(0, 10) <= t.prazo).length;
    $("#conteudo").innerHTML = `<div class="largura">
      <div class="aviso info" style="margin-bottom:16px">${ico("info")}<div>Para mostrar que o sistema realmente ajuda, registre quanto tempo uma tarefa leva <b>do jeito manual</b> e <b>com o Olinpy</b>, e quantos erros precisaram ser corrigidos. Use números medidos de verdade.</div></div>
      <div class="kpis"><div class="k"><b>${Math.round(tempoTarefas / 60 * 10) / 10} h</b><span>tempo registrado nas tarefas</span></div>
        <div class="k o"><b>${concl.length ? Math.round(noPrazo / concl.length * 100) : 0}%</b><span>tarefas concluídas no prazo</span></div>
        <div class="k a"><b>${M.length}</b><span>medições registradas</span></div>
        <div class="k"><b>${DADOS.tarefas.filter((t) => t.auto).length}</b><span>tarefas criadas automaticamente</span></div></div>
      <div class="grade"><div class="card c8"><div class="card-cab"><h3>Comparação manual × Olinpy</h3></div><div class="card-corpo" style="overflow-x:auto">
        ${linhas.length ? `<table class="t"><thead><tr><th>Tarefa</th><th>Manual (média)</th><th>Com o Olinpy</th><th>Economia</th><th>Erros (manual → Olinpy)</th><th>Medições</th></tr></thead><tbody>
        ${linhas.map((l) => `<tr><td><b>${h(l.t)}</b></td><td>${l.mm ? `${l.mm.toFixed(1)} min` : "—"}</td><td>${l.mo ? `${l.mo.toFixed(1)} min` : "—"}</td>
          <td>${l.econ !== null ? `<span class="tag ${l.econ > 0 ? "t-ok" : "t-atr"}">${l.econ}%</span>` : "—"}</td><td>${l.erM.toFixed(1)} → ${l.erO.toFixed(1)}</td><td>${l.n}</td></tr>`).join("")}</tbody></table>`
          : `<p class="vazio">Nenhuma medição ainda.</p>`}</div></div>
      <div class="card c4"><div class="card-cab"><h3>Nova medição</h3></div><div class="card-corpo"><form id="fMed" style="display:flex;flex-direction:column;gap:10px">
        <label>Tarefa medida<input id="mT" list="mLista" required placeholder="Ex.: Montar calendário de condicionantes"><datalist id="mLista">${Object.keys(porTarefa).map((t) => `<option>${h(t)}</option>`).join("")}</datalist></label>
        <label>Como foi feita<select id="mModo"><option value="manual">Manual (planilha, Word, papel)</option><option value="olinpy">Com o Olinpy</option></select></label>
        <div class="form"><label>Minutos<input id="mMin" type="number" min="1" required></label><label>Erros corrigidos<input id="mErr" type="number" min="0" value="0"></label></div>
        <label>Observação<input id="mObs"></label><button class="btn"${pode("editar") ? "" : " disabled"}>Registrar</button></form></div></div></div></div>`;
    $("#fMed").addEventListener("submit", (e) => { e.preventDefault();
      DADOS.medicoes.push({ tarefa: $("#mT").value.trim(), modo: $("#mModo").value, minutos: Number($("#mMin").value), erros: Number($("#mErr").value || 0), obs: $("#mObs").value, quem: S.nome, quando: new Date().toISOString() });
      salvar(); toast("Medição registrada."); telaIndicadores(); });
  }

  /* ── usuários ──────────────────────────────────────────────────────── */
  async function telaUsuarios() {
    if (!pode("usuarios")) { $("#conteudo").innerHTML = `<p class="vazio">Só administradores gerenciam usuários.</p>`; return; }
    let lista;
    try { lista = await OlinpyCripto.usuarios(); } catch (e) { lista = { versao: 1, usuarios: [] }; }
    const pend = JSON.parse(sessionStorage.getItem("olinpy_usuarios_pend") || "null");
    if (pend) lista = pend;
    $("#acoesBarra").innerHTML = `<button class="btn" id="bNovoU">${ico("mais")} Novo usuário</button>`;
    $("#conteudo").innerHTML = `<div class="largura">
      ${pend ? `<div class="aviso" style="margin-bottom:14px">${ico("alerta")}<div>Há mudanças ainda <b>não publicadas</b>. Baixe o arquivo e envie para <code>dados/usuarios.json</code> no GitHub. <button class="btn peq" id="bBaixarU" style="margin-left:8px">Baixar usuarios.json</button></div></div>` : ""}
      <div class="grade"><div class="card c8"><div class="card-cab"><h3>Equipe</h3></div><div class="card-corpo"><table class="t"><thead><tr><th>Usuário</th><th>Nome</th><th>Papel</th><th>Desde</th><th></th></tr></thead><tbody>
        ${lista.usuarios.map((u) => `<tr><td><b>${h(u.login)}</b></td><td>${h(u.nome)}</td><td>${h(PAPEIS[u.papel] || u.papel)}</td><td>${fd(u.criado)}</td>
          <td>${u.login !== S.login ? `<button class="btn perigo peq" data-rm="${h(u.login)}">Remover</button>` : `<button class="btn claro peq" id="bMinha">Trocar minha senha</button>`}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card c4"><div class="card-cab"><h3>Papéis</h3></div><div class="card-corpo" style="font-size:.85rem;display:flex;flex-direction:column;gap:8px">
        <div><b>Administrador</b> – tudo, inclusive usuários e publicação dos dados da equipe.</div><div><b>Técnico</b> – cadastra e edita empresas, prazos, tarefas e vistorias.</div>
        <div><b>Somente consulta</b> – vê tudo, não altera (bom para estagiários iniciantes ou o cliente).</div>
        <p class="mut" style="margin:6px 0 0">Como o site é estático, a lista de usuários fica em <code>dados/usuarios.json</code>: depois de criar ou remover alguém, baixe o arquivo e envie para o GitHub. Cada pessoa só entra com a própria senha, que nunca é guardada.</p></div></div></div></div>`;
    const pendente = (l) => { sessionStorage.setItem("olinpy_usuarios_pend", JSON.stringify(l)); telaUsuarios(); };
    $("#bBaixarU")?.addEventListener("click", () => { baixar("usuarios.json", JSON.stringify(pend, null, 1), "application/json"); });
    $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { if (!confirm(`Remover o acesso de ${b.dataset.rm}?`)) return;
      lista.usuarios = lista.usuarios.filter((u) => u.login !== b.dataset.rm); registrar(`Usuário removido: ${b.dataset.rm}`); pendente(lista); }));
    const formU = (proprio) => {
      dialogo(proprio ? "Trocar minha senha" : "Novo usuário", `<form id="fU" class="form">
        ${proprio ? "" : `<label>Usuário (login)<input id="uL" required pattern="[a-z0-9._-]{3,30}" placeholder="ex.: maria"></label><label>Nome<input id="uN" required></label>
        <label class="w">Papel<select id="uP"><option value="tecnico">Técnico</option><option value="consulta">Somente consulta</option><option value="admin">Administrador</option></select></label>`}
        <label>Senha (mín. 10 caracteres)<input id="uS" type="password" minlength="10" required autocomplete="new-password"></label>
        <label>Repita a senha<input id="uS2" type="password" minlength="10" required autocomplete="new-password"></label>
        <p class="mut w" style="margin:0">A senha é usada só para cifrar a chave do escritório neste navegador; ela não é enviada a lugar nenhum.</p>
        <div class="rodape-form w"><button type="button" class="btn claro" onclick="this.closest('dialog').close()">Cancelar</button><button class="btn">Gerar acesso</button></div></form>`);
      $("#fU").addEventListener("submit", async (e) => { e.preventDefault();
        if ($("#uS").value !== $("#uS2").value) { toast("As senhas não conferem."); return; }
        const reg = await OlinpyCripto.registroUsuario({ login: proprio ? S.login : $("#uL").value, nome: proprio ? S.nome : $("#uN").value, papel: proprio ? S.papel : $("#uP").value, senha: $("#uS").value });
        if (!proprio && lista.usuarios.some((u) => u.login === reg.login)) { toast("Esse usuário já existe."); return; }
        lista.usuarios = lista.usuarios.filter((u) => u.login !== reg.login).concat(reg).sort((a, b) => a.login.localeCompare(b.login));
        registrar(proprio ? "Senha própria trocada (aguardando publicação)" : `Usuário criado: ${reg.login} (${PAPEIS[reg.papel]})`);
        $("#dlg").close(); pendente(lista); });
    };
    $("#bNovoU").addEventListener("click", () => formU(false));
    $("#bMinha")?.addEventListener("click", () => formU(true));
  }

  /* ── configurações ─────────────────────────────────────────────────── */
  function telaConfig() {
    const C = DADOS.config, ia = OlinpyIA.config();
    $("#conteudo").innerHTML = `<div class="largura"><div class="grade">
      <div class="card c6"><div class="card-cab"><h3>Escritório</h3></div><div class="card-corpo"><form id="fCfg" class="form">
        <label class="w">Nome do escritório<input id="cNome" value="${h(C.escritorio)}"></label><label>Cidade/UF<input id="cCid" value="${h(C.cidade)}"></label>
        <label>Responsável técnico<input id="cRt" value="${h(C.rt || "")}"></label><label class="w">Registro (CREA/CFT/CRQ…)<input id="cReg" value="${h(C.registro || "")}"></label>
        <label class="w">WhatsApp do escritório<input id="cZap" value="${h(C.whatsapp || "")}"></label>
        <div class="rodape-form w"><button class="btn"${pode("editar") ? "" : " disabled"}>Salvar</button></div></form></div></div>
      <div class="card c6"><div class="card-cab"><h3>Assistente de IA</h3></div><div class="card-corpo"><form id="fIA" class="form">
        <label class="w">Provedor<select id="iaProv"><option value="groq"${ia.provedor === "groq" ? " selected" : ""}>Groq (grátis) – gpt-oss-120b</option><option value="gemini"${ia.provedor === "gemini" ? " selected" : ""}>Google Gemini (grátis) – gemini-2.5-flash</option></select></label>
        <label class="w">Chave da API<input id="iaChave" type="password" autocomplete="off" placeholder="${ia.temChave ? "chave salva (cifrada) – digite para trocar" : "cole aqui a sua chave"}"></label>
        <p class="mut w" style="margin:0">A chave fica cifrada neste navegador, junto com os seus dados. Crie a sua grátis em <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a> ou <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a>.</p>
        <div class="rodape-form w"><button class="btn">Salvar</button></div></form></div></div>
      <div class="card c12"><div class="card-cab"><h3>Dados e cópias de segurança</h3></div><div class="card-corpo">
        <p class="mut" style="margin-top:0">Empresas, prazos, tarefas, vistorias e histórico ficam <b>cifrados neste navegador</b>. Para levar a outro computador ou compartilhar com a equipe:</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn claro" id="bBackup">Baixar backup cifrado</button>
          <label class="btn claro">Restaurar backup<input type="file" id="fRest" accept=".olinpy" hidden></label>
          ${S.papel === "admin" ? `<button class="btn" id="bPub">Gerar arquivo da equipe (equipe.enc)</button>` : ""}
          <button class="btn claro" id="bEquipe">Carregar dados publicados da equipe</button></div>
        <p class="mut" style="margin-bottom:0">O arquivo <code>equipe.enc</code> vai para a pasta <code>dados/</code> do site: quem entrar num computador novo recebe esses dados. Só abre com login.</p></div></div>
    </div></div>`;
    $("#fCfg").addEventListener("submit", (e) => { e.preventDefault(); Object.assign(C, { escritorio: $("#cNome").value.trim(), cidade: $("#cCid").value.trim(), rt: $("#cRt").value.trim(), registro: $("#cReg").value.trim(), whatsapp: $("#cZap").value.trim() }); salvar(); toast("Salvo."); });
    $("#fIA").addEventListener("submit", async (e) => { e.preventDefault(); await OlinpyIA.salvarConfig({ provedor: $("#iaProv").value, chave: $("#iaChave").value.trim() }); toast("Configuração da IA salva."); telaConfig(); });
    $("#bBackup").addEventListener("click", async () => { const bytes = await OlinpyCripto.cifrar(await OlinpyCripto.chave(), new TextEncoder().encode(JSON.stringify(DADOS)));
      baixar(`olinpy-backup-${HOJE_ISO}.olinpy`, new Blob([bytes])); registrar("Backup baixado"); });
    $("#fRest").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(new TextDecoder().decode(await OlinpyCripto.decifrar(await OlinpyCripto.chave(), await f.arrayBuffer())));
        if (!confirm("Substituir os dados deste navegador pelo backup?")) return; DADOS = Object.assign(PADRAO(), d); salvar(); registrar("Backup restaurado"); toast("Backup restaurado."); montarMenu(); }
      catch (err) { toast("Arquivo inválido ou de outro escritório."); } });
    $("#bPub")?.addEventListener("click", async () => { const bytes = await OlinpyCripto.cifrar(await OlinpyCripto.chave(), new TextEncoder().encode(JSON.stringify({ ...DADOS, publicado: new Date().toISOString(), por: S.nome })));
      baixar("equipe.enc", new Blob([bytes])); registrar("Arquivo da equipe gerado"); toast("Envie equipe.enc para a pasta dados/ no GitHub."); });
    $("#bEquipe").addEventListener("click", async () => { try { const d = await OlinpyCripto.jsonProtegido("dados/equipe.enc");
      if (!confirm(`Substituir os dados deste navegador pelos publicados${d.publicado ? ` em ${fd(d.publicado)}` : ""}?`)) return;
      DADOS = Object.assign(PADRAO(), d); salvar(); toast("Dados da equipe carregados."); montarMenu(); } catch (err) { toast("Ainda não há dados publicados da equipe."); } });
  }

  /* ── início da sessão ──────────────────────────────────────────────── */
  async function abrirApp() {
    S = OlinpyCripto.sessao();
    $("#telaLogin").hidden = true; $("#app").hidden = false;
    $("#uNome").textContent = S.nome; $("#uPapel").textContent = PAPEIS[S.papel] || S.papel;
    $("#uAvatar").textContent = S.nome.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    $("#conteudo").innerHTML = `<p class="vazio">Abrindo os dados do escritório…</p>`;
    await carregar();
    await OlinpyIA.carregar().catch(() => {});
    const n = automatizar();
    montarMenu();
    rotear();
    if (n) toast(`Automação: ${plural(n, "tarefa nova criada", "tarefas novas criadas")} a partir dos prazos.`);
  }
  function iniciar() {
    window.addEventListener("hashchange", () => { if (S) rotear(); });
    $("#bSair").addEventListener("click", () => { OlinpyCripto.sair(); location.hash = ""; location.reload(); });
    $("#bMenu").addEventListener("click", () => $("#app").classList.toggle("menu-aberto"));
    $("#dlg").addEventListener("click", (e) => { if (e.target.id === "dlg") e.target.close(); });
    $("#fLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = $("#lEntrar"); b.disabled = true; b.textContent = "Verificando…"; $("#loginErro").hidden = true;
      try { await OlinpyCripto.entrar($("#lUsuario").value, $("#lSenha").value); $("#lSenha").value = ""; await abrirApp(); }
      catch (err) { $("#loginErro").textContent = err.message; $("#loginErro").hidden = false; }
      finally { b.disabled = false; b.textContent = "Entrar"; }
    });
    if (OlinpyCripto.sessao()) abrirApp().catch((e) => { console.error(e); OlinpyCripto.sair(); location.reload(); });
    else { $("#telaLogin").hidden = false; $("#lUsuario").focus(); }
  }

  return { iniciar, rotear, toast, dialogo, baixar, salvar, registrar, empresas, empresa, prazos, entregas, situacao, pode, buscarCNPJ, buscarCEP, feriados,
    opcoesEmpresas, opcoesAreas, tagArea, get dados() { return DADOS; }, get sessao() { return S; }, get base() { return BASE; } };
})();

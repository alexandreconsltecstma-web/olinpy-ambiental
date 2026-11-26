/* Olinpy – ferramentas: assistente, condicionantes e mapas (embutidos), vistoria de campo, propostas,
   calculadoras e legislação. */
"use strict";

/* ── armazenamento das fotos de vistoria (IndexedDB, cifrado) ───────── */
const FotosDB = (() => {
  let db = null;
  const abrir = () => db || (db = new Promise((ok, erro) => { const r = indexedDB.open("olinpy", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); }));
  const tx = async (modo, fn) => { const d = await abrir(); return new Promise((ok, erro) => { const t = d.transaction("fotos", modo); const r = fn(t.objectStore("fotos")); t.oncomplete = () => ok(r?.result); t.onerror = () => erro(t.error); }); };
  return {
    async gravar(id, blob) { const b = await OlinpyCripto.cifrar(await OlinpyCripto.chave(), new Uint8Array(await blob.arrayBuffer())); return tx("readwrite", (s) => s.put(b, id)); },
    async ler(id) { const d = await abrir(); const b = await new Promise((ok) => { const r = d.transaction("fotos").objectStore("fotos").get(id); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
      if (!b) return null; return new Blob([await OlinpyCripto.decifrar(await OlinpyCripto.chave(), b)], { type: "image/jpeg" }); },
    apagar(id) { return tx("readwrite", (s) => s.delete(id)); },
  };
})();
const blobURL = (b) => (b ? URL.createObjectURL(b) : "");
const blobDataURL = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });

async function reduzirFoto(arquivo) {
  const img = await createImageBitmap(arquivo);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.82));
}
const posicao = () => new Promise((ok) => { if (!navigator.geolocation) return ok(null);
  navigator.geolocation.getCurrentPosition((p) => ok({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), prec: Math.round(p.coords.accuracy) }), () => ok(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); });

/* ── coordenadas: UTM SIRGAS 2000 (GRS80) ida e volta ───────────────── */
const GRS = { a: 6378137, f: 1 / 298.257222101, k0: 0.9996 };
function paraUTM(lon, lat, zona = Math.floor((lon + 180) / 6) + 1) {
  const { a, f, k0 } = GRS, e2 = f * (2 - f), ep2 = e2 / (1 - e2), lon0 = (((zona - 1) * 6 - 180 + 3) * Math.PI) / 180, fi = (lat * Math.PI) / 180, la = (lon * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(fi) ** 2), T = Math.tan(fi) ** 2, C = ep2 * Math.cos(fi) ** 2, A = Math.cos(fi) * (la - lon0);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * fi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * fi) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * fi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * fi));
  const E = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let Nn = k0 * (M + N * Math.tan(fi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) Nn += 10000000;
  return { E, N: Nn, zona, hemis: lat < 0 ? "S" : "N" };
}
function deUTM(E, N, zona, sul = true) {
  const { a, f, k0 } = GRS, e2 = f * (2 - f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = E - 500000, y = sul ? N - 10000000 : N, lon0 = (((zona - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const fi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(fi1) ** 2), T1 = Math.tan(fi1) ** 2, C1 = ep2 * Math.cos(fi1) ** 2, R1 = a * (1 - e2) / (1 - e2 * Math.sin(fi1) ** 2) ** 1.5, Dd = x / (N1 * k0);
  const lat = fi1 - (N1 * Math.tan(fi1) / R1) * (Dd ** 2 / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * Dd ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * Dd ** 6 / 720);
  const lon = lon0 + (Dd - (1 + 2 * T1 + C1) * Dd ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * Dd ** 5 / 120) / Math.cos(fi1);
  return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
}
const gms = (v, eixo) => { const s = v < 0 ? (eixo === "lat" ? "S" : "O") : (eixo === "lat" ? "N" : "L"); v = Math.abs(v); const g = Math.floor(v), m = Math.floor((v - g) * 60), sg = ((v - g) * 60 - m) * 60;
  return `${g}°${String(m).padStart(2, "0")}'${sg.toFixed(2).padStart(5, "0")}" ${s}`; };
function lerCoord(t) {  // aceita -9.75 ou 9°45'09" S
  t = String(t).trim().replace(",", ".");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = t.match(/(\d+)[°º\s]+(\d+)['’\s]+([\d.]+)["”]?\s*([NSLOEW])?/i);
  if (!m) return NaN;
  const v = +m[1] + +m[2] / 60 + +m[3] / 3600;
  return /[SOW]/i.test(m[4] || "") ? -v : v;
}

/* ── páginas impressas (relatórios e propostas) ────────────────────── */
function abrirImpressao(titulo, corpo) {
  const C = Olinpy.dados.config;
  const w = window.open("", "_blank");
  if (!w) { Olinpy.toast("Permita pop-ups para gerar o PDF."); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${h(titulo)}</title><style>
    @page{size:A4;margin:16mm 14mm} body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#1c2430;margin:0}
    .cab{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1f4d3a;padding-bottom:8px;margin-bottom:14px} .cab img{height:46px}
    .cab b{font-size:13pt;color:#1f4d3a;display:block} .cab span{font-size:9pt;color:#5d6878}
    h1{font-size:15pt;color:#1f4d3a;margin:6px 0 2px} h2{font-size:11.5pt;color:#1f4d3a;border-bottom:1px solid #cfd8d3;padding-bottom:3px;margin:16px 0 8px}
    table{width:100%;border-collapse:collapse;margin:6px 0} th,td{border:1px solid #c9d0d8;padding:5px 7px;text-align:left;vertical-align:top;font-size:9.5pt} th{background:#eef3f0}
    .nc td{background:#fdeeee} .fotos{display:grid;grid-template-columns:1fr 1fr;gap:10px} .f{border:1px solid #c9d0d8;padding:6px;break-inside:avoid}
    .f img{width:100%;height:230px;object-fit:cover;display:block} .f p{margin:5px 0 0;font-size:9pt} .f small{color:#5d6878;font-size:8pt}
    .dados{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:9.5pt} .tot{text-align:right;font-size:12pt;font-weight:bold;color:#1f4d3a}
    .ass{margin-top:46px;display:flex;justify-content:space-around;text-align:center;font-size:9pt} .ass div{border-top:1px solid #333;padding-top:4px;width:40%}
    .rod{margin-top:22px;font-size:8pt;color:#8a94a3;border-top:1px solid #e1e5ea;padding-top:6px}
  </style></head><body><div class="cab"><img src="${location.origin}${location.pathname.replace(/[^/]*$/, "")}logo.png" alt=""><div><b>${h(C.escritorio)}</b><span>${h([C.cidade, C.whatsapp && `WhatsApp ${C.whatsapp}`].filter(Boolean).join(" · "))}</span></div></div>
  ${corpo}<div class="rod">Documento gerado no Olinpy em ${new Date().toLocaleString("pt-BR")} · revisar e validar antes de enviar.</div></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 700);
}

const OlinpyTelas = {
  assistente: (c) => OlinpyIA.tela(c),

  condicionantes(c) {
    c.className = "conteudo cheio";
    c.innerHTML = `<iframe src="painel/?embed=1" title="Painel de condicionantes"></iframe>`;
  },

  mapas(c, emp) {
    c.className = "conteudo cheio";
    const u = new URLSearchParams({ embed: "1" });
    if (emp) { const e = Olinpy.empresas().find((x) => x.nome === emp); u.set("empreendimento", emp); if (e?.cnpj) u.set("cnpj", e.cnpj); }
    c.innerHTML = `<iframe src="https://alexandreconsltecstma-web.github.io/geomapa-qgis/?${u}" title="GeoMapa" allow="geolocation; clipboard-write"></iframe>`;
    $("#acoesBarra").innerHTML = `<a class="btn claro peq" target="_blank" rel="noopener" href="https://alexandreconsltecstma-web.github.io/geomapa-qgis/">${ico("externo")} Abrir em tela cheia</a>`;
  },

  /* ── vistoria ──────────────────────────────────────────────────────── */
  async vistoria(c, empId) {
    const D0 = Olinpy.dados; D0.vistorias ||= [];
    const ed = Olinpy.pode("editar");
    const lista = () => {
      $("#acoesBarra").innerHTML = ed ? `<button class="btn" id="bNovaV">${ico("mais")} Nova vistoria</button>` : "";
      c.innerHTML = `<div class="largura"><div class="card"><div class="card-corpo" style="padding-top:14px">
        ${D0.vistorias.length ? `<table class="t"><thead><tr><th>Data</th><th>Empresa</th><th>Áreas</th><th>Não conformidades</th><th>Fotos</th></tr></thead><tbody>
          ${D0.vistorias.slice().sort((a, b) => b.data.localeCompare(a.data)).map((v) => `<tr class="clica" data-v="${v.id}"><td>${fd(v.data)}</td><td>${h(Olinpy.empresa(v.empresaId)?.nome || v.local || "—")}</td>
            <td>${v.areas.map(Olinpy.tagArea).join(" ")}</td><td>${v.itens.filter((i) => i.st === "nc").length}</td><td>${v.fotos.length}</td></tr>`).join("")}</tbody></table>`
          : `<p class="vazio">Nenhuma vistoria ainda. No celular, as fotos já saem com data, hora e coordenadas.</p>`}</div></div></div>`;
      $$("[data-v]").forEach((tr) => tr.addEventListener("click", () => editar(D0.vistorias.find((v) => v.id === tr.dataset.v))));
      $("#bNovaV")?.addEventListener("click", () => editar(null));
    };
    const editar = async (v) => {
      if (!v) { const e = Olinpy.empresa(empId || ""); v = { id: uid(), empresaId: e?.id || "", data: HOJE_ISO, responsavel: Olinpy.sessao.nome, areas: (e?.areas || ["ma"]).filter((a) => CHECKLISTS[a]),
        objetivo: "", itens: [], fotos: [] }; v.itens = v.areas.flatMap((a) => CHECKLISTS[a].map((t) => ({ area: a, t, st: "nv", obs: "" }))); D0.vistorias.push(v); Olinpy.registrar("Vistoria iniciada", v.empresaId); Olinpy.salvar(); }
      const urls = {};
      for (const f of v.fotos) urls[f.id] = blobURL(await FotosDB.ler(f.id));
      $("#acoesBarra").innerHTML = `<button class="btn claro" id="bVoltarV">Voltar</button><button class="btn claro" id="bNC">${ico("tarefas")} Criar tarefas das não conformidades</button><button class="btn" id="bRelV">Gerar relatório (PDF)</button>`;
      const opts = [["nv", "Não verificado"], ["c", "Conforme"], ["nc", "Não conforme"], ["na", "Não se aplica"]];
      c.innerHTML = `<div class="largura"><div class="grade">
        <div class="card c4"><div class="card-cab"><h3>Dados da vistoria</h3></div><div class="card-corpo" style="display:flex;flex-direction:column;gap:10px">
          <label>Empresa<select id="vEmp">${Olinpy.opcoesEmpresas(v.empresaId, "Outra / não cadastrada")}</select></label>
          <label>Local (se não cadastrada)<input id="vLocal" value="${h(v.local || "")}"></label>
          <div class="form"><label>Data<input id="vData" type="date" value="${h(v.data)}"></label><label>Responsável<input id="vResp" value="${h(v.responsavel)}"></label></div>
          <label>Objetivo<textarea id="vObj" placeholder="Ex.: verificar cumprimento das condicionantes da LO">${h(v.objetivo)}</textarea></label>
          <label>Conclusão / recomendações<textarea id="vConc">${h(v.conclusao || "")}</textarea></label>
          <button class="btn perigo peq" id="vDel">Excluir vistoria</button></div></div>
        <div class="card c8"><div class="card-cab"><h3>Checklist</h3><span class="mut">${v.itens.filter((i) => i.st === "nc").length} não conformidade(s)</span></div><div class="card-corpo"><div class="checklist">
          ${v.itens.map((i, k) => `<div class="item-check ${i.st === "nc" ? "nc" : ""}"><div>${Olinpy.tagArea(i.area)} ${h(i.t)}<input data-obs="${k}" value="${h(i.obs)}" placeholder="observação" style="margin-top:6px;padding:5px 8px;font-size:.8rem"></div>
            <select data-st="${k}">${opts.map(([o, n]) => `<option value="${o}"${i.st === o ? " selected" : ""}>${n}</option>`).join("")}</select></div>`).join("")}</div>
          <div style="display:flex;gap:8px;margin-top:10px"><input id="vNovoItem" placeholder="Adicionar item ao checklist"><button class="btn claro" id="vAddItem">Adicionar</button></div></div></div>
        <div class="card c12"><div class="card-cab"><h3>Relatório fotográfico</h3><label class="btn" style="margin-left:auto">${ico("vistoria")} Tirar / adicionar fotos<input type="file" id="vFotos" accept="image/*" capture="environment" multiple hidden></label></div>
          <div class="card-corpo"><p class="mut" id="vMsg" style="margin-top:0">Cada foto recebe data, hora e coordenadas do aparelho (se o GPS estiver ligado).</p><div class="fotos">
          ${v.fotos.map((f, k) => `<div class="foto"><img src="${urls[f.id]}" alt="Foto ${k + 1}"><div class="info"><span>Foto ${k + 1} · ${new Date(f.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${f.gps ? ` · ${f.gps.lat}, ${f.gps.lon} (±${f.gps.prec} m)` : ""}</span>
            <textarea data-leg="${k}" placeholder="Legenda">${h(f.legenda || "")}</textarea><button class="btn claro peq" data-rmf="${k}">Remover</button></div></div>`).join("")}</div></div></div>
      </div></div>`;
      const sync = () => { Object.assign(v, { empresaId: $("#vEmp").value, local: $("#vLocal").value, data: $("#vData").value, responsavel: $("#vResp").value, objetivo: $("#vObj").value, conclusao: $("#vConc").value }); Olinpy.salvar(); };
      ["#vEmp", "#vLocal", "#vData", "#vResp", "#vObj", "#vConc"].forEach((s) => $(s).addEventListener("change", sync));
      $$("[data-st]").forEach((s) => s.addEventListener("change", () => { v.itens[+s.dataset.st].st = s.value; s.closest(".item-check").classList.toggle("nc", s.value === "nc"); Olinpy.salvar(); }));
      $$("[data-obs]").forEach((s) => s.addEventListener("change", () => { v.itens[+s.dataset.obs].obs = s.value; Olinpy.salvar(); }));
      $$("[data-leg]").forEach((s) => s.addEventListener("change", () => { v.fotos[+s.dataset.leg].legenda = s.value; Olinpy.salvar(); }));
      $$("[data-rmf]").forEach((b) => b.addEventListener("click", async () => { const f = v.fotos.splice(+b.dataset.rmf, 1)[0]; await FotosDB.apagar(f.id); Olinpy.salvar(); editar(v); }));
      $("#vAddItem").addEventListener("click", () => { const t = $("#vNovoItem").value.trim(); if (!t) return; v.itens.push({ area: v.areas[0] || "ma", t, st: "nv", obs: "" }); Olinpy.salvar(); editar(v); });
      $("#vFotos").addEventListener("change", async (e) => {
        const arqs = [...e.target.files]; if (!arqs.length) return;
        $("#vMsg").textContent = "Processando fotos e localização…";
        const gps = await posicao();
        for (const a of arqs) { const id = uid(); await FotosDB.gravar(id, await reduzirFoto(a)); v.fotos.push({ id, quando: new Date().toISOString(), gps, legenda: "" }); }
        Olinpy.registrar(`${arqs.length} foto(s) adicionada(s) à vistoria`, v.empresaId); Olinpy.salvar(); editar(v);
      });
      $("#vDel").addEventListener("click", async () => { if (!confirm("Excluir esta vistoria e as fotos?")) return; for (const f of v.fotos) await FotosDB.apagar(f.id);
        D0.vistorias = D0.vistorias.filter((x) => x.id !== v.id); Olinpy.salvar(); lista(); });
      $("#bVoltarV").addEventListener("click", () => { sync(); lista(); });
      $("#bNC").addEventListener("click", () => { sync(); const ncs = v.itens.filter((i) => i.st === "nc");
        if (!ncs.length) { Olinpy.toast("Nenhuma não conformidade marcada."); return; }
        ncs.forEach((i) => { const chave = `vist:${v.id}:${i.t}`; if (D0.tarefas.some((t) => t.origem === chave)) return;
          D0.tarefas.push({ id: uid(), titulo: `Corrigir: ${i.t}${i.obs ? ` (${i.obs})` : ""}`, empresaId: v.empresaId, area: i.area, prazo: addDias(HOJE_ISO, 15), responsavel: v.responsavel,
            status: "afazer", origem: chave, criada: new Date().toISOString(), auto: true, minutos: 0 }); });
        Olinpy.registrar(`Tarefas criadas a partir de ${ncs.length} não conformidade(s) da vistoria`, v.empresaId); Olinpy.salvar(); Olinpy.toast(`${ncs.length} tarefa(s) criada(s) com prazo de 15 dias.`); });
      $("#bRelV").addEventListener("click", async () => { sync();
        const e = Olinpy.empresa(v.empresaId), fotos = [];
        for (const f of v.fotos) fotos.push({ ...f, src: await blobDataURL(await FotosDB.ler(f.id)) });
        const rot = Object.fromEntries(opts);
        abrirImpressao(`Relatório de vistoria – ${e?.nome || v.local || ""}`, `<h1>Relatório de vistoria técnica</h1>
          <div class="dados"><div><b>Empresa:</b> ${h(e?.nome || v.local || "—")}</div><div><b>CNPJ:</b> ${h(fmtCNPJ(e?.cnpj || "") || "—")}</div>
            <div><b>Endereço:</b> ${h([e?.endereco, e?.municipio && `${e.municipio}/${e.uf}`].filter(Boolean).join(" – ") || "—")}</div><div><b>Data:</b> ${fd(v.data)}</div>
            <div><b>Responsável técnico:</b> ${h(v.responsavel)}</div><div><b>Áreas:</b> ${v.areas.map((a) => AREAS[a].nome).join(", ")}</div></div>
          ${v.objetivo ? `<h2>Objetivo</h2><p>${h(v.objetivo)}</p>` : ""}
          <h2>Checklist</h2><table><thead><tr><th>Item verificado</th><th>Situação</th><th>Observação</th></tr></thead><tbody>
          ${v.itens.filter((i) => i.st !== "nv").map((i) => `<tr class="${i.st === "nc" ? "nc" : ""}"><td>${h(i.t)}</td><td>${rot[i.st]}</td><td>${h(i.obs)}</td></tr>`).join("") || "<tr><td colspan=3>Nenhum item avaliado.</td></tr>"}</tbody></table>
          ${fotos.length ? `<h2>Registro fotográfico</h2><div class="fotos">${fotos.map((f, k) => `<div class="f"><img src="${f.src}"><p><b>Foto ${k + 1}.</b> ${h(f.legenda || "")}</p>
            <small>${new Date(f.quando).toLocaleString("pt-BR")}${f.gps ? ` · Lat ${f.gps.lat}, Lon ${f.gps.lon} (SIRGAS 2000/WGS 84)` : ""}</small></div>`).join("")}</div>` : ""}
          ${v.conclusao ? `<h2>Conclusão e recomendações</h2><p>${h(v.conclusao).replace(/\n/g, "<br>")}</p>` : ""}
          <div class="ass"><div>${h(v.responsavel)}<br>Responsável pela vistoria</div><div>Representante da empresa</div></div>`); });
    };
    if (empId) editar(null); else lista();
  },

  /* ── propostas ─────────────────────────────────────────────────────── */
  propostas(c) {
    const D0 = Olinpy.dados; D0.propostas ||= [];
    const ed = Olinpy.pode("editar");
    const SERV = ["Licença de Operação – requerimento e acompanhamento", "Renovação de Licença de Operação", "Licença Ambiental Simplificada / dispensa", "PGRS – Plano de Gerenciamento de Resíduos Sólidos",
      "RCA / PCA – estudos ambientais", "Mapas técnicos (localização, AID/AII, hidrografia)", "CTF/APP, RAPP e TCFA (IBAMA)", "Acompanhamento mensal de condicionantes",
      "PGR – Programa de Gerenciamento de Riscos (NR-01)", "PCMSO (com médico do trabalho parceiro)", "LTCAT", "Treinamento de NR (NR-35, NR-10, NR-06…)",
      "Alvará de funcionamento e licença sanitária", "Regularização no Corpo de Bombeiros", "Vistoria técnica com relatório fotográfico"];
    const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const lista = () => {
      $("#acoesBarra").innerHTML = ed ? `<button class="btn" id="bNovaPr">${ico("mais")} Nova proposta</button>` : "";
      c.innerHTML = `<div class="largura"><div class="card"><div class="card-corpo" style="padding-top:14px">${D0.propostas.length ? `<table class="t"><thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Situação</th></tr></thead><tbody>
        ${D0.propostas.slice().reverse().map((p) => `<tr class="clica" data-p="${p.id}"><td>${h(p.numero)}</td><td>${h(p.cliente)}</td><td>${fd(p.data)}</td><td>${brl(p.itens.reduce((s, i) => s + i.qt * i.valor, 0))}</td>
          <td><span class="tag ${({ enviada: "t-30", aprovada: "t-ok", recusada: "t-atr" })[p.situacao] || "t-cinza"}">${h(p.situacao || "rascunho")}</span></td></tr>`).join("")}</tbody></table>` : `<p class="vazio">Nenhuma proposta ainda.</p>`}</div></div></div>`;
      $$("[data-p]").forEach((tr) => tr.addEventListener("click", () => editar(D0.propostas.find((p) => p.id === tr.dataset.p))));
      $("#bNovaPr")?.addEventListener("click", () => editar(null));
    };
    const editar = (p) => {
      if (!p) { p = { id: uid(), numero: `${new Date().getFullYear()}/${String(D0.propostas.length + 1).padStart(3, "0")}`, data: HOJE_ISO, cliente: "", empresaId: "", itens: [{ desc: SERV[0], qt: 1, valor: 0 }],
        prazo: "30 dias após o envio da documentação completa", validade: 15, pagamento: "50% na aprovação e 50% na entrega", obs: "Taxas dos órgãos, ARTs e análises laboratoriais não incluídas.", situacao: "rascunho" }; D0.propostas.push(p); }
      $("#acoesBarra").innerHTML = `<button class="btn claro" id="bVoltarP">Voltar</button><button class="btn claro" id="bIAprop">${ico("assistente")} Escopo com IA</button><button class="btn" id="bPdfP">Gerar PDF</button>`;
      const total = () => p.itens.reduce((s, i) => s + i.qt * i.valor, 0);
      c.innerHTML = `<div class="largura"><div class="card"><div class="card-corpo" style="padding-top:16px"><div class="form">
        <label>Nº<input id="pNum" value="${h(p.numero)}"></label><label>Data<input id="pData" type="date" value="${h(p.data)}"></label>
        <label>Empresa cadastrada<select id="pEmp">${Olinpy.opcoesEmpresas(p.empresaId, "— escolher —")}</select></label><label>Cliente (como sai na proposta)<input id="pCli" value="${h(p.cliente)}"></label>
        <div class="w"><table class="t"><thead><tr><th>Serviço</th><th style="width:80px">Qtd.</th><th style="width:140px">Valor unit. (R$)</th><th style="width:120px">Subtotal</th><th></th></tr></thead><tbody>
          ${p.itens.map((i, k) => `<tr><td><input list="servs" data-k="${k}" data-c="desc" value="${h(i.desc)}"></td><td><input type="number" min="1" data-k="${k}" data-c="qt" value="${i.qt}"></td>
            <td><input type="number" min="0" step="0.01" data-k="${k}" data-c="valor" value="${i.valor}"></td><td>${brl(i.qt * i.valor)}</td><td><button class="btn claro peq" data-rm="${k}">×</button></td></tr>`).join("")}
          <tr><td colspan="3"><button class="btn claro peq" id="pAdd">${ico("mais")} Serviço</button></td><td colspan="2"><b>${brl(total())}</b></td></tr></tbody></table>
          <datalist id="servs">${SERV.map((s) => `<option>${h(s)}</option>`).join("")}</datalist></div>
        <label class="w">Escopo / descrição do trabalho<textarea id="pEsc" rows="5">${h(p.escopo || "")}</textarea></label>
        <label>Prazo de execução<input id="pPrazo" value="${h(p.prazo)}"></label><label>Validade da proposta (dias)<input id="pVal" type="number" value="${p.validade}"></label>
        <label>Condições de pagamento<input id="pPag" value="${h(p.pagamento)}"></label><label>Situação<select id="pSit">${["rascunho", "enviada", "aprovada", "recusada"].map((s) => `<option${p.situacao === s ? " selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="w">Observações<textarea id="pObs">${h(p.obs)}</textarea></label></div>
        <div class="rodape-form"><button class="btn perigo" id="pDel">Excluir</button></div></div></div></div>`;
      const sync = () => { Object.assign(p, { numero: $("#pNum").value, data: $("#pData").value, empresaId: $("#pEmp").value, cliente: $("#pCli").value, escopo: $("#pEsc").value, prazo: $("#pPrazo").value,
        validade: Number($("#pVal").value) || 15, pagamento: $("#pPag").value, situacao: $("#pSit").value, obs: $("#pObs").value }); Olinpy.salvar(); };
      $$("input,select,textarea", c).forEach((el) => el.addEventListener("change", () => { if (el.dataset.k) { const it = p.itens[+el.dataset.k]; it[el.dataset.c] = el.dataset.c === "desc" ? el.value : Number(el.value) || 0; sync(); editar(p); } else sync(); }));
      $("#pEmp").addEventListener("change", () => { const e = Olinpy.empresa($("#pEmp").value); if (e) { $("#pCli").value = e.nome; sync(); } });
      $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { p.itens.splice(+b.dataset.rm, 1); sync(); editar(p); }));
      $("#pAdd").addEventListener("click", () => { p.itens.push({ desc: "", qt: 1, valor: 0 }); sync(); editar(p); });
      $("#pDel").addEventListener("click", () => { if (!confirm("Excluir esta proposta?")) return; D0.propostas = D0.propostas.filter((x) => x.id !== p.id); Olinpy.salvar(); lista(); });
      $("#bVoltarP").addEventListener("click", () => { sync(); lista(); });
      $("#bIAprop").addEventListener("click", () => { sync(); sessionStorage.setItem("olinpy_pergunta", `Redija o escopo de uma proposta de consultoria para ${p.cliente || "[cliente]"} com os serviços: ${p.itens.map((i) => i.desc).join("; ")}. Para cada serviço: objetivo, etapas, entregáveis e o que o cliente precisa fornecer. Texto formal e objetivo.`); location.hash = "assistente"; });
      $("#bPdfP").addEventListener("click", () => { sync(); const C = Olinpy.dados.config;
        abrirImpressao(`Proposta ${p.numero}`, `<h1>Proposta de prestação de serviços nº ${h(p.numero)}</h1><p>${h(C.cidade)}, ${new Date(D(p.data)).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          <p><b>Cliente:</b> ${h(p.cliente)}</p>${p.escopo ? `<h2>Escopo</h2><p>${h(p.escopo).replace(/\n/g, "<br>")}</p>` : ""}
          <h2>Serviços e investimento</h2><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Valor unitário</th><th>Subtotal</th></tr></thead><tbody>
          ${p.itens.map((i) => `<tr><td>${h(i.desc)}</td><td>${i.qt}</td><td>${brl(i.valor)}</td><td>${brl(i.qt * i.valor)}</td></tr>`).join("")}</tbody></table><p class="tot">Total: ${brl(total())}</p>
          <h2>Condições</h2><p><b>Prazo de execução:</b> ${h(p.prazo)}<br><b>Pagamento:</b> ${h(p.pagamento)}<br><b>Validade desta proposta:</b> ${p.validade} dias</p>${p.obs ? `<p>${h(p.obs)}</p>` : ""}
          <div class="ass"><div>${h(C.rt || C.escritorio)}${C.registro ? `<br>${h(C.registro)}` : ""}</div><div>De acordo – ${h(p.cliente)}</div></div>`); });
    };
    lista();
  },

  /* ── calculadoras ──────────────────────────────────────────────────── */
  calculadoras(c) {
    c.innerHTML = `<div class="largura"><div class="grade">
      <div class="card c6"><div class="card-cab"><h3>Prazos (dias corridos ou úteis)</h3></div><div class="card-corpo"><div class="form">
        <label>Data inicial<input type="date" id="cpIni" value="${HOJE_ISO}"></label><label>Quantidade de dias<input type="number" id="cpN" value="30"></label>
        <label class="check w"><input type="checkbox" id="cpUt"> Contar só dias úteis (sem feriados nacionais)</label></div><div class="calc-res" id="cpRes"></div>
        <p class="mut">Feriados estaduais e municipais não entram: confira no calendário local.</p></div></div>
      <div class="card c6"><div class="card-cab"><h3>APP de curso d'água (Código Florestal)</h3></div><div class="card-corpo"><div class="form">
        <label>Tipo<select id="apTipo"><option value="rio">Curso d'água natural</option><option value="nascente">Nascente / olho d'água</option><option value="lago_rural">Lago natural – zona rural</option><option value="lago_urb">Lago natural – zona urbana</option></select></label>
        <label id="apLargL">Largura do leito regular (m)<input type="number" id="apLarg" value="5" min="0" step="0.1"></label>
        <label id="apAreaL" hidden>Superfície do lago (ha)<input type="number" id="apArea" value="10" min="0"></label></div><div class="calc-res" id="apRes"></div>
        <p class="mut">Lei 12.651/2012, art. 4º. Há regras específicas para áreas consolidadas (art. 61-A) e reservatórios artificiais.</p></div></div>
      <div class="card c6"><div class="card-cab"><h3>Tanque séptico (NBR 7229)</h3></div><div class="card-corpo"><div class="form">
        <label>Ocupação<select id="fsOc">${FOSSA.map((o, i) => `<option value="${i}">${h(o.n)}</option>`).join("")}</select></label><label>Nº de pessoas / unidades<input type="number" id="fsN" value="5" min="1"></label>
        <label>Intervalo de limpeza (anos)<select id="fsAnos">${[1, 2, 3, 4, 5].map((a) => `<option${a === 1 ? " selected" : ""}>${a}</option>`).join("")}</select></label>
        <label>Temperatura média do mês mais frio<select id="fsT"><option value="0">até 10 °C</option><option value="1">10 a 20 °C</option><option value="2" selected>acima de 20 °C</option></select></label></div>
        <div class="calc-res" id="fsRes"></div><p class="mut">V = 1000 + N·(C·T + K·Lf). Valores de referência da NBR 7229/1993: confira na norma e no projeto.</p></div></div>
      <div class="card c6"><div class="card-cab"><h3>Conversor de coordenadas</h3></div><div class="card-corpo"><div class="form">
        <label>Latitude (decimal ou GMS)<input id="ccLat" value="-9.752500"></label><label>Longitude (decimal ou GMS)<input id="ccLon" value="-36.661500"></label>
        <div class="w" style="display:flex;gap:8px"><button class="btn claro" id="ccIda">Geográficas → UTM</button><button class="btn claro" id="ccVolta">UTM → geográficas</button></div>
        <label>E (m)<input id="ccE"></label><label>N (m)<input id="ccN"></label><label>Fuso<input id="ccZ" type="number" value="24"></label>
        <label>Hemisfério<select id="ccH"><option value="S">Sul</option><option value="N">Norte</option></select></label></div><div class="calc-res" id="ccRes"></div>
        <p class="mut">SIRGAS 2000 (elipsoide GRS80). Em Alagoas: fusos 24 e 25.</p></div></div>
    </div></div>`;
    const prazo = async () => { const ini = $("#cpIni").value, n = Number($("#cpN").value) || 0; if (!ini) return;
      let d = D(ini);
      if (!$("#cpUt").checked) d.setDate(d.getDate() + n);
      else { const fer = new Set(); for (const a of [d.getFullYear(), d.getFullYear() + 1]) (await Olinpy.feriados(a)).forEach((f) => fer.add(f.date)); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 && !fer.has(isoD(d))) k++; } }
      $("#cpRes").innerHTML = `<b class="grande">${d.toLocaleDateString("pt-BR")}</b>${d.toLocaleDateString("pt-BR", { weekday: "long" })} · ${n} dias ${$("#cpUt").checked ? "úteis" : "corridos"} a partir de ${fd(ini)}`; };
    ["#cpIni", "#cpN", "#cpUt"].forEach((s) => $(s).addEventListener("input", prazo)); prazo();
    const app = () => { const t = $("#apTipo").value, L = Number($("#apLarg").value), A = Number($("#apArea").value);
      $("#apLargL").hidden = t !== "rio"; $("#apAreaL").hidden = t !== "lago_rural";
      let m, txt;
      if (t === "rio") { m = L < 10 ? 30 : L <= 50 ? 50 : L <= 200 ? 100 : L <= 600 ? 200 : 500; txt = `faixa marginal em cada margem, desde a borda da calha do leito regular (rio com ${L} m)`; }
      else if (t === "nascente") { m = 50; txt = "raio mínimo no entorno da nascente perene ou olho d'água"; }
      else if (t === "lago_rural") { m = A <= 20 ? 50 : 100; txt = `faixa no entorno (superfície ${A <= 20 ? "até" : "acima de"} 20 ha)`; }
      else { m = 30; txt = "faixa no entorno, em zona urbana"; }
      $("#apRes").innerHTML = `<b class="grande">${m} metros</b>${txt}`; };
    ["#apTipo", "#apLarg", "#apArea"].forEach((s) => $(s).addEventListener("input", app)); app();
    const fossa = () => { const o = FOSSA[+$("#fsOc").value], N = Number($("#fsN").value) || 1, anos = +$("#fsAnos").value, ti = +$("#fsT").value;
      const contrib = N * o.c, T = contrib <= 1500 ? 1 : contrib <= 3000 ? 0.92 : contrib <= 4500 ? 0.83 : contrib <= 6000 ? 0.75 : contrib <= 7500 ? 0.67 : contrib <= 9000 ? 0.58 : 0.5;
      const K = [[94, 65, 57], [134, 105, 97], [174, 145, 137], [214, 185, 177], [254, 225, 217]][anos - 1][ti];
      const V = 1000 + N * (o.c * T + K * o.lf);
      $("#fsRes").innerHTML = `<b class="grande">${(V / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m³</b>volume útil (${Math.round(V).toLocaleString("pt-BR")} L) · contribuição ${contrib.toLocaleString("pt-BR")} L/dia · C=${o.c} L · T=${T} d · K=${K} · Lf=${o.lf}`; };
    ["#fsOc", "#fsN", "#fsAnos", "#fsT"].forEach((s) => $(s).addEventListener("input", fossa)); fossa();
    $("#ccIda").addEventListener("click", () => { const la = lerCoord($("#ccLat").value), lo = lerCoord($("#ccLon").value);
      if (isNaN(la) || isNaN(lo)) { $("#ccRes").textContent = "Coordenada inválida."; return; }
      const u = paraUTM(lo, la); $("#ccE").value = u.E.toFixed(2); $("#ccN").value = u.N.toFixed(2); $("#ccZ").value = u.zona; $("#ccH").value = u.hemis;
      $("#ccRes").innerHTML = `<b>UTM ${u.zona}${u.hemis}</b> · E ${u.E.toFixed(2)} m · N ${u.N.toFixed(2)} m<br>${gms(la, "lat")} · ${gms(lo, "lon")} · EPSG:${(u.hemis === "S" ? 31960 : 31954) + u.zona}`; });
    $("#ccVolta").addEventListener("click", () => { const g = deUTM(Number($("#ccE").value), Number($("#ccN").value), Number($("#ccZ").value), $("#ccH").value === "S");
      if (!isFinite(g.lat)) { $("#ccRes").textContent = "Valores UTM inválidos."; return; }
      $("#ccLat").value = g.lat.toFixed(6); $("#ccLon").value = g.lon.toFixed(6); $("#ccRes").innerHTML = `<b>${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}</b><br>${gms(g.lat, "lat")} · ${gms(g.lon, "lon")}`; });
  },

  /* ── legislação ────────────────────────────────────────────────────── */
  legislacao(c) {
    const F = { q: "", a: "" };
    const desenhar = () => { const q = F.q.toLowerCase();
      $("#leis").innerHTML = LEGISLACAO.filter((l) => (!F.a || l.area === F.a) && (!q || `${l.nome} ${l.resumo}`.toLowerCase().includes(q))).map((l, i) => `<div class="lei"><span>${Olinpy.tagArea(l.area)}</span><div><b>${h(l.nome)}</b><p>${h(l.resumo)}</p>
        <div class="acoes-lei"><a class="btn claro peq" href="${h(l.url)}" target="_blank" rel="noopener">${ico("externo")} Texto oficial</a><button class="btn claro peq" data-ia="${h(l.nome)}">${ico("assistente")} Perguntar à IA</button></div></div></div>`).join("") || `<p class="vazio">Nada encontrado.</p>`;
      $$("[data-ia]").forEach((b) => b.addEventListener("click", () => { sessionStorage.setItem("olinpy_pergunta", `Resuma os pontos práticos de "${b.dataset.ia}" para a rotina de uma consultoria que atende empresas: o que exige, de quem, prazos e o que conferir no texto oficial.`); location.hash = "assistente"; })); };
    c.innerHTML = `<div class="largura"><div class="aviso info" style="margin-bottom:14px">${ico("info")}<div>Sempre confira o texto vigente na fonte oficial: normas mudam. Os resumos aqui são orientativos.</div></div>
      <div class="filtros"><input type="search" id="lq" placeholder="Buscar norma"><select id="la"><option value="">Todas as áreas</option>${Olinpy.opcoesAreas("")}</select></div>
      <div class="card"><div class="card-corpo" id="leis" style="padding-top:8px"></div></div></div>`;
    $("#lq").addEventListener("input", (e) => { F.q = e.target.value; desenhar(); });
    $("#la").addEventListener("change", (e) => { F.a = e.target.value; desenhar(); });
    desenhar();
  },
};

// NBR 7229/1993 – contribuição de esgoto (C, L/dia por pessoa ou unidade) e lodo fresco (Lf)
const FOSSA = [
  { n: "Residência – padrão alto (pessoa)", c: 160, lf: 1 }, { n: "Residência – padrão médio (pessoa)", c: 130, lf: 1 }, { n: "Residência – padrão baixo (pessoa)", c: 100, lf: 1 },
  { n: "Hotel, exceto lavanderia e cozinha (pessoa)", c: 100, lf: 1 }, { n: "Alojamento provisório (pessoa)", c: 80, lf: 1 },
  { n: "Fábrica em geral (pessoa)", c: 70, lf: 0.3 }, { n: "Escritório (pessoa)", c: 50, lf: 0.2 }, { n: "Edifício público ou comercial (pessoa)", c: 50, lf: 0.2 },
  { n: "Escola – externato (pessoa)", c: 50, lf: 0.2 }, { n: "Bar (pessoa)", c: 6, lf: 0.1 }, { n: "Restaurante (refeição)", c: 25, lf: 0.1 },
  { n: "Cinema, teatro, templo (lugar)", c: 2, lf: 0.02 }, { n: "Sanitário público (bacia)", c: 480, lf: 4 },
];

/* Olinpy – segurança: usuários, sessão e dados criptografados (AES-GCM 256).

   Como funciona
   - Existe UMA chave do escritório (aleatória, 256 bits). Ela cifra os dados publicados (dados/*.enc).
   - dados/usuarios.json guarda, para cada usuário, essa chave cifrada com uma chave derivada da senha
     dele (PBKDF2-SHA256, 310.000 iterações, sal próprio). A senha em si nunca é guardada.
   - No login, a senha destrava a chave do escritório, que fica só na sessionStorage desta aba
     (some ao fechar a aba ou ao clicar em Sair).
   Formato de um .enc: 12 bytes de IV + texto cifrado (AES-GCM). */
"use strict";

const OlinpyCripto = (() => {
  const ITER = 310000;
  const SESSAO = "olinpy_sessao";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n));

  async function chaveDaSenha(senha, sal, iter = ITER) {
    const base = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sal, iterations: iter, hash: "SHA-256" }, base,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  const importar = (bruta) => crypto.subtle.importKey("raw", bruta, "AES-GCM", true, ["encrypt", "decrypt"]);

  async function cifrar(chave, bytes) {
    const iv = aleatorio(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, bytes));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return out;
  }
  async function decifrar(chave, bytes) {
    const u = new Uint8Array(bytes);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12) }, chave, u.subarray(12)));
  }

  // ── sessão ────────────────────────────────────────────────────────────
  let chaveCache = null;
  function sessao() { try { return JSON.parse(sessionStorage.getItem(SESSAO) || "null"); } catch (e) { return null; } }
  async function chave() {
    if (chaveCache) return chaveCache;
    const s = sessao();
    if (!s) throw new Error("sem sessão");
    chaveCache = await importar(deB64(s.chave));
    return chaveCache;
  }
  function sair() { sessionStorage.removeItem(SESSAO); chaveCache = null; }

  async function usuarios(raiz = "") {
    const r = await fetch(`${raiz}dados/usuarios.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error("lista de usuários indisponível");
    return r.json();
  }

  async function entrar(login, senha, raiz = "") {
    const lista = await usuarios(raiz);
    const u = lista.usuarios.find((x) => x.login.toLowerCase() === login.trim().toLowerCase());
    if (!u) throw new Error("Usuário ou senha incorretos.");
    let bruta;
    try {
      const kek = await chaveDaSenha(senha, deB64(u.sal), u.iter || ITER);
      bruta = await decifrar(kek, deB64(u.chave));
    } catch (e) { throw new Error("Usuário ou senha incorretos."); }
    const s = { login: u.login, nome: u.nome, papel: u.papel, chave: b64(bruta), desde: Date.now() };
    sessionStorage.setItem(SESSAO, JSON.stringify(s));
    chaveCache = null;
    return s;
  }

  // novo registro de usuário (só quem está logado tem a chave do escritório)
  async function registroUsuario({ login, nome, papel, senha }) {
    const s = sessao();
    if (!s) throw new Error("sem sessão");
    const sal = aleatorio(16);
    const kek = await chaveDaSenha(senha, sal);
    return { login: login.trim().toLowerCase(), nome: nome.trim(), papel, sal: b64(sal), iter: ITER,
             chave: b64(await cifrar(kek, deB64(s.chave))), criado: new Date().toISOString().slice(0, 10) };
  }

  // ── arquivos protegidos ───────────────────────────────────────────────
  async function baixarProtegido(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(`não encontrei ${url}`);
    return decifrar(await chave(), await r.arrayBuffer());
  }
  async function jsonProtegido(url) { return JSON.parse(dec.decode(await baixarProtegido(url))); }

  // ── armazenamento local cifrado (dados que ficam só neste navegador) ──
  async function guardar(nome, valor) {
    const bytes = await cifrar(await chave(), enc.encode(JSON.stringify(valor)));
    localStorage.setItem(`olinpy_${nome}`, b64(bytes));
  }
  async function ler(nome, padrao) {
    const v = localStorage.getItem(`olinpy_${nome}`);
    if (!v) return padrao;
    try { return JSON.parse(dec.decode(await decifrar(await chave(), deB64(v)))); } catch (e) { return padrao; }
  }

  return { entrar, sair, sessao, chave, usuarios, registroUsuario, baixarProtegido, jsonProtegido, guardar, ler, cifrar, decifrar, b64, deB64 };
})();

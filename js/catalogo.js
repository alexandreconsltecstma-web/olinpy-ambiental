/* Olinpy – catálogo: áreas, obrigações periódicas, segmentos de empresa, legislação, checklists e atalhos da IA.
   Prazos marcados com conferir: true têm divergência entre fontes ou variam por órgão/município:
   o sistema mostra o aviso "conferir" e o técnico valida. Nada aqui substitui a leitura da norma. */
"use strict";

const AREAS = {
  ma: { nome: "Meio Ambiente", cor: "#2e8b57", curto: "Ambiental",
        icone: '<path d="M12 3c-5 3.5-7.5 7.8-7.5 12A7.5 7.5 0 0 0 19.5 15C19.5 10.8 17 6.5 12 3z"/><path d="M12 21V11M12 15l-3-2.5M12 18l3.5-3"/>' },
  sst: { nome: "Segurança e Saúde do Trabalho", cor: "#d9620b", curto: "SST",
         icone: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2.5 15h19v2.5h-19zM12 7V4M9 7.5 8 5M15 7.5l1-2.5"/>' },
  reg: { nome: "Regularização e alvarás", cor: "#2d6cdf", curto: "Alvarás",
         icone: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>' },
  sg: { nome: "Sistemas de gestão (ISO)", cor: "#7b52ab", curto: "Gestão",
        icone: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>' },
};

// meses: periodicidade; antes: dias de antecedência do alerta; por: "empresa" | "trabalhador" | "equipamento"
const OBRIGACOES = [
  // ── Meio Ambiente ──
  { id: "lo", area: "ma", nome: "Licença de Operação (LO)", base: "LC 140/2011, art. 14, §4º; Res. CONAMA 237/1997", meses: null, antes: 150,
    dica: "Pedir a renovação com antecedência mínima de 120 dias do vencimento mantém a licença válida até a decisão do órgão." },
  { id: "li", area: "ma", nome: "Licença de Instalação (LI)", base: "Res. CONAMA 237/1997", meses: null, antes: 90 },
  { id: "lp", area: "ma", nome: "Licença Prévia (LP)", base: "Res. CONAMA 237/1997", meses: null, antes: 90 },
  { id: "las", area: "ma", nome: "Licença Ambiental Simplificada (LAS – AL)", base: "Lei AL 7.705/2015", meses: null, antes: 120 },
  { id: "dispensa", area: "ma", nome: "Declaração de dispensa / inexigibilidade de licença", base: "Órgão municipal ou estadual", meses: null, antes: 60 },
  { id: "condic", area: "ma", nome: "Condicionantes da licença", base: "Texto da própria licença", meses: null, antes: 30,
    dica: "Cadastre cada condicionante com prazo como um documento desta empresa." },
  { id: "ctf", area: "ma", nome: "CTF/APP – Certificado de Regularidade (IBAMA)", base: "Lei 6.938/1981, art. 17; IN IBAMA sobre CTF/APP", meses: 3, antes: 15, conferir: true,
    dica: "Emitir o certificado atualizado quando o cliente pedir ou antes de licitações/renovações." },
  { id: "rapp", area: "ma", nome: "RAPP – Relatório Anual de Atividades Potencialmente Poluidoras", base: "Lei 6.938/1981; IN IBAMA (RAPP)", meses: 12, mesFixo: "03-31", antes: 45, conferir: true,
    dica: "Prazo usual 31/03 (ano-base anterior). Em 2026 houve prorrogação para algumas atividades: confirme no IBAMA." },
  { id: "tcfa", area: "ma", nome: "TCFA – Taxa de Controle e Fiscalização Ambiental", base: "Lei 6.938/1981, art. 17-B a 17-H", meses: 3, antes: 10, conferir: true,
    dica: "Trimestral. Confirme as datas de vencimento no IBAMA." },
  { id: "dmr", area: "ma", nome: "DMR – Declaração de Movimentação de Resíduos (SINIR/MTR)", base: "Lei 12.305/2010; Portaria MMA 280/2020", meses: 3, antes: 15, conferir: true },
  { id: "inv_res", area: "ma", nome: "Inventário Nacional de Resíduos Sólidos", base: "Lei 12.305/2010; Decreto 10.936/2022", meses: 12, mesFixo: "03-31", antes: 45, conferir: true },
  { id: "pgrs", area: "ma", nome: "PGRS – revisão / atualização", base: "Lei 12.305/2010, arts. 20 a 24", meses: 12, antes: 30, conferir: true,
    dica: "A periodicidade depende do órgão e da licença; muitos pedem atualização anual." },
  { id: "outorga", area: "ma", nome: "Outorga de uso de recursos hídricos", base: "Lei 9.433/1997", meses: null, antes: 120 },
  { id: "automon", area: "ma", nome: "Automonitoramento (efluentes, emissões, ruído)", base: "Condicionantes; Res. CONAMA 430/2011", meses: 6, antes: 20, conferir: true },
  { id: "separador", area: "ma", nome: "Limpeza do separador água e óleo / caixa de gordura", base: "Condicionantes da licença", meses: 6, antes: 15, conferir: true },
  // ── Segurança e Saúde do Trabalho ──
  { id: "pgr", area: "sst", nome: "PGR – Programa de Gerenciamento de Riscos (revisão)", base: "NR-01, item 1.5.4.4.6", meses: 24, antes: 60,
    dica: "Revisar a cada 2 anos (3 anos com sistema de gestão de SST certificado) ou antes, se houver mudanças, acidentes ou nova legislação." },
  { id: "pcmso", area: "sst", nome: "PCMSO – relatório analítico anual", base: "NR-07, item 7.6.2", meses: 12, antes: 30 },
  { id: "aso", area: "sst", nome: "ASO periódico", base: "NR-07", meses: 12, antes: 30, por: "trabalhador",
    dica: "Anual para expostos a riscos e, em geral, a cada 2 anos para os demais, conforme o PCMSO." },
  { id: "ltcat", area: "sst", nome: "LTCAT – verificação de atualização", base: "Lei 8.213/1991, art. 58", meses: 12, antes: 30, conferir: true,
    dica: "Atualizar sempre que o ambiente de trabalho mudar; o lembrete anual serve para verificar." },
  { id: "cipa", area: "sst", nome: "CIPA – mandato e eleição", base: "NR-05", meses: 12, antes: 60 },
  { id: "nr35", area: "sst", nome: "Treinamento NR-35 (trabalho em altura) – reciclagem", base: "NR-35, item 35.4.2.2", meses: 24, antes: 30, por: "trabalhador" },
  { id: "nr10", area: "sst", nome: "Treinamento NR-10 (eletricidade) – reciclagem", base: "NR-10", meses: 24, antes: 30, por: "trabalhador" },
  { id: "nr33", area: "sst", nome: "Treinamento NR-33 (espaço confinado) – reciclagem", base: "NR-33", meses: 12, antes: 30, por: "trabalhador" },
  { id: "nr20", area: "sst", nome: "Treinamento NR-20 (inflamáveis) – reciclagem", base: "NR-20", meses: 36, antes: 30, por: "trabalhador", conferir: true,
    dica: "A periodicidade varia com a classe da instalação e o tipo de curso." },
  { id: "nr11", area: "sst", nome: "Treinamento NR-11 (empilhadeira/movimentação)", base: "NR-11; NR-01 (periodicidade definida pela empresa)", meses: 24, antes: 30, por: "trabalhador", conferir: true },
  { id: "nr12", area: "sst", nome: "Treinamento NR-12 (máquinas)", base: "NR-12; NR-01", meses: 24, antes: 30, por: "trabalhador", conferir: true },
  { id: "brigada", area: "sst", nome: "Brigada de incêndio – treinamento", base: "NBR 14276; normas do Corpo de Bombeiros", meses: 12, antes: 30, conferir: true },
  { id: "extintor", area: "sst", nome: "Extintores – inspeção e recarga", base: "NBR 12962; Corpo de Bombeiros", meses: 12, antes: 20, por: "equipamento", conferir: true },
  { id: "epi_ca", area: "sst", nome: "EPI – validade do CA e trocas", base: "NR-06", meses: null, antes: 30, por: "equipamento",
    dica: "Conferir o CA na consulta do Ministério do Trabalho e registrar a entrega na ficha de EPI." },
  { id: "esocial", area: "sst", nome: "eSocial SST – eventos S-2220 e S-2240", base: "Leiautes do eSocial", meses: 1, antes: 5, conferir: true },
  { id: "cat", area: "sst", nome: "CAT – comunicação de acidente (S-2210)", base: "Lei 8.213/1991, art. 22", meses: null, antes: 1,
    dica: "Até o 1º dia útil seguinte ao acidente; em caso de morte, de imediato." },
  // ── Regularização e alvarás ──
  { id: "alvara", area: "reg", nome: "Alvará de funcionamento (prefeitura)", base: "Código de posturas municipal", meses: 12, antes: 45, conferir: true },
  { id: "visa", area: "reg", nome: "Licença sanitária (Vigilância Sanitária)", base: "Código sanitário municipal/estadual", meses: 12, antes: 45, conferir: true },
  { id: "avcb", area: "reg", nome: "Certificado / vistoria do Corpo de Bombeiros (CBMAL)", base: "IT 01/2021 CBMAL", meses: 12, antes: 60, conferir: true,
    dica: "Na IT 01/2021 do CBMAL a validade inicial é de 1 ano para ocupações comuns; confirme a vigente." },
  { id: "cnd_fed", area: "reg", nome: "Certidão negativa federal (Receita/PGFN)", base: "Portaria conjunta RFB/PGFN", meses: 6, antes: 15 },
  { id: "crf", area: "reg", nome: "CRF – Certificado de Regularidade do FGTS", base: "Caixa", meses: 1, antes: 5 },
  { id: "cndt", area: "reg", nome: "CNDT – Certidão negativa de débitos trabalhistas", base: "TST", meses: 6, antes: 15 },
  { id: "art", area: "reg", nome: "ART/TRT do responsável técnico", base: "CREA / CFT", meses: null, antes: 30 },
  { id: "dedetiza", area: "reg", nome: "Controle de pragas (dedetização)", base: "Vigilância sanitária; RDC ANVISA 52/2009", meses: 6, antes: 15, conferir: true },
  { id: "caixa_agua", area: "reg", nome: "Limpeza da caixa d'água", base: "Vigilância sanitária", meses: 6, antes: 15, conferir: true },
  // ── Sistemas de gestão ──
  { id: "aud_int", area: "sg", nome: "Auditoria interna (ISO 9001/14001/45001)", base: "Requisito 9.2 das normas ISO", meses: 12, antes: 30, conferir: true },
  { id: "analise", area: "sg", nome: "Análise crítica pela direção", base: "Requisito 9.3 das normas ISO", meses: 12, antes: 30, conferir: true },
  { id: "aud_ext", area: "sg", nome: "Auditoria de manutenção da certificação", base: "Organismo certificador", meses: 12, antes: 60 },
  { id: "requisitos", area: "sg", nome: "Atualização do levantamento de requisitos legais", base: "ISO 14001/45001, item 6.1.3", meses: 6, antes: 15, conferir: true },
];
const OBR = Object.fromEntries(OBRIGACOES.map((o) => [o.id, o]));

// segmentos: obrigações que o sistema SUGERE (o técnico confirma o que se aplica)
const SEGMENTOS = {
  comercio: { nome: "Comércio varejista / atacadista", sug: ["lo", "pgrs", "pgr", "pcmso", "aso", "alvara", "avcb", "extintor", "brigada", "cnd_fed", "crf", "cndt"] },
  servicos: { nome: "Serviços / escritório", sug: ["dispensa", "pgr", "pcmso", "aso", "alvara", "avcb", "extintor", "cnd_fed", "crf", "cndt"] },
  alimentos: { nome: "Alimentação (restaurante, padaria, lanchonete)", sug: ["lo", "pgrs", "separador", "pgr", "pcmso", "aso", "alvara", "visa", "avcb", "extintor", "dedetiza", "caixa_agua"] },
  saude: { nome: "Saúde (clínica, laboratório, farmácia, odonto, veterinária)", sug: ["lo", "pgrs", "ctf", "pgr", "pcmso", "aso", "alvara", "visa", "avcb", "extintor", "dedetiza", "caixa_agua"] },
  industria: { nome: "Indústria", sug: ["lo", "condic", "ctf", "rapp", "tcfa", "dmr", "inv_res", "pgrs", "automon", "outorga", "pgr", "pcmso", "aso", "ltcat", "cipa", "nr12", "nr10", "nr11", "brigada", "extintor", "epi_ca", "esocial", "alvara", "avcb"] },
  construcao: { nome: "Construção civil", sug: ["li", "lo", "pgrs", "dmr", "pgr", "pcmso", "aso", "nr35", "nr10", "nr12", "nr11", "cipa", "epi_ca", "esocial", "alvara", "art"] },
  posto: { nome: "Posto de combustível", sug: ["lo", "condic", "ctf", "rapp", "tcfa", "pgrs", "separador", "automon", "pgr", "pcmso", "aso", "nr20", "brigada", "extintor", "alvara", "avcb"] },
  oficina: { nome: "Oficina mecânica / lava-jato / autopeças", sug: ["lo", "pgrs", "separador", "dmr", "ctf", "pgr", "pcmso", "aso", "nr12", "extintor", "epi_ca", "alvara", "avcb"] },
  agro: { nome: "Agropecuária / agroindústria", sug: ["lo", "outorga", "ctf", "rapp", "pgrs", "pgr", "pcmso", "aso", "nr12", "epi_ca", "alvara"] },
  transporte: { nome: "Transporte e logística", sug: ["lo", "ctf", "pgrs", "separador", "pgr", "pcmso", "aso", "nr11", "nr35", "alvara", "avcb", "extintor"] },
  residuos: { nome: "Gestão de resíduos / reciclagem / sucata", sug: ["lo", "condic", "ctf", "rapp", "tcfa", "dmr", "inv_res", "pgrs", "pgr", "pcmso", "aso", "nr12", "epi_ca", "alvara", "avcb"] },
  eventos: { nome: "Eventos, lazer e hotelaria", sug: ["lo", "pgrs", "pgr", "pcmso", "aso", "alvara", "visa", "avcb", "brigada", "extintor", "caixa_agua"] },
  educacao: { nome: "Educação", sug: ["dispensa", "pgr", "pcmso", "aso", "alvara", "visa", "avcb", "brigada", "extintor", "caixa_agua"] },
  outro: { nome: "Outro", sug: ["pgr", "pcmso", "aso", "alvara"] },
};

const LEGISLACAO = [
  { area: "ma", nome: "Lei 6.938/1981 – Política Nacional do Meio Ambiente", resumo: "SISNAMA, licenciamento, CTF e TCFA.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6938.htm" },
  { area: "ma", nome: "Lei 15.190/2025 – Lei Geral do Licenciamento Ambiental", resumo: "Normas gerais do licenciamento (em vigor desde 2026).", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15190.htm" },
  { area: "ma", nome: "Lei Complementar 140/2011", resumo: "Competências dos entes no licenciamento; renovação com 120 dias.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp140.htm" },
  { area: "ma", nome: "Lei 12.305/2010 – Política Nacional de Resíduos Sólidos", resumo: "PGRS, logística reversa, responsabilidade compartilhada.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm" },
  { area: "ma", nome: "Decreto 10.936/2022 – Regulamenta a PNRS", resumo: "MTR, inventário, SINIR.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/D10936.htm" },
  { area: "ma", nome: "Lei 12.651/2012 – Código Florestal", resumo: "APP, reserva legal, CAR.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm" },
  { area: "ma", nome: "Lei 9.605/1998 – Crimes Ambientais", resumo: "Sanções penais e administrativas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm" },
  { area: "ma", nome: "Lei 9.433/1997 – Política Nacional de Recursos Hídricos", resumo: "Outorga e cobrança pelo uso da água.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9433.htm" },
  { area: "ma", nome: "Resoluções CONAMA (001/86, 237/97, 307/02, 357/05, 430/11…)", resumo: "EIA/RIMA, licenciamento, resíduos da construção, efluentes.", url: "https://conama.mma.gov.br/" },
  { area: "ma", nome: "Lei AL 6.787/2006 – Política Estadual de Meio Ambiente (Alagoas)", resumo: "Licenciamento pelo IMA/AL.", url: "https://www2.ima.al.gov.br/wp-content/uploads/legislacao/leis-estaduais/Lei%20n%C2%BA%206.787%20ATUAL.pdf" },
  { area: "ma", nome: "Resolução CEPRAM 20/2017 (Alagoas)", resumo: "Pequeno e médio potencial de impacto; formulário de potencial poluidor.", url: "https://www.legisweb.com.br/legislacao/?id=337688" },
  { area: "sst", nome: "Normas Regulamentadoras (NR-01 a NR-38) – vigentes", resumo: "PGR, PCMSO, CIPA, EPI, NR-10, NR-12, NR-33, NR-35…", url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes" },
  { area: "sst", nome: "CLT – Capítulo V (Segurança e Medicina do Trabalho)", resumo: "Arts. 154 a 201.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm" },
  { area: "sst", nome: "Lei 8.213/1991 – Benefícios da Previdência", resumo: "CAT (art. 22), LTCAT e aposentadoria especial (art. 58).", url: "https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm" },
  { area: "sst", nome: "eSocial – eventos de SST", resumo: "S-2210 (CAT), S-2220 (ASO), S-2240 (agentes nocivos).", url: "https://www.gov.br/esocial/pt-br" },
  { area: "reg", nome: "LGPD – Lei 13.709/2018", resumo: "Tratamento de dados pessoais de clientes e trabalhadores.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
  { area: "reg", nome: "Licença sanitária – Portal Alagoas Digital", resumo: "Como pedir a licença sanitária em AL.", url: "https://alagoasdigital.al.gov.br/servico/5ab15eba547bb370bc7c1c42/licenca-sanitaria" },
  { area: "reg", nome: "CBMAL – Instrução Técnica 01/2021", resumo: "Procedimentos administrativos do Corpo de Bombeiros de Alagoas.", url: "https://saps.cbm.al.gov.br/webroot/downloads/IT%2001_2021%20CBMAL%20-%20Procedimentos%20Administrativos%20-%20Parte%201%20-%20Aspectos%20Gerais.pdf" },
  { area: "ma", nome: "Consulta de autuações e embargos (IBAMA)", resumo: "Verificar se o cliente tem embargo ou auto de infração.", url: "https://www.gov.br/pt-br/servicos/consultar-autuacoes-ambientais-e-embargos" },
  { area: "ma", nome: "Sistema MTR / SINIR", resumo: "Manifesto de Transporte de Resíduos e DMR.", url: "https://mtr.sinir.gov.br/" },
];

const CHECKLISTS = {
  ma: ["Licença ambiental vigente e disponível no local", "Condicionantes em dia", "Resíduos segregados e identificados",
       "Área de armazenamento de resíduos coberta e impermeabilizada", "MTR emitidos e destinadores licenciados",
       "Efluentes com tratamento / caixa separadora limpa", "Sem lançamento irregular de efluentes", "Emissões atmosféricas e odor sob controle",
       "Ruído compatível com a vizinhança", "Produtos químicos com bacia de contenção", "PGRS implantado e equipe treinada"],
  sst: ["PGR e PCMSO vigentes", "ASOs em dia", "EPI adequado, com CA e ficha de entrega", "Extintores sinalizados, desobstruídos e no prazo",
        "Saídas de emergência livres e sinalizadas", "Máquinas com proteções (NR-12)", "Instalações elétricas protegidas (NR-10)",
        "Treinamentos obrigatórios registrados", "Kit de primeiros socorros", "CIPA ou designado de segurança", "Sinalização de segurança"],
  reg: ["Alvará de funcionamento vigente e visível", "Licença sanitária vigente", "Certificado do Corpo de Bombeiros vigente",
        "Controle de pragas no prazo", "Limpeza da caixa d'água no prazo", "Certidões negativas atualizadas"],
  sg: ["Política e objetivos divulgados", "Requisitos legais atualizados", "Não conformidades tratadas", "Indicadores monitorados"],
};

const ATALHOS_IA = [
  { area: "ma", t: "Ofício de entrega de condicionante", p: "Redija um ofício formal ao órgão ambiental entregando o cumprimento de uma condicionante. Use campos entre colchetes para o que eu preciso completar (empresa, nº da licença, nº da condicionante, documento anexado)." },
  { area: "ma", t: "Estrutura de um PGRS", p: "Monte a estrutura (sumário comentado) de um PGRS para uma pequena empresa, segundo a Lei 12.305/2010, indicando o que entra em cada item." },
  { area: "ma", t: "Checklist para LO no IMA/AL", p: "Liste os documentos normalmente pedidos para requerer Licença de Operação no IMA/AL, separando o que é da empresa e o que é do técnico. Avise o que eu devo confirmar no termo de referência." },
  { area: "ma", t: "Prazos desta semana", p: "Quais prazos vencem nos próximos 7 dias e quais estão atrasados? Organize por empresa.", ferramenta: true },
  { area: "sst", t: "Diferença entre PGR, PCMSO e LTCAT", p: "Explique de forma objetiva a diferença entre PGR, PCMSO e LTCAT, quando cada um é exigido e como se conectam." },
  { area: "sst", t: "Ordem de serviço de segurança (NR-01)", p: "Redija uma ordem de serviço de segurança para a função [função], com riscos, medidas de prevenção e EPIs. Deixe campos para eu completar." },
  { area: "sst", t: "Treinamentos por atividade", p: "Para uma empresa de [segmento] com atividades de [atividades], quais treinamentos de NR podem ser exigidos e com qual periodicidade? Indique o que conferir na norma." },
  { area: "reg", t: "Documentos para alvará", p: "Liste os documentos normalmente pedidos para alvará de funcionamento, licença sanitária e vistoria do Corpo de Bombeiros, avisando que variam por município." },
  { area: "geral", t: "Resposta ao cliente (WhatsApp)", p: "Escreva uma mensagem curta e cordial de WhatsApp para o cliente [nome] explicando que [assunto] e o que ele precisa enviar." },
  { area: "geral", t: "Proposta de serviço", p: "Redija o texto de escopo de uma proposta de consultoria para [serviço] na empresa [empresa], com etapas, entregáveis e responsabilidades do cliente." },
];

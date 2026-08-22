const estadoTimes = { campeonatos: [], campeonato: null, time: "", parciais: null };
const formatadorTimes = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function textoTimes(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}

function pontosTimes(valor) {
  return typeof valor === "number" ? formatadorTimes.format(valor) : "—";
}

function dadosDoTime(campeonato, nomeTime) {
  const historico = [];
  campeonato.rodadas.forEach((rodada) => {
    rodada.partidas.forEach((partida) => {
      const mandante = partida.mandante.time === nomeTime;
      const visitante = partida.visitante.time === nomeTime;
      if (!mandante && !visitante) return;
      const equipe = mandante ? partida.mandante : partida.visitante;
      const adversario = mandante ? partida.visitante : partida.mandante;
      if (typeof equipe.pontuacao !== "number") return;
      historico.push({
        rodada: rodada.numero,
        cartoleiro: equipe.cartoleiro,
        pontuacao: equipe.pontuacao,
        resultado: equipe.resultado,
        naoEscalou: equipe.naoEscalou,
        adversario,
        mandante,
      });
    });
  });
  return historico.sort((a, b) => a.rodada - b.rodada);
}

function tabelaAteRodada(campeonato, numeroRodada) {
  const times = new Map(campeonato.classificacao.map((item) => [item.time, {
    time: item.time, pontos: 0, vitorias: 0, marcados: 0, sofridos: 0,
  }]));
  campeonato.rodadas.filter((rodada) => rodada.numero <= numeroRodada).forEach((rodada) => {
    rodada.partidas.forEach((partida) => {
      if (typeof partida.mandante.pontuacao !== "number" || typeof partida.visitante.pontuacao !== "number") return;
      [partida.mandante, partida.visitante].forEach((equipe, indice) => {
        const registro = times.get(equipe.time);
        if (!registro) return;
        const oponente = indice === 0 ? partida.visitante : partida.mandante;
        registro.marcados += equipe.pontuacao;
        registro.sofridos += oponente.pontuacao;
        if (equipe.resultado === "V") { registro.pontos += 3; registro.vitorias += 1; }
        if (equipe.resultado === "E") registro.pontos += 1;
      });
    });
  });
  return [...times.values()].sort((a, b) =>
    b.pontos - a.pontos || b.vitorias - a.vitorias ||
    (b.marcados - b.sofridos) - (a.marcados - a.sofridos) ||
    b.marcados - a.marcados || a.time.localeCompare(b.time, "pt-BR"));
}

function posicaoNaRodada(campeonato, nomeTime, rodada) {
  const indice = tabelaAteRodada(campeonato, rodada).findIndex((item) => item.time === nomeTime);
  return indice >= 0 ? indice + 1 : null;
}

function rodadaEmAberto(campeonato) {
  return campeonato.rodadas.find((rodada) => rodada.partidas.some((partida) =>
    partida.mandante.pontuacao === null || partida.visitante.pontuacao === null))?.numero ||
    campeonato.rodadas.at(-1)?.numero;
}

function confrontoDoTime(campeonato, nomeTime, numeroRodada) {
  const rodada = campeonato.rodadas.find((item) => item.numero === numeroRodada);
  if (!rodada) return null;
  const partida = rodada.partidas.find((item) =>
    item.mandante.time === nomeTime || item.visitante.time === nomeTime);
  if (!partida) return null;
  return partida.mandante.time === nomeTime
    ? { time: partida.mandante, adversario: partida.visitante }
    : { time: partida.visitante, adversario: partida.mandante };
}

function formatarAtualizacao(dataIso) {
  if (!dataIso) return "";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function renderizarParcial() {
  const campeonato = estadoTimes.campeonato;
  if (!campeonato || !estadoTimes.time) return;
  const dados = estadoTimes.parciais || {};
  const numeroRodada = dados.rodadaCampeonato || rodadaEmAberto(campeonato);
  const confronto = confrontoDoTime(campeonato, estadoTimes.time, numeroRodada);
  const ladoTime = document.getElementById("lado-time-parcial");
  const ladoAdversario = document.getElementById("lado-adversario-parcial");
  [ladoTime, ladoAdversario].forEach((lado) => lado?.classList.remove("vencendo", "perdendo", "empatando"));

  if (!confronto) {
    textoTimes("nome-time-parcial", estadoTimes.time);
    textoTimes("nome-adversario-parcial", "Adversário não identificado");
    textoTimes("pontos-time-parcial", "—");
    textoTimes("pontos-adversario-parcial", "—");
    textoTimes("status-parcial", "Não foi encontrado confronto para esta rodada.");
    textoTimes("resultado-parcial", "Confira se a tabela da rodada já foi preenchida.");
    return;
  }

  const chaveTime = `${campeonato.serie}|${confronto.time.time}`;
  const chaveAdversario = `${campeonato.serie}|${confronto.adversario.time}`;
  const parcialTime = dados.pontuacoes?.[chaveTime];
  const parcialAdversario = dados.pontuacoes?.[chaveAdversario];
  textoTimes("nome-time-parcial", confronto.time.time);
  textoTimes("nome-adversario-parcial", confronto.adversario.time);
  textoTimes("pontos-time-parcial", pontosTimes(parcialTime));
  textoTimes("pontos-adversario-parcial", pontosTimes(parcialAdversario));

  const atualizacao = formatarAtualizacao(dados.atualizadoEm);
  textoTimes("status-parcial", `${numeroRodada}ª rodada do campeonato${dados.rodadaCartola ? ` · ${dados.rodadaCartola}ª rodada do Cartola` : ""}${atualizacao ? ` · atualizado em ${atualizacao}` : ""}`);

  if (typeof parcialTime !== "number" || typeof parcialAdversario !== "number") {
    textoTimes("resultado-parcial", dados.mensagem || "Aguardando pontuações parciais.");
    return;
  }

  const diferenca = parcialTime - parcialAdversario;
  if (Math.abs(diferenca) < 5) {
    ladoTime?.classList.add("empatando");
    ladoAdversario?.classList.add("empatando");
    textoTimes("resultado-parcial", "EMPATE PARCIAL — diferença menor que 5 pontos.");
  } else if (diferenca > 0) {
    ladoTime?.classList.add("vencendo");
    ladoAdversario?.classList.add("perdendo");
    textoTimes("resultado-parcial", `${confronto.time.time} está vencendo por ${pontosTimes(Math.abs(diferenca))} pontos.`);
  } else {
    ladoTime?.classList.add("perdendo");
    ladoAdversario?.classList.add("vencendo");
    textoTimes("resultado-parcial", `${confronto.adversario.time} está vencendo por ${pontosTimes(Math.abs(diferenca))} pontos.`);
  }
}

async function carregarParciais(forcarAtualizacao = false) {
  const botao = document.getElementById("atualizar-parcial");
  if (botao) botao.disabled = true;
  try {
    const sufixo = forcarAtualizacao ? `?t=${Date.now()}` : "";
    const resposta = await fetch(`../dados/parciais.json${sufixo}`, { cache: forcarAtualizacao ? "no-store" : "default" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    estadoTimes.parciais = await resposta.json();
  } catch (erro) {
    estadoTimes.parciais = { mensagem: "Não foi possível consultar as parciais neste momento.", pontuacoes: {} };
    console.error("Erro ao carregar as parciais:", erro);
  } finally {
    if (botao) botao.disabled = false;
    renderizarParcial();
  }
}

function criarOpcao(valor, rotulo) {
  const opcao = document.createElement("option");
  opcao.value = valor;
  opcao.textContent = rotulo;
  return opcao;
}

function preencherTimes(nomePreferido) {
  const seletor = document.getElementById("seletor-time");
  if (!seletor || !estadoTimes.campeonato) return;
  seletor.replaceChildren();
  const nomes = estadoTimes.campeonato.classificacao.map((item) => item.time);
  nomes.forEach((nome) => seletor.append(criarOpcao(nome, nome)));
  const selecionado = nomes.includes(nomePreferido) ? nomePreferido : nomes[0];
  seletor.value = selecionado;
  estadoTimes.time = selecionado;
}

function renderizarGrafico(historico) {
  const grafico = document.getElementById("grafico-evolucao");
  if (!grafico) return;
  grafico.replaceChildren();
  const maior = Math.max(...historico.map((item) => item.pontuacao), 1);
  historico.forEach((item) => {
    const coluna = document.createElement("article");
    coluna.className = `coluna-evolucao resultado-${(item.resultado || "n").toLowerCase()}`;
    const cabecalho = document.createElement("div");
    const rodada = document.createElement("span");
    rodada.textContent = `${item.rodada}ª`;
    const posicao = document.createElement("small");
    const colocacao = posicaoNaRodada(estadoTimes.campeonato, estadoTimes.time, item.rodada);
    posicao.textContent = colocacao ? `${colocacao}º lugar` : "—";
    cabecalho.append(rodada, posicao);
    const trilho = document.createElement("div");
    trilho.className = "trilho-pontos";
    const barra = document.createElement("span");
    barra.style.width = `${Math.max((item.pontuacao / maior) * 100, 2)}%`;
    trilho.append(barra);
    const pontos = document.createElement("strong");
    pontos.textContent = pontosTimes(item.pontuacao);
    coluna.append(cabecalho, trilho, pontos);
    grafico.append(coluna);
  });
}

function renderizarConfrontos(historico) {
  const lista = document.getElementById("historico-confrontos");
  if (!lista) return;
  lista.replaceChildren();
  [...historico].reverse().forEach((item) => {
    const artigo = document.createElement("article");
    artigo.className = `confronto-time resultado-${(item.resultado || "n").toLowerCase()}`;
    const rodada = document.createElement("span");
    rodada.className = "numero-rodada-time";
    rodada.textContent = `${item.rodada}ª RODADA`;
    const adversario = document.createElement("strong");
    adversario.textContent = item.adversario.time;
    const placar = document.createElement("b");
    placar.textContent = `${pontosTimes(item.pontuacao)} × ${pontosTimes(item.adversario.pontuacao)}`;
    const resultado = document.createElement("span");
    resultado.className = "selo-resultado-time";
    resultado.textContent = item.naoEscalou ? "NÃO ESCALOU" : ({ V: "VITÓRIA", E: "EMPATE", D: "DERROTA" }[item.resultado] || "—");
    artigo.append(rodada, adversario, placar, resultado);
    lista.append(artigo);
  });
}

function renderizarTime() {
  const campeonato = estadoTimes.campeonato;
  const nomeTime = estadoTimes.time;
  if (!campeonato || !nomeTime) return;
  const classificacao = campeonato.classificacao.find((item) => item.time === nomeTime);
  const historico = dadosDoTime(campeonato, nomeTime);
  const melhor = [...historico].sort((a, b) => b.pontuacao - a.pontuacao)[0];
  const pior = [...historico].sort((a, b) => a.pontuacao - b.pontuacao)[0];
  const vitorias = historico.filter((item) => item.resultado === "V").length;
  const empates = historico.filter((item) => item.resultado === "E").length;
  const derrotas = historico.filter((item) => item.resultado === "D").length;
  const recentes = historico.slice(-5).map((item) => item.resultado || "—").join(" · ");

  textoTimes("serie-time", `SÉRIE ${campeonato.serie}`);
  textoTimes("nome-time", nomeTime);
  textoTimes("nome-cartoleiro", historico.at(-1)?.cartoleiro || "Cartoleiro não informado");
  textoTimes("posicao-atual", classificacao ? `${classificacao.posicao}º` : "—");
  textoTimes("jogos-time", historico.length);
  textoTimes("pontos-time", classificacao?.pontos ?? "—");
  textoTimes("media-time", pontosTimes(classificacao?.media));
  textoTimes("melhor-rodada-time", melhor ? `${pontosTimes(melhor.pontuacao)} · ${melhor.rodada}ª` : "—");
  textoTimes("pior-rodada-time", pior ? `${pontosTimes(pior.pontuacao)} · ${pior.rodada}ª` : "—");
  textoTimes("vitorias-time", vitorias);
  textoTimes("empates-time", empates);
  textoTimes("derrotas-time", derrotas);
  textoTimes("sequencia-time", `Últimos resultados: ${recentes || "—"}`);
  textoTimes("status-times", `${historico.length} rodada(s) disputada(s) · dados atualizados automaticamente`);
  renderizarGrafico(historico);
  renderizarConfrontos(historico);
  renderizarParcial();

  const url = new URL(window.location.href);
  url.searchParams.set("serie", campeonato.serie);
  url.searchParams.set("time", nomeTime);
  window.history.replaceState(null, "", url);
}

function selecionarSerie(letra, nomePreferido) {
  estadoTimes.campeonato = estadoTimes.campeonatos.find((item) => item.serie === letra) || estadoTimes.campeonatos[0];
  document.getElementById("seletor-serie").value = estadoTimes.campeonato.serie;
  preencherTimes(nomePreferido);
  renderizarTime();
}

async function carregarTimes() {
  try {
    const respostas = await Promise.all(["a", "b", "c", "d", "e"].map((serie) => fetch(`../dados/serie-${serie}.json`)));
    if (respostas.some((resposta) => !resposta.ok)) throw new Error("Falha ao carregar um dos campeonatos");
    estadoTimes.campeonatos = await Promise.all(respostas.map((resposta) => resposta.json()));
    await carregarParciais();
    const seletorSerie = document.getElementById("seletor-serie");
    estadoTimes.campeonatos.forEach((campeonato) => seletorSerie.append(criarOpcao(campeonato.serie, `SÉRIE ${campeonato.serie}`)));
    const parametros = new URLSearchParams(window.location.search);
    selecionarSerie((parametros.get("serie") || "A").toUpperCase(), parametros.get("time") || "");
    seletorSerie.addEventListener("change", () => selecionarSerie(seletorSerie.value, ""));
    document.getElementById("seletor-time").addEventListener("change", (evento) => {
      estadoTimes.time = evento.target.value;
      renderizarTime();
    });
    document.getElementById("atualizar-parcial").addEventListener("click", () => carregarParciais(true));
  } catch (erro) {
    textoTimes("status-times", "Não foi possível carregar o histórico dos times.");
    console.error("Erro ao carregar os times:", erro);
  }
}

document.addEventListener("DOMContentLoaded", carregarTimes);

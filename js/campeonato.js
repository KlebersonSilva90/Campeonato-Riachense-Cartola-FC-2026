const estadoCampeonato = { dados: null, rodadaAtual: 1 };
const formatadorPontuacao = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatarPontuacao(valor) {
  return typeof valor === "number" ? formatadorPontuacao.format(valor) : "—";
}

function criarCelula(texto, rotulo) {
  const celula = document.createElement("td");
  celula.textContent = texto;
  celula.dataset.label = rotulo;
  return celula;
}

function obterStatusRodada(rodada) {
  if (!rodada.partidas.length) return "futura";
  let preenchidas = 0;
  rodada.partidas.forEach((partida) => {
    if (typeof partida.mandante.pontuacao === "number") preenchidas += 1;
    if (typeof partida.visitante.pontuacao === "number") preenchidas += 1;
  });
  if (preenchidas === 0) return "futura";
  if (preenchidas === rodada.partidas.length * 2) return "concluída";
  return "parcial";
}

function criarLegenda() {
  const tabela = document.querySelector(".tabela-container");
  if (!tabela || document.getElementById("legenda-classificacao")) return;
  const posicoesAcesso = Number(document.body.dataset.posicoesAcesso || 0);
  const legenda = document.createElement("div");
  legenda.id = "legenda-classificacao";
  legenda.className = "legenda-classificacao";
  legenda.setAttribute("aria-label", "Legenda das cores");

  const itens = posicoesAcesso
    ? [["acesso", "Acesso"], ["rebaixamento", "Rebaixamento"]]
    : [["lider", "Líder"], ["rebaixamento", "Rebaixamento"]];
  itens.push(["vencedor", "Vencedor"], ["empate", "Empate"], ["nao-escalou", "Não escalou"]);

  itens.forEach(([tipo, texto]) => {
    const item = document.createElement("span");
    item.className = "legenda-item";
    const cor = document.createElement("i");
    cor.className = `legenda-cor legenda-${tipo}`;
    cor.setAttribute("aria-hidden", "true");
    item.append(cor, texto);
    legenda.append(item);
  });
  tabela.before(legenda);
}

function criarSeletorRodadas(rodadas) {
  const tituloAtual = document.getElementById("titulo-rodada");
  if (!tituloAtual || tituloAtual.tagName === "SELECT") return;

  const seletor = document.createElement("select");
  seletor.id = "titulo-rodada";
  seletor.className = "seletor-rodada";
  seletor.setAttribute("aria-label", "Selecionar rodada");
  rodadas.forEach((rodada) => {
    const opcao = document.createElement("option");
    opcao.value = rodada.numero;
    opcao.textContent = `${rodada.numero}ª RODADA — ${obterStatusRodada(rodada)}`;
    seletor.append(opcao);
  });
  seletor.addEventListener("change", () => renderizarRodada(Number(seletor.value)));
  tituloAtual.replaceWith(seletor);
}

function renderizarClassificacao(classificacao) {
  const corpo = document.getElementById("corpo-classificacao");
  if (!corpo) return;
  corpo.replaceChildren();
  const primeiraPosicaoRebaixada = Math.max(1, classificacao.length - 3);
  const posicoesAcesso = Number(document.body.dataset.posicoesAcesso || 0);

  classificacao.forEach((time) => {
    const linha = document.createElement("tr");
    if (posicoesAcesso && time.posicao <= posicoesAcesso) {
      linha.classList.add("acesso");
      linha.title = "Zona de acesso";
    } else if (time.posicao >= primeiraPosicaoRebaixada) {
      linha.classList.add("rebaixamento");
      linha.title = "Zona de rebaixamento";
    }
    linha.append(
      criarCelula(time.posicao, "Posição"), criarCelula(time.time, "Time"),
      criarCelula(time.pontos, "PTS"), criarCelula(time.jogos, "J"),
      criarCelula(time.vitorias, "V"), criarCelula(time.empates, "E"),
      criarCelula(time.derrotas, "D"), criarCelula(formatarPontuacao(time.pontosMarcados), "PM"),
      criarCelula(formatarPontuacao(time.pontosSofridos), "PS"),
      criarCelula(formatarPontuacao(time.saldo), "Saldo"), criarCelula(formatarPontuacao(time.media), "Média"),
    );
    corpo.append(linha);
  });
}

function criarEquipe(equipe) {
  const bloco = document.createElement("div");
  bloco.className = "equipe";
  if (equipe.resultado === "V") bloco.classList.add("vencedor");
  if (equipe.resultado === "E") bloco.classList.add("empate");

  const info = document.createElement("div");
  info.className = "equipe-info";
  const time = document.createElement("strong");
  time.textContent = equipe.time || "A definir";
  const cartoleiro = document.createElement("span");
  cartoleiro.textContent = equipe.cartoleiro || "Cartoleiro não informado";
  info.append(time, cartoleiro);

  const placar = document.createElement("span");
  placar.className = "pontuacao";
  placar.textContent = formatarPontuacao(equipe.pontuacao);
  if (equipe.naoEscalou) {
    placar.classList.add("nao-escalou");
    placar.title = "Time não escalado";
  }
  bloco.append(info, placar);
  return bloco;
}

function renderizarRodada(numeroRodada) {
  const rodada = estadoCampeonato.dados?.rodadas.find((item) => item.numero === numeroRodada);
  const lista = document.getElementById("lista-partidas");
  const titulo = document.getElementById("titulo-rodada");
  if (!rodada || !lista || !titulo) return;

  estadoCampeonato.rodadaAtual = numeroRodada;
  if (titulo.tagName === "SELECT") titulo.value = String(numeroRodada);
  else titulo.textContent = `${numeroRodada}ª RODADA`;
  lista.dataset.status = obterStatusRodada(rodada);
  lista.replaceChildren();

  rodada.partidas.forEach((partida) => {
    const artigo = document.createElement("article");
    artigo.className = "partida";
    artigo.append(criarEquipe(partida.mandante));
    const versus = document.createElement("span");
    versus.className = "versus";
    versus.textContent = "×";
    versus.setAttribute("aria-hidden", "true");
    artigo.append(versus, criarEquipe(partida.visitante));
    lista.append(artigo);
  });

  if (!rodada.partidas.length) {
    const vazio = document.createElement("p");
    vazio.className = "estado-dados";
    vazio.textContent = "Confrontos ainda não cadastrados para esta rodada.";
    lista.append(vazio);
  }
}

window.trocarRodadaDados = function trocarRodadaDados(direcao) {
  const total = estadoCampeonato.dados?.rodadas.length || 19;
  let proxima = estadoCampeonato.rodadaAtual + direcao;
  if (proxima < 1) proxima = total;
  if (proxima > total) proxima = 1;
  renderizarRodada(proxima);
};

async function carregarCampeonato() {
  const status = document.getElementById("status-dados");
  const serie = document.body.dataset.serie || "A";
  const dadosUrl = document.body.dataset.dadosUrl || "../dados/serie-a.json";
  try {
    const resposta = await fetch(dadosUrl);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    estadoCampeonato.dados = await resposta.json();
    renderizarClassificacao(estadoCampeonato.dados.classificacao);
    criarLegenda();
    criarSeletorRodadas(estadoCampeonato.dados.rodadas);
    const ultimaConcluida = [...estadoCampeonato.dados.rodadas]
      .reverse()
      .find((rodada) => obterStatusRodada(rodada) === "concluída");
    renderizarRodada(ultimaConcluida?.numero || 1);
    if (status) {
      const data = new Date(estadoCampeonato.dados.atualizadoEm);
      status.textContent = `Dados da planilha · atualizados em ${data.toLocaleString("pt-BR")}`;
    }
  } catch (erro) {
    if (status) status.textContent = `Não foi possível carregar os dados da Série ${serie}.`;
    document.getElementById("fallback-serie")?.removeAttribute("hidden");
    console.error(`Erro ao carregar dados da Série ${serie}:`, erro);
  }
}

document.addEventListener("DOMContentLoaded", carregarCampeonato);
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLSelectElement) return;
  if (event.key === "ArrowLeft") window.trocarRodadaDados(-1);
  if (event.key === "ArrowRight") window.trocarRodadaDados(1);
});
document.addEventListener("DOMContentLoaded", () => {
  const area = document.getElementById("lista-partidas");
  if (!area) return;
  let inicioX = 0;
  area.addEventListener("touchstart", (event) => {
    inicioX = event.touches[0].clientX;
  }, { passive: true });
  area.addEventListener("touchend", (event) => {
    const distancia = event.changedTouches[0].clientX - inicioX;
    if (Math.abs(distancia) > 50) window.trocarRodadaDados(distancia > 0 ? -1 : 1);
  }, { passive: true });
});

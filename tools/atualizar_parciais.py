"""Atualiza as pontuações parciais dos confrontos durante a rodada do Cartola FC."""

from __future__ import annotations

import json
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


RAIZ = Path(__file__).resolve().parents[1]
DADOS = RAIZ / "dados"
ARQUIVO_MAPA = DADOS / "times-cartola.json"
ARQUIVO_PARCIAIS = DADOS / "parciais.json"
API = "https://api.cartola.globo.com"
SERIES = "ABCDE"


def consultar(caminho: str, tentativas: int = 3):
    requisicao = Request(
        f"{API}{caminho}",
        headers={"User-Agent": "Campeonato-Riachense-Cartola-FC/2026"},
    )
    for tentativa in range(tentativas):
        try:
            with urlopen(requisicao, timeout=25) as resposta:
                conteudo = resposta.read().decode("utf-8")
                return json.loads(conteudo) if conteudo.strip() else None
        except (HTTPError, URLError, TimeoutError):
            if tentativa == tentativas - 1:
                raise
            time.sleep(2 ** tentativa)


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto or "")
    texto = "".join(letra for letra in texto if not unicodedata.combining(letra)).casefold()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", texto).split())


def carregar_campeonatos():
    return {
        serie: json.loads((DADOS / f"serie-{serie.lower()}.json").read_text(encoding="utf-8"))
        for serie in SERIES
    }


def carregar_mapa():
    if not ARQUIVO_MAPA.exists():
        return {"atualizadoEm": None, "times": {}}
    return json.loads(ARQUIVO_MAPA.read_text(encoding="utf-8"))


def candidatos_busca(resposta):
    if not resposta:
        return []
    if isinstance(resposta, list):
        return resposta
    if isinstance(resposta, dict):
        for chave in ("times", "resultados"):
            if isinstance(resposta.get(chave), list):
                return resposta[chave]
        if isinstance(resposta.get("time_id"), list):
            quantidade = len(resposta["time_id"])
            return [{
                chave: (valor[indice] if isinstance(valor, list) and indice < len(valor) else valor)
                for chave, valor in resposta.items()
            } for indice in range(quantidade)]
        return [resposta] if resposta.get("time_id") else []
    return []


def localizar_time(nome: str, cartoleiro: str):
    try:
        resposta = consultar(f"/times?q={quote(nome)}")
    except (HTTPError, URLError, TimeoutError) as erro:
        consulta_alternativa = normalizar(nome)
        try:
            resposta = consultar(f"/times?q={quote(consulta_alternativa)}")
        except (HTTPError, URLError, TimeoutError):
            print(f"Aviso: não foi possível localizar {nome}: {erro}")
            return None
    candidatos = candidatos_busca(resposta)
    nome_normalizado = normalizar(nome)
    cartoleiro_normalizado = normalizar(cartoleiro)
    candidatos.sort(
        key=lambda item: (
            normalizar(item.get("nome")) != nome_normalizado,
            normalizar(item.get("nome_cartola")) != cartoleiro_normalizado,
        )
    )
    if not candidatos:
        return None
    escolhido = candidatos[0]
    return {
        "timeId": escolhido.get("time_id"),
        "slug": escolhido.get("slug"),
        "nomeCartola": escolhido.get("nome_cartola"),
    }


def participantes_rodada(campeonato, numero):
    rodada = next((item for item in campeonato["rodadas"] if item["numero"] == numero), None)
    if not rodada:
        return []
    return [equipe for partida in rodada["partidas"] for equipe in (partida["mandante"], partida["visitante"])]


def rodada_local_atual(campeonatos):
    quantidade = max(len(campeonato["rodadas"]) for campeonato in campeonatos.values())
    for numero in range(1, quantidade + 1):
        participantes = [
            equipe
            for campeonato in campeonatos.values()
            for equipe in participantes_rodada(campeonato, numero)
        ]
        if participantes and any(equipe.get("pontuacao") is None for equipe in participantes):
            return numero
    return quantidade


def mapa_parciais(resposta):
    if not isinstance(resposta, dict):
        return {}
    atletas = resposta.get("atletas", resposta)
    if not isinstance(atletas, dict):
        return {}
    return {str(chave): valor for chave, valor in atletas.items()}


def valor_parcial(atleta):
    if not isinstance(atleta, dict):
        return 0.0
    for chave in ("pontuacao", "pontos_num", "pontos"):
        if isinstance(atleta.get(chave), (int, float)):
            return float(atleta[chave])
    return 0.0


def calcular_pontuacao(time_cartola, parciais):
    atletas = time_cartola.get("atletas") or []
    if not atletas:
        return None
    capitao = str(time_cartola.get("capitao_id") or "")
    total = 0.0
    encontrados = 0
    for atleta in atletas:
        atleta_id = str(atleta.get("atleta_id") or atleta.get("id") or "")
        parcial = parciais.get(atleta_id)
        if parcial is None:
            continue
        pontos = valor_parcial(parcial)
        total += pontos * (1.5 if atleta_id == capitao else 1)
        encontrados += 1
    return round(total, 2) if encontrados else 0.0


def salvar(arquivo: Path, dados):
    arquivo.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def salvar_estado_se_mudou(arquivo: Path, dados):
    anterior = None
    if arquivo.exists():
        anterior = json.loads(arquivo.read_text(encoding="utf-8"))
    comparacao_anterior = {chave: valor for chave, valor in (anterior or {}).items() if chave != "atualizadoEm"}
    comparacao_nova = {chave: valor for chave, valor in dados.items() if chave != "atualizadoEm"}
    if comparacao_anterior == comparacao_nova:
        return False
    dados["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    salvar(arquivo, dados)
    return True


def main():
    campeonatos = carregar_campeonatos()
    rodada_campeonato = rodada_local_atual(campeonatos)
    mercado = consultar("/mercado/status") or {}
    rodada_cartola = mercado.get("rodada_atual")
    fechado = mercado.get("status_mercado") == 2
    mapa = carregar_mapa()
    times_antes = json.dumps(mapa["times"], ensure_ascii=False, sort_keys=True)
    chaves_rodada = []

    for serie, campeonato in campeonatos.items():
        for equipe in participantes_rodada(campeonato, rodada_campeonato):
            chave = f"{serie}|{equipe['time']}"
            chaves_rodada.append(chave)
            if mapa["times"].get(chave, {}).get("timeId"):
                continue
            encontrado = localizar_time(equipe["time"], equipe.get("cartoleiro", ""))
            mapa["times"][chave] = encontrado or {"timeId": None, "slug": None, "nomeCartola": None}
            time.sleep(0.12)

    if json.dumps(mapa["times"], ensure_ascii=False, sort_keys=True) != times_antes:
        mapa["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
        salvar(ARQUIVO_MAPA, mapa)

    saida = {
        "atualizadoEm": None,
        "rodadaCampeonato": rodada_campeonato,
        "rodadaCartola": rodada_cartola,
        "mercadoFechado": fechado,
        "bolaRolando": bool(mercado.get("bola_rolando")),
        "disponivel": False,
        "mensagem": "As parciais aparecem quando o mercado do Cartola FC estiver fechado.",
        "pontuacoes": {},
    }

    if fechado and rodada_cartola:
        parciais = mapa_parciais(consultar("/atletas/pontuados"))
        if parciais:
            for chave in chaves_rodada:
                time_id = mapa["times"].get(chave, {}).get("timeId")
                if not time_id:
                    saida["pontuacoes"][chave] = None
                    continue
                try:
                    escalacao = consultar(f"/time/id/{time_id}") or {}
                    saida["pontuacoes"][chave] = calcular_pontuacao(escalacao, parciais)
                except (HTTPError, URLError, TimeoutError):
                    saida["pontuacoes"][chave] = None
                time.sleep(0.12)
            saida["disponivel"] = True
            saida["mensagem"] = "Pontuações parciais da rodada em andamento."
        else:
            saida["mensagem"] = "Mercado fechado; aguardando as primeiras pontuações dos atletas."

    salvar_estado_se_mudou(ARQUIVO_PARCIAIS, saida)
    print(saida["mensagem"])


if __name__ == "__main__":
    main()

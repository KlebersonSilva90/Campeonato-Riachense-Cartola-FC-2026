"""Atualiza e valida os dados públicos das Séries A, B, C, D e E."""

from __future__ import annotations

import sys
from datetime import datetime

from extrair_serie_a import ROOT, build_data, save_data, validate_data


SERIES = ("A", "B", "C", "D", "E")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("=" * 62)
    print("ATUALIZAÇÃO DOS CAMPEONATOS")
    print(datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
    print("=" * 62)

    staged: list[tuple[str, dict, object]] = []
    all_errors: list[str] = []
    all_warnings: list[str] = []

    for serie in SERIES:
        print(f"\n[Série {serie}] Lendo planilha...")
        try:
            data, output = build_data(serie)
            errors, warnings = validate_data(data)
        except Exception as error:
            all_errors.append(f"Série {serie}: não foi possível processar ({error})")
            print(f"  ERRO: {error}")
            continue

        if errors:
            for error in errors:
                all_errors.append(f"Série {serie}: {error}")
                print(f"  ERRO: {error}")
            continue

        for warning in warnings:
            all_warnings.append(f"Série {serie}: {warning}")
            print(f"  AVISO: {warning}")

        completed_rounds = sum(
            1 for round_data in data["rodadas"]
            if round_data["partidas"] and all(
                isinstance(match["mandante"]["pontuacao"], (int, float))
                and isinstance(match["visitante"]["pontuacao"], (int, float))
                for match in round_data["partidas"]
            )
        )
        leader = data["classificacao"][0]
        print(f"  OK: 20 times, 19 rodadas, {completed_rounds} concluídas")
        print(f"  Líder: {leader['time']} ({leader['pontos']} pts)")
        staged.append((serie, data, output))

    if all_errors:
        print("\n" + "=" * 62)
        print(f"ATUALIZAÇÃO CANCELADA: {len(all_errors)} erro(s)")
        print("Nenhum arquivo JSON foi substituído.")
        print("=" * 62)
        return 1

    for _, data, output in staged:
        save_data(data, output)

    print("\n" + "=" * 62)
    print(f"CONCLUÍDO: {len(staged)} séries atualizadas")
    print(f"Avisos: {len(all_warnings)}")
    print(f"Destino: {ROOT / 'dados'}")
    print("=" * 62)
    return 0


if __name__ == "__main__":
    sys.exit(main())

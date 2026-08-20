# Atualização dos campeonatos

Mantenha as cinco planilhas na pasta `planilhas/`:

```text
planilhas/
├── Serie A2.xlsm
├── Serie B2.xlsm
├── Serie C2.xlsm
├── Serie D2.xlsm
└── Serie E2.xlsm
```

Depois de editar e salvar as planilhas, execute na raiz do projeto:

```powershell
python tools/atualizar_campeonatos.py
```

O comando lê as Séries A–E, valida os dados e atualiza os arquivos em `dados/`.

As validações incluem:

- 20 times por série;
- 19 rodadas e 10 confrontos por rodada;
- nomes duplicados ou desconhecidos;
- pontuação preenchida somente de um lado;
- pontos, jogos, vitórias, empates e derrotas;
- pontos marcados, sofridos, saldo e média;
- classificação compatível com os confrontos preenchidos.

Se qualquer série apresentar erro, nenhum JSON é substituído. Corrija a planilha indicada e execute o comando novamente.

# INSIGHTS — La ricerca che impara dalle ricerche

TASK-130, ADR-0101. Il codice è in `services/api/shaperoute_api/insights/`.

## Il ciclo

```
ricerche ──► eventi ──► report + propose ──► explain ──► apply ──► vocabolario vN
   ▲          (data/insights,                (prove)     (a mano,    (nel repo,
   │           mai cancellati)                            validato)   versionato)
   └──────────── l'API legge il vocabolario: tabelle → vocabolario → AI ◄──┘
                         metriche per versione: ha aiutato?  →  revert
```

1. **Raccolta.** L'API scrive un evento per: parole della forma
   (`shape_reading`), percorsi (`route`), percorsi a tema (`themed`), città
   cercate (`city_search`), «Explore» (`recommended_list`,
   `recommended_open`), e i segnali d'uso (`gpx_export`, `run_scored`).
   Ogni evento ha esito, codice d'errore, numero di risultati, somiglianza,
   tappe trovate e toccate, millisecondi, chi ha risposto (`table`,
   `learned`, `ai`) e la **versione del vocabolario**.
2. **Analisi** (`report`): metriche totali e per versione, query più
   chieste.
3. **Proposte** (`propose`): ognuna con id stabile, motivo, numero di
   eventi ed esempi. Tipi:
   - `theme_synonym`, `shape_synonym`: una frase che l'AI ha letto allo
     stesso modo ≥ 3 volte e mai diversamente, che non contraddice le
     tabelle. Applicata, l'API risponde senza l'AI.
   - `catalog_city`: una città dove «Explore» è stato vuoto ≥ 3 volte.
   - `catalog_phrase`: una parola disegnata ≥ 3 volte che il catalogo non ha.
   - `review_unknown_theme`, `review_no_places`: per una persona; non si
     applicano.
4. **Spiegazione** (`explain ID`): la proposta, le prove, e quanti eventi
   passati avrebbe risolto senza l'AI (il replay).
5. **Applicazione** (`apply ID`): una nuova versione di
   `shaperoute_api/learned/vocabulary.json`, con data, proposta e motivo.
   Rifiutata se è già applicata o se è una «review». Poi: riavviare l'API,
   rivedere e committare il file (PR come per il codice).
6. **Misura**: `report` mostra le metriche della nuova versione accanto a
   quelle di prima. Peggio? `revert N`: una versione in più uguale alla N.

## Comandi

Dalla radice del repository, con l'ambiente dell'API:

```
services/api/.venv/bin/python -m shaperoute_api.insights report
services/api/.venv/bin/python -m shaperoute_api.insights propose
services/api/.venv/bin/python -m shaperoute_api.insights explain <id>
services/api/.venv/bin/python -m shaperoute_api.insights apply <id>
services/api/.venv/bin/python -m shaperoute_api.insights history
services/api/.venv/bin/python -m shaperoute_api.insights revert <versione>
services/api/.venv/bin/python -m shaperoute_api.insights import-history
```

`--dir` cambia la cartella degli eventi, `--vocab` il vocabolario,
`--json` dà l'uscita per un programma. `import-history` porta il registro
delle richieste (TASK-090) negli eventi, in un file a parte rigenerato ogni
volta, senza le partenze.

## Le metriche

| Metrica | Meglio se |
|---|---|
| `ai_rate`: letture fatte dall'AI | scende (costo) |
| `learned_rate`: letture dal vocabolario | sale |
| `theme_unknown_rate` | scende |
| `themed_success_rate`, `themed_mean_passed` | salgono |
| `route_success_rate`, `route_mean_similarity` | salgono |
| `explore_empty_rate` | scende |
| `gpx_per_route`: GPX esportati per percorso mostrato | sale |

## Privacy, sicurezza, costi

- Nessun identificativo, nessun indirizzo, nessuna posizione precisa:
  celle di ~1 km, o il nome di una città. Email e numeri lunghi oscurati.
  `/places` non si registra.
- File in `data/insights/`, fuori dal repository (`.gitignore`), modo 600.
- **Accesi di default** (scelta dell'utente); `--no-insights` o
  `SHAPEROUTE_INSIGHTS=0` per spegnerli. Scrivere un evento non fa mai
  fallire una richiesta.
- Nessuna modifica automatica: solo `apply`, a mano, su dati; il codice non
  si genera.
- L'analisi legge file locali: nessuna chiamata all'AI o a servizi. Ogni
  frase imparata toglie una chiamata al modello.

## Debug

- `explain <id>`: perché una proposta esiste (motivo, prove, replay).
- `history`: ogni versione del vocabolario, quando, da quale proposta,
  perché.
- Gli eventi sono JSON a una riga: `grep`, `jq`.
- All'avvio l'API scrive dove registra e quale versione del vocabolario
  usa.

## Come provarlo

1. API con eventi in una cartella di prova:
   `python -m shaperoute_api --insights-dir out/insights_test --vocabulary out/insights_test/vocab.json`
   (copiare prima `learned/vocabulary.json` in quella cartella).
2. Tre richieste a tema che le tabelle non conoscono, in tre città
   («un giro per innamorati a Bologna/Torino/Milano»).
3. `propose` mostra il sinonimo; `explain`, poi `apply`.
4. Riavviare l'API; la quarta richiesta (a Roma) ha `"by":"learned"` e
   l'AI non è chiamata. `report`: `ai_rate` 1,0 in v0, 0,0 in v1.
5. `revert 0`, riavvio: l'AI torna a rispondere.

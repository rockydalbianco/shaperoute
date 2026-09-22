# Task

Un file per task. Si scrive **quando il task sta per iniziare**, non in
anticipo: scritto tre mesi prima descrive un codice che non esiste e
decisioni non ancora prese.

Per aprirne uno: copiare `TASK-TEMPLATE.md`.

## Pronti

| Task | Titolo | Fase |
|---|---|---|
| [TASK-001](TASK-001.md) | Repository locale, GitHub, `main` protetto | 0 |
| [TASK-010](TASK-010.md) | Scheletro pacchetto route-engine e CLI | 1 |
| [TASK-011](TASK-011.md) | Forme parametriche: circle e heart | 1 |
| [TASK-012](TASK-012.md) | Proiezione in coordinate geografiche | 1 |
| [TASK-013](TASK-013.md) | Export GPX minimo — **primo riscontro visivo** | 1 |

## Da scrivere quando si arriva

Titolo e confini sono già in `../ROADMAP.md`. Il file si scrive al momento.

`TASK-002` verifica documentazione · `TASK-014` snapping alla rete OSMnx ·
`TASK-015` somiglianza e ottimizzatore · `TASK-016` validazione ·
`TASK-020`–`024` app e API · `TASK-030`–`031` linguaggio naturale

## Numerazione

Per decine, una per fase: `0xx` fondamenta, `01x` route-engine, `02x` app
e API, `03x` AI. I buchi sono voluti: un task nuovo prende un numero libero
della sua decina, senza rinumerare nulla.

## Stati

`Todo` → `In corso` → `Done`

Lo stato si cambia **nel file del task**, dentro la PR che lo esegue. Il
quadro d'insieme sta in `../STATUS.md`, non qui: due elenchi di stati si
disallineano sempre.

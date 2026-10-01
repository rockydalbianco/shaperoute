# TASK-130 — Le ricerche che insegnano

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-130-insights`

Chiesto dall'utente il 2026-10-01: un sistema che analizzi ricerche,
risultati, errori, città, lingue e feedback e proponga miglioramenti di
ricerca e catalogo, validati, versionati e reversibili. Raccolta sempre
accesa (scelta dell'utente).

## Obiettivo

Le ricerche vere producono proposte con prove; applicate a mano, rendono la
ricerca più utile ed economica, e lo si misura.

## Contesto da leggere

- `docs/INSIGHTS.md`, ADR-0101; ADR-0085 e ADR-0096 (registro e privacy)

## Cosa fare

1. Eventi (`insights/events.py`) dagli endpoint e dai percorsi a tema.
2. Analisi e proposte (`analyze.py`), vocabolario versionato
   (`vocabulary.py`), comandi (`__main__.py`).
3. Il vocabolario fra tabelle e AI (`themes.py`, `/shape-readings`).
4. Prova dal vivo del ciclo.
5. (Seconda parte, chiesta di nuovo dall'utente) Prove da giorni o luoghi
   diversi; correzioni dei refusi e `conflict`; validazione del vocabolario
   (`validate`, all'avvio, in CI); `impact` con test sulle proporzioni;
   `apply --dry-run/--again`; città, lingue e richieste riuscite o fallite
   nel `report`; tempo della sola lettura (`read_ms`).

## Criteri di accettazione

- [x] Eventi senza dati personali (celle, oscuramenti), mai bloccanti.
- [x] Proposte con prove e `explain`; `apply`/`revert` versionati, solo a
      mano; nessun codice generato.
- [x] Metriche per versione del vocabolario.
- [x] Storia conservata e storico importabile.
- [x] Test deterministici del ciclo completo; tutti i test dell'API verdi.
- [x] Prova dal vivo: proposta → apply → richiesta letta dal vocabolario.
- [x] Una persona che ripete la stessa richiesta non insegna nulla; l'AI
      contro l'ortografia non si impara senza una persona.
- [x] Il vocabolario si valida prima di `apply`, all'avvio dell'API e in CI.
- [x] `impact` dice meglio / peggio / pochi eventi, e a cosa tornare.

## File toccati

```
services/api/shaperoute_api/insights/__init__.py
services/api/shaperoute_api/insights/events.py
services/api/shaperoute_api/insights/analyze.py
services/api/shaperoute_api/insights/vocabulary.py
services/api/shaperoute_api/insights/__main__.py
services/api/shaperoute_api/learned/vocabulary.json
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/shaperoute_api/themes.py
services/api/shaperoute_api/themed.py
services/api/tests/test_insights.py
.gitignore
docs/INSIGHTS.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-130.md
```

## Fuori scope

- Il database (TASK-114); una pagina web dei report.
- Applicare le proposte da soli.
- Le città e frasi proposte nel giro del catalogo: TASK-128.

## Esito

Dal vivo (API di prova, 2026-10-01): 11 ricerche e 12 richieste storiche
importate; proposte «Lisbona nel catalogo» (Explore vuoto 3 volte) e «un
giro per innamorati = romantic» (AI 3 su 3). Applicata la seconda: «un giro
per innamorati a Roma» letto dal vocabolario, senza AI (v1, `ai_rate` 0).
Notato per una persona: l'AI legge «zzz qualcosa di strano» come
romantico e «stemma della Ferrari» come cerchio: è il motivo per cui non si
impara da una risposta sola.

Seconda parte (2026-10-01): dal vivo, qwen3:4b legge «curoe» come cerchio
(ora `conflict`, non un sinonimo) e «pesca» come pesce. «un giro rmantico»
a Bologna e Torino → `correction` rmantico → romanti… → applicata (v2) →
«un percorso rmantico a Milano, 8 km» letto dal vocabolario, `read_ms` 0
invece di ~1000, cuore a 0,96. `impact`: «too few events» (giusto: 1
evento). 31 test degli insights, 291 dell'API, verdi.

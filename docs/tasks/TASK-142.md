# TASK-142 — Le ricerche che insegnano: i segnali dell'app e le città

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-142-app-signals`

Chiesto dall'utente il 2026-10-01, la terza volta con lo stesso messaggio
di TASK-130: un sistema di auto-miglioramento della ricerca, completo. Il
nucleo c'è (TASK-130, ADR-0101); questo task chiude i buchi trovati nel
codice e negli eventi veri del Mac. Numeri presi senza coordinatore (primi
liberi anche nei branch e nei worktree).

## Obiettivo

Le scelte fatte nell'app (città, percorso fra A·B·C, «Try N km») e le
ricerche corrette dall'utente diventano prove; le città cercate con altre
parole si imparano; ogni cambio, anche del motore o del catalogo, si
misura per data; si può chiedere perché una frase non è ancora proposta.

## Contesto da leggere

- `docs/INSIGHTS.md`, ADR-0101; ADR-0105 e ADR-0110 («Explore»)

## Cosa fare

1. `POST /signals` (nuovo `signals.py`): `city_chosen`, `route_chosen`,
   `hint_taken`, validati campo per campo, mai bloccanti, con un tetto al
   minuto; nell'app un invio che non fallisce mai (`src/api/signals.ts`),
   da `ExploreTools.tsx` e `RoutePanel.tsx`.
2. Percorsi annullati registrati (`cancelled`), con il numero di percorsi
   offerti e la distanza chiesta.
3. Proposte nuove: `city_name` (applicabile: «levic» → «Levico Terme», da
   ricerche corrette con un'altra città entro pochi minuti, in ≥ 2 giorni);
   `review_ranking` (si sceglie spesso B o C invece di A); `review_distance`
   («Try N km» preso spesso per una forma). `catalog_city` anche dalle città
   scelte fra i suggerimenti.
4. Il vocabolario corregge `GET /cities` (sezione `city_names`).
5. Comandi: `why TESTO`, `compare --split DATA`, `trend`, `report --since`.

## Criteri di accettazione

- [x] Una città scelta dai suggerimenti è un evento; tre «Explore» vuoti
      lì propongono la città per il catalogo.
- [x] Una ricerca di città corretta dall'utente in 2 giorni diversi propone
      `city_name`; applicata, `/cities` cerca il nome imparato.
- [x] Segnali senza dati personali (celle, nessun testo digitato), validati,
      mai bloccanti; la scelta fra A·B·C e «Try N km» arrivano dall'app.
- [x] `why` dice per ogni regola cosa manca; `compare` dà meglio / peggio /
      pochi eventi fra due periodi.
- [x] Test deterministici dell'API e dell'app verdi.

## File toccati

```
services/api/shaperoute_api/signals.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/insights/__init__.py
services/api/shaperoute_api/insights/events.py
services/api/shaperoute_api/insights/analyze.py
services/api/shaperoute_api/insights/vocabulary.py
services/api/shaperoute_api/insights/__main__.py
services/api/shaperoute_api/learned/vocabulary.json
services/api/tests/test_insights_signals.py
packages/shared-types/src/signals.ts
packages/shared-types/fixtures/signals.json
apps/mobile/src/api/signals.ts
apps/mobile/src/api/signals.test.ts
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
docs/INSIGHTS.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-142.md
```

## Fuori scope

- `App.tsx` (TASK-132) e `packages/shared-types/src/index.ts` (TASK-088):
  il tipo dei segnali sta in `src/signals.ts`; esportarlo da `index.ts`
  dopo il merge di TASK-088.
- Applicare le proposte da soli; un identificativo di sessione o di utente.
- Le lettere digitate nei suggerimenti (ADR-0101: non si registrano).
- Una pagina web dei report; il database (TASK-114).

## Esito

Dal vivo (API di prova sulla 8007 con Geoapify, 2026-10-01): il primo
giorno ricostruito dall'evento vero del Mac («levic» → Levič → Levico 16 s
dopo), il secondo dal vivo; `propose` → `city_name` «levic» → Levico Terme,
`why levic` tutto soddisfatto, `apply` (v1), riavvio, `GET /cities?q=levic`
→ Levico Terme, `"by":"learned"`. Vercelli scelta da un suggerimento e
«Explore» vuoto 3 volte → `catalog_city`. Un percorso annullato mentre
calcolava → `cancelled`, senza l'«ok» del risultato buttato. Un campo in
più → 422. Trovato e corretto un errore di TASK-130: `Insights.record`
riceveva `ms` due volte e scartava ogni percorso dell'API. ADR-0111 era
stato preso da TASK-144 nel frattempo: questo task usa ADR-0112. Test: 388
dell'API, 556 dell'app, shared-types verdi.

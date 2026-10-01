# TASK-145 — «Start» anche sui percorsi di «Explore»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-145-explore-start`

## Obiettivo

Un percorso aperto da «Explore» (consigliato, esempio della città, o a
tema) ha «Start» come un percorso disegnato: si parte con le indicazioni di
svolta, a voce, e a fine corsa il punteggio. Chiesto dall'utente il
2026-10-01.

## Contesto da leggere

- `docs/UI.md` «Le due schermate» punto 3 («Explore») e «La navigazione»
- `docs/API.md` «`GET /recommended-routes`» e «`POST /track-scores`»
- `services/route-engine/route_engine/directions.py` (ADR-0045)
- `services/api/shaperoute_api/jobs.py` `with_directions`, `alongs.py`

## Cosa fare

I percorsi di «Explore» arrivano all'app come soli punti, senza indicazioni
(il catalogo, i percorsi a tema e gli esempi salvati sul telefono non le
hanno). L'indicazione si ricava dal grafo: i punti del motore sono i nodi
del grafo e la geometria delle strade fra loro.

1. Motore: `route_engine/route_nodes.py`, i nodi del grafo per cui passa
   una linea data come punti (entro 1 m, anche arrotondata a 6 decimali),
   con i salti colmati dalla via più breve e i nodi che stanno solo vicino
   alla linea scartati.
2. API: `POST /route-directions` (`line_directions.py`), `{points}` →
   `{directions}`, sulla mappa della zona (la stessa cache dei percorsi) e
   con gli `along` come i percorsi disegnati. Fixture in `packages/shared-types/fixtures/`.
3. App: «Start» giallo nella scheda di un percorso di «Explore» e nella
   scheda di un percorso a tema. Al tocco chiede le indicazioni («Getting
   directions…»), poi la navigazione come per un percorso disegnato; «Stop»
   e la fine corsa tornano alla scheda di «Explore». Le indicazioni avute
   restano in memoria: un secondo «Start» sullo stesso percorso non le
   richiede.

## Criteri di accettazione

- [x] Una linea fatta dal motore su un grafo di prova torna ai suoi nodi,
      anche coi punti arrotondati a 6 decimali; un nodo vicino alla linea
      ma non sulla via è scartato; una strada mancante si colma (test).
- [x] `POST /route-directions` risponde le stesse indicazioni che il
      percorso pianificato aveva, `422` per una linea che non sta sulla
      mappa, `503 map_data_unavailable` senza mappa (test).
- [x] Nell'app «Start» c'è sulle schede di «Explore», chiede le indicazioni
      una volta e apre la navigazione sulla linea del percorso; se non
      arrivano, il motivo e «Start» che riprova (test).
- [x] Prova dal vivo sull'API del Mac con un percorso del catalogo.

## File toccati

```
services/route-engine/route_engine/route_nodes.py
services/route-engine/tests/test_route_nodes.py
services/api/shaperoute_api/line_directions.py
services/api/shaperoute_api/app.py
services/api/tests/test_line_directions.py
packages/shared-types/fixtures/route-directions-request.json
packages/shared-types/fixtures/route-directions.json
apps/mobile/App.tsx
apps/mobile/__tests__/AppExploreStart.test.tsx
apps/mobile/src/api/routeDirections.ts
apps/mobile/src/api/routeDirections.test.ts
apps/mobile/src/api/routes.ts
apps/mobile/src/explore/useStartDirections.ts
apps/mobile/src/explore/useStartDirections.test.ts
apps/mobile/src/explore/ExploreStart.tsx
apps/mobile/src/explore/ExploreStart.test.tsx
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/explore/explored.ts
apps/mobile/src/explore/ThemedCard.tsx
apps/mobile/src/explore/ThemedCard.test.tsx
docs/API.md
docs/UI.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-145.md
```

`routes.ts` solo per esportare `isDirection`; `explored.ts` solo per un
commento che diceva «no Start».

`App.tsx` è anche di TASK-132 (PR #130) e `app.py` di TASK-142 (PR #142):
toccati in punti diversi, con l'ok dell'utente; chi mergia dopo aggiorna
il branch e risolve.

## Fuori scope

- Salvare le indicazioni nel catalogo (`seed_catalog.py`, di TASK-128).
- Indicazioni calcolate sul telefono senza API.
- Ricalcolare il percorso quando si esce dal tracciato.

## Esito

«Start» c'è su ogni percorso di «Explore»: l'app chiede le indicazioni a
`POST /route-directions`, che ritrova i nodi della linea sul grafo della
zona (ADR-0117), poi parte la navigazione di sempre. Dal vivo sull'API del
Mac: Trento, Bologna, Milano e Levico in 0,1–0,5 s; 4 percorsi appena
pianificati danno indicazioni identiche a quelle del motore. Da provare
sull'iPhone: serve riavviare l'API del Mac (endpoint nuovo) e un
`eas update` da `main`.

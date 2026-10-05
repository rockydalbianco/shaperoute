# TASK-234 — «Viene meglio a 12 km»: la distanza dove la forma riesce meglio

**Stato**: Todo — task file scritto il 2026-10-05; il codice dopo la #310
(TASK-226), che tocca gli stessi file del motore
**Fase**: 4 · **Branch**: `feat/TASK-234-better-distance`
**ADR**: ADR-0196 (estende ADR-0041)

## Obiettivo

Quando un percorso riesce, ma a un'altra distanza la forma verrebbe
chiaramente meglio, l'app lo dice e offre di provare: «Questo cuore viene
meglio a circa 12 km», con il bottone «Prova 12 km».

## La richiesta dell'utente (2026-10-05)

«E che ti consiglia anche la distanza corretta per far venire al meglio
quella forma. Del tipo te cerchi un cuore da 15 km ma se con 12 viene
meglio te lo dice.»

Oggi c'è soltanto metà di questo (ADR-0041, TASK-031): quando il motore
*rifiuta*, perché il percorso migliore segue la forma ma è a più di 2 km
dalla distanza chiesta, l'API manda `suggested_distance_m` e l'app scrive
«It fits at about N km» con «Try N km». Se invece il cuore da 15 km
riesce, anche seguito male, nessuno dice che a 12 km verrebbe meglio.

Fra due proposte l'utente ha scelto di partire dal **passo 1**: usare i
tentativi che la ricerca ha già tracciato, senza calcoli e senza attese in
più. Il passo 2 (cercare apposta 2–3 distanze vicine, 5–50 s di server
l'una) è fuori da questo task: si valuta dopo, se il passo 1 scatta poco.

## Le scelte (ADR-0196)

Dall'utente: il passo 1, e una riga con «Prova» sotto il percorso. Il
resto è deciso dall'agente su delega dell'utente:

1. **Da dove**: dai tentativi della ricerca che ha dato il percorso
   (`Search.attempts`, anche quella lontana di ADR-0040). Ogni tentativo
   ha già la sua somiglianza e la sua lunghezza: nessun tracciato in più.
2. **Quando un tentativo è «chiaramente meglio»**: il suo costo senza la
   parte della distanza (forma, strade ripassate, partenza spostata) è
   più basso di quello del percorso scelto di almeno `W_SHAPE × 0,05`
   (cinque punti di somiglianza), e la sua somiglianza è almeno
   `SIMILARITY_THRESHOLD` (0,90). Così non si consiglia un percorso con
   un baffo ripassato o lontano dalla partenza. Le soglie si tarano sulle
   misure (punto 7).
3. **Quale distanza**: quella del tentativo, arrotondata al km come
   `suggested_distance_m` e dentro i limiti della richiesta per
   l'attività (bici 10–30 km). Se arrotondata è uguale alla distanza
   chiesta, niente. Fra più tentativi, quello col costo più basso; a
   parità, il più vicino alla distanza chiesta.
4. **Il percorso non cambia**: il motore sceglie esattamente come oggi.
   Il consiglio è solo un campo in più.
5. **Il campo**: `better_distance_m` (metri, intero) nel risultato e
   nella risposta dell'API, `null` quando non c'è un consiglio. Vale per
   la richiesta, non per le alternative (TASK-093). È nuovo e
   facoltativo: l'app di oggi lo ignora.
6. **Nell'app**, sotto il percorso: «This heart comes out better at about
   12 km.» e il bottone «Try 12 km», che scrive la distanza e ridisegna
   (lo stesso `onTryDistance` di ADR-0041). Anche per una parola («This
   word…») e un contorno da foto («This outline…»). Nelle cinque lingue
   (ADR-0172), da far confermare all'utente. Solo dentro le distanze che
   «Draw» offre per quell'attività. Dopo un «Try», se il nuovo percorso
   consigliasse di tornare alla distanza di prima, la riga non compare:
   niente avanti e indietro.
7. **Misura prima di tutto**: sui 14 casi disegnabili (`MAPS.md`) e sui
   campioni giudicati, quante volte scatta e con quali distanze. Se
   scatta quasi mai, lo si scrive in `MAPS.md` e lo si dice all'utente
   prima dell'app: forse serve il passo 2.
8. **La canoa è fuori**: sull'acqua `water_fit` sceglie già la forma più
   grande che ci sta, e quando non ci sta c'è la distanza suggerita
   (ADR-0164).

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0041 (la distanza quando la forma non ci sta),
  ADR-0040 (la ricerca lontana), ADR-0087 (le alternative, TASK-093),
  ADR-0172 (le lingue), ADR-0196
- `docs/ROUTE_ENGINE.md` §5 (la ricerca e il costo)
- `docs/API.md` «Errori» (`suggested_distance_m`), `docs/MAPS.md`
- `docs/UI.md` «Draw»

## Cosa fare

1. Motore (`optimizer.py`, `models.py`): calcolare il consiglio dai
   tentativi in `plan_shape` e metterlo in `RouteResult`.
2. API (`schemas.py`, l'arrotondamento di `errors.py`): `better_distance_m`
   nella risposta; `packages/shared-types`; `docs/API.md`.
3. `engine.zip` del telefono rifatto (TASK-214):
   `python tools/phone_engine/phone_engine.py engine`.
4. Le misure del punto 7 in `MAPS.md`.
5. App: la riga e il bottone sotto il percorso (`betterDistance.ts`, file
   nuovo, e `RoutePanel.tsx`), i testi nelle cinque lingue, `docs/UI.md`.

## Criteri di accettazione

- [ ] Test del motore: con tentativi finti, il consiglio c'è quando uno è
      chiaramente meglio a un'altra distanza, e manca quando è meglio di
      poco, quando la somiglianza è sotto 0,90, quando arrotondato al km
      è la distanza chiesta o è fuori dai limiti dell'attività.
- [ ] Il percorso scelto è identico a prima su tutti i test e sui 14 casi
      (`MAPS.md`): stesse impronte fissate.
- [ ] L'API restituisce `better_distance_m`; senza consiglio è `null`; i
      client di oggi non si rompono.
- [ ] Le misure del punto 7 sono in `MAPS.md`.
- [ ] L'app mostra la riga e «Try N km» solo col campo e dentro le
      distanze di «Draw»; «Try» ridisegna a quella distanza; niente riga
      che rimanda alla distanza di prima.
- [ ] I testi nelle cinque lingue; l'utente li ha visti.
- [ ] Test deterministici per motore, API e app (`docs/TESTING.md`).

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/models.py
services/route-engine/tests/test_better_distance.py         (nuovo)
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/errors.py
services/api/tests/test_better_distance.py                  (nuovo)
packages/shared-types/src/index.ts
apps/mobile/assets/engine/engine.zip
apps/mobile/src/route/betterDistance.ts                     (nuovo)
apps/mobile/src/route/betterDistance.test.ts                (nuovo)
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/App.tsx
apps/mobile/src/i18n/it.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
docs/API.md
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-234.md
```

## Fuori scope

- Il passo 2: cercare apposta altre distanze dopo il primo percorso.
- La canoa (punto 8).
- Gli esempi di «Explore» e i percorsi consigliati: hanno distanze loro.
- Cambiare quale percorso il motore sceglie.

## Esito

—

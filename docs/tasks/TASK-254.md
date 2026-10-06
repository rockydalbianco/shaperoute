# TASK-254 — Correzioni piccole dalla revisione dell'app

**Stato**: Todo
**Fase**: 4 · **Branch**: `fix/TASK-254-review-small-fixes`

## Obiettivo

Dodici difetti piccoli e verificati, ognuno chiuso con il suo test: niente
di nuovo da vedere, solo cose che oggi vanno storte e dopo no.

## Contesto

Dalla revisione del codice dell'app chiesta dall'utente il 2026-10-06,
letta su `origin/main` `4e4370f8`. Ogni voce è stata verificata sul
codice. Si può dividere in due PR (la parte **libera** subito, la parte
**occupata** dopo TASK-232 B2, TASK-232 C e TASK-251).

**Libera adesso**

1. `favorites/favoriteRoute.ts` `exploredKeepable`: non tiene `walks`. Un
   preferito fatto da un esempio a pezzi sull'acqua («Dog head» sul Garda)
   perde la penna alzata: occhi uniti da una riga, «Start» senza pause.
   Aggiungere `penUp(...)` come in `drawnKeepable`.
2. `route/useImageOutline.ts`: una scelta della foto fallita (permesso
   negato, foto troppo grande, errore) azzera il contorno già tracciato e
   i ritocchi a mano. Azzerare solo quando la foto è stata presa; il
   problema si mostra accanto a quello che c'era.
3. `social/PeopleSearch.tsx`: dopo una ricerca fallita lo stesso nome non
   si può cercare di nuovo (`askedQuery` resta uguale). Azzerarlo nel ramo
   d'errore.
4. `social/FollowLists.tsx`: `busy` tiene un solo id. Con due richieste in
   corso i bottoni della prima si riaccendono: doppio «Accept», errore
   rosso a vuoto. Un insieme di id.
5. `api/routes.ts`, l'attesa: un solo 5xx non JSON durante un controllo
   chiude la richiesta come `bad_answer` («a bug: HTTP 502»), mentre tre
   errori di rete sono perdonati. Contare i 5xx contro
   `MAX_POLL_FAILURES`.
6. `api/routes.ts`, i controlli: una forma, una svolta, uno stato o un
   codice d'errore che questa versione dell'app non conosce fanno
   rifiutare tutta la risposta. Server e app si pubblicano separati:
   accettare una forma sconosciuta (`shapeName` la regge già), una svolta
   sconosciuta come «straight», un codice sconosciuto come errore generico
   con il suo messaggio.
7. `places/photon.ts`, `engine/zones.ts`: la posizione GPS a piena
   precisione va nell'URL (a Photon, un servizio terzo; al server a ogni
   apertura). Arrotondare a 2 decimali (circa 1 km) dove serve solo come
   «qui vicino»; correggere il commento di `location/useCurrentPosition.ts`
   («It never leaves the phone»). **Prima verificare sul codice dell'API
   che `/phone-zones` scelga la stessa zona** con il punto arrotondato;
   se no, quella chiamata resta com'è e si scrive qui perché.

**Occupata adesso** (dopo il merge di chi tiene il file)

8. `activities/fitLines.ts` (TASK-232 C): ogni segmento sotto 0,5 pt è
   scartato e il punto di partenza avanza lo stesso. Con una posizione
   ogni 5 m, una corsa più estesa di circa 2 km non ha più disegno
   nell'immagine da condividere (`share/PostImage.tsx`). Tenere l'ultimo
   punto disegnato finché la distanza supera la soglia.
9. `explore/ExploreTools.tsx` (TASK-232 B2): `CityPicker.open` non ha un
   «vince l'ultima chiesta». «Paris» poi «London» con la rete lenta: se
   Parigi risponde per ultima, la città torna Parigi. Un contatore delle
   richieste, azzerato anche da `choose`, «Near me» e allo smontaggio.
10. `explore/useThemedRoute.ts` (TASK-232 B2): un solo controllo fallito
    chiude un percorso a tema che il server sta ancora calcolando.
    Tollerare i fallimenti di fila come `requestRoute`.
11. `explore/nearbyCities.ts` (TASK-232 B2): la posizione arrotondata come
    al punto 7.
12. `screens/RunPanel.tsx` `useNow` (TASK-251): il conto alla rovescia
    mostra «4» (o «13» dopo la finestra del permesso) per un istante.
    `setNow(Date.now())` appena `on` diventa vero.

## Contesto da leggere

- `docs/API.md`, il paragrafo di `POST /routes` (l'attesa e gli errori)
- I file elencati sopra, ognuno con il suo test accanto

## Cosa fare

Per ogni voce: il test che fallisce su `main`, poi la correzione più
piccola che lo fa passare. Niente refactoring intorno.

## Criteri di accettazione

- [ ] 1: il preferito di un esempio a pezzi riaperto ha gli stessi `walks`
      dell'esempio (`favoriteRoute.test.ts`).
- [ ] 2: dopo una scelta negata, contorno e ritocchi sono quelli di prima.
- [ ] 3: una ricerca fallita si può ripetere con lo stesso nome.
- [ ] 4: con due richieste in corso, i bottoni di tutte e due restano
      spenti fino alla propria risposta.
- [ ] 5: un 502 fra due controlli buoni non chiude la richiesta; tre di
      fila sì.
- [ ] 6: una risposta con `shape: "unicorn"` è un percorso; una svolta
      sconosciuta è «straight»; un codice d'errore sconosciuto porta il
      suo messaggio.
- [ ] 7 e 11: negli URL la posizione ha al più 2 decimali; la zona scelta
      dal server è la stessa (test dell'API, o la nota del perché no).
- [ ] 8: una traccia con un punto ogni 5 m lunga 8 km dà un disegno
      continuo in un riquadro di 190 × 200 pt.
- [ ] 9: di due città chieste, resta l'ultima chiesta.
- [ ] 10: un controllo fallito fra due buoni non chiude il percorso a tema.
- [ ] 12: il primo numero del conto alla rovescia è 3.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/favorites/favoriteRoute.ts          (+ test)
apps/mobile/src/route/useImageOutline.ts            (+ test)
apps/mobile/src/social/PeopleSearch.tsx             (+ test)
apps/mobile/src/social/FollowLists.tsx              (+ test)
apps/mobile/src/api/routes.ts                       (+ test)
apps/mobile/src/places/photon.ts                    (+ test)
apps/mobile/src/engine/zones.ts                     (+ test)
apps/mobile/src/location/useCurrentPosition.ts      (solo il commento)
apps/mobile/src/activities/fitLines.ts              (+ test) — dopo TASK-232 C
apps/mobile/src/explore/ExploreTools.tsx            (+ test) — dopo TASK-232 B2
apps/mobile/src/explore/useThemedRoute.ts           (+ test) — dopo TASK-232 B2
apps/mobile/src/explore/nearbyCities.ts             (+ test) — dopo TASK-232 B2
apps/mobile/src/screens/RunPanel.tsx                (+ test) — dopo TASK-251
docs/STATUS.md, docs/DECISIONS.md                   (le righe di questo task)
```

## Fuori scope

- Tutto quello che cambia testi o schermate: i messaggi d'errore per chi
  corre, «Try again» in «Explore», l'`ErrorBoundary`, «Retry» sulla mappa.
  Aspettano le risposte dell'utente.
- «Move the shape» che fallisce e perde il percorso di prima
  (`paddle/useMoveShape.ts`): chiede una nota nuova sullo schermo.
- Le traduzioni: sono le parti successive di TASK-210.
- Velocità e struttura (il Pager smontato, la linea reiniettata a ogni
  posizione, la divisione di `App.tsx`): task propri.

## Esito

*(si compila a fine task)*

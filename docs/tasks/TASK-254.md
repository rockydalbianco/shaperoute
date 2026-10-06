# TASK-254 — Correzioni piccole dalla revisione dell'app

**Stato**: In lavorazione
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

- [x] 1: il preferito di un esempio a pezzi riaperto ha gli stessi `walks`
      dell'esempio (`favoriteRoute.test.ts`).
- [x] 2: dopo una scelta negata, contorno e ritocchi sono quelli di prima.
- [x] 3: una ricerca fallita si può ripetere con lo stesso nome.
- [x] 4: con due richieste in corso, i bottoni di tutte e due restano
      spenti fino alla propria risposta.
- [x] 5: un 502 fra due controlli buoni non chiude la richiesta; tre di
      fila sì.
- [x] 6: una risposta con `shape: "unicorn"` è un percorso; una svolta
      sconosciuta è «straight»; un codice d'errore sconosciuto porta il
      suo messaggio.
- [x] 7 e 11: negli URL la posizione ha al più 2 decimali; la zona scelta
      dal server è la stessa (test dell'API, o la nota del perché no).
- [x] 8: una traccia con un punto ogni 5 m lunga 8 km dà un disegno
      continuo in un riquadro di 190 × 200 pt.
- [x] 9: di due città chieste, resta l'ultima chiesta.
- [x] 10: un controllo fallito fra due buoni non chiude il percorso a tema.
- [x] 12: il primo numero del conto alla rovescia è 3.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

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
apps/mobile/src/explore/ExploreScreen.test.tsx      (due righe: l'URL di /nearby-cities
                                                     arrotondato e «9.2 km away», voce 11;
                                                     ok del coordinatore)
apps/mobile/src/units/shownInMiles.test.tsx         (una riga: il punto di «Trento» a 20 km
                                                     veri, il telefono misura la distanza)
apps/mobile/src/route/ImageChoice.tsx               (+ test) — voce 2: il problema di una
                                                     foto negata al posto della nota, con il
                                                     contorno sotto; ok del coordinatore
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

Tutte e dodici le voci in un'unica PR (il branch è partito da `main` con
TASK-232 B2, 232 C e 251 già dentro), ognuna con il suo test che fallisce
sul file di `main` e passa con la correzione (verificato voce per voce).
Scelte tecniche in ADR-0218. Note:

- **7, `/phone-zones` resta a piena precisione.** Il server sceglie la
  zona più piccola che tiene `ZONE_MARGIN_M` = 3 km attorno al punto
  (`phone_zone_api.py`, `area_around`): con il punto arrotondato a due
  decimali (spostato fino a ~550 m) un telefono vicino al bordo del
  margine riceverebbe un'altra zona o un 404, e la zona deve tenere il
  percorso vero. La posizione intera va al server comunque come partenza
  di ogni percorso. `engine/zones.ts` non cambia.
- **7 e 11, `/nearby-cities`**: il server cerca già nel quadrato di due
  decimali (`CELL_DECIMALS`), quindi lo stesso quadrato; ma misura
  `away_m` dal punto che riceve, fino a ~700 m di differenza. Su richiesta
  del coordinatore **«km away» e l'ordine dei paesi li misura il telefono**
  dal punto preciso (`metresBetween`, `measured` in `nearbyCities.ts`);
  l'`away_m` del server non si usa, e un posto senza non si scarta. I
  paesi tenuti in memoria per quadrato si rimisurano a ogni partenza.
- **6, lo stato del job**: uno stato sconosciuto è lavoro in corso, detto
  a `onStatus` come «computing». La svolta sconosciuta diventa «straight»
  prima dei controlli, solo in `requestRoute`: `api/routeDirections.ts`
  (non di questo task) resta stretto.
- **2, lo schermo**: lo stato «traced» porta `problem?` quando la scelta
  di un'altra foto fallisce; contorno e ritocchi restano (test del hook).
  Perché il problema **si veda**, `route/ImageChoice.tsx` (caso «traced» di
  `ImageNote`) mostra il riquadro rosso al posto della nota gialla, con il
  contorno e «Edit the outline» sotto; aggiunto ai file con l'ok del
  coordinatore. Nessun testo nuovo: sono i testi di `imageProblemText`.
- **12**: il test è in `screens/useNow.test.ts`, file nuovo, perché
  `RunPanel.test.tsx` è fra i file più grandi (partenza fredda in CI).

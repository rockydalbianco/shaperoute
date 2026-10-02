# TASK-176 — «Explore»: niente filtri, altre forme mentre si sceglie, «Near me»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-176-explore-more-shapes` · ADR-0144

Chiesto dall'utente il 2026-10-02: «Toglimi i filtri, non mi piacciono.
Poi, una volta selezionata la città, fai caricare le prime tre figure come
già impostato, un cuore, un cerchio, una stella, più velocemente
possibile, ma poi allo stesso tempo cerca di farne altre mentre li
selezionano. Poi non mi piace il tasto My start: torna sulla mia
posizione, ma non è intuibile, devi rivederla sta cosa».

## Obiettivo

In «Explore» non c'è niente da impostare prima di guardare: scelta una
città arrivano le prime tre forme e poi, da sole, altre; e per tornare ai
percorsi vicini c'è una voce che si capisce.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», punto 3 («Explore»)
- ADR-0116 (gli esempi di una città), ADR-0132 (i disegni del feed
  nell'attesa), ADR-0135 (le schede), ADR-0136 (gli esempi tenuti
  sull'API, le richieste una alla volta)
- `apps/mobile/src/explore/exampleRoutes.ts`, `ExploreScreen.tsx`,
  `CityExamples.tsx`, `ExploreTools.tsx`

## Cosa fare

1. `ExploreScreen.tsx`: via la riga dei filtri; `RouteFilters.tsx` e i
   suoi test si cancellano.
2. `exampleRoutes.ts`: dopo le prime tre forme, altre cinque, una alla
   volta; il cerchio chiesto per primo; una città con percorsi consigliati
   riceve le forme che non ha.
3. `CityExamples.tsx`, `ExploreScreen.tsx`: le forme in più come schede,
   da quando tocca a loro.
4. `ExploreTools.tsx`: «Near me» prima voce della fila al posto di «My
   start».
5. Test; `UI.md`, `API.md` (il paragrafo degli esempi), ADR, `STATUS.md`.

## Criteri di accettazione

- [x] «Best near you» non ha filtri: ogni percorso vicino è una scheda.
- [x] Scelta una città senza percorsi consigliati, dopo cuore, cerchio e
      stella l'app chiede da sola altre forme, una alla volta; ognuna è una
      scheda da quando tocca a lei, e si apre come le prime.
- [x] Una forma in più che non riesce non lascia schede né messaggi, e non
      viene richiesta finché l'app resta aperta; un guaio di rete o il
      limite delle richieste ferma le altre senza toccare le prime tre.
- [x] Il cerchio è la prima richiesta; la prima scheda resta il cuore.
- [x] Le forme in più non superano 18 richieste di esempi al minuto, le
      prime tre comprese; le prime tre non aspettano mai.
- [x] Una città con percorsi consigliati riceve, in coda alle sue schede,
      le forme che non ha, con la città chiamata come sulle sue schede;
      senza città scelta non si disegna niente.
- [x] «Near me» è la prima voce della fila delle città, accesa senza città
      scelta; da una città riporta alla partenza. «My start» non c'è più.
- [x] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone.

## File toccati

```
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
apps/mobile/src/explore/ExploreMoreShapes.test.tsx (nuovo)
apps/mobile/src/explore/RouteFilters.tsx           (cancellato)
apps/mobile/src/explore/RouteFilters.test.tsx      (cancellato)
apps/mobile/src/explore/exampleRoutes.ts
apps/mobile/src/explore/exampleRoutes.test.ts
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/CityExamples.test.tsx
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
services/api/shaperoute_api/prefetch_zones.py      (EXAMPLE_SHAPES: il cerchio per primo)
services/api/shaperoute_api/draw_examples.py       (solo il commento in testa)
services/api/tests/test_draw_examples.py
docs/UI.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-176.md
```

## Fuori scope

- Nell'API solo l'ordine delle prime tre forme (il cerchio per primo in
  `EXAMPLE_SHAPES`, chiesto dal coordinatore): `draw_examples` non disegna
  le altre cinque (vedi «Seguiti»).
- Il server: l'API ha TASK-168 dal 2026-10-02 e gli esempi di 62 città
  disegnati prima. Rilanciare `draw_examples`, o aggiornare il server, lo
  chiede il coordinatore all'utente.
- `App.tsx`: la voce «Near me» non sa se la partenza è la posizione o un
  luogo cercato.
- Le altre proposte del canvas: la pagina «Draw», la scheda del percorso,
  il sistema dei pulsanti.

## Esito

Fatto (2026-10-02, ADR-0144).

- «Best near you» non ha più filtri; `RouteFilters.tsx` è cancellato.
- Scelta una città, dopo cuore, cerchio e stella l'app disegna luna,
  cavallo, lumaca, testa di cane e testa di coniglio, una alla volta; il
  cerchio è la prima richiesta. Le cinque forme sono state scelte
  misurando ogni forma del catalogo a 5 km dal centro di Trento, Verona,
  Bologna e Padova (la tabella è in ADR-0144).
- Una città con percorsi consigliati riceve le forme che non ha, in coda
  alle sue schede.
- Le forme in più lasciano all'app 12 dei 30 POST al minuto che l'API
  accetta da un telefono: sfogliando città già disegnate, quelle della
  terza aspettano che il minuto passi.
- Nell'API `EXAMPLE_SHAPES` ha il cerchio per primo: `draw_examples`
  chiede le prime tre forme nell'ordine dell'app.
- «Near me» è la prima voce della fila delle città; «My start» non c'è più.

1036 test dell'app verdi, con i nuovi di «Explore», degli esempi e della
fila delle città, e 567 dell'API; lint, typecheck, prettier, ruff e black
puliti.

Visto su un simulatore (iPhone 17, Expo Go) con un'API locale sul Mac.
Con il codice già unito a TASK-174:

- Padova senza catalogo: otto richieste, nell'ordine cerchio, cuore,
  stella, luna, cavallo, lumaca, testa di cane, testa di coniglio, e otto
  schede con la mappa (somiglianza fra 0,90 e 0,94);
- Milano con un catalogo di sole tre forme, come le città in evidenza sul
  server: le tre schede subito, poi «Moon · Drawing…» accanto alla stella
  e le cinque forme in coda (luna 0,98, cavallo 0,99), cinque richieste;
- senza città scelta: «Near me» accesa, nessuna richiesta.

Prima di unire TASK-174: Trento senza catalogo, le otto forme; Verona con
il catalogo intero, una richiesta sola, la testa di cane, l'unica forma che
non ha. Il simulatore si guarda solo a schermate: tocchi e scorrimento non
sono stati provati.

**Da provare con il dito sull'iPhone**, con l'app ripubblicata: toccare
«Near me» da una città, lo scorrimento mentre arrivano le schede, aprire
una forma aggiunta.

Seguiti:

- Quando si aggiunge una riga di schede, quello che sta sotto scende di una
  riga: i disegni del feed, nelle città senza catalogo. Succede al più due
  volte. `maintainVisibleContentPosition` non va bene su questa pagina
  (ADR-0144, «Scartate»).
- `draw_examples` disegna solo le prime tre forme: le altre cinque le
  disegna il primo telefono in ogni città. Disegnarle prima costa circa
  un'ora e mezza di calcolo sulle 62 città, e va chiesto all'utente.
- Il tetto di 18 richieste di esempi al minuto è preso sul limite di 30
  che l'API ha da sola; sul server oggi è 120 (ADR-0144).
- «Near me» dice così anche quando la partenza è un luogo cercato in
  «Draw»: per dire il nome del luogo serve una riga in `App.tsx`.
- Il test di TASK-174 in `CityExamples.test.tsx` stampa un avviso di React
  (`forgetFeedMaps` fuori da `act`): non è di questo task.
- **I test in CI e i file grandi.** Senza cache jest esegue per primi i
  file di test più grandi, e il primo render di un file partito mentre
  React Native si sta ancora caricando per gli altri può superare i 5 s
  del primo test: è successo due volte a `ExploreScreen.test.tsx`, che con
  i test nuovi era diventato il quarto file per grandezza (da 11,7 a
  17 kB). Non aspettava niente: a cache calda quel test dura 0,3 s. I
  test delle forme in più stanno ora in `ExploreMoreShapes.test.tsx`, e
  `ExploreScreen.test.tsx` è tornato grande come prima; da una cache vuota
  il suo primo test dura 0,6 s. Lo stesso vale per ogni file di test che
  cresce: `AppFavorites.test.tsx`, oggi fra i primi, in locale da cache
  vuota va in timeout sul suo primo test quando il Mac è carico.

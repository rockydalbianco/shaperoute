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
- [x] Una città con percorsi consigliati riceve, in coda alle sue schede,
      le forme che non ha; senza città scelta non si disegna niente.
- [x] «Near me» è la prima voce della fila delle città, accesa senza città
      scelta; da una città riporta alla partenza. «My start» non c'è più.
- [x] Nessuna dipendenza nuova; colori dai token; testi in inglese.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova con il dito sull'iPhone.

## File toccati

```
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
apps/mobile/src/explore/RouteFilters.tsx           (cancellato)
apps/mobile/src/explore/RouteFilters.test.tsx      (cancellato)
apps/mobile/src/explore/exampleRoutes.ts
apps/mobile/src/explore/exampleRoutes.test.ts
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/CityExamples.test.tsx
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
docs/UI.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-176.md
```

## Fuori scope

- L'API: `draw_examples` e `prefetch_zones` chiedono ancora cuore, cerchio
  e stella in quest'ordine (vedi «Seguiti»).
- Il server: aggiornare l'API con TASK-168, lanciare `draw_examples`, le
  zone delle città medie. È quello che rende subito pronte le prime tre
  forme, e aspetta l'ok dell'utente.
- `App.tsx`: la voce «Near me» non sa se la partenza è la posizione o un
  luogo cercato.
- Le altre proposte del canvas: la pagina «Draw», la scheda del percorso,
  il sistema dei pulsanti.

## Esito


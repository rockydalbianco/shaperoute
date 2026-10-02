# TASK-164 — La schermata della corsa: numeri, svolta e freccia di direzione

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-164-run-screen`

## Obiettivo

Durante una corsa, con un percorso o senza, la stessa schermata dice i km
fatti, il passo medio, il passo di adesso e il tempo, e la mappa mostra una
freccia che punta dove si sta andando. Con un percorso resta la svolta
(freccia, metri, indicazione scritta) e si aggiungono i km rimasti e quanta
parte del disegno è fatta; senza percorso, al posto della svolta, la freccia
e la distanza verso il punto di partenza. Chiesto dall'utente il 2026-10-02
(«così è troppo semplice»), su un mockup proposto in chat.

## Contesto da leggere

- `docs/UI.md` «La navigazione», «Correre senza percorso»
- `apps/mobile/src/screens/NavigateScreen.tsx`, `FreeRunScreen.tsx`
- `apps/mobile/src/navigation/useNavigation.ts`, `useFreeRun.ts`,
  `freeRun.ts`, `trackRecorder.ts`
- `apps/mobile/src/map/messages.ts`, `mapPage.ts`, `MapView.tsx`
- `docs/DECISIONS.md` ADR-0052, ADR-0091, ADR-0122

## Cosa fare

1. I numeri della corsa, funzioni pure dalla traccia (`runStats.ts`): la
   direzione di marcia, il punto cardinale, il passo degli ultimi 200 m, il
   passo dell'ultimo km, la stima dei minuti alla fine, direzione e distanza
   del punto di partenza.
2. La mappa: `follow` porta la direzione; il segnaposto diventa una freccia
   girata in quel verso, e torna quello di prima quando la corsa finisce.
3. `useNavigation` dà anche la traccia, come `useFreeRun`.
4. Il pannello dei numeri, uguale per le due corse (`RunPanel.tsx`): km in
   grande, tre riquadri (passo medio, passo di adesso, tempo), barra del
   percorso.
5. Con un percorso: sotto la svolta, «42% drawn» e il punto cardinale; nel
   pannello «3.2 km to go» e «about 17 min».
6. Senza percorso: in alto freccia e distanza in linea d'aria verso la
   partenza, e «Heading north-east»; nel pannello il passo dell'ultimo km.
7. Test; `UI.md`, ADR-0133.

## Criteri di accettazione

- [ ] Con un percorso, il pannello mostra km fatti, passo medio, passo di
      adesso, tempo, km rimasti, minuti stimati e la barra; il banner della
      svolta dice le stesse cose di prima.
- [ ] Senza percorso, il banner mostra distanza e freccia verso la partenza
      e il verso di marcia; il pannello km, passi, tempo e ultimo km.
- [ ] Il tempo va avanti ogni secondo; il passo compare dopo 100 m.
- [ ] La mappa riceve la direzione con `follow` e disegna la freccia;
      a fine corsa torna il segnaposto.
- [ ] «Pocket», «Stop» e «Finish» fanno quello che facevano.
- [ ] Nessuna dipendenza nuova; test, lint, typecheck e format dell'app
      verdi.
- [ ] Visto nel simulatore.
- [ ] Prova sull'iPhone camminando (dell'utente, dopo la pubblicazione).

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/AppFreeRun.test.tsx
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapView.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/navigation/runStats.ts
apps/mobile/src/navigation/runStats.test.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunPanel.test.tsx
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/NavigateScreen.test.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/screens/FreeRunScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-164.md
```

## Fuori scope

- «Pause» e la pausa automatica da fermi: il tempo oggi conta anche le
  soste (ADR-0091). Task a parte.
- «Hold to stop», lo «Stop» da tenere premuto.
- La voce a ogni km anche nella corsa con percorso.
- Girare la mappa nel verso di marcia: resta col nord in alto.
- Il nome della via in cui si è, senza percorso: vorrebbe l'API.
- La bussola del telefono: la direzione viene dalla traccia.
- Dislivello, battito, cadenza.

## Esito

*(a fine task)*

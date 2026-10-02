# TASK-164 — La schermata della corsa: numeri, svolta e freccia di direzione

**Stato**: Done
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

- [x] Con un percorso, il pannello mostra km fatti, passo medio, passo di
      adesso, tempo, km rimasti, minuti stimati e la barra; il banner della
      svolta dice le stesse cose di prima.
- [x] Senza percorso, il banner mostra distanza e freccia verso la partenza
      e il verso di marcia; il pannello km, passi, tempo e ultimo km.
- [x] Il tempo va avanti ogni secondo; il passo compare dopo 100 m.
- [x] La mappa riceve la direzione con `follow` e disegna la freccia;
      a fine corsa torna il segnaposto.
- [x] «Pocket», «Stop» e «Finish» fanno quello che facevano.
- [x] Nessuna dipendenza nuova; test, lint, typecheck e format dell'app
      verdi.
- [x] Visto nel simulatore, con un GPS simulato: la corsa senza percorso e
      quella con un percorso (un cuore a Trento, dall'API sul Mac).
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

Fatto (2026-10-02): il pannello dei numeri è lo stesso per le due corse,
la mappa disegna la freccia di direzione, e senza percorso il banner
indica la partenza. 2 file di test nuovi, 802 test dell'app verdi; lint,
typecheck e format puliti. Provato nel simulatore con il GPS simulato:
senza percorso (300 m a nord, poi a est: la freccia gira, «Heading east»,
la partenza a destra, passi attorno a 5:05) e con un percorso (svolta,
«1% drawn», «N», km rimasti, barra). **Manca la prova sull'iPhone**
camminando, dopo la ripubblicazione.

Emerso: chi parte lontano dall'inizio del percorso («Start here») ha nei
km e nel passo anche il tratto per arrivarci, perché la traccia parte con
«Start» (ADR-0091); annotato in ADR-0133. Rimandati, da chiedere
all'utente: «Pause», «Hold to stop», la voce a ogni km nella corsa con
percorso (`STATUS.md`, ADR-0133).

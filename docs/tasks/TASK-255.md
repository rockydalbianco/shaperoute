# TASK-255 — La corsa tiene lo schermo acceso, e niente calorie fuori dalla corsa

**Stato**: Todo
**Fase**: 4 · **Branch**: `fix/TASK-255-run-screen-awake`

## Obiettivo

Durante una corsa, una pedalata o una pagaiata lo schermo non si spegne
da solo, qualunque pagina sia a vista; se il telefono è stato comunque
bloccato, la traccia non viene tagliata da una riga dritta. Il riquadro
«Calories» si vede solo correndo.

## Contesto

Dalla revisione del codice dell'app del 2026-10-06 (`tasks/TASK-252.md`
per il contesto), verificato sul codice:

- `activateKeepAwakeAsync` è chiamata solo da `usePocketMode.enter`
  (`navigation/usePocketMode.ts:91`, tag `pocket-mode`, ADR-0066);
  `screens/NavigateScreen.test.tsx:244-249` controlla perfino che **non**
  sia chiamata fuori dalla modalità tasca. Con la mappa a vista e il blocco
  automatico del telefono, l'app va in secondo piano; `watchPositionAsync`
  è solo in primo piano (nessun permesso di sfondo in `app.json`): la
  registrazione, la voce e la pausa automatica si fermano senza avviso.
  Una build di sviluppo tiene lo schermo acceso da sola e nasconde tutto.
  Al ritorno, la prima posizione è unita all'ultima con una riga dritta e
  tutto il tempo conta (`trackRecorder.ts:151-158`: una pausa automatica
  non è un buco; il campo `gap` esiste, `trackRecorder.ts:30`, ma si usa
  solo per le pause a mano e della penna).
- `runMetrics.kcal` (`:113-118`) usa 1,036 kcal per kg e km, la formula
  della corsa, per ogni sport: 40 km in bici danno circa 2900 kcal, il
  triplo del vero. `RunPanel.tsx:280, 290` mostra il riquadro sempre.

**Scelte dell'utente** (2026-10-06, «sì a tutte e cinque»): 1) lo schermo
resta acceso per tutta la corsa, non solo in modalità tasca; 4) il
riquadro «Calories» va via fuori dalla corsa, finché non c'è una formula
per sport.

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0066 (modalità tasca), ADR-0070 (fuori
  tracciato), ADR-0153 (bici), ADR-0169 (canoa nell'app)
- `apps/mobile/src/navigation/usePocketMode.ts`, `trackRecorder.ts`,
  `useNavigation.ts`, `useFreeRun.ts`; `screens/RunDashboard.tsx`,
  `RunPanel.tsx`

## Cosa fare

1. Lo schermo acceso con un tag suo (`run`) per tutta la corsa, dalla
   partenza a «Stop» o all'arrivo, con e senza percorso: acceso dove la
   corsa parte (`useNavigation`/`useFreeRun`, o `RunDashboard` quando la
   corsa è viva), spento nella pulizia. `expo-keep-awake` c'è già
   (`package.json`): **nessuna dipendenza nuova**. La modalità tasca
   tiene il suo tag: i due non si pestano.
2. `trackRecorder`: la prima posizione dopo un silenzio lungo (più di
   `GAP_AFTER_MS`, da fissare con i test: 30 s è la proposta) è segnata
   `gap`, come dopo una pausa a mano: niente metri sulla riga dritta e il
   tempo del silenzio fuori dal cronometro. La mappa disegna già i `gap`
   come tratti staccati? Verificarlo (`map/routeSplit.ts`); se no, è un
   seguito da scrivere, non da fare qui.
3. `RunPanel`: il riquadro «Calories» solo con `activity === "running"`
   (e camminata, se esiste come sport); in bici e in canoa il posto resta
   vuoto o lo prende il riquadro accanto, come decide chi fa il task,
   senza testi nuovi.
4. `NavigateScreen.test.tsx:244-249` cambia verso: lo schermo è acceso
   anche fuori dalla modalità tasca.
5. ADR-0219: lo schermo acceso per tutta la corsa (aggiornamento di
   ADR-0066), il buco dopo un silenzio, le calorie solo correndo.
   `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [ ] Alla partenza di una corsa con percorso `activateKeepAwakeAsync` è
      chiamata con il tag della corsa; a «Stop» e all'arrivo
      `deactivateKeepAwake` con lo stesso tag (test di `useNavigation`).
- [ ] Lo stesso per la corsa senza percorso (`useFreeRun`).
- [ ] Entrare e uscire dalla modalità tasca non spegne lo schermo della
      corsa (due tag).
- [ ] Una posizione che arriva più di `GAP_AFTER_MS` dopo l'ultima non
      aggiunge metri e non aggiunge tempo; una che arriva prima sì.
- [ ] Con «Bike» e «Paddle» il riquadro «Calories» non c'è; con «Run» c'è
      come prima.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useFreeRun.test.ts
apps/mobile/src/navigation/usePocketMode.ts            (solo se serve per i due tag)
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/trackRecorder.test.ts
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunPanel.test.tsx (o il test che copre i riquadri)
apps/mobile/src/screens/NavigateScreen.test.tsx
docs/UI.md, docs/STATUS.md, docs/DECISIONS.md          (le righe di questo task)
```

## Fuori scope

- **Parte dopo il merge di TASK-251** (#383), che tiene `useNavigation.ts`,
  `RunPanel.tsx`, `RunDashboard.tsx`, e di TASK-253 se tocca
  `useNavigation.ts` prima.
- La posizione in background (registrare a telefono bloccato): build
  propria, permessi nuovi, un task suo (idea 1 della revisione).
- Una formula delle calorie per sport: quando l'utente la vuole.
- Un avviso alla prima partenza che l'app deve restare aperta: testo
  nuovo, da chiedere.

## Esito

*(si compila a fine task)*

# TASK-476 — Il «+» del Feed per aggiungere un'attività

**Stato**: In lavorazione · parte A in PR (bozza fino al simulatore e al sì
dell'utente su schermate e testi)
**Fase**: 5 · **Branch**: `feat/TASK-476-feed-add-activity`
**Dipende da**: TASK-312 B (il flusso «From a file», in `main` con la #622)
**ADR**: ADR-0387 assegnato, per ora non serve (nessuna scelta tecnica nuova)

## Obiettivo

Dal Feed, che è la home, un iscritto aggiunge un'attività fatta fuori da
MuW senza passare da «My activities»: un «+» in alto a destra apre un
foglio «Add activity».

## Contesto da leggere

- `docs/IMPORTAZIONI.md` (le regole delle attività importate, ADR-0272);
- `docs/tasks/TASK-312.md`, parti B–E;
- `apps/mobile/src/imports/AddPastActivity.tsx`,
  `apps/mobile/src/screens/FeedScreen.tsx`.

## Scelte dell'utente (2026-11-12)

La richiesta: «nel feed che è la home manca un tasto + per poter caricare
un'attività manualmente da fuori o dall'app o da un'altra app».

1. Il «+» va a destra nella barra del Feed, solo con un account. La prima
   versione apre **solo «From a file»** (GPX, TCX, FIT): le altre voci
   entrano quando sono pronte, senza «Soon».

## Parte A — Il «+» e il foglio (app sola)

- Il «+» a destra delle schede del Feed; senza schede (API vecchia) a
  destra di una barra vuota. Non c'è senza account né in una build senza
  il selettore di file (`filePickerAvailable()`).
- Il foglio «Add activity» (`SheetModal`, scuro dietro), con «✕» e il
  flusso di «Add past activity» aperto sulle scelte (`opened`), senza il
  suo pulsante; si chiude quando la corsa è tenuta o il modulo scartato
  (`onDone`). In «My activities» non cambia niente: i test di
  `AddPastActivity.test.tsx` passano senza ritocchi.
- Un testo nuovo, «Add activity», in it/de/fr/es.
- Niente server, niente impronta nativa: esce con un OTA.

```
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/imports/AddPastActivity.tsx
apps/mobile/src/feed/AddToFeed.tsx               (nuovo)
apps/mobile/src/feed/AddToFeed.test.tsx          (nuovo)
apps/mobile/src/screens/FeedScreenAdd.test.tsx   (nuovo)
apps/mobile/src/i18n/it.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/es.ts
docs/tasks/TASK-476.md                            (nuovo)
```

File approvati dal Coordinatore il 2026-11-12. Rispetto al suo messaggio:
`AddPastActivity.tsx` prende due props (`opened`, `onDone`) invece di un
hook, il cambio più piccolo; la prova che «My activities» non cambia sono
i suoi test di prima, verdi senza ritocchi.

### «Everyone» dal «+» (scelta dell'utente, 2026-11-12)

Una corsa importata partiva sempre «Only me»: aggiunta dal «+» del Feed,
nel Feed non sarebbe comparsa. L'utente: «Sì, Everyone», e al Coordinatore
«Everyone + privacy». Eccezione ad ADR-0304 per questo solo ingresso
(ADR-0387, nella PR di documenti dopo il merge).

- `RunEnd.tsx`: `imported.visibility` facoltativo (approvato dal
  Coordinatore); `AddPastActivity` passa «everyone» solo con `opened`. In
  «My activities» resta «Only me» (`AddPastActivity.test.tsx`, invariato).
- «Everyone» si vede scelto, la frase «Every member sees it in your
  profile.» sta anche sopra «Save», e si può cambiare prima di salvare
  (`AddToFeed.test.tsx`).
- **Prima che esca**: le frasi della privacy (e dell'aiuto) che dicono
  «An activity added from a file always starts on «Only me»» vanno
  riscritte nelle cinque lingue e sul sito, col sì dell'utente.
  `apps/mobile/src/about/content/**` e `site/privacy/**` sono a turno:
  chiederlo al Coordinatore. Il campo e la frase entrano in `main`
  insieme, o la frase prima; l'OTA esce con la copia del sito.

```
apps/mobile/src/activities/RunEnd.tsx            (in più, approvato)
```

## Proposte per dopo (nessun codice senza il sì dell'utente e la lista dei file)

1. **«Photos only»**: post di sole foto, anche da Instagram — è TASK-312 C
   (API, server); seconda voce del foglio.
2. **«Apri in MuW» da altre app**: il .gpx/.fit dal menu Condividi di
   Strava, Garmin Connect o File arriva in MuW e apre il foglio. Tipi di
   documento iOS e intent Android: build nativa (1.0.3).
3. **Da Apple Salute / Health Connect**: gli allenamenti recenti del
   telefono, uno da scegliere — studio TASK-312 D, build nativa, privacy.
4. **Inserimento a mano senza GPS** (sport, data, durata, distanza):
   `runs.source` nuovo, migrazione, segno «Manual», fuori da gioco e
   concorso.
5. **Collegamenti diretti** (Strava, Garmin, Polar…): studio TASK-312 E;
   l'accordo API di Strava (dal 2024) mostra i dati di un utente solo a
   lui, quindi niente Feed da lì.
6. **Dopo «Save», il post subito**: un passo in meno fra aggiunta e
   pubblicazione.

## Criteri di accettazione

- [x] Il «+» c'è con un account e il selettore; non c'è senza (test).
- [x] Il foglio apre «From a file»; «Save» tiene la corsa e chiude il
      foglio; «✕» chiude (test).
- [x] «My activities» come prima (`AddPastActivity.test.tsx` verde).
- [x] `tsc` e jest dei file toccati verdi.
- [ ] Schermate dal simulatore e testo «Add activity» approvati
      dall'utente.
- [ ] CI verde, «#NNNN pronta» al Coordinatore.

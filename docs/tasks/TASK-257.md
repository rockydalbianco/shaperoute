# TASK-257 — Una corsa rifiutata resta sul telefono, con il motivo

**Stato**: In review
**Fase**: 4 · **Branch**: `fix/TASK-257-refused-run-kept`

## Obiettivo

Una corsa salvata che l'API rifiuta per sempre (`invalid_request`) non
sparisce più dal telefono: resta in «My activities» con il motivo e un
«Discard», e la coda non butta via la più vecchia in silenzio.

## Contesto

Dalla revisione del codice dell'app del 2026-10-06, verificato sul codice
e rimandato da TASK-252 perché cambia quello che l'utente vede:

- `activities/activitiesDoor.ts:205-211`: una corsa che l'API risponde con
  `invalid_request` (una traccia senza niente da credere, **una lista
  piena**) è tolta dal file (`stopWaiting`) senza una parola, dopo che
  l'utente ha già visto il logo «salvato» (TASK-212) e `App.tsx` ha
  già cancellato la corsa in corso. Con la lista piena l'utente avrebbe
  potuto fare posto: la corsa è già persa.
- `activities/outbox.ts` `MAX_WAITING = 20`: oltre venti, `withRun` toglie
  la più vecchia (`slice(-MAX_WAITING)`) senza avviso.
- `ActivitiesList.tsx:52-57` dice già «{count} runs are on this phone,
  waiting for a connection.»; non c'è una riga per quelle rifiutate.

**Scelta dell'utente** (2026-10-06): sì, la corsa rifiutata resta sul
telefono con il motivo e «Discard».

## Contesto da leggere

- `docs/API.md`: `PUT /me/activities/{key}` e i suoi errori
- `docs/DECISIONS.md`: ADR-0140 (le corse salvate), ADR-0174 (il logo
  dopo «Save»), ADR-0216 (le code)
- `apps/mobile/src/activities/outbox.ts`, `activitiesDoor.ts`,
  `ActivitiesList.tsx`, `RunEnd.tsx`, `ActivityCard.tsx`

## Cosa fare

1. `outbox.ts`: una voce in attesa può avere `refused: { code, message }`
   (il messaggio dell'API, in inglese, com'è); `withRun` non toglie mai
   una corsa rifiutata o in attesa senza dirlo: oltre `MAX_WAITING`,
   `keepWaiting` risponde `false` con un motivo (`full`), e `RunEnd`
   mostra «The phone holds {count} runs not sent yet. Discard one in My
   activities first.» invece di cancellare.
2. `activitiesDoor.send`: su `invalid_request` la corsa resta, segnata
   `refused`; non viene più mandata finché resta segnata; `waiting`
   continua a contarla, e un contatore `refused` a parte.
3. «My activities»: sopra la lista, le corse rifiutate di questo telefono,
   una riga per corsa con la data, i km, il motivo in parole («The server
   could not take this run: {message}») e «Discard», che la toglie dal
   file dopo un sì. Con un solo testo nuovo per i motivi che l'API dà
   davvero (`services/api`: leggere i codici di `PUT /me/activities`
   prima di scrivere i testi).
4. Testi nuovi nelle cinque lingue; **all'utente prima del merge**.
5. ADR-0221. `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [ ] Una corsa risposta con `invalid_request` resta nel file, segnata
      con il motivo; il giro dopo non la rimanda.
- [ ] «My activities» la mostra con il motivo e «Discard»; «Discard» la
      toglie dal file dopo il sì.
- [ ] Con venti corse nel file, «Save» non ne cancella una: dice che il
      telefono è pieno e tiene la corsa in corso (il file della corsa non
      va cancellato in quel caso: verificare in `App.tsx` dove
      `clearRun()` segue «Save», e se serve toccare quelle righe dirlo
      nella PR).
- [ ] Le quattro tabelle hanno ogni testo nuovo; i testi approvati
      dall'utente.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/activities/outbox.ts                 (+ test)
apps/mobile/src/activities/activitiesDoor.ts         (+ test)
apps/mobile/src/activities/ActivitiesList.tsx        (+ test)
apps/mobile/src/activities/RunEnd.tsx                (+ test)
apps/mobile/src/i18n/{de,it,es,fr}.ts
apps/mobile/App.tsx                                  (solo se «Save» a telefono pieno lo richiede: dirlo nella PR)
docs/UI.md, docs/STATUS.md, docs/DECISIONS.md        (le righe di questo task)
```

## Fuori scope

- **Parte dopo il merge di TASK-252** (#388), che tocca gli stessi file.
- Alzare `MAX_WAITING`: non serve, se il telefono lo dice.
- Un avviso a «Log out» per le corse in attesa: testo nuovo, da chiedere.
- Il filtro dei motivi dell'API in più lingue: l'API risponde in inglese
  (TASK-210, «un task dell'API»).

## Esito

Branch `feat/TASK-257-refused-run-stays` (nome dal coordinatore).
`invalid_request` segna la corsa (`refused`) invece di toglierla; il giro
la salta; «My activities» la mostra con «Try again» e «Discard». Il
limite di 20 è per account (ADR-0221, punto 3) e `keepWaiting` risponde
`kept` / `full` / `not_written`. `App.tsx` **non** cambia: `onSaveRun`
chiama `clearRun()` solo quando `record` riesce, e a telefono pieno
`record` risponde `false`. File fuori dall'elenco: `__tests__/AppActivities.test.tsx`
(la prova «a run the API will never take stops waiting» diceva il
comportamento di prima) e un test nuovo `RunEnd.test.tsx`. Due testi a
telefono pieno invece di uno: senza corse rifiutate non c'è niente da
scartare. Testi da confermare dall'utente.

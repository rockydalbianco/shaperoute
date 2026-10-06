# TASK-252 — Le code sul telefono non perdono niente

**Stato**: Todo
**Fase**: 4 · **Branch**: `fix/TASK-252-phone-queues`

## Obiettivo

Quello che aspetta sul telefono senza rete (le corse da salvare, «Public»,
Strava) arriva all'API come l'utente l'ha lasciato per ultimo, e non si
perde per una scrittura a metà, per una corsa che il server rifiuta o per
una connessione ferma. Niente di visibile cambia.

## Contesto

Dalla revisione del codice dell'app chiesta dall'utente il 2026-10-06
(«rileggi tutto il codice dell'app e cerca di migliorarlo»), letta su
`origin/main` `4e4370f8`. Le voci sono verificate sul codice:

- **«Public» torna acceso contro l'ultima scelta.** `drawingsDoor.choose`
  mette la scelta in coda quando l'API non risponde (`keepForDrawing`), ma
  una scelta successiva salvata direttamente non toglie quella in coda:
  solo `sendWaitingDrawings` chiama `dropForDrawing`. Acceso senza rete,
  spento con la rete buona: al giro dopo la corsa torna pubblica.
- **Il file della coda si svuota prima di essere riscritto**
  (`file.create({ overwrite: true })`, poi `file.write`), in
  `activities/outbox.ts`, `strava/stravaOutbox.ts`,
  `social/drawingOutbox.ts`. Telefono pieno a metà: il file resta vuoto,
  `loadOutbox` risponde `[]`, tutte le corse in attesa sono perse.
- **Una corsa che il server continua a rifiutare blocca le altre.** In
  `activitiesDoor.send` ogni esito che non è `ok` o `invalid_request`
  chiude il giro alla prima corsa: un 500 o un 413 sulla prima ferma per
  sempre le venti dopo.
- **La coda riparte solo** all'apertura con un account, al «Save»
  successivo o aprendo «My activities»: non quando l'app torna in primo
  piano con la rete tornata.
- **`ask` (`api/accounts.ts`) non ha un tempo massimo**: una connessione
  che accetta e poi tace lascia `sending` acceso (niente più giri in
  questa sessione), «Logging in…» fermo, reazioni e «Follow» bloccati.
  iOS rinuncia da solo dopo 60 s, Android mai.
- **«Delete account» lascia sul telefono le corse in attesa** di
  quell'account: tracce GPS con gli orari, in chiaro, nei documenti
  dell'app. «Privacy» dice che la cancellazione toglie tutto.
- **Una corsa fermata con una sola posizione resta nel file** e, entro 30
  minuti, diventa l'inizio della corsa dopo sullo stesso percorso (o della
  prossima corsa senza percorso): `endRun`/`endFreeRun` rispondono `null`
  e l'app non chiama `clearRun()`.
- **La fine corsa si costruisce rileggendo il file**: se la scrittura è
  fallita, «Stop» torna alla mappa come se non si fosse corso, con tutta
  la traccia ancora in memoria.

## Contesto da leggere

- `docs/API.md`, i paragrafi di `PUT /me/activities/{key}` e
  `PUT /me/activities/{key}/drawing`
- `docs/DECISIONS.md`: ADR-0140 (le corse salvate), ADR-0159 («Public»)
- `apps/mobile/src/activities/outbox.ts`, `activitiesDoor.ts`
- `apps/mobile/src/social/drawingOutbox.ts`, `drawingsDoor.ts`
- `apps/mobile/src/navigation/trackStore.ts`

## Cosa fare

1. `social/drawingOutbox.ts`: `forgetForDrawing(owner, key)`.
   `drawingsDoor.choose` la chiama a ogni risposta definitiva dell'API (un
   sì, o un no che non vale la pena ripetere).
2. Un modulo solo per scrivere e rileggere una lista su file
   (`src/storage/keptList.ts`, nuovo), usato dalle tre code: il contenuto
   nuovo va prima in una copia accanto, poi nel file; in lettura, un file
   vuoto o rotto lascia il posto alla copia. Solo con i metodi di `File`
   che i test già imitano (`create`, `write`, `textSync`, `delete`,
   `exists`).
3. `activitiesDoor.send`: il giro si ferma solo quando non vale la pena
   continuare (senza rete, API occupata o in errore 5xx, sessione finita:
   `worthAgain`); una corsa rifiutata in un altro modo resta in coda e il
   giro passa alla successiva.
4. `activitiesDoor`: `send()` anche quando l'app torna in primo piano
   (`AppState`, come `social/followRequests.ts`).
5. `api/accounts.ts` `ask`: un tempo massimo (`AbortController`), che dà
   `unreachable`; più lungo per i corpi grandi (una corsa, una foto).
6. `account/useAccount.ts` `deleteAccount`: **dopo il sì dell'API a
   `DELETE /me`, e solo allora**, toglie dal telefono le voci di
   quell'account (`owner` uguale al suo `id`) da `activities-outbox.json`,
   `strava-outbox.json` e `drawings-outbox.json`. Le voci di altri account
   restano. «Log out» non cancella niente: le corse aspettano lo stesso
   account. Il file della corsa in corso non ha un proprietario e non si
   tocca.
7. `navigation/trackStore.ts`: una corsa salvata con una sola posizione
   non si riprende (`resumable`); lo stesso per la corsa senza percorso.
   `endRun` restituisce la corsa dalla memoria del registratore, non dal
   file riletto.

## Criteri di accettazione

Ognuno con un test che fallisce su `main` e passa qui.

- [ ] «Public» acceso senza rete, poi spento con la rete: la coda non ha
      più la voce, e un giro successivo non manda `public: true`.
- [ ] Una scrittura che fallisce dopo `create` (file vuoto) non perde le
      corse che aspettavano: `loadOutbox` le restituisce ancora. Lo stesso
      per le code di Strava e dei disegni.
- [ ] Due corse in coda, la prima riceve un `bad_answer` 413: la seconda
      viene mandata lo stesso, la prima resta in coda.
- [ ] Senza rete (`unreachable`) il giro si ferma alla prima corsa, come
      adesso.
- [ ] Con l'app che torna «active», la coda viene mandata.
- [ ] Una richiesta dell'account che non risponde entro il tempo massimo
      dà `unreachable`, e la richiesta viene interrotta.
- [ ] «Delete account» riuscito: nelle tre code non resta niente di
      quell'account, e resta tutto degli altri. «Delete account» fallito:
      le code sono come prima.
- [ ] Una corsa fermata con una posizione sola non diventa l'inizio della
      successiva.
- [ ] `endRun` dà la corsa anche quando il file non si può scrivere.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/storage/keptList.ts                 (nuovo)
apps/mobile/src/storage/keptList.test.ts            (nuovo)
apps/mobile/src/activities/outbox.ts
apps/mobile/src/activities/outbox.test.ts
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/activities/activitiesDoorQueue.test.tsx   (nuovo)
apps/mobile/src/strava/stravaOutbox.ts
apps/mobile/src/strava/stravaOutbox.test.ts
apps/mobile/src/social/drawingOutbox.ts
apps/mobile/src/social/drawingOutbox.test.ts
apps/mobile/src/social/drawingsDoor.ts
apps/mobile/src/social/drawingsDoor.test.tsx        (nuovo)
apps/mobile/src/api/accounts.ts
apps/mobile/src/api/accounts.test.ts
apps/mobile/src/account/useAccount.ts
apps/mobile/src/account/useAccount.test.ts
apps/mobile/src/navigation/trackStore.ts
apps/mobile/src/navigation/trackStore.test.ts
apps/mobile/src/navigation/freeRun.ts               (solo se `resumable` della corsa libera sta lì)
docs/STATUS.md, docs/DECISIONS.md                   (le righe di questo task)
```

## Fuori scope

- **Una corsa rifiutata con `invalid_request` oggi è cancellata in
  silenzio**, e oltre venti in coda la più vecchia sparisce: tenerla e
  mostrarla con il motivo è una cosa che l'utente vede. Aspetta la sua
  risposta (domanda 3 della revisione).
- Un avviso a «Log out» per le corse che aspettano: testo nuovo, scelta
  dell'utente.
- La scrittura in due tempi anche per il file della corsa in corso
  (`track.json`, riscritto ogni 15 s): raddoppierebbe le scritture; qui
  basta `endRun` dalla memoria.
- `App.tsx`: non si tocca (è di TASK-232 B2).
- Riunire gli otto involucri di `fetch` di `src/api/`: struttura, un altro
  task.

## Esito

*(si compila a fine task)*

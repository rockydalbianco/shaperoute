# TASK-507 — I dati del telefono restano di chi li ha fatti, anche quando cambia l'account

**Stato**: In lavorazione · A + C (#1533) in produzione; D (#1545) e B1 (#1546) in `main` dopo l'OTA 25; restano l'OTA di D e B1, B2 (turno su `App.tsx`) e i documenti finali (ADR-0406).
Prima del 2026-11-24: In lavorazione · A + C in `main` (#1533, `edde967c`) · **D in PR dal 2026-11-24** (`fix/TASK-507-d-account-data`, #1545) · **B1 in PR dal 2026-11-24** (`fix/TASK-507-b1-owner-in-progress`, #1546, provata al simulatore) · B2 nel turno su `App.tsx`
**Fase**: 4 · **ADR**: ADR-0406 (dal Coordinatore, voce nella PR di
documenti finale) · numero dal Coordinatore il 2026-11-23

## Obiettivo

Nella prova al simulatore del 2026-11-23 un account appena creato aveva
«Le mie attività: 3» (`out/prova-app-2026-11-23/PROPOSTE.md`, punto U2). La
verifica (`out/TASK-507/VERIFICA.md`) ha trovato questo:

- erano tre sessioni di stretching di una prova del 21-11, rimaste in
  `stretch-outbox.json`;
- sono partite verso il server col nuovo account, perché il database nuovo
  gli aveva dato lo stesso numero (`User.id`) dell'account vecchio;
- tutte le code del telefono riconoscono il proprietario solo da quel
  numero.

In produzione i numeri non si ripetono. Però la corsa e gli allenamenti in
corso non hanno nessun proprietario, e su un telefono condiviso passano a
chi entra dopo.

## Le parti

- **A — Il proprietario è il public_id sul suo server** (tecnica, senza
  testi):
  - `account/phoneOwners.ts` ricorda, per ogni numero visto, il `public_id`
    dell'account (un UUID che il server non ridà mai) e il server;
  - a ogni ingresso, prima che una coda parta (`useAccount.put` e
    `keptState`), se il numero ora è di un'altra persona o di un altro
    server, ciò che aspettava sotto di lui si lascia andare;
  - un account visto per la prima volta prende ciò che aspetta col suo
    numero, come prima.
- **C — La cancellazione dell'account svuota tutto**: corse, sonno,
  palestra, piscina, stretching, schede e storico della palestra, disegni,
  foto, ordine, completi, «Public», Strava (`forgetPhoneDataOf`). Prima ne
  svuotava cinque.
- **B — Un proprietario per le cose in corso**: la corsa (`trackStore.ts`,
  dopo la #1529 di TASK-496), la palestra, la nuotata, gli allenamenti
  dell'orologio. Cosa vede un altro account lo decide l'utente (domanda 1).
- **D — I dati personali del telefono** (peso, altezza, cuore, zona di
  casa, ricerche recenti): per account o per telefono, lo decide l'utente
  (domanda 2).

## Le scelte dell'utente (2026-11-23)

- **Domanda 1**: «Nascosta finché rientra». Una corsa, un allenamento, una
  nuotata o un allenamento dell'orologio lasciati da un altro account
  restano nascosti sul telefono finché quell'account rientra (parte B).
- **Domanda 2**: «Di ogni account». Peso, altezza, anno di nascita e zone
  del cuore sono di ogni account e si nascondono all'uscita; ricerche e
  città recenti si cancellano all'uscita; lingua, unità, tono, mappe e
  luoghi scaricati restano del telefono (parte D). La zona di casa resta
  com'è: si cancella già all'uscita (`useActivities.ts`) e la frase della
  privacy resta vera, come controllato col Coordinatore.

## Criteri di accettazione (A + C)

- [x] La prova del 23-11 rifatta in un test: l'app si apre su un numero ora
      di un'altra persona e non manda niente di quella vecchia
      (`account/phoneOwners.test.ts`).
- [x] Lo stesso account sullo stesso server tiene tutto; su un altro server
      è un altro account; senza `public_id` non cambia niente.
- [x] La cancellazione dell'account svuota tutte le code di quell'account e
      niente degli altri.
- [x] Nessun testo, nessuna dipendenza, niente di nativo.
- [x] Test toccati, `tsc` ed `eslint` verdi; la suite intera in CI.

## File toccati (A + C)

```
apps/mobile/src/account/phoneOwners.ts, phoneOwners.test.ts   (nuovi)
apps/mobile/src/account/useAccount.ts
apps/mobile/src/activities/sleepOut.ts          (forgetAllSleepOf)
apps/mobile/src/gym/gymOutbox.ts                (forgetGymOf)
apps/mobile/src/gym/gymHistoryCache.ts          (forgetHistoriesOf)
apps/mobile/src/gym/plans.ts                    (forgetPlansOf)
apps/mobile/src/pool/poolOutbox.ts              (forgetPoolOf)
apps/mobile/src/stretchSport/stretchOutbox.ts   (forgetStretchOf)
docs/tasks/TASK-507.md                          (nuovo)
```

## Parte D — i dati personali di ogni account

- `account/currentOwner.ts` (nuovo): l'account dentro adesso, detto da
  `useAccount` prima che l'app mostri qualcosa dell'account. Ogni account ha
  il suo file: `body.json` diventa `body.12.json` per l'account 12, e lo
  stesso `heart.json`. Con nessuno dentro non si vede niente. Il file di
  prima va al primo account che entra con l'aggiornamento.
- `body/bodyProfile.ts`, `body/heartZones.ts`: leggono e scrivono il file
  dell'account; quando l'account cambia ricaricano e lo dicono alle
  schermate.
- `account/useAccount.ts`: all'uscita (logout, sessione finita, account
  cancellato) svuota ricerche e città recenti.
- `account/phoneOwners.ts`: cancellando l'account, o se il suo numero ora è
  di un altro, se ne vanno anche corpo e cuore.

### Criteri di accettazione (D)

- [x] Un account non vede il corpo né il cuore di un altro; con nessuno
      dentro non si vedono; tornano quando l'account rientra.
- [x] Il corpo di prima va al primo account che entra.
- [x] All'uscita ricerche e città recenti sono vuote.
- [x] Nessun testo nuovo, niente di nativo; la privacy resta vera.
- [x] `account/accountData.test.ts` (nuovo); i test di account, corpo,
      cuore e delle schermate che li leggono verdi; `tsc` ed `eslint`.

### File toccati (D)

```
apps/mobile/src/account/currentOwner.ts, accountData.test.ts   (nuovi)
apps/mobile/src/account/useAccount.ts, phoneOwners.ts
apps/mobile/src/body/bodyProfile.ts, heartZones.ts
docs/tasks/TASK-507.md
```

## Parte B1 — le cose in corso hanno un proprietario

Con la scelta dell'utente «Nascosta finché rientra».

- **La corsa** (`navigation/trackStore.ts`):
  - `SavedRun.owner` è l'account che l'ha cominciata. Sta nel file intero,
    mai nelle righe del diario (nota di TASK-496).
  - Prima di leggere o cominciare una corsa, se nel file c'è quella di un
    altro account, file e diario vanno da parte, così come sono:
    `current-run.<numero>.json` e `.journal`, poi `-2`, `-3`… Non si scrive
    mai sopra, non si cancella niente.
  - Quando l'account rientra e il file è libero, la sua corsa torna al suo
    posto.
  - Una corsa senza proprietario (di prima, o cominciata senza account) è
    di chiunque, come prima.
- **La palestra e la nuotata in corso** (`gym/workoutStore.ts`,
  `pool/poolStore.ts`): un elemento per account nella stessa lista; si vede
  solo quello dell'account dentro. `useWorkout` e `usePoolSwim` rileggono
  quando cambia l'account.
- **Gli allenamenti dell'orologio** (`watch/watchRuns.ts`): ognuno ha
  l'account dentro quando è arrivato. La scheda mostra solo i suoi. Il
  limite di 10 vale per ogni account, così quelli di un altro non spingono
  fuori i suoi.
- **Cancellazione o numero di un altro** (`account/phoneOwners.ts`): se ne
  vanno anche le sue corse, la palestra, la nuotata e gli allenamenti
  dell'orologio, messi da parte o no.
- **Resta per B2**, nel turno su `App.tsx`: una corsa già sullo schermo
  quando si cambia account con l'app aperta.

### Criteri di accettazione (B1)

- [x] A lascia una corsa (file e diario), entra B, B fa e salva la sua, A
      rientra e ritrova la sua intera, diario compreso
      (`navigation/trackStoreOwner.test.ts`, condizione del Coordinatore).
- [x] Due corse di B e A che si scambiano il posto; con nessuno dentro non
      si vede niente; una seconda corsa di A messa da parte non va sopra la
      prima.
- [x] Lo stesso per palestra, nuotata e orologio (`workoutStoreOwner`,
      `poolStoreOwner`, `watchRunsOwner`).
- [x] Test toccati verdi (1298 nelle cartelle toccate, 23 dell'app), `tsc`
      ed `eslint`.
- [x] Prova al simulatore (2026-11-24, iPhone 17, Expo Go, API e database
      locali usa e getta; schermate in `out/TASK-507/sim/` nel checkout
      principale):
      - A comincia una corsa libera e l'app viene chiusa;
      - riaperta senza nessuno dentro, la corsa va da parte
        (`current-run.1.json`) e non si riapre;
      - B entra e non vede niente, anche riaprendo l'app;
      - B comincia una sua corsa e l'app viene chiusa;
      - riaperta senza nessuno dentro, anche quella di B va da parte; le due
        corse da parte restano identiche byte per byte;
      - A rientra: la sua corsa torna e si riapre;
      - A la salva: sul server la corsa è sotto A (`user_id` 1), nessuna
        sotto B; la corsa di B resta da parte, intera.
- [x] Trovato nella prova e corretto: una corsa partita per sbaglio senza
      nessuno dentro e fermata subito lasciava nel file un solo punto, senza
      proprietario, e teneva fuori la corsa di A. Ora un file così (senza
      proprietario, fermo, meno di due punti, che l'app non mostra mai) non
      occupa il posto (`slotHoldsNothing`, due test in più).

### File toccati (B1)

```
apps/mobile/src/navigation/trackStore.ts, trackStoreOwner.test.ts (nuovo)
apps/mobile/src/gym/workoutStore.ts, useWorkout.ts, workoutStoreOwner.test.ts (nuovo)
apps/mobile/src/pool/poolStore.ts, usePoolSwim.ts, poolStoreOwner.test.ts (nuovo)
apps/mobile/src/watch/watchRuns.ts, watchRunsOwner.test.ts (nuovo)
apps/mobile/src/account/phoneOwners.ts
docs/tasks/TASK-507.md
```

## Sul server

Niente da sistemare. Le tre sessioni sono finite solo nel database di prova
del Mac (`127.0.0.1:8051`), che non c'è più. In produzione non sono mai
arrivate (`VERIFICA.md`, punto 1).

## Diario

- **2026-11-23** — Verifica (`out/TASK-507/VERIFICA.md`), poi la parte
  A + C col via del Coordinatore.
- **2026-11-23** — Risposte dell'utente alle domande 1 e 2. A + C in `main`
  con la #1533.
- **2026-11-24** — Parte D in PR.
- **2026-11-24** — Parte B1 scritta, in bozza fino alla prova al simulatore.
- **2026-11-24** — Prova al simulatore di B1 riuscita, con una correzione (un file di un punto senza proprietario non tiene fuori la corsa che torna).

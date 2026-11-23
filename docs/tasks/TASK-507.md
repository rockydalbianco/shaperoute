# TASK-507 — I dati del telefono restano di chi li ha fatti, anche quando cambia l'account

**Stato**: In lavorazione · A + C in `main` (#1533, `edde967c`) · **D in PR
dal 2026-11-24** (`fix/TASK-507-d-account-data`) · B1 dopo D (con una prova
al simulatore) · B2 nel turno su `App.tsx`
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

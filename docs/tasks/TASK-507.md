# TASK-507 — I dati del telefono restano di chi li ha fatti, anche quando cambia l'account

**Stato**: In lavorazione · parte A + C in PR (branch
`fix/TASK-507-phone-owners`) · B dopo TASK-496 (#1529) e il turno su
`App.tsx` · D dopo la scelta dell'utente
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

## Sul server

Niente da sistemare. Le tre sessioni sono finite solo nel database di prova
del Mac (`127.0.0.1:8051`), che non c'è più. In produzione non sono mai
arrivate (`VERIFICA.md`, punto 1).

## Diario

- **2026-11-23** — Verifica (`out/TASK-507/VERIFICA.md`), poi la parte
  A + C col via del Coordinatore.

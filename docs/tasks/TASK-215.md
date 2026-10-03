# TASK-215 — «Find friends» in cima a «Feed»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-215-feed-people-search`
**Dipende da**: TASK-211 parte A (#256, in `main`) · **ADR**: ADR-0178

## Obiettivo

Da «Feed» si cercano gli altri iscritti per nome e se ne apre il profilo.
Chiesto dall'utente il 2026-10-03: «In feed, metti il tasto ricerca per
cercare gli amici». Stacca la ricerca dalla parte B di TASK-211, che la
proponeva come lente in «Profile».

## Contesto da leggere

- `docs/API.md` «Follow» (`GET /users?q=`, `Person`)
- `docs/UI.md` «Le pagine» («Feed») e «Il profilo di un altro iscritto»
- `apps/mobile/src/screens/ProfileLayer.tsx` (le porte e la pagina sopra
  l'app), `apps/mobile/src/profile/UserProfilePage.tsx`

## Cosa fare

1. Un tasto «Find friends» con la lente in cima all'elenco di «Feed».
2. Una pagina sopra l'app: «←», il campo «Name», gli iscritti trovati
   (foto o iniziale, nome), al più 20, da 2 lettere.
3. Un nome toccato apre `UserProfilePage`; «←» torna ai nomi, com'erano.
4. Senza account il tasto apre «Profile» dicendo perché.
5. Un disegno aperto dal profilo torna al profilo, non a «Profile».
6. Test, testi nelle quattro lingue, `UI.md`, ADR.

## Criteri di accettazione

- [x] Il tasto è sopra i disegni di «Feed» e apre la ricerca (test).
- [x] Una lettera non chiede niente; la pausa dopo la scrittura fa una
      richiesta sola; il tasto della tastiera cerca subito e la pausa non
      richiede (test).
- [x] Si mostra solo la risposta all'ultima ricerca (test).
- [x] Un nome apre il profilo; «←» ritrova i nomi e il campo com'erano,
      senza chiedere di nuovo (test).
- [x] Un disegno aperto da quel profilo, chiuso, torna al profilo (test).
- [x] Senza account: «Profile» con «Log in to find your friends.» e
      nessuna richiesta (test).
- [x] Un server senza la ricerca dice «This server cannot look for members
      yet.»; una sessione finita chiede di rientrare (test).
- [x] Test verdi dell'app (typecheck, lint, prettier, jest).
- [ ] Prova sull'iPhone, dopo l'aggiornamento del server con la
      migrazione `0011` e la pubblicazione, con l'ok dell'utente.

## File toccati

```
apps/mobile/src/api/people.ts                          (nuovo)
apps/mobile/src/api/people.test.ts                     (nuovo)
apps/mobile/src/social/peopleDoor.ts                   (nuovo)
apps/mobile/src/social/PeopleSearch.tsx                (nuovo)
apps/mobile/src/social/PeopleSearch.test.tsx           (nuovo)
apps/mobile/src/social/FindFriendsButton.tsx           (nuovo)
apps/mobile/src/social/FindFriendsButton.test.tsx      (nuovo)
apps/mobile/src/social/FindFriendsFlow.test.tsx        (nuovo)
apps/mobile/src/screens/PeopleScreen.tsx               (nuovo)
apps/mobile/src/screens/PeopleScreen.test.tsx          (nuovo)
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-215.md
```

## Fuori scope

- «Follow», «Requests», «Followers» e «Following»: TASK-211 parte B.
- I tag delle persone nelle corse pubblicate: TASK-208 (riusa
  `PeopleSearch`).
- Il feed vero, con i disegni di chi segui: TASK-118.
- Aggiornare il server e pubblicare l'app: con l'ok dell'utente.

## Esito

Fatto il 2026-10-03. In cima a «Feed» c'è «Find friends»: apre sopra l'app
la ricerca per nome (da 2 lettere, al più 20, foto e nome) e da un nome il
profilo in sola lettura, con i suoi disegni; «←» torna ai nomi, poi a
«Feed». È la prima strada nell'app verso il profilo di un altro (domanda
aperta di TASK-116). Sul telefono funziona solo dopo l'aggiornamento del
server con la migrazione `0011`: prima dice «This server cannot look for
members yet.». I testi nuovi sono tradotti dall'agente, da far confermare.

# TASK-487 — Il Feed senza attività finte

**Stato**: Done (2026-11-22) — #1397 in `main` (5a6e3cd4); esce con l'OTA 23
(Coordinatore, col sì dell'utente)
**Fase**: 5 · **Branch**: `fix/feed-no-examples` (codice),
`docs/TASK-487-feed-no-examples` (documenti)
**ADR**: ADR-0127, precisazione (TASK-487) · numero del task dal
Coordinatore (fork 3), 2026-11-22; niente ADR nuovo (Coordinatore)

## La richiesta (2026-11-22)

> «Nell'applicazione che ho scaricato sul Mac che è quella dell'App Store
> nel feed ci sono attività finte devono esserci tutte le attività come
> sull'App di prova mie e di Riccardo dell'utente Rocky togliamo tutte
> quelle finte e poi rimandiamo l'aggiornamento.»

## La causa

L'app dell'App Store e quella di prova usano lo stesso server
(`https://api.getmuw.app`, variabile `EXPO_PUBLIC_API_URL` di EAS
`production` e `preview`). Le attività finte erano gli esempi di
`apps/mobile/src/feed/sampleFeed.ts` (TASK-156, ADR-0127): figure del
catalogo con corridori inventati, che «Tutti» mostrava quando nessuno ha
fatto l'accesso o quando l'account non ha nulla da vedere. Sul Mac l'app
era senza accesso. `GET /feed` vuole il token: senza accesso il server non
dà le attività vere.

## Scelta dell'utente (2026-11-22)

Alla domanda «cosa deve vedere chi apre il Feed senza accesso?» l'utente
ha scelto **«Invito ad accedere»** (non un Feed pubblico senza accesso, che
avrebbe chiesto una modifica al server).

## Cosa fa la PR #1397 (solo app)

- `apps/mobile/src/screens/FeedScreen.tsx`: il Feed mostra solo i post
  veri; gli esempi non entrano più.
- «Tutti» senza accesso: «Log in from Profile to see the activities.»
  («Accedi dal Profilo per vedere le attività.»).
- «Tutti» con accesso e nessun post: «Nobody has published anything yet.»
  («Nessuno ha ancora pubblicato nulla.»).
- Testi nuovi in it/de/fr/es.
- Test adattati; tolti `__tests__/AppFeedPaddle.test.tsx` e il test
  «a drawing of «Feed» on the water is not moved» di
  `AppExploreMove.test.tsx`: il loro unico ingresso era toccare un
  esempio nel Feed. Restano i test unitari di `paddlePosts` e `feedRoute`.

## Chiusura (2026-11-22)

- La #1397 è in `main` (5a6e3cd4), unita dal Coordinatore al verde. Prima
  due giri di test rossi: `AppEditDrawing` e `AppExploreMove` (testa
  1ec61c0a), poi, con `main` più avanti, `FeedScreenStyle` (senza accesso
  «All» compare due volte: la scheda e il titolo dell'invito) e `AppPages`
  (lo scorrimento verso «Feed» trova l'invito, non gli esempi), testa
  9abed3da.
- Documenti: #1402 (task file, STATUS, precisazione di ADR-0127), poi questa.

## Cosa resta

- OTA 23, production e preview (Coordinatore, con il sì dell'utente).
- L'utente fa l'accesso dall'app del Mac e controlla che il Feed mostri le
  attività vere.
- Fuori da questo task: gli esempi compaiono ancora tra i «featured» della
  ricerca di «Esplora» (`src/search/StartState.tsx`), e il codice usato solo
  dagli esempi (`paddlePosts`, `fetchPostRoute`) resta per quello.

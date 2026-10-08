# TASK-092 — Percorsi consigliati: tutti salvati, i migliori proposti

**Stato**: In lavorazione
**Fase**: 4 · **Branch**: `feat/TASK-092-recommended-routes`

Chiesto dall'utente il 2026-10-01: «salvali tutti… per ripopolare anche
strade non visitate solitamente». Decisione di prodotto in ADR-0086.
Il criterio dei migliori lo ha lasciato all'agente il 2026-10-07:
«consiglia tu i migliori disegni» (ADR-0229).

## Obiettivo

Ogni percorso generato dall'API resta salvato nel database; l'app propone
a chi cerca un percorso quelli migliori già fatti nella sua zona, e i
migliori si possono usare sui social del progetto.

Questa parte (brief del coordinatore, 2026-10-07/08): una riga
**«Recommended»** in «Explore», con i percorsi del catalogo vicini,
ordinati dall'API col criterio di ADR-0229.

## Dipende da

- TASK-110, TASK-114, TASK-122 (database, account, API sempre accesa):
  in `main`.
- TASK-117, TASK-119, TASK-171, TASK-172 (disegni pubblicati, reazioni,
  preferiti, corse salvate): in `main`.
- PR #438 (TASK-210 F, i nomi delle forme in «Explore»): la parte app
  parte quando è in `main`, perché tocca anche `src/explore/*`.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0086, ADR-0098, ADR-0229
- `docs/API.md`, `GET /recommended-routes` e `GET /recommended`
- `docs/UI.md`, «Explore»

## Cosa fare

1. **API**: `GET /recommended` in un modulo nuovo, sul catalogo: i
   percorsi entro 5 km dal punto, al più 10, nell'ordine di ADR-0229
   (somiglianza come la scheda la scrive, poi le reazioni dei disegni
   pubblicati delle corse su quel percorso, poi corse salvate e
   preferiti; a parità tutti, il più vicino prima). Token obbligatorio.
2. **App**: una riga «Recommended» in «Explore» con le schede che
   «Explore» usa già (`RouteCard`), ognuna apre il suo percorso come le
   altre righe, con «Start». Si nasconde senza catalogo, senza rete,
   senza account.
3. Testi nuovi nelle cinque lingue, mostrati all'utente prima del merge.

## Criteri di accettazione

- [ ] Un test deterministico mostra l'ordine su una fixture piccola: la
      somiglianza batte le reazioni, le reazioni battono le corse, a
      parità restano tutti e due.
- [ ] La riga non rompe niente: senza catalogo, senza rete, senza
      account si nasconde.
- [ ] La risposta per una riga di 10 percorsi con le anteprime pesa meno
      di 100 kB.
- [ ] Test verdi nell'API e nell'app.
- [ ] `API.md` e `UI.md` aggiornati; ADR-0229.
- [ ] I testi nuovi nelle cinque lingue visti dall'utente.

## File toccati

- `services/api/shaperoute_api/best_routes.py` (nuovo),
  `services/api/tests/test_best_routes.py` (nuovo)
- `services/api/shaperoute_api/recommended.py` (la funzione `listed`,
  usata da tutti e due gli elenchi)
- `services/api/shaperoute_api/app.py` (una riga `install_best_routes`)
- `apps/mobile/src/explore/*` (un componente nuovo, `ExploreScreen.tsx`,
  i test)
- `apps/mobile/src/api/recommended.ts` (nuovo) e il suo test
- `apps/mobile/src/i18n/*` (righe nuove in fondo)
- `docs/API.md`, `docs/UI.md`, `docs/DECISIONS.md`, `docs/STATUS.md`,
  questo file

## Fuori scope

- Salvare nel database ogni percorso generato (punto 1 di ADR-0086): qui
  si consiglia il catalogo.
- I percorsi disegnati sul telefono e gli esempi delle città.
- Filtri nuovi (ADR-0144), classifiche e sfide fra utenti.
- Esportare i migliori per i social del progetto.
- `src/feed/*`, `feed.py`, `moderation.py`, `comments.py`, `follows.py`,
  `profiles.py` (TASK-121 in parallelo), `App.tsx`.

## Esito

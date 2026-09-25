# TASK-066 — L'app non si blocca se l'API risponde senza `directions`

**Stato**: Done
**Fase**: manutenzione · **Branch**: `fix/TASK-066-missing-directions` (parte da `main`)

Assegnato dal coordinatore. Trovato nella prova sull'iPhone di TASK-058
(2026-09-25): con un'API vecchia (del 24/09, prima di TASK-048) il percorso
arriva senza `directions` e l'app si chiude con «Cannot read property
'length'» in `RoutePanel.tsx` (`view.result.directions.length`).

## Obiettivo

Una risposta senza `directions`, che il contratto (`packages/shared-types`,
TASK-048) rende obbligatorio, è una risposta sbagliata: l'app mostra
l'errore che ha già per questo caso (`bad_answer`) invece di chiudersi.
Nessun valore di ripiego silenzioso: un'API vecchia deve dirlo.

## Contesto da leggere

- `packages/shared-types/src/index.ts`: `RouteResult`, `Direction`, `TURNS`
- `apps/mobile/src/api/routes.ts`: `isRouteResult`

## Cosa fare

1. `isRouteResult` controlla `directions`: un array di oggetti con i campi
   di `Direction`.
2. Stesso controllo per gli altri campi aggiunti dopo TASK-048 (TASK-056:
   `shape` o `word`).
3. Test.

## Criteri di accettazione

- [x] Un test con una risposta senza `directions` → `bad_answer`, non
      un'eccezione.
- [x] `npm run typecheck`, `lint` e `test` verdi (267 test).

## File toccati

```
apps/mobile/src/api/routes.ts
apps/mobile/src/api/routes.test.ts
docs/tasks/TASK-066.md
docs/STATUS.md
```

## Fuori scope

- `RoutePanel.tsx` (in TASK-058, PR #72): con la guardia non serve toccarlo.
- Un messaggio apposta per «API da aggiornare».

## Esito

`isRouteResult` ora esige `directions`, ogni voce controllata campo per
campo (`turn` fra i `TURNS`, `street` e `road_type` stringa o null).
Trovato strada facendo: la guardia rifiutava anche i percorsi di una parola
(`shape: null`, TASK-056), che sarebbero diventati `bad_answer` appena
TASK-057 li avesse chiesti. Ora accetta una forma del catalogo senza
parola, oppure `shape: null` con `word` stringa; mai entrambe né nessuna.
Test sulla fixture `route-result-word.json`. Nessun ADR.

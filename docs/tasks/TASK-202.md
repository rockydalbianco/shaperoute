# TASK-202 — La penna alzata accesa di default

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-202-pen-up-default-on`
**ADR**: nessuno nuovo, vale ADR-0157
**Dipende da**: TASK-198 (#218) e TASK-200 in `main`

## Obiettivo

In «Draw», con una parola, l'interruttore «Lift the pen between letters»
parte acceso: una parola si chiede con la penna alzata, a meno che chi la
chiede non lo spenga.

Scelta dell'utente del 2026-10-02 («sì, acceso di default»), arrivata al
coordinatore dalla sessione «Logo e post Instagram». Era la prima delle
domande aperte di TASK-198 («Esito»): TASK-198 l'aveva costruito spento,
su correzione del coordinatore, finché l'utente non sceglieva.

## Contesto da leggere

- `docs/tasks/TASK-198.md` («Esito», le scelte da confermare)
- `docs/UI.md` «Lift the pen between letters»
- `apps/mobile/App.tsx` (lo stato dell'interruttore),
  `apps/mobile/src/route/RoutePanel.tsx`

## Cosa fare

1. Lo stato iniziale dell'interruttore acceso in `App.tsx`.
2. I test: l'interruttore parte acceso e una parola manda `pen_up: true`;
   spento a mano, la richiesta è quella di prima, senza il campo; una
   forma o un'immagine non mandano mai `pen_up`. I test che si aspettavano
   una parola senza `pen_up` lo dicono: la penna spenta a mano, o il campo.
3. `UI.md`; la riga in `STATUS.md`, che dice anche che la domanda di
   TASK-198 è risolta (il task file di TASK-198 non si tocca).

## Criteri di accettazione

- [x] Aperta l'app, con una parola, l'interruttore è acceso e la richiesta
      ha `pen_up: true` (test).
- [x] Spento, la richiesta di una parola non ha `pen_up` (test).
- [x] Una forma e un'immagine non hanno mai `pen_up`: la forma con un test,
      con l'interruttore lasciato acceso; l'immagine dal tipo,
      `ImageRouteRequest.pen_up?: false` in `shared-types`, che non compila
      con `true`.
- [x] Test, lint, `tsc` e `format:check` verdi.

## File toccati

Elenco previsto; la PR dichiara i suoi.

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/__tests__/AppBike.test.tsx
apps/mobile/__tests__/AppPenUp.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-202.md
```

## Fuori scope

- **I testi della voce** e **la riga dei km** (TASK-198): domande
  all'utente che la sessione social gli sta facendo.
- **Ricordare la scelta** dell'interruttore fra un'apertura e l'altra:
  non chiesto.
- Il server e la pubblicazione.

## Note per il deploy

Con l'interruttore acceso, una parola chiesta a un'API **senza TASK-197**
risponde `invalid_request` (TASK-198, «Esito»): oggi il server è fermo
prima di TASK-197. Quindi questa modifica va sul telefono **solo dopo
l'aggiornamento del server**, con l'ok dell'utente; pubblicare l'app prima
romperebbe ogni parola.

## Esito

Fatto (2026-10-03). In `App.tsx` lo stato iniziale dell'interruttore è
acceso; nient'altro nel codice dell'app cambia. Quattro test si
aspettavano la penna spenta all'avvio: in `AppPenUp.test.tsx` il primo ora
spegne l'interruttore a mano e controlla che la richiesta sia quella di
prima, il secondo non preme niente, il terzo lascia l'interruttore acceso
mentre si sceglie la forma; in `App.test.tsx` e `AppBike.test.tsx` la
richiesta di una parola ha `pen_up: true`. Suite dell'app intera verde.
Non provato sull'iPhone: con il server di oggi, senza TASK-197, una parola
fallirebbe (vedi «Note per il deploy»).

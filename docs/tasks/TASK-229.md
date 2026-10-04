# TASK-229 — «Save» per uscire dalla lavagna del contorno

**Stato**: Done (2026-10-04)
**Fase**: 4 · **Branch**: `fix/TASK-229-outline-save` (parte da `main`)

Chiesto dall'utente il 2026-10-03: «Non si riesce ad uscire quando carichi
una foto e modifichi la sagoma, da aggiungere qualcosa per salvare le
modifiche e uscire». Numeri dal coordinatore; ADR-0191.

## Obiettivo

Dalla lavagna «Edit the outline» (TASK-079, ADR-0074) si esce sempre, con
un pulsante che si vede e dice che le modifiche restano.

## La causa

L'unico modo di uscire era «Done», un testo giallo in alto a destra
dell'intestazione. In Expo Go, dove l'utente prova l'app, quell'angolo è
coperto dal pulsante di Expo (visto anche nelle prove nel simulatore), e
la lavagna a tutto schermo di iOS non si chiude trascinando in giù: una
volta dentro non si usciva.

## Come (su delega dell'utente)

- **«Save» in fondo alla lavagna**, sotto «Add a part», «Add a detail» e
  «Undo», largo quanto la riga: dove arriva il pollice, lontano dagli
  angoli. Neutro come gli altri pulsanti: il giallo è del percorso
  (`UI.md`, «Il tema»).
- **Salvare è chiudere**: ogni tratto entra nel contorno appena l'API
  risponde (TASK-079), quindi «Save» chiude la lavagna e il contorno
  nell'anteprima è già quello modificato. Anche il tasto «indietro» di
  Android chiude tenendo le modifiche, come prima.
- **Tolto «Done»**: due pulsanti per la stessa cosa confondono. In alto
  resta solo «Fit» quando la foto è ingrandita (in Expo Go anche lui sotto
  il pulsante di Expo: due dita fanno lo stesso).
- **Nessun «Cancel»** che butti le modifiche: non chiesto; per tornare
  indietro c'è «Undo», fino al contorno ricavato.
- «Save» passa da `t()`: il testo è già nelle tabelle (`EditProfile`).

## Criteri di accettazione

- [x] «Save» in fondo alla lavagna la chiude, e le modifiche restano.
- [x] «Done» non c'è più.
- [x] Test Jest: `OutlineBoard.test.tsx` (Save chiude, Done assente),
      `ImageChoice.test.tsx` (la lavagna si apre e si chiude con «Save»).
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check`; la CI.
- [ ] Prova sull'iPhone: dell'utente, con la prossima pubblicazione.

## File toccati

```
apps/mobile/src/route/OutlineBoard.tsx
apps/mobile/src/route/OutlineBoard.test.tsx
apps/mobile/src/route/ImageChoice.test.tsx   (solo «Done» → «Save»)
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-229.md                       (nuovo)
```

## Fuori scope

- «Cancel» che scarta le modifiche fatte da quando la lavagna è aperta.
- Tradurre gli altri testi della lavagna (le parti di TASK-210).

## Esito

«Save» in fondo alla lavagna del contorno: chiude e tiene le modifiche;
tolto «Done», che in Expo Go stava sotto il pulsante di Expo. Solo app:
esce con la prossima pubblicazione, con l'ok dell'utente.

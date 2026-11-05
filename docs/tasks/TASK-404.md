# TASK-404 — Disegno a mano: dopo un primo tratto piccolo, «too much for one route»

**Stato**: Done · 2026-11-05
**Fase**: 5 · **Branch**: `fix/TASK-404-freehand-detail`
**Numeri**: TASK-404, assegnato dal Coordinatore; nessun ADR (è una
correzione, nessuna scelta cambia). Seguito di TASK-281 e TASK-331.

## Obiettivo

L'utente (2026-11-05), disegnando a mano libera nel nuoto: dopo pochi
tratti l'app dice «That is too much for one route. Undo something, or draw
simpler lines.» e non lascia aggiungere altro. Succede in tutti gli sport.

## Cosa c'è oggi

`detailOf` in `apps/mobile/src/mapdraw/drawing.ts` raddrizza ogni tratto
aggiunto con `fitted`, a partire dall'1% (ADR-0068) della grandezza del
disegno **prima** del tratto, e tiene la versione più fedele che sta nei
200 punti di `MAX_DETAIL_POINTS`. Se il primo tratto è piccolo (un punto,
una riga corta), la tolleranza è di pochi centimetri: il tratto grande che
segue tiene tutto il tremolio del dito e si prende quasi tutti i punti
(prova in locale: un'asta dopo un puntino, 196 punti su 200). Il tratto
dopo non entra più: «too_much».

## Cosa cambia

La tolleranza (e la chiusura degli occhielli, `LOOP_SHARE`) si misura sulla
grandezza del disegno **con** il tratto nuovo. Lo scatto al disegno
(`SNAP_SHARE`) e la soglia del tratto troppo corto (`MIN_DETAIL_SHARE`)
restano sul disegno di prima. Una riga in `detailOf`; nessun testo, nessun
motore, nessun contratto: impronta iOS invariata (`6f8bba4c`), arriva con un
OTA.

## Criteri di accettazione

- [x] Un tratto corto, poi tre cerchi venti volte più grandi con il
      tremolio di una mano: entrano tutti e costano meno di 80 punti
      (`drawing.test.ts`; senza la correzione 116).
- [x] I test di `src/mapdraw` di prima restano verdi; typecheck, lint e
      Prettier verdi in locale sui file toccati.
- [ ] CI verde.

## File toccati

```
apps/mobile/src/mapdraw/drawing.ts
apps/mobile/src/mapdraw/drawing.test.ts
docs/tasks/TASK-404.md                       (nuovo)
docs/STATUS.md
```

## Fuori scope

- `fitted` resta «la versione più fedele che sta nel limite»: con un
  tremolio grande quanto l'1% il tratto costa ancora molto. Cambiarlo è una
  scelta su quanto è fedele il disegno, non questa correzione.
- Le parti di TASK-402 in `drawing.ts` (`turnDeg` in `withDetail`): loro
  uniscono `main` dopo.
- **L'OTA**, che parte col sì dell'utente.

## Esito

Un primo tratto piccolo non toglie più posto ai tratti dopo: ogni tratto
si raddrizza sulla grandezza del disegno che forma. Solo JS; la prova sul
telefono e l'OTA di produzione sono del Coordinatore, l'OTA col sì
dell'utente.

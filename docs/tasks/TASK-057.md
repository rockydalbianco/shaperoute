# TASK-057 — Campo per la parola da disegnare, nell'app

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-057-word-field`

## Obiettivo

Nella schermata della scelta l'utente può scrivere una parola invece di
scegliere una forma; l'app la controlla prima di mandarla, la manda come
`word` e la mostra come nome del percorso.

Richiesta dell'utente (2026-09-24): «aggiungere all'interfaccia lo spazio
per scrivere le lettere/parole da disegnare».

## Contesto da leggere

- `docs/API.md` §«Una parola invece di una forma» (TASK-056, ADR-0051)
- `docs/UI.md` §«Forma e distanza», §«Chiedere un percorso», §«Il risultato»
- `packages/shared-types/src/index.ts`: `LETTERS`, `MAX_WORD_LETTERS`,
  `LETTER_DISTANCE_M`, `RouteRequest`

## Cosa fare

1. Un interruttore «Shape | Word» sopra le tessere: una o l'altra, e si
   vede quale (ADR-0053).
2. Con «Word»: un campo per la parola, in maiuscole; sotto, il controllo
   con `LETTERS`, i limiti di lunghezza e i 3 km a lettera, in inglese
   chiaro; «Draw route» spento finché la parola non va.
3. La richiesta parte con `word` (e senza `shape`); l'attesa e il risultato
   mostrano la parola come nome del percorso.
4. Test deterministici; `UI.md` aggiornato.

## Criteri di accettazione

- [x] L'interruttore mostra quale dei due è scelto; cambiare non perde
      quanto scritto nell'altro.
- [x] Una parola valida manda `{"word": "CIAO", …}` senza `shape`.
- [x] Lettere fuori da A–Z, spazi, troppe lettere, distanza sotto i 3 km a
      lettera: messaggio chiaro e «Draw route» spento; per la distanza un
      tasto porta a quella minima.
- [x] Attesa e risultato dicono la parola.
- [x] Una parola che non ci sta non propone le forme, ma una parola più
      corta.
- [x] Test verdi (`npm test`, typecheck, lint, prettier); provato
      sull'iPhone.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/src/route/wordInput.ts          (nuovo)
apps/mobile/src/route/wordInput.test.ts     (nuovo)
apps/mobile/src/route/problems.ts
apps/mobile/src/route/problems.test.ts
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/route/useRouteRequest.test.ts
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/screens/Segmented.tsx       (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-057.md
```

## Fuori scope

- `services/*` e `packages/shared-types`: il contratto c'è già (TASK-056).
- `shapeWords.ts`, `ShapeTiles.tsx`: sono di TASK-065.
- Una stima della barra diversa per le parole (`progress.ts`): le parole
  chiedono 40–258 s, la barra pulsa quando l'attesa si allunga (ADR-0055).
- Accenti tolti di nascosto («città» → «CITTA»): l'app dice quale lettera
  non c'è, come l'API.

## Esito

Interruttore «Shape | Word» e campo per la parola, controllata prima di
mandarla (A–Z, al più 7 lettere, 3 km a lettera, «Use N km»); la parola è
il nome del percorso nell'attesa e nel risultato. Provato sull'iPhone il
2026-09-25: «va benone». Rimandata una stima della barra per le parole
(`progress.ts`, ADR-0053).

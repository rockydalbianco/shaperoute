# TASK-057 — Campo per la parola da disegnare, nell'app

**Stato**: In corso
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

- [ ] L'interruttore mostra quale dei due è scelto; cambiare non perde
      quanto scritto nell'altro.
- [ ] Una parola valida manda `{"word": "CIAO", …}` senza `shape`.
- [ ] Lettere fuori da A–Z, spazi, troppe lettere, distanza sotto i 3 km a
      lettera: messaggio chiaro e «Draw route» spento; per la distanza un
      tasto porta a quella minima.
- [ ] Attesa e risultato dicono la parola.
- [ ] Una forma toccata dopo un errore torna a «Shape».
- [ ] Test verdi (`npm test`, typecheck, lint, prettier); provato
      sull'iPhone.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/RoutePanel.tsx
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

*(a fine task)*

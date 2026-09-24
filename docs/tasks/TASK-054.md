# TASK-054 — Partenza a scelta, attesa e avvisi più chiari

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-054-start-and-outcome`

## Obiettivo

Si può partire da un'altra città anche con il GPS attivo; sulla mappa
l'attesa è un caricamento e gli avvisi del motore si leggono senza
conoscerne il gergo.

## Richieste dell'utente (2026-09-24, dopo TASK-051)

- «Scegliere se usare la posizione del GPS o, anche con il GPS attivo,
  andare in un'altra città.»
- «Mettere un caricamento al posto dei secondi che passano.»
- «Migliorare le scritte sotto, le note che vengono fuori.»

## Contesto da leggere

- `docs/UI.md` («La partenza», «Chiedere un percorso», «Il risultato»)
- `apps/mobile/App.tsx`, `src/screens/ChooseScreen.tsx`,
  `src/route/RoutePanel.tsx`
- I testi degli avvisi nel motore: `validation.py` (`Issue`),
  `optimizer.py` (`search`, `plan_shape`), `network.py`
  (`snap_to_network`)

## Cosa fare

Decisioni dell'agente su delega dell'utente:

1. **Partenza a scelta**: nella scheda della partenza, due pulsanti
   affiancati, «My position» e «Another place». Con «Another place» compare
   la ricerca, e il luogo scelto resta la partenza anche se il GPS risponde.
   «My position» torna al GPS e lo rilegge. Senza GPS (permesso negato o
   nessuna risposta) la ricerca c'è sempre, come oggi.
2. **Attesa**: al posto dei secondi un indicatore di caricamento
   (`ActivityIndicator`, già in React Native) accanto alla frase che dice
   cosa fa l'API.
3. **Avvisi in parole semplici**: l'app riconosce i testi del motore che
   conosce e li riscrive brevi, ognuno con un segno e un tono (attenzione,
   informazione); un testo che non riconosce resta com'è. È un ripiego:
   la strada pulita sono i codici negli avvisi del contratto, e il contratto
   oggi è di TASK-048 (`packages/shared-types`).
4. **Risultato**: la distanza in grande, «on roads · target N km» sotto,
   gli avvisi in una lista, «Export GPX» largo.

## Criteri di accettazione

- [x] Con il GPS attivo, «Another place» e un luogo cercato: il percorso
      parte da lì, e il GPS che risponde dopo non lo cambia (test).
- [x] «My position» torna al GPS (test).
- [x] Durante l'attesa c'è l'indicatore e non ci sono secondi (test).
- [x] Ogni avviso che il motore scrive oggi ha la sua frase semplice, e un
      testo sconosciuto passa com'è (test, con i testi veri del motore).
- [x] Nessun colore scritto a mano; ogni cosa da toccare alta almeno 44.
- [x] `typecheck`, `lint`, `format:check`, `npm test` puliti.
- [x] Provato dall'utente sull'iPhone.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/warnings.ts        (nuovo)
apps/mobile/src/route/warnings.test.ts   (nuovo)
apps/mobile/src/location/startMode.ts    (nuovo)
apps/mobile/src/location/startMode.test.ts (nuovo)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Codici negli avvisi del contratto e nel motore (`packages/shared-types`
  è di TASK-048).
- Ricordare i luoghi cercati fra un'apertura e l'altra.
- Una barra di avanzamento vera: l'API non dice a che punto è il calcolo.

## Esito

Provato dall'utente sull'iPhone il 2026-09-24: «sì, funziona».

244 test verdi. Nuovi: `startMode.test.ts` (da dove si parte),
`warnings.test.ts` (un caso per ogni avviso che il motore scrive oggi, con i
testi veri), e in `App.test.tsx` la partenza da un altro luogo con il GPS
acceso e il ritorno al GPS. ADR-0048 per gli avvisi. In più, deciso
dall'agente: la stessa frase compare una volta sola (un pezzo di forma
saltato più volte), e un avviso che l'app non conosce resta in inglese com'è.

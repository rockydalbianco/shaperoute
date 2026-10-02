# TASK-193 — I test dell'app stabili sotto carico

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-193-stable-app-tests`

## Obiettivo

Il job `mobile` della CI e la suite dell'app sul Mac non falliscono più
perché la macchina è carica: un test ha il tempo di un avvio a freddo, e
`__tests__/AppFreeRun.test.tsx` non dipende dall'orologio vero.

## Contesto da leggere

- `docs/TESTING.md` «Test automatici»
- `apps/mobile/package.json` (la configurazione di jest)
- `apps/mobile/__tests__/AppFreeRun.test.tsx`
- `apps/mobile/src/navigation/runControl.ts` e
  `apps/mobile/src/screens/RunPanel.tsx` (`useNow`, `useRunNumbers`): da
  leggere, non da toccare

## Cosa si sa già

**I rossi di oggi in CI** (job `mobile`, sempre «Exceeded timeout of 5000 ms
for a test», sempre il primo test di un file):

| Run | Dove | Test |
|---|---|---|
| 37013552127 | `main` (push) | `AppFavorites.test.tsx`, «the heart keeps the route on the map, and removes it» |
| 37003706954 | PR di TASK-172 | lo stesso, e `AppActivities.test.tsx`, «"My activities" in "Profile" lists the runs…» |
| 37003621033 | PR di TASK-176 | `src/explore/ExploreScreen.test.tsx`, «a city without recommended routes…» |
| 37016727438 | PR di TASK-189 (#207) | `AppFavorites.test.tsx`, lo stesso |

(Il run 36967654844 era rosso per Prettier, non per i test.)

**La causa è l'avvio a freddo di jest.** In CI non c'è cache: ogni file
sorgente si trasforma con Babel la prima volta che serve. React Native
carica i suoi componenti solo quando si disegnano, quindi il primo
`render` dopo un avvio a freddo paga quella trasformazione **dentro il
test**. Senza cache jest parte dai file di test più grandi, uno per
worker (3 in CI, su 4 vCPU): i primi a disegnare pagano tutti insieme.
Misurato:

- CI, run 37016291238 (primo push di questa PR, con `verbose` acceso solo
  per misurare): `AppActivities` #0 **5,18 s**, `AppFavorites` #0 **5,10 s**,
  `App.test` #0 **4,85 s**; il quarto, `RunDashboard` #0, 1,3 s. Con i 5 s
  di jest quel run sarebbe stato rosso.
- Mac, cache fredda, 3 worker come in CI, tre volte: `AppFavorites` #0
  2,9–3,4 s, `AppActivities` #0 2,9–3,4 s, `App.test` #0 2,8–3,3 s,
  `RunDashboard` #0 0,6–0,8 s.
- Mac, cache fredda, tutti i worker, macchina libera: il più lento 4,7 s
  (`RunDashboard` #0), 9 test sopra i 2 s.
- Mac, cache calda, due suite insieme: il più lento 1,9 s; con il Mac
  saturo (carico 143) 4,2 s. **A cache calda il carico non è un problema.**
- Mac, cache fredda, due suite fredde insieme (un worktree nuovo mentre un
  altro agente prova): Mac libero 8,2–9,6 s; con altri agenti al lavoro
  21–22 s una volta e 44–49 s un'altra; Mac saturo (carico oltre 100)
  185–251 s, con la suite a 8 minuti invece di 12 secondi.

Ogni worktree ha la sua cache di jest (la chiave contiene la cartella): il
primo giro in un worktree nuovo è sempre a freddo.

**`AppFreeRun.test.tsx` dipendeva dall'orologio vero** in quattro punti; i
primi tre riprodotti mettendo un'attesa vera nel test di `main`:

1. l'orologio della corsa (`useNow`) parte da quando la schermata si monta,
   e il test leggeva `Date.now()` dopo: con più di 1 s in mezzo «Time»
   segnava 0:58, fuori da `(0:59|1:00)` (attesa di 1,1 s: fallisce);
2. «Pause» ferma il tempo a `Date.now()`: con più di 150 ms fra le
   posizioni e il tocco, «Avg pace» diventa 3:21 invece di 3:20 (attesa di
   200 ms: fallisce); con più di 1 s anche «Time: 1:00» (attesa di 1,1 s:
   fallisce);
3. il conto alla rovescia è un `setTimeout` vero di 3 s: con più di 3 s fra
   «Run» e il controllo, «Get ready» non c'è più (attesa di 3,1 s:
   fallisce);
4. la pausa da fermi scatta dopo 10 s veri: non riprodotta, ma con un
   timeout più lungo di 10 s diventa raggiungibile.

## Cosa fare

1. `testTimeout` per tutta l'app in `apps/mobile/package.json`.
2. `AppFreeRun.test.tsx` con i timer finti di jest: il tempo passa solo
   quando il test lo dice. Niente cambia nel codice dell'app.
3. Provare: il file molte volte, la suite intera da sola e con un'altra
   accanto.

## Criteri di accettazione

- [x] Un test dell'app ha 30 s, non 5: `testTimeout` in `package.json`.
- [x] `AppFreeRun.test.tsx` passa con attese vere di 1,1 s, 200 ms e 3,1 s
      nei punti che prima lo rompevano.
- [x] `AppFreeRun.test.tsx` 20 volte di fila, e 20 con una suite fredda
      accanto: sempre verde.
- [x] La suite intera verde da sola e con un'altra accanto (a cache calda,
      e a cache fredda con il Mac libero).
- [x] Lint, tipi, Prettier e CI verdi.

## File toccati

```
apps/mobile/package.json
apps/mobile/__tests__/AppFreeRun.test.tsx
docs/TESTING.md
docs/STATUS.md
docs/tasks/TASK-193.md
```

## Decisioni prese

Decise dall'agente su delega dell'utente; il valore del timeout con il
coordinatore. Nessun numero di ADR è stato assegnato a questo task.

- **`testTimeout: 30000`.** Il coordinatore ha chiesto 15 s se le misure
  lo reggono, altrimenti il valore più piccolo che le misure giustificano,
  30 s al massimo. 15 s coprono la CI (5,2 s) e un avvio a freddo con il
  Mac libero (fino a 9,6 s), ma non un avvio a freddo mentre altri agenti
  lavorano: lì sei test hanno preso fra 13,5 e 22,4 s. 30 s coprono anche
  quello. **Non coprono** il Mac saturo (44–251 s misurati): nessun valore
  ragionevole lo fa, e lì la cura è rilanciare, perché il secondo giro è a
  cache calda. Il prezzo di 30 s: un test che si blocca davvero fallisce
  dopo 30 s invece di 5.
- **Timer finti in tutto `AppFreeRun.test.tsx`**, con un istante di
  partenza fisso. Il test della corsa manda le posizioni a −59 s, −30 s e
  0, poi fa passare un secondo (`TICK_MS`): l'orologio della corsa scatta e
  segna un minuto esatto, quindi «Time: 1:00» e «Pace now: 3:20 /km» senza
  alternative. Il suo `20_000` non serve più.
- **`AppFavorites.test.tsx` non è stato diviso.** Il coordinatore l'ha
  chiesto, a patto che le misure dicessero che abbassa il primo `render` a
  freddo. Provato (cache fredda, 3 worker, tre volte, gli stessi otto test
  in due file): i due pezzi scendono a 0,2 s e `App.test`/`AppActivities`
  da 2,8–3,4 a 1,3–1,5 s, ma l'avvio a freddo **si sposta** su
  `src/screens/RunDashboard.test.tsx`, il file che diventa il primo a
  disegnare: il suo primo test passa da 0,6–0,8 a 2,8–3,0 s. Il test più
  lento della suite resta dov'era (da 2,9–3,4 a 2,8–3,0 s): in CI, con i
  5 s di prima, `RunDashboard` sarebbe stato il prossimo a cadere, come è
  successo ad `AppFavorites` dopo la divisione di `ExploreScreen` in
  TASK-176. Chi disegna per primo paga: dividere i file cambia solo chi.
  La decisione se dividerlo lo stesso torna al coordinatore.

## Fuori scope

- `apps/mobile/__tests__/AppActivities.test.tsx` ha un suo
  `jest.setTimeout(20_000)` e un `20_000` su un test: valgono più del
  valore di progetto, quindi quel file resta a 20 s. Era di un'altra PR: da
  togliere in un task a parte.
- Dividere `AppFavorites.test.tsx` (vedi sopra): si può fare per ordine, non
  cura i timeout.
- Togliere l'avvio a freddo invece di aspettarlo: tenere la cache di jest
  fra un run e l'altro della CI (`actions/cache`), che tocca il workflow; o
  meno worker per suite sul Mac quando più agenti provano insieme
  (`maxWorkers`), che rallenta la CI. Non decisi qui.

## Esito

Fatto (2026-10-02), PR #206. Un test dell'app ha 30 s; `AppFreeRun` gira su
un orologio finto e passa anche con le attese che rompevano quello di prima.

Le prove:

- `AppFreeRun.test.tsx`: 20 su 20 con il Mac carico per conto suo (carico
  da 73 a 330; il test più lento 5,6 s, sopra i 5 s di prima), 20 su 20 con
  una suite fredda che gira accanto. Il file di `main`, in quelle stesse 20
  prove accanto alla suite, è passato anche lui 20 su 20: quel carico non
  bastava a romperlo, le attese messe a mano sì.
- Suite intera: `npm run test` da sola 1046 su 1046 (11,8 s). Due insieme a
  cache calda, Mac saturo: 1046 su 1046 tutte e due (22 s, il più lento
  4,2 s). Due insieme a cache fredda, Mac libero: 1046 su 1046 tutte e due
  (29 s, il più lento 9,6 s; 9 e 7 test sopra i 5 s di prima).
- **Un fallimento, detto com'è**: due suite a cache fredda con il Mac già
  saturo (carico fino a 143) hanno preso 8 minuti e fallito 15 e 17 test su
  1046: 28 timeout, quasi tutti sul primo `render` di un file (fino a
  251 s), e quattro test che seguivano un test scaduto nello stesso file.
  Rilanciate a cache calda subito dopo, con lo stesso carico: verdi.
- Prima del valore finale: due suite fredde insieme con altri agenti al
  lavoro, una volta 21–22 s il più lento (verdi), una volta 44–49 s, con
  `AppActivities` fallito sui suoi 20 s.

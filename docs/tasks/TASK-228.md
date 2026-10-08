# TASK-228 — Il «Feed» sull'acqua

**Stato**: Done (2026-10-05) — PR #322, merge `de9512b`. Solo app: esce
con la prossima pubblicazione.
**Fase**: 4 · **Branch**: `feat/TASK-228-water-feed`
**Dipende da**: TASK-156 (il feed d'esempio), TASK-188 (il tocco apre il
percorso), TASK-227 (gli esempi della canoa dentro l'app), TASK-226 (gli
occhi staccati sull'acqua): tutti in `main`

Chiesto dall'utente il 2026-10-03, nella sessione di TASK-191 C: nel «Feed»
anche personaggi inventati con percorsi fatti in canoa, come il feed
d'esempio della corsa.

## Obiettivo

«Feed» mostra, fra i quindici disegni d'esempio della corsa, quattro
disegni fatti sull'acqua da pagaiatori inventati. Un tocco ne apre il
percorso, da fare in canoa.

## Scelte dell'utente (2026-10-05)

Tre domande, una per volta, ognuna con una proposta:

1. **Quando si vedono**: **sempre, mescolati** a quelli di corsa, con la
   scritta «Paddle» sul post, qualunque sia lo sport scelto. Scartate: solo
   con «Paddle» scelto; mescolati ma in cima con «Paddle».
2. **Quanti e dove**: **quattro, uno per luogo** (Lago di Garda, Lago di
   Como, Jesolo, Riccione), una forma diversa per ciascuno (cuore, stella,
   luna, testa di cane con gli occhi staccati), tutti da 2 km: gli stessi
   percorsi che l'app ha già in «Explore». Scartate: otto, due per luogo;
   quattro di lunghezze diverse, disegnati apposta.
3. **I nomi**: **in inglese, come lo sport**: `greta_kayak` (Lago di Garda),
   `leo.sup` (Lago di Como), `irene_onwater` (Jesolo), `ale.paddle`
   (Riccione). Scartati: in italiano; senza lo sport nel nome.

## Contesto da leggere

- `docs/tasks/TASK-156.md`, `TASK-161.md`, `TASK-163.md` (il feed d'esempio)
- `docs/tasks/TASK-162.md` (la mappa sotto i disegni)
- `docs/tasks/TASK-188.md` (il tocco apre il percorso)
- `docs/tasks/TASK-227.md`, `TASK-226.md` (gli esempi della canoa dentro
  l'app, i pezzi)
- `docs/UI.md` «Le pagine», la voce «Feed»
- `apps/mobile/src/feed/`, `src/explore/exampleRoutes.ts`,
  `src/explore/explored.ts`

## Cosa fare

1. I quattro post sull'acqua, con i percorsi del motore.
2. Mescolarli ai post della corsa in «Feed».
3. La scheda dice «Paddle» e disegna a pezzi la forma che lo è.
4. Il tocco apre il percorso sull'acqua.
5. Test, `UI.md`, ADR-0190, `STATUS.md`.

## Criteri di accettazione

- [x] «Feed» mostra 19 disegni: i 15 della corsa nel loro ordine e, fra
      loro, i 4 sull'acqua, con qualunque sport (test).
- [x] Quattro post, uno per luogo d'acqua, ognuno con la sua forma e con
      il nome scelto; nomi validi come nomi utente dell'app e diversi da
      quelli della corsa (test).
- [x] Ogni linea è il percorso del motore sull'acqua vera: l'esempio che
      l'app ha già per quel luogo e quella forma. Nessuna coordinata
      copiata né disegnata a mano (test: ogni punto della linea è un punto
      dell'esempio).
- [x] La testa di cane resta a pezzi: niente linea dove la penna è alzata
      (test).
- [x] La scheda dice «Paddle» prima dei fatti, anche a VoiceOver (test).
- [x] Un tocco apre il percorso sull'acqua senza chiedere niente all'API,
      anche con «Run» scelto; «Start» passa dall'avviso della canoa e
      parte senza indicazioni (test dell'app).
- [x] Il motore non cambia; niente server, niente pubblicazione; nessuna
      dipendenza nuova; nessun testo nuovo da tradurre.
- [x] Test dell'app verdi; lint, typecheck e prettier puliti.

## File toccati

```
apps/mobile/src/feed/paddlePosts.ts            (nuovo)
apps/mobile/src/feed/paddlePosts.test.ts       (nuovo)
apps/mobile/src/feed/sampleFeed.ts
apps/mobile/src/feed/sampleFeed.test.ts
apps/mobile/src/feed/feedRoute.ts
apps/mobile/src/feed/feedRoute.test.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
apps/mobile/__tests__/AppFeedPaddle.test.tsx   (nuovo)
docs/tasks/TASK-228.md                         (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
```

Non toccati, di proposito: `FeedScreen.tsx` e `App.tsx` (li ha TASK-235),
le tabelle `src/i18n/` (nessun testo nuovo), `src/paddle/` (TASK-233),
`exampleRoutes.ts`.

## Fuori scope

- Il feed vero (TASK-118): qui solo esempi.
- Post in bici.
- Altri luoghi d'acqua, altre lunghezze: i post seguono gli esempi dentro
  l'app. I laghi di TASK-233 non hanno ancora esempi dentro l'app.
- Like, commenti e profilo dei personaggi inventati.
- Pubblicare con `eas update`: lo fa il coordinatore.

## Esito

### 2026-10-05

**Fatto** (ADR-0190):

- `src/feed/paddlePosts.ts` (nuovo):
  - `PADDLE_POSTS`, i quattro post. Di inventato hanno nome, titolo,
    minuti e punteggio. Il percorso no: ogni post **legge l'esempio** del
    suo luogo e della sua forma da `PADDLE_EXAMPLES.bundled`, cioè da
    `paddleExamples.json`, disegnato dal motore sull'acqua del server
    (TASK-227). Non c'è un secondo file di coordinate: quando il JSON si
    rifà, i post lo seguono.
  - L'`id` del post è l'`id` dell'esempio
    (`example:heart:paddling:45.8811,10.8456`).
  - La linea: 120 punti al più, come i disegni della corsa; per una forma
    a pezzi tutti i punti e `gaps`, i punti a cui la penna arriva senza
    disegnare, come le schede di «Explore» (TASK-226).
  - `withPaddle`: il primo post sull'acqua dopo due della corsa, poi uno
    ogni quattro. Nel «Feed» di oggi sono il 3º, l'8º, il 13º e il 18º
    di 19.
  - `paddleDetail`: il percorso intero di un post sull'acqua.
- `sampleFeed.ts`: `SamplePost` ha due campi facoltativi, `activity`
  (`"paddling"`) e `gaps`. `RUN_POSTS` sono i quindici del file;
  `SAMPLE_FEED`, che `FeedScreen` già legge, è `withPaddle(RUN_POSTS)`.
  `sampleFeed.json` e `tools/sample_feed.py` non cambiano.
- `feedRoute.ts`: `postRoute` porta `gaps` e, sull'acqua, la distanza
  chiesta (2 km); `fetchPostRoute` di un post sull'acqua non chiede
  niente e dà il percorso dentro l'app, che dice `activity: "paddling"`.
  Per questo `App.tsx` non cambia: la scheda sulla mappa, «Start» con
  l'avviso e la corsa senza indicazioni leggono lo sport dal percorso,
  come per un esempio di «Explore» con «Paddle».
- `FeedPost.tsx`: la riga dei fatti di un post sull'acqua comincia con il
  nome dello sport, «Paddle · Heart · 2.0 km · 26 min»; la linea salta i
  tratti con la penna alzata.

**I quattro post**:

| Nome | Luogo | Forma | Titolo | Tempo | Punteggio |
|---|---|---|---|---|---|
| `greta_kayak` | Lago di Garda | cuore | «A heart on Lake Garda» | 26 min | 96 |
| `leo.sup` | Lago di Como | stella | «Star off the lakefront» | 29 min | 91 |
| `irene_onwater` | Jesolo | luna | «Morning moon off Jesolo» | 24 min | 94 |
| `ale.paddle` | Riccione | testa di cane | «Dog paddle off Riccione» | 30 min | 89 |

I tempi sono da 12 a 15 minuti al km: una canoa o una tavola, senza
fretta.

**Test**:

- `paddlePosts.test.ts` (nuovo, 7): i quattro post e i loro nomi; ogni
  linea è l'esempio dentro l'app, punto per punto, dalla riva e ritorno;
  i pezzi della testa di cane; tempi e punteggi; `withPaddle`.
- `sampleFeed.test.ts`: i tre test di prima ora guardano `RUN_POSTS`; uno
  nuovo sui 19 di «Feed» e sui posti di quelli sull'acqua.
- `feedRoute.test.ts` (+2), `FeedPost.test.tsx` (+2).
- `__tests__/AppFeedPaddle.test.tsx` (nuovo, 3): con «Run» scelto, il
  tocco apre il percorso sull'acqua senza richieste all'API; «Start»
  mostra l'avviso e poi parte senza indicazioni; «Back to the list» torna
  a «Feed». È un file a parte per non allungare `AppFeed.test.tsx`
  (memoria «ci-jest-cold-start-largest-files»).

**Decisioni prese su delega** (ADR-0190): i post leggono gli esempi invece
di avere un file loro; lo sport del percorso viene dal percorso e non
cambia lo sport scelto; «Paddle» sulla scheda è il nome dello sport come
lo scrive il suo bottone, uguale in ogni lingua, quindi nessun testo nuovo
nelle tabelle.

**Limiti noti**:

- «Meanwhile, from the feed», i disegni che «Explore» mostra mentre
  disegna una città (TASK-163), prende gli stessi 19: fra i cinque che
  mostra può essercene uno sull'acqua. Lì una scheda non si apre.
- Senza API configurata (`apiUrl` nullo) un post sull'acqua, toccato, dice
  «The route could not load», come uno della corsa: `useExplored` rinuncia
  prima di chiedere. L'app pubblicata l'API ce l'ha sempre.
- Se `paddleExamples.json` viene rifatto senza uno dei quattro luoghi o
  una delle quattro forme, quel post sparisce da «Feed» e
  `paddlePosts.test.ts` fallisce.

**Testi da confermare con l'utente**: i quattro titoli (in inglese, come
quelli della corsa) e i tempi.

**Visto nel simulatore** (2026-10-05, Expo Go dal worktree, un dispositivo
a parte): i quattro post con la mappa del lago o del mare sotto la linea,
la riga «Paddle · …», la testa di cane a pezzi. Per la foto i post erano
in cima all'elenco, solo in locale. Il tocco non è stato provato sul
dispositivo (senza tocchi): lo coprono i test dell'app. Le due schermate
sono in `out/task228-feed/`, fuori dal repository.

**Merge**: PR #322, `de9512b` (2026-10-05 04:00Z), CI 5/5 verde, solo i 13
file elencati sopra.

## Note per il deploy

- Solo l'app: esce con la prossima pubblicazione, che fa il coordinatore.
  Niente server: i quattro percorsi sono dentro l'app.
- Da provare sull'iPhone: i quattro post in «Feed» con la mappa del lago o
  del mare sotto la linea, e il tocco che apre il percorso.

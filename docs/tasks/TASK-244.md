# TASK-244 — «Move the shape» anche sugli esempi di «Explore» con «Paddle»

**Stato**: In revisione (PR #360; il merge aspetta il «merge 360» del coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-244-explore-move`
**Dipende da**: TASK-238 (spostare la figura sull'acqua, ADR-0202),
TASK-227 e TASK-233 (gli esempi sull'acqua di «Explore»)

## Obiettivo

Chi apre un esempio di «Explore» con «Paddle» può **spostare la figura**
come fa in «Draw»: «Move the shape», un dito la trascina, il motore la
mette nel posto più vicino in cui ci sta. Chiesto dall'utente il
2026-10-05, appena chiuso TASK-238: «rendi spostabili anche gli esempi di
Explore» (era il punto 9 di `TASK-238.md`).

## Scelte dell'utente (2026-10-05)

- **Il percorso spostato resta di «Explore»**: la scheda sotto la mappa è
  ancora quella dell'esempio, con «Start», «Move the shape» per spostarlo
  ancora, «Export GPX», il cuore dei preferiti e «Back to the list».
  Proposta anche: farlo diventare il percorso di «Draw».

## Contesto da leggere

- `docs/tasks/TASK-238.md` (parte B) e `docs/DECISIONS.md` ADR-0202, con
  l'aggiunta di questo task in fondo
- `docs/UI.md` «Sull'acqua: «Paddle»»: «Move the shape» e «Explore»
- `apps/mobile/src/explore/exampleRoutes.ts`, `explored.ts`,
  `ExploredCard.tsx`
- `apps/mobile/src/paddle/shapeMove.ts`, `useMoveShape.ts` (TASK-238)
- `services/api/shaperoute_api/paddle_examples.py`

## Il punto

Niente di nuovo nel motore né nell'API: `near` e `centre` ci sono da
TASK-238. Agli esempi mancavano due cose che un percorso di «Draw» ha già:
**dov'è la forma** (`centre`) e **com'era stata chiesta** (la richiesta, con
la partenza del luogo e non quella del percorso sulla riva).

## Cosa fare

1. **`centre` negli esempi**. `paddle_examples.py` lo scrive nei 32 esempi
   di `paddleExamples.json` (ridisegnati sull'acqua del server: deve
   cambiare solo `centre`). L'app lo tiene per gli esempi chiesti al server
   (`asRecommended`), anche nel file del telefono.
2. **La richiesta dell'esempio**. L'app ricorda come ha chiesto ogni
   esempio pronto (`exampleRequest`): forma, penna alzata come sull'acqua,
   distanza, attività e **la partenza del luogo**. Con quella partenza
   l'API rilegge lo stesso file dell'acqua (ADR-0202, punto 5).
3. **«Move the shape» nella scheda** di un esempio aperto da «Explore»
   (`ExploredCard.tsx`), con i testi e il modo sulla mappa di TASK-238.
4. **Al rilascio** `POST /route-jobs` con la richiesta dell'esempio più
   `near` (`useMoveExample.ts`). La risposta prende il posto dell'esempio
   sulla mappa; la lista tiene l'esempio com'era.

## Criteri di accettazione

- [x] I 32 esempi dentro l'app, ridisegnati sull'acqua del server, sono
      identici punto per punto: in più hanno solo `centre`; l'impronta del
      motore (`engine`) è la stessa.
- [x] Un esempio chiesto al server tiene il `centre` della risposta, anche
      nel file del telefono (`exampleRoutes.test.ts`).
- [x] Con un esempio sull'acqua aperto da «Explore», «Move the shape» fa
      trascinare la figura; al rilascio l'app chiede forma, distanza,
      `paddling` e la partenza del luogo, con `near`
      (`__tests__/AppExploreMove.test.tsx`).
- [x] Il percorso spostato resta nella scheda di «Explore», con «Start»,
      e si può spostare ancora; tornando alla lista e riaprendo la scheda
      c'è l'esempio com'era.
- [x] Mentre il motore lavora la figura resta dove il dito l'ha lasciata e
      la scheda non offre «Start» né il GPX; se la figura non ci stava, o
      se la richiesta fallisce, una riga lo dice (e nel secondo caso torna
      il percorso di prima).
- [x] Un esempio senza `centre`, un esempio della corsa, un preferito e un
      disegno del «Feed» non hanno «Move the shape».
- [x] Sull'acqua vera (la copia dei file del server), la richiesta che
      l'app manda per ognuno dei 32 esempi spostato di 150 m ha risposta
      senza scaricare niente, in 0,4–3,7 s.
- [x] Nessun testo nuovo da tradurre.
- [x] Test dell'app e dello script verdi.
- [ ] Visto con un dito vero sull'iPhone (dopo la pubblicazione, che è del
      coordinatore).

## File toccati

```
services/api/shaperoute_api/paddle_examples.py
services/api/tests/test_paddle_examples.py
apps/mobile/src/paddle/paddleExamples.json            (solo le 32 righe `centre`)
apps/mobile/src/paddle/paddleExamples.test.ts
apps/mobile/src/paddle/useMoveExample.ts              (nuovo, con il test)
apps/mobile/src/explore/exampleRoutes.ts              (con il test)
apps/mobile/src/explore/explored.ts                   (con il test)
apps/mobile/src/explore/ExploredCard.tsx              (con il test)
apps/mobile/App.tsx
apps/mobile/__tests__/AppExploreMove.test.tsx         (nuovo)
docs/UI.md
docs/DECISIONS.md                                     (aggiunta in fondo ad ADR-0202)
docs/STATUS.md
docs/tasks/TASK-244.md                                (nuovo)
```

## I testi

Nessuno nuovo. La scheda usa quelli di TASK-238, già confermati e già
nelle cinque lingue («Move the shape», il pannello con «Cancel», «The
shape does not fit there: this is the nearest place.»). Durante l'attesa
dice la frase di «Draw», «Drawing a 2 km heart…», in inglese come il resto
della scheda di «Explore»; se la richiesta fallisce, le parole che le
schede di «Explore» usano già sull'acqua.

## Fuori scope

- **I preferiti**: l'utente ha chiesto gli esempi di «Explore». Un
  preferito non ha `centre` né la richiesta da cui è nato.
- **I disegni sull'acqua del «Feed»** (TASK-228): sono gli stessi esempi,
  ma aperti dal «Feed» non si spostano.
- **Gli esempi della corsa**: su strada `near` è rifiutato (ADR-0202,
  punto 4).
- Motore, API, server, `draw_examples`, `engine.zip`: non cambiano.
- Ridisegnare da soli gli esempi tenuti sul telefono senza `centre`: vedi
  «Note per chi prosegue».

## Note per chi prosegue

- **Un esempio tenuto sul telefono prima di questo task non ha `centre`**
  (i laghi già aperti in «Explore»): non mostra «Move the shape» finché
  non è ridisegnato, cioè finché il lago non esce dagli otto luoghi tenuti
  e viene richiesto. Non lo si ridisegna apposta: senza rete l'esempio
  tenuto sparirebbe. Se serve, è un seguito (ridisegnarlo solo con la rete,
  tenendo il vecchio finché il nuovo non arriva).
- **Il percorso spostato non si tiene**: vive finché la scheda è aperta
  (anche durante la corsa e al ritorno da «Finish»). Il cuore dei preferiti
  lo salva come ogni percorso di «Explore».
- **`paddleExamples.json`** si rifà con `python -m
  shaperoute_api.paddle_examples --cache-dir <dir>` sui file dell'acqua del
  2026-10-04 copiati dal server (una copia è sul Mac in
  `out/task227-paddle/cache`): 29 s. TASK-232 A e TASK-243, se cambiano il
  motore, lo rigenerano da `main`: `centre` esce da solo.
- **La partenza della richiesta** è quella del luogo (`city.point`), non
  `points[0]`: con un'altra partenza l'area dell'acqua cambia e il server
  potrebbe doverla scaricare da Overpass.

## Emerso

- **Provato con il motore sull'acqua del server** (non con l'API accesa né
  nel simulatore: la mappa e il dito sono quelli di TASK-238, non
  toccati): i 32 esempi chiesti con la partenza del luogo e `near` 150 m a
  est del loro `centre` hanno tutti risposta, in 0,4–3,7 s, con la forma a
  20–112 m da dove è stata lasciata (oltre gli 80 m la scheda lo dice).
- **Un caso del motore, non di questo task**: chiesto con `near` uguale al
  suo `centre`, la testa di coniglio del Lago di Garda esce 20 m più in là
  (172 punti invece di 173), anche con il centro non arrotondato; gli
  altri 31 escono identici. Il criterio di TASK-238 («`near` uguale al
  `centre` dà lo stesso percorso») quindi non vale sempre sull'acqua vera:
  entro i 30 m che non costano (`NEAR_FREE_M`) il motore può scegliere un
  altro posto. L'app non manda mai uno spostamento nullo (sotto 8 px il
  dito non sposta niente), quindi non si vede; detto al coordinatore.

## Esito

*(alla chiusura)*

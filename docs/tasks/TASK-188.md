# TASK-188 — Un tocco su un disegno di «Feed» apre il suo percorso

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-188-feed-open-route`

Chiesto dall'utente il 2026-10-02 («Dai la possibilità, quando sono in
feed di poter cliccare sull'attività delle persone inventate e mettere nei
preferiti o fare inizia percorso»); numeri assegnati dal coordinatore
(ADR-0151).

## Obiettivo

In «Feed» un tocco su un disegno d'esempio apre il suo percorso sulla
mappa, come un percorso di «Explore»: lì si mette nei preferiti con il
cuore, si corre con «Start», si esporta il GPX. «←» torna a «Feed».

## Contesto da leggere

- `docs/UI.md` «Le pagine: «Feed», «Draw», «Explore»» e «Favorites»
- `docs/DECISIONS.md` ADR-0127 (il feed d'esempio), ADR-0098 (i percorsi
  consigliati), ADR-0139 (i preferiti)

## Cosa fare

1. La scheda di un disegno (`FeedPost`) diventa un pulsante quando chi la
   mostra le dice cosa aprire; in «Explore», fra i disegni mostrati mentre
   una città si disegna (TASK-163), resta com'è.
2. Il disegno come percorso di «Explore» (`feedRoute.ts`): ciò che la
   scheda sulla mappa mostra mentre il percorso arriva intero, e come lo si
   chiede all'API. L'`id` del disegno è la posizione del percorso nel file
   della sua città quando il feed è stato scritto, e il catalogo da allora
   è cresciuto: se sotto quell'`id` oggi c'è un altro percorso, o nessuno,
   il percorso si ritrova fra quelli che partono dove parte il disegno
   (stessa città, stessa forma, stessa lunghezza).
3. `useExplored.open` accetta un modo diverso di chiedere il percorso
   intero; senza, resta com'era.
4. `App.tsx`: il tocco apre il percorso sulla mappa, e «←» (e «Back to the
   list») torna alla pagina da cui si è partiti.
5. Documenti: `UI.md`, `STATUS.md`, ADR-0151.

## Criteri di accettazione

- [x] Un tocco su un disegno di «Feed» apre la mappa con il suo percorso e
      la scheda di «Explore»: km, forma, città, «Start», «Export GPX».
- [x] Il cuore in alto a destra mette quel percorso nei preferiti (senza
      account apre «Profile», come per ogni altro percorso).
- [x] «Start» chiede le indicazioni e fa partire la corsa lungo il percorso.
- [x] «←» e «Back to the list» tornano a «Feed»; da un percorso di
      «Explore» tornano ancora a «Explore».
- [x] Tutti e quindici i disegni trovano il loro percorso nel catalogo di
      oggi, anche quello il cui `id` è cambiato (la farfalla di Roma).
- [x] Un disegno il cui percorso non è più nel catalogo non apre un altro
      percorso al suo posto: «The route could not load.»
- [x] Test, lint, typecheck e prettier verdi.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/src/feed/feedRoute.ts
apps/mobile/src/feed/feedRoute.test.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/src/explore/explored.ts
apps/mobile/src/explore/explored.test.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-188.md
```

## Fuori scope

- Like, commenti, il profilo di chi ha corso: sono del feed vero
  (TASK-118).
- Cuore e «Start» direttamente sulla scheda del feed, senza passare dalla
  mappa: si può aggiungere dopo, se l'utente lo vuole.
- I disegni del feed mostrati in «Explore» mentre una città si disegna
  (TASK-163): restano da guardare.
- Rifare il feed d'esempio sul catalogo nuovo (seguito di TASK-161): gli
  `id` vecchi funzionano comunque.
- `ExploredCard`: il pulsante dice «Back to the list» anche venendo dal
  feed.
- Pubblicare su `preview`: con l'ok dell'utente, da `main` pulito.

## Dove sono arrivato (2026-10-02)

Codice e test fatti e committati sul branch. Provato in un simulatore, con
un'API propria e un database usa e getta: un tocco sul disegno apre il
percorso sulla mappa; «←» torna a «Feed»; il cuore senza account apre
«Profile», con un account salva il preferito (PUT 201, cuore pieno);
«Start» chiede le indicazioni e parte la corsa. Uno swipe verso destra
sopra una scheda la apriva come un tocco («Feed» è la prima pagina, niente
scorre e nessuno toglie il tocco): la scheda ora ignora un dito che si è
mosso più di 12 punti. Lo stesso vale probabilmente per le schede di
«Explore», ultima pagina, con uno swipe verso sinistra: da guardare, fuori
da questo task.

**Manca**: `UI.md` (la riga «Le schede non si toccano» di «Feed» e «←» da
un percorso del feed), ADR-0151 in `DECISIONS.md`, la voce in `STATUS.md`,
l'esito qui; rifare test, lint, typecheck e prettier interi; la PR, la coda
dei merge del coordinatore. Non provato nel simulatore: la farfalla di Roma
(l'`id` cambiato; coperto dai test e da un controllo sul catalogo: tutti e
quindici i disegni trovano il loro percorso) e «Back to the list».

## Esito


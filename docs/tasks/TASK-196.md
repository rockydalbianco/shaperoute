# TASK-196 — Uno swipe che finisce sopra una scheda di «Explore» non la apre

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-196-explore-swipe-tap`

Seguito di TASK-188 (ADR-0151, «Le schede di «Explore», ultima pagina,
hanno probabilmente lo stesso difetto dello swipe verso sinistra: da
guardare in un task suo»); numero assegnato dal coordinatore.

## Obiettivo

In «Explore» uno swipe orizzontale che finisce con il dito sopra la scheda
di un percorso non la apre: la apre solo un tocco.

## Contesto da leggere

- `docs/UI.md` «Le pagine: «Feed», «Draw», «Explore»» e il punto
  «Explore» della pagina principale (le schede di TASK-167)
- `docs/DECISIONS.md` ADR-0151, «Uno swipe non è un tocco»
- `apps/mobile/src/feed/FeedPost.tsx`: come l'ha risolto TASK-188

## Cosa fare

1. La soluzione di TASK-188 è scritta dentro `FeedPost.tsx` e non è
   esportata: non si può riusare senza toccare quel file, che non è di
   questo task. Va riscritta uguale in un file nuovo,
   `useTapNotSwipe.ts`: la scheda ricorda dove il dito è sceso
   (`onPressIn`) e, quando si alza (`onPress`), ignora un dito che si è
   mosso più di 12 punti (`TAP_SLOP`, lo stesso valore di «Feed»).
2. `RouteCard` usa `useTapNotSwipe` quando è un pulsante (`onPress`).
3. Un test dello stesso tipo di quello di `FeedPost.test.tsx`.
4. Documenti: `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] Uno swipe che finisce sopra una scheda di «Explore» non la apre
      (test: dito sceso e alzato a 120 punti di distanza, e a 13).
- [x] Un tocco la apre ancora, anche con un dito che trema (test: 7 punti).
- [x] Uno swipe non lascia traccia: il tocco dopo apre la scheda.
- [x] Nessun file della pagina «Explore» né di «Feed» è cambiato.
- [x] Test, lint, typecheck e prettier verdi.

## File toccati

```
apps/mobile/src/explore/useTapNotSwipe.ts
apps/mobile/src/explore/RouteCard.tsx
apps/mobile/src/explore/RouteCard.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-196.md
```

## Fuori scope

- `FeedPost.tsx` tiene la sua copia della stessa logica: farle usare
  `useTapNotSwipe` è un task piccolo, da fare quando nessuno lavora su
  «Feed».
- Gli altri pulsanti di «Explore» non sono `RouteCard` e restano com'erano:
  le voci delle città (`Chip` in `ExploreTools.tsx`, dentro una riga che
  scorre di lato e prende lei il dito), i suggerimenti della ricerca, «Ask
  for a route» e i pulsanti di `AskForRoute`, «Try again» degli esempi.
  Sono piccoli, e uno swipe che ci finisce sopra è raro; se sul telefono il
  difetto si vede anche lì, è un task sopra questo, che tocca
  `ExploreTools.tsx`, `ExploreScreen.tsx`, `CityExamples.tsx` e
  `AskForRoute.tsx` (oggi di TASK-192).
- I disegni di «Feed» mostrati mentre una città si disegna (`WhileDrawing`)
  non sono pulsanti: niente da correggere.
- `ThemedCard` ed `ExploredCard` stanno sulla mappa, a tutto schermo, dove
  lo swipe fra le pagine non c'è.
- Pubblicare su `preview`: con l'ok dell'utente, da `main` pulito.

## Esito

Fatto (2026-10-02). `RouteCard` ignora un dito che si è mosso più di 12
punti fra quando scende e quando si alza: la stessa soluzione di TASK-188
(ADR-0151), nessuna decisione nuova. Essendo nella scheda, vale ovunque
c'è una `RouteCard` da toccare: i percorsi di «Best near you»
(`ExploreScreen`), gli esempi pronti di una città (`CityExamples`) e i
preferiti in «Profile» (`FavoritesList`). Il test nuovo fallisce senza la
correzione e passa con lei; 1047 test dell'app verdi. **Non provato con
un dito**: né su un telefono né in un simulatore; il difetto su «Explore»
è quello descritto in ADR-0151 per «Feed», e la correzione è coperta solo
dal test. **Da provare con il dito sull'iPhone** dopo la prossima
pubblicazione su `preview`: uno swipe verso sinistra sopra una scheda di
«Explore» non deve aprirla, un tocco sì. Rimandato, e scritto in «Fuori
scope»: `FeedPost` che usa lo stesso file, e i pulsanti piccoli di
«Explore».

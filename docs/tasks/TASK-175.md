# TASK-175 — La mappa senza i pulsanti dello zoom

**Stato**: In revisione
**Fase**: 4 · **Branch**: `chore/TASK-175-no-zoom-buttons`

Chiesto dall'utente il 2026-10-02 («Quando visualizzo un'anteprima, togli
la possibilità di zumare in alto a destra, più o meno, si potrà zumare
solamente con il touch»); numeri assegnati dal coordinatore (ADR-0143).

## Obiettivo

Sulla mappa non ci sono più i due pulsanti «+» e «−» in alto a destra: la
mappa si ingrandisce e si rimpicciolisce solo con le dita.

## Contesto da leggere

- `docs/UI.md` «La mappa» (schermata 2) e «Il cuore sulla mappa»
- `docs/DECISIONS.md` ADR-0139 (il cuore dei preferiti, TASK-171)

## Cosa fare

1. Togliere il `NavigationControl` di MapLibre dalla pagina della mappa
   (`mapPage.ts`). I gesti restano quelli di MapLibre: due dita per lo
   zoom, un dito per spostare.
2. Il cuore dei preferiti stava sotto i pulsanti: sale nell'angolo, alla
   stessa altezza di «←» (`FavoriteHeart.tsx`).
3. Un controllo nei test della pagina: i pulsanti non ci sono e lo zoom
   con le dita non è spento.
4. Documenti: `UI.md`, `STATUS.md`, ADR-0143.

## Criteri di accettazione

- [x] La pagina della mappa non ha controlli in alto a destra.
- [x] Lo zoom con due dita funziona come prima (la pagina non lo spegne).
- [x] Il cuore dei preferiti è alla stessa altezza di «←», sotto la tacca
      su ogni telefono.
- [x] L'attribuzione dei dati resta visibile in basso, per intero.
- [x] Test, lint, typecheck e prettier verdi.

## File toccati

```
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/favorites/FavoriteHeart.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-175.md
```

## Fuori scope

- Le mappe del Feed (`feedMapPage.ts`): sono immagini, i pulsanti non li
  hanno mai avuti.
- La rotazione della mappa con due dita e lo zoom con il doppio tocco:
  restano come sono, sono gesti del touch.
- La lavagna del contorno (`OutlineBoard`): non è una mappa e non ha
  pulsanti di zoom, solo «Fit».
- Pubblicare su `preview`: con l'ok dell'utente, da `main` pulito.

## Esito

Fatto (2026-10-02). La pagina della mappa non crea più il controllo dello
zoom; il cuore dei preferiti è nell'angolo in alto a destra, di fronte a
«←». Guardata la pagina in un browser largo come un telefono: nessun
controllo in alto a destra, l'attribuzione in basso. Non guardato su un
telefono: si vede dopo la prossima pubblicazione su `preview`.

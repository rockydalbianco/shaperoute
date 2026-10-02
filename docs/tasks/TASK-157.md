# TASK-157 — «Ask for a route» in fondo a «Explore», quasi nascosto

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-157-ask-at-the-foot`

Chiesto dall'utente il 2026-10-02: «Ask for a route mettilo sotto alle
figure preimpostate delle varie zone, lo mettiamo in fondo, quasi
nascosto».

## Obiettivo

In «Explore» si vedono prima le figure già pronte della zona; «Ask for a
route» sta in fondo alla pagina, chiuso, e si apre con un tocco.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», punto 3 («Explore»)
- `apps/mobile/src/explore/ExploreScreen.tsx`, `AskForRoute.tsx`

## Cosa fare

1. `ExploreScreen.tsx`: «Ask for a route» dopo gli esempi della città e
   dopo l'elenco, dietro una riga discreta che lo apre.
2. Aperto, la pagina scorre fino a lui.
3. Test; `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] All'apertura di «Explore» le categorie di «Ask for a route» non si
      vedono: in fondo c'è solo la riga «Ask for a route».
- [x] La riga viene dopo l'elenco dei percorsi, e dopo i messaggi quando
      l'elenco è vuoto o non arriva.
- [x] Un tocco apre «Ask for a route» nello stesso punto; una categoria
      chiede il percorso come prima.
- [x] `AskForRoute.tsx` e i suoi test non cambiano.
- [x] Colori dai token; testi in inglese; test, lint, typecheck e prettier
      verdi.
- [ ] Prova sull'iPhone.

## File toccati

```
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-157.md
```

## Fuori scope

- Il ridisegno di «Explore» del canvas (schede grandi, filtri in una riga).
- Cambiare «Ask for a route» dentro: categorie, campo, pulsante.

## Esito

Fatto (2026-10-02). «Ask for a route» è l'ultima cosa della pagina: una
riga grigia e sottolineata sotto esempi e percorsi consigliati; toccata, si
apre lì e la pagina scorre fino a lei. 3 test nuovi, 730 test dell'app
verdi, lint, typecheck e prettier puliti. Visto su un simulatore con Expo
Go, senza API. **Da provare sull'iPhone**, con l'app ripubblicata.

Nessun ADR: è una posizione chiesta dall'utente, non una scelta tecnica.

# TASK-151 — «Explore»: A · B · C anche sugli esempi di una città

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-151-explore-choices`

Chiesto dall'utente il 2026-10-02: «in Explore seleziono New York e un
cuore da 5,2 km: una volta che ci premo sopra non ci sono le tre opzioni».
Numero e ADR-0126 dal coordinatore.

## Obiettivo

Un esempio di città aperto da «Explore» (TASK-143) mostra le tessere
«A · B · C» come un percorso disegnato (TASK-093), e mappa, «Start» e
«Export GPX» sono del percorso scelto.

## Contesto da leggere

- `docs/UI.md`, «Le due schermate», punto 3 («Explore») e «Il risultato»
- `docs/DECISIONS.md`, ADR-0087 (più percorsi), ADR-0116 (esempi),
  ADR-0117 («Start» in «Explore»)
- `apps/mobile/src/explore/exampleRoutes.ts`, `explored.ts`,
  `ExploredCard.tsx`; `apps/mobile/src/route/RouteTiles.tsx`

## Cosa fare

1. `exampleRoutes.ts`: un esempio tiene le `alternatives` che l'API manda
   già, in memoria e nel file sul telefono; un esempio salvato prima, senza
   il campo, si ridisegna.
2. `explored.ts`: un percorso aperto ha `choices`, `chosen` e `choose`;
   `route`, `detail`, `request` e `result` sono quelli del percorso scelto,
   così `App.tsx` non cambia.
3. `ExploredCard.tsx`: le tessere di `RouteTiles`, sopra «Start».
4. Test: gli esempi, l'hook, la scheda, e l'app intera dal tocco su «New
   York» a «Start» sul percorso B.

## Criteri di accettazione

- [x] Un esempio disegnato con un'API che manda alternative si apre con le
      tessere «A · B · C»; A è selezionata.
- [x] Toccata B: la scheda dice i suoi km e la sua somiglianza, la mappa
      mostra la sua linea, «Start» chiede le indicazioni dei suoi punti.
- [x] Un percorso del catalogo, o un esempio senza alternative, non ha
      tessere: come prima.
- [x] Un esempio salvato sul telefono prima di questo task si ridisegna, e
      la volta dopo è lì con le alternative, senza chiedere niente.
- [x] `App.tsx` non è toccato.
- [x] Test, lint, tipi e formato dell'app verdi.

## File toccati

```
apps/mobile/src/explore/exampleRoutes.ts
apps/mobile/src/explore/exampleRoutes.test.ts
apps/mobile/src/explore/explored.ts
apps/mobile/src/explore/explored.test.ts
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/explore/ExploredCard.test.tsx        (nuovo)
apps/mobile/src/explore/ExploreStart.test.tsx        (solo l'oggetto di prova)
apps/mobile/__tests__/AppExploreChoices.test.tsx     (nuovo)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-151.md
```

## Fuori scope

- **Gli altri percorsi in grigio sulla mappa**, come per un percorso
  disegnato: la riga è in `App.tsx` (`others=`), che è di TASK-149,
  TASK-115 e TASK-132. Seguito, quando `App.tsx` è libero.
- **Il segnale «percorso scelto fra A · B · C»** (TASK-142) per gli esempi:
  anche quello parte da `App.tsx`.
- **Alternative per i percorsi del catalogo**: il catalogo tiene un
  percorso solo (ADR-0097); servirebbe rifare il seme (`seed_catalog.py`).
- **Alternative per i percorsi a tema** («Ask for a route»): l'API ne
  manda uno.
- «Start» in «Explore»: c'è già da TASK-145, e l'app pubblicata il
  2026-10-02 alle 00:04 (commit `8b5e3c2`) lo contiene.

## Esito

Fatto. A New York (API del Mac, zona in cache) il cuore da 5 km arriva con
tre percorsi, 5,2 · 5,1 · 4,9 km, e così cerchio e stella: ora l'app li
tiene e li fa scegliere. 637 test verdi (10 nuovi), lint, tipi e formato
verdi. **Da provare sull'iPhone**: serve ripubblicare l'app (`eas update`,
a fine coda dei merge). Rimandati, scritti qui sopra: le linee grigie sulla
mappa e il segnale della scelta.

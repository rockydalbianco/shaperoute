# TASK-155 — «Explore»: gli altri percorsi in grigio sulla mappa

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-155-explore-others`

Chiesto dall'utente il 2026-10-02, dopo aver provato TASK-151 sull'iPhone
(«ora funziona, aggiungi le linee grigie sulla mappa»). È il primo seguito
scritto in `TASK-151.md`. Numero dal coordinatore, con il via per
`App.tsx` (solo l'espressione `others=`).

## Obiettivo

Con un esempio di città aperto da «Explore», i percorsi non scelti fra
«A · B · C» sono linee grigie sulla mappa, come per un percorso disegnato
(ADR-0087).

## Contesto da leggere

- `docs/UI.md`, «Il risultato» («Più percorsi fra cui scegliere») e il
  paragrafo «Da TASK-151» di «Explore»
- `apps/mobile/src/explore/explored.ts`; in `apps/mobile/App.tsx` la prop
  `others` di `<MapView>`

## Cosa fare

1. `explored.ts`: un percorso aperto dice anche `others`, le linee dei
   percorsi non scelti.
2. `App.tsx`: la prop `others` della mappa le riceve quando un percorso di
   «Explore» è aperto; durante la corsa e su un percorso a tema, nessuna.
3. Test: l'hook, e l'app intera (le linee grigie cambiano con la tessera,
   spariscono in corsa e tornando all'elenco).

## Criteri di accettazione

- [x] Aperto un esempio con alternative, la mappa riceve le linee degli
      altri percorsi; toccata B, la linea grigia è quella di A.
- [x] Durante la corsa e tornati all'elenco, nessuna linea grigia.
- [x] Un percorso del catalogo o a tema: nessuna linea grigia, come prima.
- [x] Un percorso disegnato: le sue linee grigie come prima.
- [x] In `App.tsx` cambia solo l'espressione di `others`.
- [x] Test, lint, tipi e formato dell'app verdi.

## File toccati

```
apps/mobile/App.tsx                                  (solo `others=`)
apps/mobile/src/explore/explored.ts
apps/mobile/src/explore/explored.test.ts
apps/mobile/src/explore/ExploredCard.test.tsx        (solo l'oggetto di prova)
apps/mobile/src/explore/ExploreStart.test.tsx        (solo l'oggetto di prova)
apps/mobile/__tests__/AppExploreChoices.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-155.md
```

## Fuori scope

- Il segnale «percorso scelto fra A · B · C» (TASK-142) per gli esempi di
  «Explore»: l'altro seguito di TASK-151, non chiesto qui.
- Alternative per i percorsi del catalogo e a tema.
- Nessun ADR: è ADR-0087 esteso a «Explore» (coordinatore).

## Esito

Fatto: sulla mappa di un esempio di «Explore» gli altri percorsi sono
grigi sotto quello scelto, e cambiano con la tessera. 696 test verdi,
lint, tipi e formato verdi. TASK-154 (lo swipe) rifà le condizioni su
`screen` in `App.tsx` e unirà questa espressione. **Da provare
sull'iPhone** dopo la ripubblicazione dell'app.

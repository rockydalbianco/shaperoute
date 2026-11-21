# TASK-474 — I numeri della scheda del Feed a quattro colonne

**Stato**: In revisione (PR #1277) · **Branch**: `fix/TASK-474-feed-card-numbers` · **ADR**: nessuno
(è un difetto) · assegnato dal Coordinatore il 2026-11-12, visto durante TASK-470.

## Il difetto

Nella scheda del Feed di un post con quattro numeri (una corsa con le
calorie: distanza, tempo, passo, kcal), su iOS i valori escono minuscoli,
circa 4 pt, sopra le etichette grandi. Con tre numeri (un giorno di sci) sono
giusti, e nella pagina del post pure.

**Riprodurlo**: al simulatore iOS, Feed «All», un post di corsa con le
calorie (seed in `out/TASK-470/seed.py`, post «Star over the old town»).
Schermate prima e dopo, e le misure (`measure.txt`), in `out/TASK-474/` (fuori dal
repository).

## La causa

`feed/SummaryBoxes.tsx`, così da TASK-410 F (`488d5e61`, 2026-11-08): il
valore si rimpicciolisce per stare nella sua colonna (`adjustsFontSizeToFit`)
e aveva l'altezza di riga fissa di `font.body` (22 pt). Con quattro colonne
larghe 80,34 e 80,66 pt la riga viene alta 39,9999 pt invece di 40: per iOS il
valore non ci sta in altezza e rimpicciolirlo non serve, perché la riga resta
22, quindi lo porta al minimo (misurato: fattore 0,27). Con tre colonne di
110 pt l'altezza è esatta.

## La correzione

- Il valore senza altezza di riga fissa: torna a 15 pt in ogni riga. Al
  posto della riga di 22 pt, 2 pt sopra e sotto la riga di 17,9 pt: la riga
  dei numeri resta alta 40 pt e la scheda a tre colonne non cambia aspetto
  (misurato al simulatore il 2026-11-12: 40 pt a tre colonne, 39,9999 a
  quattro, tutti i valori a 15 pt).
- `minimumFontScale` 0,8: un valore troppo lungo non scende sotto la
  grandezza della sua etichetta (12 pt), poi si taglia.
- Test `feed/SummaryBoxes.test.tsx`: senza la correzione falliscono i due
  sulla causa.

File toccati: `apps/mobile/src/feed/SummaryBoxes.tsx`,
`apps/mobile/src/feed/SummaryBoxes.test.tsx` (nuovo), questo file.

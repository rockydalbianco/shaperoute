# TASK-432 — «Edit the drawing» sui percorsi chiusi che si incrociano

**Stato**: In lavorazione · 2026-11-10 · branch
`fix/TASK-432-edit-closed-crossing`
**Fase**: 5 · **ADR**: precisazione di ADR-0356 (nella PR di soli documenti)
· numero dal Coordinatore («Coordinatore (fork)», 2026-11-10)

## Obiettivo

In «Explore» il pulsante «Edit the drawing» deve esserci su ogni percorso,
anche su quelli che incrociano la propria linea.

## Contesto

Segnalazione dell'utente del 2026-11-10, provando l'OTA di produzione
(gruppo `4eca1d42`, da `88e5f88f`): «non mi lascia modificare il disegno in
explore».

Causa, dal codice di `main` (`59517c4d`): la scheda mostra il pulsante solo
se la linea del percorso fa un disegno (`cardTrack` in `App.tsx`, cioè
`drawingOf(trackInPlace(points))` non nullo). Un percorso che torna alla
partenza diventa un solo contorno chiuso. Se si incrocia da solo (parole,
farfalle, smiley, la maggior parte delle figure complesse), `outlineOf` non
ne fa un contorno: niente disegno, niente pulsante. TASK-428 aveva già
risolto lo stesso caso, ma solo per le tracce che finiscono lontano dalla
partenza.

Misura sul catalogo (`catalog/seed` e `catalog/muw_routes`, 575 percorsi):
334 senza pulsante. Il numero è lo stesso su `main`, sull'OTA `88e5f88f` e
prima di TASK-425 (`cfa6afe6`): non è una regressione di TASK-425, il
problema c'è da TASK-369.

## Cosa cambia

- `trackInPlace` (`apps/mobile/src/route/figureLines.ts`): anche un
  percorso chiuso che non fa un contorno diventa l'anello di TASK-428
  (ADR-0356): un anellino alla partenza più un dettaglio che percorre la
  linea e finisce sul suo primo punto, corso una volta. Prima questo valeva
  solo per le tracce che finiscono lontano dalla partenza.
- Quello che l'utente vede sulla mappa di «Draw on the map» cambia come in
  TASK-428, già approvato dall'utente: la linea intera con l'anellino alla
  partenza. Nessuna domanda nuova (Coordinatore, 2026-11-10).
- I percorsi chiusi che facevano già un contorno restano come prima.

## Misura

575 percorsi del catalogo:

- prima: 241 con il pulsante, 334 senza;
- dopo: 575 con il pulsante (264 come contorno, 311 come anello);
- distanza chiesta per gli anelli: 0,91–1,00 volte il percorso (mediana
  0,97), mai andata e ritorno. Sotto 1 per la semplificazione della linea,
  come per ogni linea disegnata.

Dopo il merge di `main` (`50a9fa4a`, quarto giro di TASK-419) il catalogo
ha 597 percorsi: il pulsante c'è su tutti.

La #1078 (correzione di TASK-410, «Edit & run» del Feed) aveva la stessa
modifica a `figureLines.ts`, ma con una guardia che lasciava fuori 23
percorsi (552 su 575): la sessione del Feed l'ha tolta dalla sua PR e i
suoi test passano con questa versione (Coordinatore, 2026-11-10).

## File toccati

- `apps/mobile/src/route/figureLines.ts`
- `apps/mobile/src/route/figureLines.test.ts`
- `apps/mobile/src/route/exploreCatalogEdit.test.ts` (nuovo)
- `docs/tasks/TASK-432.md`

PR di soli documenti, dopo il merge: `docs/STATUS.md`, `docs/DECISIONS.md`
(precisazione di ADR-0356), `docs/INDEX.md`, `docs/archive/COMPLETATI.md` e
questo file.

## Criteri di accettazione

- [x] Un percorso chiuso che si incrocia fa un disegno: anello alla partenza
      corso una volta (test «bowtie»; fallisce sul codice di `main`).
- [x] Ogni percorso del catalogo ha un disegno da modificare e non chiede
      più del percorso stesso (`exploreCatalogEdit.test.ts`, 597 su 597;
      fallisce sul codice di `main`).
- [x] I test di TASK-425 e TASK-428 restano verdi.
- [x] Test toccati, `tsc`, lint e Prettier verdi in locale.

## Dopo il merge

- OTA: esce con il prossimo OTA di produzione (Coordinatore).

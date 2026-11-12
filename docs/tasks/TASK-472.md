# TASK-472 — La scheda dei numeri ripiegata durante la registrazione

**Stato**: Done (2026-11-12) — #1262 in `main` (10a50ba0); schermate al
simulatore approvate dall'utente; esce con l'aggiornamento completo dell'app
**Fase**: 5 · **Branch**: `feat/TASK-472-run-card-fold`

## Obiettivo

Durante la registrazione, sulla pagina «Map», la scheda dei numeri sotto la
mappa si trascina in giù per vedere meglio la mappa.

Chiesto dall'utente il 2026-11-12. Scelta dell'utente (domanda con tre
proposte): **si abbassa a striscia**. Trascinata in giù, la scheda resta una
striscia sottile con distanza · passo · tempo su una riga e il tasto
«Pause»; la mappa prende il resto. Trascinata in su, o toccata, torna
intera.

## Comportamento

- Solo su «Map», solo durante la corsa: dal primo fix in poi, GPS acceso,
  corsa non arrivata e non in pausa. «Compass» e «Data» non cambiano.
- In cima alla scheda aperta c'è una maniglia: toccata, piega la scheda.
- Una trascinata verticale di almeno 32 pt (`FOLD_M`), più verticale che
  laterale, piega (in giù) o apre (in su). Una trascinata laterale resta lo
  swipe fra le pagine (TASK-422).
- Toccare la striscia o la sua maniglia riapre la scheda.
- «Pause» sulla striscia mette in pausa: in pausa la scheda è sempre intera,
  con «Stop» e «Resume». Ripartiti, la scheda torna piegata com'era.
- La mappa cresce da sola: sta in `MapScreen` con `flex: 1` sopra la scheda.
- Testi nuovi (etichette di accessibilità): «Show the numbers», «Hide the
  numbers», in it, de, es, fr.

## File toccati

- `apps/mobile/src/screens/RunFoldedStrip.tsx` (nuovo)
- `apps/mobile/src/screens/RunFoldedStrip.test.tsx` (nuovo)
- `apps/mobile/src/screens/RunDashboard.tsx` (turno chiesto al Coordinatore;
  nessun branch aperto lo toccava il 2026-11-12)
- `apps/mobile/src/i18n/{it,de,es,fr}.ts` (solo due chiavi)
- `docs/tasks/TASK-472.md`

## Criteri di accettazione

- [x] Su «Map», correndo, la scheda si piega a striscia con i tre numeri e
      «Pause», e si riapre (test `RunFoldedStrip.test.tsx`).
- [x] «Pause» dalla striscia mette in pausa e mostra la scheda intera.
- [x] «Compass», «Data», prima del primo fix e in pausa: niente maniglia.
- [x] Lo swipe laterale fra le pagine funziona come prima
      (`RunDashboard.test.tsx` verde).
- [x] Schermate al simulatore, scheda aperta e piegata, al turno del
      Coordinatore (`out/TASK-472/`): trascinata giù e su, maniglia e
      «Pause» dalla striscia provati; «Sì, vai» dell'utente il 2026-11-12.

## Esito

Fatto. Resta solo l'uscita con l'aggiornamento completo (OTA del
Coordinatore) e uno sguardo sul telefono durante una corsa vera.

## Dopo il merge

PR di soli documenti: la riga in `docs/UI.md` (pagina «Map» della corsa) e
le righe di `STATUS.md`/`COMPLETATI.md`. Esce con l'aggiornamento completo
(OTA del Coordinatore).

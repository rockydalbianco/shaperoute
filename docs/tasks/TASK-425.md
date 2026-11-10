# TASK-425 — «Edit the drawing» non raddoppia la distanza delle tracce aperte

**Stato**: Done · 2026-11-10 · codice nella #1021 (`acbd59e8`), documenti
nella PR di `docs/TASK-425-done`. Esito: la traccia aperta si chiude fino
alla partenza; quelle che si incrociano da sole restano doppie (motore
proposto a parte). Resta l'OTA unico del Coordinatore.
**Fase**: 5 · **ADR**: ADR-0353 · numeri dal Coordinatore («Coordinatore
(fork)», 2026-11-10)

## Obiettivo

Con «Edit the drawing», una traccia che finisce lontano dalla partenza
(corsa libera, attività importata, disegno di un altro utente, «Edit & run»
del Feed) non deve più chiedere il doppio della distanza.

## Contesto

Segnalazione di un amico dell'utente del 2026-11-10: «quando modifichi una
figura e provi a ridisegnarla ti viene il doppio della distanza come se ci
passasse sopra due volte».

Causa, dal codice di `main` (`17a64e68`): `trackInPlace`
(`apps/mobile/src/route/figureLines.ts`, TASK-369) lasciava aperta una
traccia che finisce a più di `CLOSED_SHARE` (15%) della sua grandezza dalla
partenza: un anellino alla partenza e tutta la linea come **dettaglio**. I
dettagli si contano e si corrono andata e ritorno (`travelledLength`), quindi
4.000 m di traccia diventavano 8.029 m. Le tracce chiuse non avevano il
problema. I percorsi di «Draw» tornano sempre alla partenza, quindi sotto
A, B e C non succedeva.

## Scelta dell'utente

Proposta: «una traccia aperta viene chiusa con una linea dritta dalla fine
alla partenza: la distanza diventa circa la traccia più il pezzo per
tornare, e sulla mappa vedi la figura chiusa». Risposta dell'utente
(2026-11-10): **«Sì, chiudile»**.

## Cosa cambia

- `trackInPlace` chiude anche la traccia che finisce lontano, con un lato
  dritto fino al primo punto.
- Solo se così chiusa non fa un disegno (`drawingOf` nullo, per esempio
  quando la traccia si incrocia da sola o il lato di ritorno la attraversa),
  resta aperta come prima: il tasto continua a funzionare.

## Misura su tracce vere

62 percorsi di `samples/`, tagliati al 50% e al 75% dei punti come una corsa
fermata prima: 124 tracce aperte.

- 46 si chiudono: distanza chiesta 0,9–1,0 volte la traccia più il ritorno
  (in 8 casi meno, perché `outlineOf` tiene l'anello più grande e taglia i
  pezzi che si incrociano, come già per le tracce chiuse).
- 76 restano aperte come prima (1,4–1,9 volte la traccia più il ritorno):
  si incrociano da sole, e il motore prende solo contorni che non si
  incrociano.
- 2 non danno nessun disegno, come prima.

Per togliere il doppio anche lì serve il motore: una linea aperta corsa una
volta sola e un ritorno per la strada più breve. È un task a parte, che non
rientra in questo.

## File toccati

- `apps/mobile/src/route/figureLines.ts`
- `apps/mobile/src/route/figureLines.test.ts`
- `docs/tasks/TASK-425.md`

PR di soli documenti, dopo il merge: `docs/DECISIONS.md` (ADR-0353 e la sua
riga d'indice), `docs/INDEX.md`, `docs/archive/COMPLETATI.md`, `docs/UI.md`
(«Edit the drawing: la figura sulla mappa») e questo file.

## Criteri di accettazione

- [x] Una traccia aperta che chiusa fa un disegno chiede la traccia più il
      ritorno, non il doppio (test «steps» e «zigzag»).
- [x] Una traccia chiusa chiede quello che chiedeva (test «square»).
- [x] Una traccia che chiusa non fa un disegno resta aperta e il tasto
      funziona (test `LINE`).
- [x] Test toccati, `tsc`, lint e Prettier verdi in locale.

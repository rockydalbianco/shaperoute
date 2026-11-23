# TASK-428 — «Edit the drawing»: la traccia aperta che si incrocia si corre una volta

**Stato**: Done · 2026-11-10 · #1040 in `main` (1e830b6f), documenti nella
PR di `docs/TASK-428-docs`
**Fase**: 5 · **ADR**: ADR-0356 · numeri dal Coordinatore («Coordinatore
(fork)», 2026-11-10)

## Obiettivo

Seguito di TASK-425. Con «Edit the drawing», una traccia che finisce lontano
dalla partenza e che, chiusa con un lato dritto, non fa un contorno (si
incrocia da sola, o il lato di ritorno la attraversa) non deve più chiedere
la traccia andata e ritorno.

## Contesto

Dopo TASK-425 queste tracce restavano aperte: un anellino alla partenza e la
linea come dettaglio, corsa andata e ritorno (1,4–1,8 volte la traccia più
il ritorno). Sono circa il 60% delle tracce aperte vere.

Il motore e l'API sanno già fare quello che serve, senza cambiamenti:

- un dettaglio (`stroke`) che finisce sul **proprio primo punto** è un
  anello e si corre **una volta sola** (`_loop_start` in
  `shapes/outline.py`; `travelledLength` e `travelledPoints` nell'app);
- le richieste di un disegno (`outline_of` in
  `services/api/shaperoute_api/images.py`) passano da
  `parse_outline(..., allow_crossings=True)`: un dettaglio può incrociare se
  stesso e il contorno.

## Scelta dell'utente

Proposta (2026-11-10): «la traccia si manda come anello che torna alla
partenza con un lato dritto: si corre una volta, poi si torna verso la
partenza; sulla mappa la figura si vede chiusa da quel lato, come le tracce
che TASK-425 chiude; solo app, niente motore». Alternativa scartata: ritorno
disegnato a parte sulla strada più breve, che chiede il motore. Risposta
dell'utente: **«Sì, fallo così»**.

## Cosa cambia

- `trackInPlace` (`apps/mobile/src/route/figureLines.ts`): quando la traccia
  chiusa non fa un disegno, la manda come anellino alla partenza più un
  dettaglio = la linea (semplificata come una prima linea disegnata,
  `firstLineOf`) e un ultimo lato fino al suo primo punto. Se nemmeno così fa
  un disegno, resta aperta come prima.
- L'anello si costruisce dalla linea aperta e non passando la traccia chiusa
  a `firstLineOf`: quella proverebbe `outlineOf`, che di una linea che si
  incrocia tiene l'anello più grande e taglia il resto (7 tracce su 124
  perdevano fino a un terzo della figura).

## Misura

Stesse 124 tracce aperte di TASK-425 per metodo (1 GPX ogni 8 di
`samples/`, tagliato al 50% e al 75% dei punti):

- 45 si chiudono come con TASK-425, invariate;
- 79 diventano anello: distanza chiesta 0,76–0,99 volte la traccia più il
  ritorno dritto (mediana 0,97; prima 1,43–1,79, mediana 1,60). Sotto 1
  perché la semplificazione toglie gli speroni andata e ritorno della corsa,
  come per ogni linea disegnata;
- dopo `framed`, `outline_of` dell'API le accetta tutte 79 e il motore corre
  l'anello una volta (`Outline.path()` lungo quanto il dettaglio).

Tre percorsi veri a Trento, dalla cache delle strade, con `plan_request`
come l'API e `placement="anchored"`:

| Traccia       | Traccia + ritorno | Chiesti | Percorso | Somiglianza |
| ------------- | ----------------- | ------- | -------- | ----------- |
| gatto, 75%    | 6,8 + 0,5 km      | 7,0 km  | 7,6 km   | 0,97        |
| farfalla, 75% | 9,8 + 1,3 km      | 10,7 km | 10,5 km  | 1,00        |
| cuore, 50%    | 15,2 + 3,0 km     | 17,0 km | 19,3 km  | 1,00        |

Prima gli stessi tre chiedevano 13, 19 e 28 km circa.

## File toccati

- `apps/mobile/src/route/figureLines.ts`
- `apps/mobile/src/route/figureLines.test.ts`
- `docs/tasks/TASK-428.md`

Nella PR di soli documenti dopo il merge: `STATUS.md`, `DECISIONS.md`
(ADR-0356), `INDEX.md`, e in `docs/UI.md` la frase «Una traccia che finisce
lontano dalla partenza resta una linea aperta» (già superata da TASK-425).

## Criteri di accettazione

- [x] Una traccia aperta che si incrocia (o il cui lato di ritorno la
      attraversa) chiede la traccia più il ritorno, non il doppio (test
      «crosses itself» e `LINE`).
- [x] Il dettaglio parte dalla partenza della traccia e finisce sul suo
      primo punto.
- [x] Le tracce che TASK-425 chiude, e quelle chiuse, chiedono quello che
      chiedevano (test di TASK-425 invariati).
- [x] Test toccati, `tsc`, lint e Prettier verdi in locale.

## Esito

In `main` con la #1040: le 79 tracce aperte vere che correvano andata e
ritorno diventano un anello alla partenza, corso una volta (mediana 0,97
volte traccia più ritorno, prima 1,60).

## Dopo il merge

- OTA: esce con il prossimo OTA di produzione, dopo il passo server 2
  (Coordinatore, 2026-11-10).

# TASK-015 — Ottimizzatore iterativo e metrica di somiglianza

**Stato**: Done
**Fase**: 1 · **Branch**: `feat/TASK-015-iterative-optimizer`

## Obiettivo

`python -m route_engine --shape heart --distance 5000 --start ... --out ...`
non disegna più la forma a scala e rotazione fisse. Cerca rotazione, punto
di ingresso e scala dove le strade seguono il contorno, ritraccia finché
forma e distanza vanno bene, e dice quanto il risultato somiglia alla forma.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §3 (scala iniziale) e §5 (ottimizzazione)
- `docs/MAPS.md` (tutto: area, cache, regole per Overpass, misure)
- `docs/DECISIONS.md` ADR-0020, ADR-0022
- `docs/TESTING.md`, paragrafi "Non deterministico, va isolato" e "Fixture"

## L'idea

Il limite rimasto dopo TASK-017 non è l'aggancio ma **dove cade la forma**:
a scala e rotazione iniziali il contorno passa su campi, fiumi e ferrovie,
e nessun aggancio lo recupera. Invece di fissare la forma e poi cercare le
strade, si adatta la forma alle strade:

1. si parte dalla forma iniziale;
2. si prova a ruotarla (e a cambiare il punto in cui la partenza entra
   nella forma) e si **conta quanta parte del contorno ha una strada
   vicina**: costa poco, perché non calcola percorsi;
3. si traccia il percorso solo per le rotazioni migliori;
4. si corregge la scala in base alla distanza reale e si ritraccia;
5. si ripete finché forma e distanza vanno bene, o finché il budget di
   tentativi è finito: allora si restituisce il migliore, con un warning.

## Cosa fare

1. **Area e grafo: fermarsi e chiedere** (decisione nuova, va in
   `DECISIONS.md`). Ruotando attorno alla partenza, l'area cambia a ogni
   tentativo. Proposta:
   - l'area è un **quadrato attorno alla partenza**, di semilato = massima
     distanza della forma dalla partenza (su tutte le fasi provate) × scala
     massima + 500 m. Per 15 km circa 11 km di lato (≈ 130 km²), contro i
     30 km² di oggi; per 5 km circa 30 km²;
   - **un grafo per zona**: se in cache c'è già un grafo `foot` che
     contiene l'area richiesta, lo si ritaglia invece di scaricare, e il
     ritaglio si salva in cache col suo nome. Scaricando per primo il caso
     più grande (circle 15 km), servono 3 download in tutto, uno per zona,
     uno alla volta (`MAPS.md`);
   - ogni tracciamento lavora sul ritaglio attorno alla forma candidata
     (`area_around`), non sul grafo di zona intero: stessi risultati di
     TASK-017, tempi da TASK-017.
2. **Metrica di somiglianza** in `metrics.py`, valori in [0, 1], con le
   distanze normalizzate sulla dimensione della forma (perimetro / 2π).
   Candidate, come chiede §5, più quella nata in TASK-017:
   - **copertura** (da `tests/measure_snapping.py`, che poi la importa);
   - **Hausdorff** simmetrica;
   - **Fréchet discreta**, su entrambe le curve ricampionate a 128 punti.

   Si confrontano con il giudizio a occhio sui campioni di questo task e si
   tiene quella che ci va d'accordo; la scelta va in `DECISIONS.md`.
3. **Conteggio delle strade** (`optimizer.py`): per ogni rotazione (24
   valori, ogni 15°) e fase (0; 0,25; 0,5; 0,75), la quota del contorno
   che ha una strada entro la fascia di TASK-017 (2% del perimetro). Si
   campionano le strade una volta sola; nessun routing.
4. **Tracciamento** con `snap_to_network` così com'è, solo per le 3
   combinazioni con il conteggio migliore.
5. **Correzione della scala**: `scala ← scala × target / distanza reale`,
   dentro [0,4; 1,1] × la scala iniziale. Il limite basso è sotto il −40%
   di §5 perché TASK-017 ha misurato percorsi fino a 3,7× il target. Al
   massimo 4 correzioni per combinazione.
6. **Rifinitura**: con la scala assestata si rifà il conteggio a ±15°
   attorno alla rotazione migliore, di 5° in 5°, e si ritraccia la
   migliore.
7. **Scelta e arresto**: costo di §5,
   `w_forma · (1 − somiglianza) + w_dist · |reale − target| / target`,
   con `w_forma` > `w_dist` (valori iniziali 2 e 1). Ci si ferma quando la
   distanza è entro **±10%** e la somiglianza sopra una soglia da tarare,
   oppure dopo **20 tracciamenti**. Se non converge: il migliore trovato e
   un warning che dice cosa manca (forma o distanza).
8. **`RouteResult` completo** con `similarity`, restituito da una funzione
   del route-engine (non dalla CLI).
9. **CLI**: stampa rotazione, fase, scala, numero di tracciamenti,
   somiglianza, distanza reale e target, warning. `--no-optimize` rifà il
   comportamento di TASK-017 (per i confronti).
10. **Test** deterministici, su grafi sintetici come `tests/test_network.py`:
    - il conteggio sceglie la rotazione verso le strade (rete solo a est
      della partenza → il cerchio finisce a est);
    - la correzione della scala porta la distanza entro ±10% su una griglia
      dove il percorso è più lungo della forma;
    - il budget di tracciamenti è rispettato;
    - senza convergenza torna il migliore, con il warning;
    - le metriche: una forma con sé stessa dà 1, forme palesemente diverse
      danno un valore basso (`TESTING.md`);
    - il ritaglio da un grafo di zona in cache non scarica nulla.
11. **Misure**: `tests/measure_snapping.py` (o uno script accanto) misura i
    12 casi con e senza ottimizzatore: distanza, copertura, somiglianza,
    tracciamenti, tempo.
12. **Campioni**: i 12 casi, `TASK-015_*_v1.gpx`, guardati in gpx.studio e
    annotati in `samples/LOG.md` con somiglianza, distanza reale / target e
    giudizio.
13. **Documentazione**: `ROUTE_ENGINE.md` §5 descrive l'algoritmo vero;
    `MAPS.md` l'area per zona e il ritaglio; `DECISIONS.md` area e
    metrica; `STATUS.md`.

## Criteri di accettazione

Rivisti con l'utente durante il task: la Valsugana è sospesa (forme non
disponibili dove la rete è troppo rada), il limite di tempo sale a 40 s.
Stato finale sui campioni `TASK-015_*_v3` (numeri in `MAPS.md`).

- [x] Distanza su strada entro **±10%** del target: **8/8** casi di Trento e
      Levico (in origine: 10 casi su 12, Valsugana compresa).
- [x] Copertura del contorno almeno **80%**: **8/8** (minimo 87%).
- [x] Giudizio a occhio `sì` o `quasi`: **8/8** (Trento `sì`, con il cuore
      da 5 km migliore nella v2; Levico `quasi`), in `samples/LOG.md`.
- [ ] Sul cuore da 5 km a Levico non ci sono rientri verso l'interno
      visibili a occhio: **in parte**. La punta c'è, ma i lobi restano
      irregolari; migliorarli è lavoro di snapping.
- [x] Ogni caso gira offline dalla cache in meno di **40 s** (limite alzato
      dall'utente da 30 s): 7–32 s.
- [x] `--no-optimize` riproduce le distanze di TASK-017, tranne dove la
      punta del cuore era uno sperone potato (Valsugana 5 km, ADR-0025).
- [x] La metrica e l'area per zona sono in `DECISIONS.md` (ADR-0023,
      ADR-0025).
- [x] `pytest -m "not network"` verde e offline; `ruff` e `black` puliti.
- [x] `ROUTE_ENGINE.md` §4 e §5, `MAPS.md` e `docs/STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/metrics.py
services/route-engine/route_engine/network.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_optimizer.py
services/route-engine/tests/test_metrics.py
services/route-engine/tests/measure_snapping.py
services/route-engine/tests/measure_optimizer.py
services/route-engine/route_engine/geo.py
services/route-engine/tests/test_export_gpx.py
services/route-engine/tests/test_network.py
samples/TASK-015_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/DECISIONS.md
docs/TESTING.md
docs/STATUS.md
```

## Fuori scope

- Cambiare lo snapping di TASK-017 (zone, corridoio, fascia): qui si usa
  com'è. Se serve cambiarlo, si segnala. *Fatto un'eccezione, chiesta
  dall'utente: la potatura non toglie più lo sperone verso la punta del
  cuore (ADR-0025).*
- Validazione di percorribilità e misura della ripercorrenza (TASK-016).
- Ottimizzatori di libreria (scipy, scikit-optimize) o dipendenze nuove:
  griglia e rifinitura bastano, come dice §5.
- Download in parallelo o più di un tentativo per grafo (`MAPS.md`).
- Forme nuove, attività diverse dalla corsa, API e app (fase 2).

## Esito

La CLI ruota, scala e sposta (fino a 500 m) la forma finché le strade la
seguono: a Trento e Milano cuori e cerchi alla distanza giusta, a Levico
quasi; in Valsugana alcune forme sono dichiarate non disponibili invece di
dare un percorso brutto. Somiglianza = copertura nei due sensi meno le
punte mancate (ADR-0025). Restano per altri task:
- le punte di andata e ritorno su strade parallele (snapping);
- la scelta fra più percorsi alternativi (app, fase 2);
- dichiarare `numpy` fra le dipendenze.

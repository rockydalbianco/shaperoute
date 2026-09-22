# MAPS — Dati cartografici e routing

Come il route-engine ottiene la rete stradale e ci aggancia la forma.
Scritto con TASK-014; le scelte di fondo stanno in ADR-0008 e ADR-0020.

## Sorgente

- **OpenStreetMap** via **OSMnx 2.1** (ADR-0008), che interroga Overpass
  (`overpass-api.de`). Unica dipendenza runtime del route-engine: niente
  scikit-learn né scipy, il nodo più vicino si calcola in metri con
  `geo.py`.
- Rete **`walk`**: tutto ciò che si percorre a piedi. Per la corsa va bene
  così finché non emergono sentieri impraticabili; filtri dedicati sono
  fuori da questo documento finché non servono.
- Overpass a volte non risponde (timeout visti durante TASK-014): si
  rilancia il comando, il grafo già scaricato non si riscarica.

## Cache

- Il grafo si scarica una volta e si salva in `data/cache/` come GraphML
  (ignorato da git). Da lì la CLI gira **offline**.
- Nome del file: `walk_<sud>_<ovest>_<nord>_<est>.graphml`, con il
  rettangolo arrotondato verso l'esterno a 1e-4° (≈ 10 m), così la stessa
  richiesta trova sempre lo stesso file.
- Dimensioni tipiche: 1–20 MB per grafo. I 12 grafi di TASK-014 occupano
  78 MB.
- I dati OSM cambiano: un campione è riproducibile solo con lo stesso
  grafo. Per rifare un confronto pulito, si tiene la cache.

## Area scaricata

Il rettangolo della forma teorica proiettata, più **500 m per lato**
(`AREA_MARGIN_M`). Non il raggio pari alla distanza target: per 15 km
sarebbero circa 700 km², quasi tutti inutili.

## Dal disegno alla strada

1. Per ogni punto della forma, il **nodo più vicino** in metri.
2. Nodi uguali consecutivi eliminati.
3. Percorso più breve fra nodi consecutivi, con peso moltiplicato per
   **2.0** sugli archi già usati (`EDGE_REUSE_PENALTY`).
4. **Potatura degli speroni**: ogni A → B → A diventa A, finché ce ne
   sono. Se non resta un anello, si tiene il percorso non potato.
5. I punti del GPX seguono la geometria vera delle strade, non la corda fra
   due incroci.

Parametri: `--reuse-penalty` dalla CLI; margine e soglia sono costanti in
`route_engine/network.py`.

## Warning

- **Rete rada**: distanza media punto-forma → nodo sopra **150 m**
  (`SPARSE_THRESHOLD_M`).
- **Partenza lontana dalla strada**: il nodo di partenza è a più di 150 m
  dal punto dell'utente.

In TASK-014 il warning è comparso solo in `valsugana` a 15 km, a 151 m e
158 m: appena sopra la soglia.

## Cosa si è misurato in TASK-014

Sui 12 campioni (heart/circle, 5 e 15 km, tre zone), con forma a scala
iniziale, rotazione 0, fase 0:

| | Distanza su strada / target |
|---|---|
| Snapping + routing (penalità 2.0) | 3,3× – 7,0× |
| Penalità 2.0 contro nessuna penalità | 0–3% in più, nessun ritorno evitato a occhio (cuore 5 km, Trento e Levico) |
| + potatura degli speroni | 2,2× – 3,8× (−19/−53% di km), archi ripercorsi −43/−90% |

Il residuo non viene da andate e ritorno ma da **deviazioni per
raggiungere waypoint oltre un ostacolo** (fiume, ferrovia, aree chiuse) e
dall'agganciare 64 waypoint fitti ai nodi invece che al contorno. Si
affronta in TASK-017, prima dell'ottimizzatore.

## Fixture di test

`services/route-engine/tests/fixtures/levico_walk_1km.graphml`: 1 km²
attorno a Levico, 303 nodi, 347 KB, scaricato il **2026-09-22**. Si
rigenera con `python tests/fixtures/make_fixtures.py` (serve la rete) e si
aggiorna questa data.

## Ancora aperto

- Provider di tiles per la mappa dell'app (fase 2).
- Motore di routing di produzione: ADR-0009.
- Attribuzione OpenStreetMap (ODbL) dove i percorsi vengono mostrati:
  da definire con l'app.

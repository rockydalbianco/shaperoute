# TASK-076 — Il cuore meno sensibile alla partenza: più partenze vicine, si tiene la migliore

**Stato**: In revisione (PR #93; merge del coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-076-nearby-starts`

## Obiettivo

Il motore prova la forma anche da alcuni nodi della rete vicini alla
partenza (entro circa 100 m) e tiene il percorso migliore; il percorso
comincia e finisce comunque dalla posizione dell'utente, con il breve tratto
di avvicinamento incluso nel percorso, nei km e nel GPX. Tempo entro
PRODUCT.md (≤ 30 s) dove oggi ci sta.

Scelta dell'utente dopo TASK-075: 25–100 m di partenza portano la
somiglianza del cuore da 10 km di Caldonazzo da 0,73 a 0,92.

## Contesto da leggere

- `docs/tasks/TASK-075.md` (Esito e giudizio)
- `docs/ROUTE_ENGINE.md` §5 («Trova dove la forma ci sta»)

## Cosa fare

1. Un modulo nuovo del motore, `route_engine/nearby_starts.py`, che chiama
   il motore senza modificare `optimizer.py` (di TASK-071).
2. Un'opzione della CLI per provarlo (`--nearby N`).
3. Misure prima/dopo: il cuore da 10 km a Caldonazzo e casi di riferimento
   a Trento e Milano da 10 e 15 km; campioni `samples/TASK-076_*`, righe in
   `samples/LOG.md`, pagina di giudizio sì / quasi / no.
4. Il collegamento all'API dopo il merge di TASK-073: fatto in
   `images.py` (`plan_request`), con il via del coordinatore; `app.py` no
   (TASK-081).
5. Dagli screenshot dell'utente del 2026-09-26 (Caldonazzo, 7–11 km, in
   `out/`): cosa spiega la differenza con «ieri», e quanto aiutano le
   partenze vicine.

## Criteri di accettazione

- [x] Il modulo sceglie le partenze vicine, pianifica in parallelo, tiene
      la migliore e aggiunge l'avvicinamento (andata e ritorno); test
      deterministici.
- [x] Percorso scelto da una partenza vicina: primo e ultimo punto sul nodo
      della partenza dell'utente, avvicinamento nei metri e nel GPX.
- [x] Tempi prima/dopo misurati sui casi di riferimento e scritti qui e in
      ADR-0071.
- [x] Campioni, righe in `samples/LOG.md` e pagina di giudizio.
- [x] `optimizer.py`, `network.py`, `words.py`, `shapes/` non toccati;
      dell'API solo `plan_request` in `images.py` e il suo test.
- [x] Scelta del cuore secondo la decisione dell'utente («vince il cuore
      migliore», anche spostato): Trento 15 km torna al `sì`.

## File toccati

```
services/route-engine/route_engine/nearby_starts.py      (nuovo)
services/route-engine/tests/test_nearby_starts.py        (nuovo)
services/route-engine/route_engine/__main__.py           (--nearby)
services/route-engine/tests/test_cli.py                  (test di --nearby)
docs/tasks/TASK-076.md
docs/ROUTE_ENGINE.md
docs/STATUS.md            (righe di TASK-076)
docs/DECISIONS.md         (ADR-0071)
samples/TASK-076_*
samples/LOG.md            (righe di TASK-076)
services/api/shaperoute_api/images.py   (plan_request: plan_nearby)
services/api/tests/test_images.py       (il suo test)
```

## Fuori scope

- `optimizer.py` (TASK-071), anche dove un interruttore aiuterebbe (vedi
  Esito, «Per dopo»).
- `words.py`, `letters.json`, `network.py`, `image_outline.py`, `shapes/`.
- `apps/mobile`, `packages/shared-types`.
- Zone nuove: le misure usano solo zone già in cache.

## Esito

**Fatto, anche nell'API.** `nearby_starts.plan_nearby` prova la forma
dalla partenza e da 3 nodi vicini in parallelo e tiene il cuore migliore,
con l'avvicinamento quando vince una vicina (ADR-0071). L'API lo usa per
forme e parole (`plan_request`); dalla CLI `--nearby 3`.

### Come funziona, in breve

- Partenze vicine: 3 nodi a 25–100 m, uno per settore di 120°, al più
  150 m lungo le strade.
- La partenza dell'utente fa il piano di sempre, nel processo che la
  chiede; ogni vicina ha un processo e fa solo la ricerca da quel nodo, sul
  grafo della partenza (niente anelli né ricerca a 2 km).
- Si aspetta al più 8 s dopo la partenza dell'utente, mai oltre 25 s, e
  nessuno se il suo percorso è già buono. Niente vicine su grafi oltre
  30 000 nodi (Milano) né più processi di quanti ne entrano in memoria.
- Vince il cuore migliore fra tutti, anche quello che la ricerca sposta
  («Start here»), come ha scelto l'utente; la distanza conta solo oltre il
  10%. Fra quelli entro 0,01 dal migliore vince il più vicino all'utente.

### Numeri

Tempi e somiglianze in ADR-0071. In sintesi: Caldonazzo 10 km, nessuna
vicina batte la partenza (0,86), +3 s; Trento 10 km 0,86 → 0,88, +5–10 s;
Trento 15 km resta il cuore spostato di 1 km (0,90), +5–30 s; Milano non
cambia. Con poca memoria libera (sotto ~1,5 GB, come nell'ultima serie di
misure) le vicine non partono e tutto resta come oggi.

### Campioni e giudizio

`samples/TASK-076_heart_{10km_caldonazzo,10km_trento,15km_trento}_{start,nearby}_v1.gpx`
e `TASK-076_heart_10km_milano_start_v1.gpx`, righe in `samples/LOG.md`.
Pagina: https://claude.ai/artifact/FsvjRQC2wokCjUG9UChJv4

Giudizio dell'utente (2026-09-26), e scelta con la regola finale:

| Caso | Dalla partenza | Dalla vicina | Scelto dal motore |
|---|---|---|---|
| Caldonazzo 10 km | sì (0,86) | quasi (0,82) | partenza |
| Trento 10 km | sì (0,86) | sì (0,88) | vicina, pari all'occhio |
| Trento 15 km | sì (0,90, spostata di 1 km) | quasi (0,88) | partenza spostata |
| Milano 10 km | sì (0,99) | — | partenza |

La prima regola pesava lo spostamento come la ricerca e a Trento 15 km
sceglieva la vicina `quasi`. L'utente ha deciso: «A, cuore migliore»
(ADR-0071). Ora la scelta coincide con il giudizio in tutti e quattro i
casi; i GPX non cambiano.

### Caldonazzo: gli screenshot del 2026-09-26 e «ieri»

Cinque screenshot dell'app (08:31–08:43, in `out/`, non nel repository):
cuori da 7, 8, 10 e 11 km, quasi tutti con la partenza spostata di 250 m o
di 1 km verso nord, lobi poco leggibili.

- **Stessa API, stesso motore.** Il testo diverso delle 08:42 («start
  moved 250 m north-east…», minuscolo) non viene da un'altra API: l'app
  traduce il messaggio del motore con `(\w+)` in
  `apps/mobile/src/route/warnings.ts:37`, che non prende le direzioni con
  il trattino, e lo mostra così com'è. Con «north» la traduzione funziona.
  Diventa TASK-082.
- **Nessuna partenza degli screenshot coincide con Via della Villa**: da
  lì 7 km fa 6,3 km (6,8 nell'app), 11 km fa 11,8 km spostato di 1 km
  (10,7 nell'app). L'API non tiene le richieste, quindi la posizione esatta
  non si ricostruisce: il GPS del telefono l'ha messa ogni volta in un
  punto un po' diverso.
- **Quanto conta la posizione**: su 81 punti entro ±100 m da Via della
  Villa (passo 25 m), il cuore da 10 km va da 0,73 a 0,98. In 48 la
  partenza resta (0,73–0,88), in 21 viene spostata di 250 m (0,75–0,94),
  in 12 di 1 km (0,90–0,98). Il profilo dello screenshot delle 08:43
  (9,4 km, 250 m a nord, 187 m in galleria) esce per esempio da
  un punto 75 m a sud e 50 m a ovest.
- **Cosa spiega «ieri»**: il motore di ieri e di oggi è lo stesso punto
  per punto (TASK-075); cambiano la posizione del GPS e la distanza
  chiesta. Stamattina i cuori erano per lo più quelli spostati di 250 m,
  che qui valgono 0,75–0,85: la metà bassa della mappa.
- **Con le partenze vicine** (25 punti, passo 50 m, regola finale): media
  0,834 → 0,847, minimo 0,73 → 0,77, cuori sotto 0,80 da 7 a 4. I cuori da
  0,90 in su restano 7, tutti dalla partenza spostata di 1 km: le vicine
  tolgono i casi peggiori, non ne creano di migliori.

### Per dopo

- **TASK-082** (coordinatore): le direzioni col trattino nei messaggi della
  partenza spostata (`warnings.ts`).
- **`optimizer.py`** (dopo TASK-071): un interruttore in `plan_shape` per
  la sola ricerca dalla partenza toglierebbe la copia dei suoi ultimi passi
  in `ShapeJob.here`; e la partenza dell'utente fa ancora la ricerca a 2 km
  anche quando la sua è già disegnabile, metà del suo tempo sul cuore.
- **Memoria**: sul PC dell'API (7 GB) le vicine partono solo con ~1,5 GB
  liberi; con l'app Claude e altri agenti aperti spesso non ci sono.
- **Log delle richieste**: l'API scrive posizione e distanza solo sulla
  console; un log su file avrebbe permesso di rifare esattamente i cuori
  degli screenshot.

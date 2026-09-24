# TASK-041 — Percorso aperto: la parola senza ritorno alla partenza

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-041-open-route` (parte da
`feat/TASK-040-word-single-stroke`)

## Obiettivo

Una scritta si può correre a sola andata: il percorso parte dall'inizio
della parola e finisce dove la parola finisce, e tutta la distanza va alla
parola. Dalla CLI, confrontando «CIAO» aperto con «CIAO» chiuso.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0042 (scritte), ADR-0039 (tratti ripassati)
- `docs/ROUTE_ENGINE.md` §2 («Una linea sola, senza contorno»)
- `services/route-engine/route_engine/optimizer.py` (`search`,
  `plan_shape`), `network.py` (`snap_to_network`), `__main__.py`

## Scelte dell'utente (2026-09-24)

- Proposto dall'utente durante TASK-040: nelle scritte si può ripassare la
  stessa strada e non serve tornare alla partenza; l'utente sceglie.
- **Solo motore e CLI**: le parole non sono ancora nell'app, dove ci sono
  solo forme chiuse. Contratto, API e interruttore nell'app arrivano con
  le parole nell'app.

## Cosa c'è già

Il giro chiuso regge tutto il motore: la fase sposta la partenza lungo la
forma, l'instradamento torna al primo nodo, `check_closed` lo verifica, la
somiglianza chiude la forma. Il GPX e `RouteResult` non lo richiedono.

## Cosa fare

Proposto dall'agente:

1. **Formato**: un `path` può essere aperto (l'ultimo punto diverso dal
   primo): è una forma **a sola andata**. Il motore la legge come andata e
   ritorno sulla stessa linea, una linea chiusa come quelle di oggi.
2. **Pianificazione**: una forma a sola andata si pianifica con il motore
   dei giri chiusi, al doppio della distanza e con la sola fase 0 (la
   partenza è l'inizio della parola). Le percentuali (distanza, somiglianza)
   non cambiano col doppio; i messaggi parlano della distanza chiesta.
3. **Taglio**: del percorso chiuso si tiene l'andata, fino al nodo che
   minimizza la distanza dal fondo della parola più la distanza da metà
   percorso. Il fondo della parola è a metà della linea di andata e
   ritorno. Le misure (ripercorso, scale, gallerie) si fanno sull'andata.
4. **CLI**: nessuna opzione nuova, l'apertura è nel file. `ciao_open.json`
   è «CIAO» scritto da sinistra a destra, senza ritorno.
5. **Campioni** a 15 km a Trento, Levico e Milano
   (`TASK-041_ciao-open_15km_<zona>_v1.gpx`), giudicati accanto a quelli
   chiusi di TASK-040.

## Criteri di accettazione

- [x] Un `path` aperto si legge come andata e ritorno; i `path` chiusi e i
      contorni danno gli stessi punti di prima (test).
- [x] `search` con la sola fase 0 prova solo quella (test).
- [x] Il taglio tiene l'andata fino al fondo della parola, anche quando il
      percorso ci passa prima (la O di «CIAO») (test).
- [x] Un percorso a sola andata non finisce dove comincia, ed è lungo circa
      la distanza chiesta (test su una griglia).
- [x] Campioni a 15 km nelle tre zone e giudizio dell'utente: l'aperto è
      peggio del chiuso.

## File toccati

```
services/route-engine/route_engine/shapes/outline.py
services/route-engine/route_engine/shapes/outlines/ciao_open.json
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/network.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/
samples/TASK-041_*.gpx, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Contratto, API e app (scelta dell'utente).
- Scegliere dove finisce la parola, o partire dalla fine.
- Forme chiuse a sola andata: per una forma chiusa l'andata finisce già
  alla partenza.

## Esito

Un `path` aperto si corre a sola andata, dalla CLI (ADR-0043): Trento
0,96, Levico 0,91, Milano 1,00. L'utente giudica «CIAO» aperto peggio del
chiuso di TASK-040, e chiede lettere più distanziate e una I dritta,
andata e ritorno sulla stessa strada. Da qui TASK-047: la I di Trento
girava 100–250 m a destra del suo asse perché la parola aveva un punto di
passaggio per vertice (67, sopra i 64 del motore), nessuno lungo la I, ed
era ruotata di 15°.

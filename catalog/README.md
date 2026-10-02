# Catalog — I percorsi consigliati

Il seme dei percorsi che la schermata «Explore» propone (TASK-092), prima
che gli utenti ne generino di loro. Decisione in ADR-0097.

## `seed/`

Un file per città, `seed/<città>.json`, prodotto dal motore:

```
python -m route_engine.seed_catalog --run
```

dalla radice del repository, con l'ambiente del motore. Pianifica ogni
forma del catalogo a 5, 10 e 21 km e le frasi di ogni città (13 città
italiane e New York), come l'API, e
tiene quelle con somiglianza da 0,88 in su, tutte. Il registro di ogni
prova sta in `out/seed_catalog/runs.jsonl` (fuori dal repository): un giro
interrotto riparte da dove era; senza `--run` rifà solo la selezione, per
esempio con `--min-similarity 0.9`.

Ogni file:

```json
{
  "city": "trento",
  "centre": [46.067, 11.1215],
  "min_similarity": 0.88,
  "license": "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0: …",
  "routes": [
    {"shape": "heart", "distance_m": 10000, "route_m": 10240,
     "similarity": 0.93, "planned_at": "2026-10-01T10:20:00Z",
     "points": [[46.067012, 11.121498], …]}
  ]
}
```

Una parola (le frasi di `PHRASES`, ADR-0097) ha `"word"` e `"style"`
(`round` o `block`) al posto di `"shape"`.
Solo parole corte (ADR-0130): CIAO e TIAMO nelle città italiane, più AO e
AMOR a Roma, BONA a Firenze, UE a Bari, UELA a Milano; a New York LOVE,
HEY e NYC. Oltre le 4–5 lettere, al tetto dei 21 km, non si leggono.

Distanze in metri, punti `[lat, lon]` WGS84. I percorsi stanno su strade
di OpenStreetMap: chi li pubblica cita «© OpenStreetMap contributors».

Si guardano con `tools/preview_samples.py` dopo averli scritti in GPX, o
incollando i punti in [geojson.io](https://geojson.io).

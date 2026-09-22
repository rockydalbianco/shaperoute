# GPX — Export della traccia

Come il route-engine scrive un percorso su file. Scritto con TASK-013;
le scelte di fondo stanno in ADR-0019.

## Struttura

GPX **1.1**, namespace `http://www.topografix.com/GPX/1/1`.

```
<gpx version="1.1" creator="ShapeRoute route-engine">
  <metadata>
    <name>heart 5 km · 2026-09-22</name>
    <author><name>ShapeRoute route-engine</name></author>
    <time>2026-09-22T18:30:00Z</time>
  </metadata>
  <trk>
    <name>heart 5 km · 2026-09-22</name>
    <trkseg>
      <trkpt lat="46.0122000" lon="11.2986000"/>
      …
    </trkseg>
  </trk>
</gpx>
```

- **Un solo `<trk>` con un solo `<trkseg>`.** Niente `<rte>` né `<wpt>`:
  un track è ciò che i visualizzatori e gli orologi trattano come "percorso
  da seguire" senza ricalcolarlo.
- **Primo e ultimo punto coincidono** e sono il punto di partenza
  dell'utente (ADR-0018): il percorso è un anello.
- **Coordinate con 7 decimali** (≈ 1 cm). Di più è rumore; di meno
  sposterebbe i punti in modo visibile a zoom stradale.
- **Niente quote** (`<ele>`) e niente tempi per punto: non esiste ancora una
  sorgente altimetrica, e un tempo inventato sarebbe un dato falso.

## Metadati

| Campo | Valore |
|---|---|
| `name` (metadata e trk) | `<forma> <distanza in km> km · <data>`, es. `heart 15.5 km · 2026-09-22` |
| `author/name`, `creator` | `ShapeRoute route-engine` — mai il nome di una persona: i campioni sono pubblici (ADR-0015) |
| `time` | istante di generazione, in UTC |

## Dove vive il codice

`services/route-engine/route_engine/export_gpx.py`, solo libreria standard
(`xml.etree.ElementTree`). In fase 1 la CLI del route-engine deve andare da
richiesta a file senza altri servizi; lo spostamento in `services/export/`
(ARCHITECTURE §2) si valuta in fase 2 insieme ai formati wearable.

## Uso dalla CLI

```
python -m route_engine --shape heart --distance 5000 \
    --start 46.0122,11.2986 --out samples/TASK-013_heart_5km_levico_v1.gpx
```

Se il file esiste già la CLI si ferma con un errore: un campione non si
sovrascrive mai (ADR-0014). La nomenclatura dei file in `samples/` è in
`samples/README.md`.

## Non ancora verificato

- Compatibilità con Garmin, Strava, Komoot: si prova quando i percorsi
  seguiranno strade vere (dopo TASK-014). Oggi il GPX contiene la forma
  **teorica**, che passa sopra case, prati e laghi.
- Quote altimetriche: servono in fase 4 (dislivello), sorgente da decidere.

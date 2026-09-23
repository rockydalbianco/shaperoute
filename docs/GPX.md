# GPX — Export della traccia

Come il route-engine scrive un percorso su file. Scritto con TASK-013,
aggiornato con TASK-024 (attribuzione, export dal telefono); le scelte di
fondo stanno in ADR-0019 e ADR-0033.

## Struttura

GPX **1.1**, namespace `http://www.topografix.com/GPX/1/1`.

```
<gpx version="1.1" creator="ShapeRoute route-engine">
  <metadata>
    <name>heart 5 km · 2026-09-22</name>
    <author><name>ShapeRoute route-engine</name></author>
    <copyright author="OpenStreetMap contributors">
      <license>https://opendatacommons.org/licenses/odbl/1-0/</license>
    </copyright>
    <link href="https://www.openstreetmap.org/copyright">
      <text>© OpenStreetMap contributors</text>
    </link>
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
| `copyright` | `author="OpenStreetMap contributors"`, licenza ODbL 1.0 |
| `link` | `https://www.openstreetmap.org/copyright`, testo «© OpenStreetMap contributors» |
| `time` | istante di generazione, in UTC |

L'ordine dei campi in `metadata` è quello voluto da GPX 1.1: `name`,
`author`, `copyright`, `link`, `time`. L'attribuzione c'è dal TASK-024: il
percorso nasce da dati OSM, e la licenza ODbL chiede di dirlo dove il dato
viaggia. I campioni scritti prima non la hanno, e restano come sono
(ADR-0014).

## Dove vive il codice

`services/route-engine/route_engine/export_gpx.py`, solo libreria standard
(`xml.etree.ElementTree`). È l'unico scrittore di GPX: lo usano la CLI e
l'API (`POST /gpx`, `API.md`), quindi il file del telefono e quello della
CLI sono uguali per lo stesso percorso. Niente `services/export/` finché
non arrivano i formati per orologi (ADR-0033).

## Dal telefono

Sotto un percorso disegnato, «Export GPX» (TASK-024):

1. l'app manda a `POST /gpx` la richiesta e il risultato che ha già;
2. l'API risponde il GPX con il nome del file, per esempio
   `shaperoute-heart-5km-2026-09-23.gpx`: senza spazi né caratteri strani,
   che alcune app rifiutano;
3. l'app lo salva nella propria cartella temporanea (`expo-file-system`),
   che il sistema può svuotare;
4. si apre il foglio di condivisione di iOS (`expo-sharing`), con il tipo
   `com.topografix.gpx`: File, AirDrop, Mail, e le app che dicono di aprire
   i GPX.

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

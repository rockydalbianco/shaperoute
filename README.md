# ShapeRoute

Genera percorsi reali che sulla mappa disegnano una forma.
«Un cuore da 15 km partendo da qui» → un percorso percorribile, in GPX.

**Stato**: fase 1, route engine, in sviluppo. Da riga di comando,
`python -m route_engine --shape heart --distance 5000 --start 46.0122,11.2986 --out heart.gpx`
scrive un GPX che segue strade reali di OpenStreetMap. Cosa funziona e
cosa manca: [`docs/STATUS.md`](docs/STATUS.md).

## Da dove si comincia

| Se vuoi… | Apri |
|---|---|
| **installare tutto e partire da zero** | [`docs/SETUP.md`](docs/SETUP.md) |
| capire a che punto siamo | [`docs/STATUS.md`](docs/STATUS.md) |
| capire cosa stiamo costruendo | [`docs/PRODUCT.md`](docs/PRODUCT.md) |
| capire come è fatto | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| sapere cosa viene dopo | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| lavorare a un task | [`docs/tasks/`](docs/tasks/) |
| sapere perché una scelta è stata fatta così | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| capire quale documento leggere | [`docs/INDEX.md`](docs/INDEX.md) |
| vedere i percorsi generati finora | [`samples/`](samples/) |

Chi lavora con un agente di codice legge prima [`CLAUDE.md`](CLAUDE.md).

## Provarlo

Serve Python 3.11 o superiore ([`docs/SETUP.md`](docs/SETUP.md)). In
PowerShell, dalla radice del repository:

```powershell
cd services\route-engine
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cd ..\..
python -m route_engine --shape heart --distance 5000 --start 46.0122,11.2986 --out heart.gpx
```

Il GPX si guarda in un visualizzatore come [gpx.studio](https://gpx.studio).
La prima esecuzione su una zona scarica il grafo stradale da OpenStreetMap
(serve la rete); le successive girano offline dalla cache in `data/cache/`,
relativa alla cartella da cui si lancia il comando: per questo si torna
alla radice. Download e cache sono spiegati in [`docs/MAPS.md`](docs/MAPS.md).

## Il principio

**L'AI interpreta la richiesta, il Route Engine decide il percorso.**
L'AI non produce mai coordinate. Se si togliesse l'AI, il prodotto
funzionerebbe ancora con un form a tendine.

## Stack

React Native + Expo + TypeScript · MapLibre · FastAPI + Pydantic ·
Route engine in Python puro · OpenStreetMap · PostgreSQL + PostGIS (più avanti)

## Come si lavora

Un task, un branch, una Pull Request. Mai su `main`.
Vedi [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md).

## Struttura

```
apps/           mobile, poi web
services/       api · ai · route-engine · export
packages/       shared-types · geometry · config
docs/           documentazione, con tasks/
samples/        GPX generati, versionati e annotati
tools/          script di sviluppo: anteprima dei campioni su mappa
```

Le cartelle si creano quando servono: `apps/` e `packages/` restano vuote
fino alla fase 2.

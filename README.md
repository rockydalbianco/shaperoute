# ShapeRoute

Genera percorsi reali che sulla mappa disegnano una forma.
«Un cuore da 15 km partendo da qui» → un percorso percorribile, in GPX.

**Stato**: fase 0, fondamenta. Nessun codice ancora. Vedi
[`docs/STATUS.md`](docs/STATUS.md).

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
```

Le cartelle si creano quando servono: `apps/` e `packages/` restano vuote
fino alla fase 2.

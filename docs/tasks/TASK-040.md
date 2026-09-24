# TASK-040 — Una parola a tratto singolo: «CIAO»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-040-word-single-stroke` (parte da
`feat/TASK-031-no-shape-no-fit`)

## Obiettivo

Sapere se una parola corta scritta a tratto singolo, come nella Strava art,
si legge sulla mappa: «CIAO» dalla CLI a Trento, Levico e Milano, giudicata
a occhio dall'utente.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0035 (contorni da file), ADR-0038 (forme
  dritte), ADR-0039 (tratti ripassati)
- `services/route-engine/route_engine/shapes/outline.py`
- `samples/README.md`, `docs/TESTING.md` (zone)

## Scelte dell'utente (2026-09-24)

- **Tratto singolo**: si corre sulla linea della lettera, ripassando dove
  serve, non attorno a una lettera piena.
- **Subito una parola corta**, non lettere singole.

## Cosa c'è già

Il contorno in JSON è un anello chiuso che non si incrocia, più tratti
appesi, percorsi andata e ritorno (`strokes`). Una parola a tratto singolo
non ci entra: non ha un anello che la contiene. Il resto del motore lavora
però su una linea chiusa qualunque: i lati ripassati li riconosce dalla
geometria (`twice_drawn`, dal punto medio di ogni lato), le tolleranze si
dimezzano da sole per le forme che ne hanno (ADR-0039) e le forme restano
dritte (ADR-0038), cosa che per una scritta è indispensabile.

## Cosa fare

Proposto dall'agente, registrato in ADR-0042:

1. **Formato**: il JSON accetta `path` al posto di `points` e `strokes`:
   una sola linea chiusa (l'ultimo punto ripete il primo), percorsa così
   com'è. Può tornare su se stessa e toccarsi; non serve che contenga
   un'area. Stessa normalizzazione in `[-1, 1]²` e stesso
   ricampionamento che tiene i vertici (`resample_keeping_vertices`).
   Rifiutati con il motivo: meno di 2 punti distinti, linea aperta, tutti i
   punti coincidenti, `path` insieme a `points` o `strokes`.
2. **«CIAO»** in `shapes/outlines/ciao.json`, disegnato per ShapeRoute:
   lettere maiuscole alte 1, collegate da una linea di base. Si parte dalla
   punta bassa della C, si scrivono C, I, A (con la barra, andata e
   ritorno), O; si torna ripassando la linea di base e le gambe della A,
   così non compare una linea sotto la A che la chiuderebbe a triangolo.
3. **Campioni** a 15 km a Trento, Levico e Milano (`samples/`,
   `TASK-040_ciao_15km_<zona>_v1.gpx`), con una riga in `samples/LOG.md`;
   anteprima con `tools/preview_samples.py`.
4. **Giudizio dell'utente**: la parola si legge? `sì`, `quasi`, `no` per
   zona.

## Criteri di accettazione

- [x] Un `path` valido si legge, si normalizza e si ricampiona; ogni file
      sbagliato è rifiutato con il suo motivo (test).
- [x] I contorni di oggi (`points`, `strokes`) danno gli stessi punti di
      prima (test esistenti verdi).
- [x] `ciao.json` produce un GPX dalla CLI a Trento, Levico e Milano, o il
      rifiuto è registrato in `samples/LOG.md`.
- [x] Giudizio dell'utente registrato per ogni zona: `quasi` in tutte e tre.

## File toccati

```
services/route-engine/route_engine/shapes/outline.py
services/route-engine/route_engine/shapes/outlines/ciao.json
services/route-engine/tests/test_outline.py
samples/TASK-040_*.gpx, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md, docs/ROADMAP.md, docs/STATUS.md
```

## Fuori scope

- Parole nell'app o nell'API: il contratto non cambia, si prova dalla CLI
  (come ADR-0035).
- Un alfabeto intero o un generatore di parole da un font.
- Altre parole, cifre, minuscole: dopo il giudizio su «CIAO».
- Tarare tolleranze o somiglianza per le scritte.
- Un percorso aperto, che non torna alla partenza: proposto dall'utente
  durante il task, è TASK-041 (`ROADMAP.md`, fase 4). Qui la parola resta
  un giro chiuso, e il ritorno ripassa la linea di base e le gambe della A.

## Esito

Il contorno accetta `path`, una linea chiusa percorsa così com'è
(ADR-0042). «CIAO» a 15 km dà un percorso a Trento (0,93), Levico (0,91) e
Milano (1,00); l'utente lo giudica `quasi` in tutte e tre. Il ritorno alla
partenza ripassa circa un quarto della linea (24%): il percorso aperto, proposto
dall'utente durante il task, è TASK-041.

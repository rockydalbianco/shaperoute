# TASK-406 — Le stazioni sciistiche: la ricerca «Ski», la neve, il meteo e la giornata

**Stato**: Proposto · nessun codice prima delle scelte dell'utente e della
lista dei file di ogni parte, approvata dal Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-406-ski-resorts` (documenti); il
codice `feat/TASK-406-a-…`
**Dipende da**: TASK-375 (lo sci «Record only», impianti e piste per nome,
gli estratti OSM del mondo sul server). TASK-375 resta chiuso così com'è.
**ADR**: ADR-0338 (proposto)

## Obiettivo

L'utente il 2026-11-06, testuale:

> «Nella sezione Ski in ricerca ci devono essere tutte le stazioni
> sciistiche da poter selezionare e vedere com'è la neve, eccetera eccetera
> invece nella sezione record, my Day devi poter selezionare il comprensorio
> in cui si è il poter inserire che ci stai usando il modello poter vedere il
> meteo della stazione, selezionata il tipo di neve, numero degli impianti,
> poi bisogna devono registrare anche i chilometri totali. Impianti presi
> copia Slopes.»

Si vuole questo:
- **la ricerca «Ski»**: le stazioni sciistiche di tutto il mondo, da
  scegliere, con com'è la neve e il meteo;
- **«Record your day»**: la stazione dove si è, il modello di sci o
  snowboard, il meteo, il tipo di neve, il numero degli impianti, i km
  totali e gli impianti presi.

**«Copia Slopes»** è una scelta dell'utente. Di Slopes si prendono le
funzioni: gli impianti presi, i km totali, il meteo della stazione. Il nome,
la grafica e i testi di quell'app restano fuori, e le pagine sono nello
stile di MuW.

## Cosa c'è già (TASK-375)

- **La giornata.** «Record your day» per lo sci, e a fine giornata i km
  delle discese, le discese, il dislivello, la velocità massima e media e
  le risalite, con le risalite tratteggiate sulla mappa (parti B e C).
- **I nomi.** Gli impianti e le piste presi, per nome e quante volte. Li
  trova il server confrontando la traccia con OpenStreetMap, e il post li
  mostra (parte D, `runs.ski_names`, migrazione 0048).
- **I dati del mondo.** Gli estratti OSM di tutto il mondo arrivano sul
  server continente per continente (`out/TASK-375/estratti-mondo-continenti.md`).
- **La ricerca.** Filtra per sport, sci compreso, ma non conosce le
  stazioni.

## Da dove vengono i dati

| Cosa | Da dove | Note |
|---|---|---|
| Le stazioni del mondo | OSM: le aree `landuse=winter_sports` con un nome, dagli stessi estratti di TASK-375 | Gratis, licenza ODbL, già citata nell'app. Per ogni stazione si contano impianti e km di piste dai riquadri dello sci. |
| Il meteo della stazione | MET Norway, Locationforecast | Dati aperti CC BY 4.0, anche per un'app commerciale. Open-Meteo gratis vale solo per uso non commerciale. |
| La neve fresca prevista | MET Norway: la precipitazione con temperatura sotto lo zero | È una stima, non un bollettino. |
| Com'è la neve, secondo chi scia | Il tipo di neve segnato dai membri di MuW nella stazione | Vedi la domanda 1. |
| Un bollettino vero (altezza della neve, impianti aperti) | Solo servizi a pagamento, con un contratto | Vedi la domanda 1. |

**MET Norway** (vincoli del Coordinatore, 2026-11-06):
- lo chiama **il server**, mai il telefono, con un User-Agent che
  identifica MuW e un contatto;
- la risposta resta in **cache** sul server fino al suo `Expires`;
- le coordinate sono quelle della **stazione**, con al massimo 4 decimali,
  mai quelle dell'utente;
- l'app mostra l'**attribuzione** («Weather: MET Norway»);
- un contatto o una chiave stanno solo in `.env` e `.env.example`.

## Scelte dell'utente

- 2026-11-06, domanda 1: «Sì, gratis + membri». Com'è la neve si mostra
  con meteo e neve fresca prevista da MET Norway, più il tipo di neve
  segnato dai membri nella stazione nelle ultime 24 ore. Niente bollettino
  a pagamento.

## Domande aperte (una alla volta)

1. **Com'è la neve** — la prima, perché decide il costo.
   **Risposta dell'utente, 2026-11-06: «Sì, gratis + membri».**
   - **Proposta: gratis + membri.** Meteo e neve fresca prevista da MET
     Norway, più il tipo di neve segnato dai membri nella stazione nelle
     ultime 24 ore.
   - **Alternativa: bollettino a pagamento**, con altezza della neve e
     impianti aperti, preso da un fornitore con un contratto.
2. **Il modello**. Proposta: testo libero, «sci o snowboard» più marca e
   modello, ricordato per la volta dopo. L'alternativa è un elenco di
   marche e modelli.
3. **Il tipo di neve**. Proposta: una sola scelta, facoltativa, a fine
   giornata, fra farinosa, battuta, ghiacciata, primaverile e pesante.
4. **La pagina della stazione** nella ricerca «Ski». Proposta: nome,
   numero degli impianti, km di piste, meteo, neve, i post dei membri lì e
   un tasto per seguirla.
5. **I testi** in cinque lingue e la **riga della privacy**: il meteo
   chiesto dal server, il tipo di neve e la stazione visibili a chi vede il
   post.

## Le parti

- **A — le stazioni sul server.** Le aree `landuse=winter_sports`, prese
  dagli estratti come impianti e piste. Si salvano nome, centro, contorno,
  numero degli impianti e km di piste, più un'API che le cerca per nome e
  per vicinanza. La migrazione la assegna il Coordinatore con la lista; la
  prima libera il 2026-11-06 è la 0054.
- **B — il meteo.** Il server chiede MET Norway per la stazione guardata e
  tiene la risposta in cache. La neve fresca si stima dalla precipitazione
  sotto lo zero.
- **C — la ricerca «Ski».** Nell'app, l'elenco delle stazioni (per nome e
  vicine) e la pagina della stazione.
- **D — «Record your day».** La stazione trovata dalla posizione, da
  cambiare con un tocco; il modello, il meteo, il tipo di neve e i km
  totali (discese più risalite). Poi il post che li mostra.
- **E — la prova sulla neve**, insieme a quella di TASK-375.

Ogni parte manda prima al Coordinatore la sua lista dei file.

**Parte A, 2026-11-06.** Le stazioni sono sul server, da OpenSkiData
(sotto, nell'aggiunta ad ADR-0338). Si cercano con `GET /ski-resorts`, per
nome o per vicinanza, e una alla volta con `GET /ski-resorts/{id}`:
`API.md` «Ski resorts», `DATABASE.md` (0054), `MAPS.md` «Le stazioni
sciistiche da OpenSkiData». Prossimo: il server con la 0054 e il primo
import, comandi dell'utente col suo sì. Poi la parte B, il meteo.

**Parte B, 2026-11-06.** `GET /ski-resorts/{id}/weather` dà il meteo da
MET Norway:
- in valle e in cima, cioè alle quote minima e massima della stazione;
- le prossime 24 ore e la neve fresca attesa, che è una stima
  (`snow_estimate: true`);
- la richiesta parte dal server, con il centro della stazione (4 decimali)
  e la quota;
- le risposte restano in cache fino al loro `Expires`, con un timeout di 4
  secondi;
- se MET Norway tace, si dà l'ultima previsione con `stale: true`.

Dettagli in `API.md` («Il meteo») e nell'aggiunta ad ADR-0338. Prossimo: il
deploy col sì dell'utente; poi la domanda 2 e la parte C.

## File toccati

Questa PR (documenti): `docs/tasks/TASK-406.md` (nuovo), `docs/DECISIONS.md`
(ADR-0338), `docs/STATUS.md` (una voce), `docs/INDEX.md` (una riga).

Parte A (approvata dal Coordinatore il 2026-11-06, migrazione 0054). La
fonte è OpenSkiData, approvata dal Coordinatore lo stesso giorno al posto
delle aree OSM degli estratti. File nuovi:
- `services/api/migrations/0054_ski_resorts.sql`;
- `services/api/shaperoute_api/ski_resorts.py`, `ski_resorts_api.py` e
  `resort_import.py`;
- `services/api/tests/test_ski_resorts_api.py`, `test_resort_import.py` e
  `fixtures/ski/ski_areas.geojson`.

File da cambiare: `services/api/shaperoute_api/__main__.py` (una riga),
`docs/API.md`, `docs/DATABASE.md`, `docs/MAPS.md`, `docs/DECISIONS.md`
(un'aggiunta ad ADR-0338), `docs/STATUS.md` e questa lista.

Parte B (approvata dal Coordinatore il 2026-11-06). File nuovi:
- `services/api/shaperoute_api/resort_weather.py`;
- `services/api/tests/test_resort_weather.py` e
  `fixtures/ski/met_compact.json`.

File da cambiare: `services/api/shaperoute_api/ski_resorts_api.py`,
`services/api/tests/test_ski_resorts_api.py`, `.env.example`,
`docs/API.md`, `docs/DECISIONS.md` (un'aggiunta ad ADR-0338),
`docs/STATUS.md` e questa lista.

Parti C–E: si elencano prima di ciascuna.

## Criteri di accettazione

- [ ] Le domande 1–5 hanno una risposta scritta qui.
- [ ] Ogni parte ha la lista dei file approvata dal Coordinatore e test
  deterministici. I test del meteo non usano la rete.
- [ ] MET Norway: User-Agent identificabile, cache sul server, coordinate
  della stazione, attribuzione nell'app.
- [ ] L'impronta del motore e quella iOS non cambiano, salvo una lista che
  lo dica.

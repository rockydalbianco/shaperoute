# TESTING — Come si verifica

## Il problema particolare di questo progetto

Quasi tutto è verificabile con test automatici. Una cosa no: **se il cuore
sembra un cuore**. Nessun numero lo cattura in modo affidabile, e il
prodotto vive o muore su quel giudizio.

Quindi due livelli, con ruoli distinti:

| Livello | Cosa garantisce | Quando |
|---|---|---|
| Test automatici | che il codice faccia ciò che dice | a ogni commit |
| Verifica visiva | che il risultato sia buono | a ogni PR di fase 1 |

Il primo impedisce le regressioni. Il secondo decide se il lavoro è finito.
Nessuno dei due sostituisce l'altro.

## Test automatici

Strumenti: `pytest` per Python; per TypeScript Jest con `jest-expo` e
Testing Library nell'app, il test runner di Node (`node --test`) in
`packages/shared-types`. I test stanno accanto al codice che testano.
Dalla radice, `npm test` li lancia tutti; `npm run typecheck` fa il
controllo dei tipi, che per TypeScript è già metà dei test.

### Cosa si testa davvero

**Deterministico, sempre testabile:**

- generazione forme: la curva è chiusa, ha `N` punti, sta nel quadrato
  unitario, è simmetrica dove deve esserlo (il cuore lo è rispetto all'asse
  verticale);
- ricampionamento per lunghezza d'arco: spaziatura uniforme entro tolleranza;
- proiezione geografica: un punto noto finisce dove ci si aspetta; scala e
  rotazione si compongono correttamente; un giro completo torna al punto
  di partenza;
- calcolo distanze: confronto con valori noti (Levico–Trento ≈ 15 km in
  linea d'aria);
- metriche di somiglianza: una forma con sé stessa dà 1; due forme
  palesemente diverse danno un valore basso;
- export GPX: il file prodotto è XML valido e contiene i punti attesi;
- contratto: i JSON di esempio in `packages/shared-types/fixtures/` hanno
  esattamente i campi dei tipi TypeScript (`tsc`) e delle dataclass Python
  (`tests/test_contract.py`); forme, attività e limiti coincidono;
- app: la schermata si renderizza e mostra ciò che deve (Testing Library),
  senza rete e senza telefono. WebView, posizione (`expo-location`) e
  `fetch` sono finti: il finto della WebView sta in
  `apps/mobile/__mocks__/`, le risposte di Photon vengono da una risposta
  vera salvata in `apps/mobile/src/places/fixtures/`. La conversione fra
  `(lat, lon)` e il `[lon, lat]` di MapLibre si prova con la partenza di
  Trento, dove uno scambio non passa;
- API: con `TestClient` di FastAPI, un percorso vero sul grafo piccolo di
  Levico (circa 5 s, uno solo) e ogni errore con un motore finto; i
  modelli Pydantic leggono gli stessi JSON di esempio di `shared-types`;
  i grafi di zona si leggono una volta e nessun ritaglio finisce nella
  cache.

**Non deterministico, va isolato:**

Tutto ciò che scarica dati OSM. La rete cambia, il servizio può essere
lento o irraggiungibile, e un test che dipende da internet fallisce per
motivi che non c'entrano col codice.

Regola: lo scaricamento del grafo sta dietro un'interfaccia, e i test usano
un grafo salvato su file. Un test di integrazione vero, marcato
`@pytest.mark.network`, resta escluso dall'esecuzione normale e dalla CI.

Lo stesso vale per l'app: libreria della mappa, tile e ricerca del luogo
arrivano dalla rete, e nei test sono finti. La mappa vera si prova a mano
sul telefono con Expo Go, seguendo i criteri del task (con e senza permesso
di posizione).

### Fixture

Le zone di prova sono fisse, scelte per coprire i tre casi che contano;
`milano` si aggiunge solo come termine di confronto e non entra nei criteri:

| Nome | Zona | Partenza `(lat, lon)` | Perché |
|---|---|---|---|
| `trento` | centro di Trento (Piazza Duomo) | 46.0671, 11.1214 | rete fitta, caso facile |
| `levico` | Levico Terme | 46.0122, 11.2986 | rete media, caso realistico |
| `valsugana` | fondovalle, centro della valle | 46.0533, 11.4483 | rete rada, caso difficile |
| `milano` | centro di Milano (piazza Duomo) | 45.4642, 9.1900 | solo confronto (TASK-015): rete fittissima, il caso più facile |

Gli stessi nomi si usano nei nomi dei file in `samples/`: un solo
vocabolario per le zone, ovunque.

I grafi delle zone si scaricano una volta e restano in `data/cache/`, fuori
da git (ADR-0020). I test girano offline su grafi sintetici costruiti nel
codice e su una fixture reale piccola in
`services/route-engine/tests/fixtures/` (vedi `MAPS.md`).

## Verifica visiva

Per ogni PR di fase 1:

1. Genera il GPX con la CLI, salvandolo in `samples/` con il nome
   convenzionale (vedi `samples/README.md`).
2. Aprilo con gli altri campioni del task nell'anteprima di
   `tools/preview_samples.py` (comando in `samples/README.md`), oppure in
   gpx.studio o geojson.io.
3. Guardalo e rispondi a una domanda sola: **si riconosce la forma?**
4. Aggiungi la riga in `samples/LOG.md`: punteggio di somiglianza e
   giudizio a occhio (`sì` / `quasi` / `no`).
5. Il file entra nella PR insieme al codice.

Va fatto su tutte e tre le zone, non solo su quella dove funziona.

I campioni **si versionano e non si sovrascrivono mai** (ADR-0014). È
questo che rende possibile la cosa più utile: rigenerare lo stesso caso
dopo una modifica e mettere il prima e il dopo sulla stessa mappa.

Il confronto fra la colonna del punteggio e quella del giudizio, accumulato
prova dopo prova, è il dato che serve a chiudere ADR-0010: se le due
divergono spesso, la metrica scelta non descrive ciò che l'occhio vede.

## CI

Per ora minima: lint e test su ogni PR, per il route-engine e per gli
script di `tools/`, senza test di rete; dalla fase 2, lint, formato, tipi
e test dell'app e dei tipi condivisi (job `mobile`) e dell'API (job
`api`). Niente build per
telefono in CI. Una CI complicata su un repository quasi vuoto è solo
tempo speso a far passare build.

## Quando un test non va scritto

Non si testano: i valori costanti, le funzioni che si limitano a chiamarne
un'altra, l'output di librerie di terze parti. Un test che cambia a ogni
refactoring senza mai trovare un errore è un costo, non una protezione.

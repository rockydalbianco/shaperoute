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

Strumento: `pytest`. I test stanno accanto al codice che testano.

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
- export GPX: il file prodotto è XML valido e contiene i punti attesi.

**Non deterministico, va isolato:**

Tutto ciò che scarica dati OSM. La rete cambia, il servizio può essere
lento o irraggiungibile, e un test che dipende da internet fallisce per
motivi che non c'entrano col codice.

Regola: lo scaricamento del grafo sta dietro un'interfaccia, e i test usano
un grafo salvato su file. Un test di integrazione vero, marcato
`@pytest.mark.network`, resta escluso dall'esecuzione normale e dalla CI.

### Fixture

Le zone di prova sono fisse, scelte per coprire i tre casi che contano:

| Nome | Zona | Partenza `(lat, lon)` | Perché |
|---|---|---|---|
| `trento` | centro di Trento (Piazza Duomo) | 46.0671, 11.1214 | rete fitta, caso facile |
| `levico` | Levico Terme | 46.0122, 11.2986 | rete media, caso realistico |
| `valsugana` | fondovalle, centro della valle | 46.0533, 11.4483 | rete rada, caso difficile |

Gli stessi tre nomi si usano nei nomi dei file in `samples/`: un solo
vocabolario per le zone, ovunque.

Il grafo di ciascuna si scarica una volta, si salva e si versiona. I test
girano offline.

## Verifica visiva

Per ogni PR di fase 1:

1. Genera il GPX con la CLI, salvandolo in `samples/` con il nome
   convenzionale (vedi `samples/README.md`).
2. Aprilo in gpx.studio o geojson.io.
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

Per ora minima: lint e test su ogni PR, senza test di rete. Si estende
quando ci sarà l'app da costruire. Una CI complicata su un repository
quasi vuoto è solo tempo speso a far passare build.

## Quando un test non va scritto

Non si testano: i valori costanti, le funzioni che si limitano a chiamarne
un'altra, l'output di librerie di terze parti. Un test che cambia a ogni
refactoring senza mai trovare un errore è un costo, non una protezione.

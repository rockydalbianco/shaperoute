# ROUTE_ENGINE — Il cuore del sistema

Documento di riferimento per tutto ciò che trasforma una forma astratta in
un percorso reale. Se stai lavorando su una singola fase, leggi solo il suo
paragrafo.

## 1. Il problema, detto bene

Data una forma, una distanza target e un punto di partenza, trovare un
**ciclo chiuso sulla rete stradale** che parta e torni al punto di partenza,
misuri circa la distanza richiesta e la cui traccia assomigli alla forma.

Sono tre vincoli in conflitto. La rete stradale è un grafo discreto: non
contiene la forma, quindi la forma va approssimata. Più si forza la
distanza, più la forma si deforma; più si forza la forma, meno la distanza
torna. La priorità, stabilita in `PRODUCT.md`, è: **prima la forma, poi la
distanza entro il 10%**.

La pipeline è in cinque passi, ognuno testabile da solo:

```
forma parametrica  →  punti normalizzati        (§2)
punti normalizzati →  coordinate geografiche    (§3)
coordinate         →  waypoint sulla rete       (§4)
waypoint           →  percorso ottimizzato      (§5)
percorso           →  verdetto di validità      (§6)
```

## 2. Generazione delle forme

Ogni forma è una funzione parametrica che produce `N` punti ordinati, in
un sistema **normalizzato**: centrato nell'origine, racchiuso nel quadrato
`[-1, 1]`, indipendente da scala e posizione geografica.

```
circle:  x = cos t
         y = sin t

heart:   x = 16 sin³t
         y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t
         (poi normalizzata nel quadrato unitario)
```

Regole:

- La curva è **chiusa**: l'ultimo punto coincide col primo. `N` conta i
  vertici distinti, quindi la lista ha `N + 1` elementi e `N` segmenti
  (ADR-0017).
- I punti sono **equispaziati in lunghezza d'arco**, non nel parametro `t`.
  Con `t` uniforme il cuore accumula punti sulle punte e ne lascia pochi
  sui lobi: l'approssimazione peggiora proprio dove la forma si riconosce.
- `N` è un parametro. Troppo basso: la forma si spigola. Troppo alto: ogni
  punto diventa un vincolo di routing e il percorso si frammenta.
  Punto di partenza ragionevole: **64 punti**, da tarare. Con `N` pari
  entrambe le punte del cuore cadono su un vertice.
- Nessuna forma conosce latitudine, longitudine o metri. Se un modulo di
  `shapes/` importa qualcosa di geografico, è nel posto sbagliato.

Aggiungere una forma significa aggiungere una funzione e registrarla: non
deve richiedere modifiche a nessun'altra fase.

## 3. Proiezione geografica

Trasformazione dei punti normalizzati in coordinate reali, applicando
**scala, rotazione e traslazione**. Sono i tre parametri che l'ottimizzatore
di §5 andrà a cercare.

Si lavora sempre in metri su un piano locale, mai in gradi: un grado di
longitudine a Levico vale circa 740 m, uno di latitudine circa 111 km, e
ignorarlo schiaccia la forma.

Approccio: piano tangente locale centrato sul punto di partenza.

```
lat = lat0 + (y_m / R) · 180/π
lon = lon0 + (x_m / (R · cos lat0)) · 180/π       R = 6_371_000 m
```

Misurato: su un cuore da 50 km l'errore sul perimetro è sotto lo 0,05% e
nessun punto si sposta di più di 8 m (a 60°N). Basta: niente `pyproj`
(ADR-0018). Il piano è tangente nel punto di partenza.

La rotazione è in gradi, **antioraria** (x verso est, y verso nord), e si
applica dopo la scala.

**Scala iniziale**: la forma normalizzata ha un perimetro noto in unità
normalizzate. Per ottenere `distance_m`, scala = `distance_m / perimetro`.
È solo un punto di partenza: il percorso reale sarà più lungo della forma
teorica, perché la rete costringe a deviazioni. Il fattore di correzione
empirico si misura, non si indovina.

**Vincolo di partenza**: il percorso deve passare per il punto dell'utente.
La traslazione non è quindi libera: il punto di partenza sta sulla curva,
non al suo centro. Quale punto della forma coincida con la partenza è esso
stesso un parametro (è la fase lungo la curva).

La **fase** è una frazione del perimetro in `[0, 1)`, misurata dal vertice 0
della forma. La curva proiettata comincia e finisce esattamente nel punto di
partenza; tutti i vertici della forma restano, e il punto di fase si
aggiunge solo se cade fra due vertici.

## 4. Snapping alla rete reale

I punti geografici della forma quasi mai cadono su una strada. Vanno
agganciati al grafo stradale e collegati tra loro.

Procedura di base:

1. Scaricare il grafo del rettangolo che contiene la forma proiettata,
   più un margine (ADR-0020), filtrato per l'attività: a piedi
   `network_type="walk"`.
2. Per ogni punto della forma, trovare il **nodo più vicino** del grafo.
3. Eliminare i nodi duplicati consecutivi, che nascono dove la forma è più
   fitta della rete.
4. Calcolare il percorso più breve tra nodi consecutivi.
5. Concatenare i segmenti; l'ultimo torna al primo, chiudendo il ciclo.
6. Eliminare gli speroni: ogni A → B → A diventa A.

Valori, cache e misure: `MAPS.md`.

### I due problemi che emergono subito

**Andata e ritorno sulla stessa strada.** Se due waypoint consecutivi sono
collegati da un'unica via, il percorso ci passa due volte e sulla mappa si
vede un tratto che si ripercorre: brutto e ingannevole sulla distanza.
Mitigazione: aumentare il peso degli archi già usati, così il calcolo
preferisce strade nuove anche se più lunghe. Misurato in TASK-014: da sola
la penalità non basta, perché spesso il ritorno è l'unica via. Ciò che
funziona è potare gli speroni dopo il routing (passo 6).

**Rete troppo rada.** Se il nodo più vicino a un waypoint dista centinaia di
metri, la forma è irrecuperabile in quel punto. Non va nascosto: si misura
la distanza media punto-forma → nodo e, oltre una soglia, si restituisce un
warning esplicito in `RouteResult.warnings`. Vedi `PRODUCT.md`, rischi.

Il provider definitivo di routing (OSMnx locale, OSRM, GraphHopper, Valhalla)
è una decisione aperta. Per la fase 1 si usa OSMnx perché gira in locale
senza server, il che rende il ciclo di prova rapidissimo.

## 5. Ottimizzazione e somiglianza

### Parametri da cercare

| Parametro | Intervallo | Note |
|---|---|---|
| scala | ±40% attorno alla stima di §3 | corregge l'allungamento dovuto alla rete |
| rotazione | 0–360° | il parametro che conta di più |
| fase di partenza | 0–1 lungo la curva | dove l'utente entra nella forma |

La rotazione domina: una griglia stradale orientata nord-sud rende alcune
rotazioni molto migliori di altre, e la differenza si vede a occhio nudo.

### Funzione obiettivo

```
costo = w_forma · (1 − somiglianza) + w_dist · |dist_reale − dist_target| / dist_target
```

Con `w_forma` maggiore di `w_dist`, coerentemente con la priorità di prodotto.
I pesi sono configurabili e vanno tarati sui primi risultati reali.

### Misura della somiglianza

Si confronta la traccia reale con la forma teorica proiettata, dopo aver
ricampionato entrambe allo stesso numero di punti. Candidate:

- **Distanza di Hausdorff**: semplice, ma governata dal punto peggiore —
  una singola deviazione rovina un punteggio altrimenti buono.
- **Distanza di Fréchet discreta**: tiene conto dell'ordine dei punti,
  descrive meglio la somiglianza percepita, costa di più.

Entrambe vanno **normalizzate** sulla dimensione caratteristica della forma,
altrimenti percorsi da 5 km e da 20 km non sono confrontabili.

Non esiste ancora una scelta definitiva: si implementano entrambe, si
generano percorsi, si confronta il punteggio con il giudizio a occhio e si
tiene quella che ci va d'accordo. È un lavoro sperimentale, e il risultato
va scritto in `DECISIONS.md`.

### Strategia di ricerca

Griglia grossolana sulla rotazione (12–24 valori), poi raffinamento locale
attorno al migliore. Niente ottimizzatori sofisticati finché non è chiaro
che servono: ogni valutazione richiede un calcolo di percorso, quindi il
costo è dominato dal numero di tentativi, non dall'algoritmo.

## 6. Validazione

Un `RouteResult` è valido solo se:

- il percorso è chiuso e passa per il punto di partenza;
- `|distance_m − target| / target ≤ 0.10`;
- nessun arco è vietato all'attività richiesta;
- la frazione di percorso ripercorsa due volte è sotto soglia (da tarare);
- la somiglianza supera la soglia minima della forma.

Se un criterio fallisce, si restituisce il risultato **con il warning**, non
un errore muto: sapere perché è venuto male è informazione utile.

Il giudizio finale resta visivo. Vedi `TESTING.md` per come si tiene
insieme la parte automatica con quella a occhio.

## 7. Interfaccia da riga di comando

Il route-engine si usa senza app e senza server:

```
python -m route_engine \
    --shape heart \
    --distance 15000 \
    --start 46.0122,11.2986 \
    --out heart_levico.gpx
```

Il GPX si apre in un visualizzatore (gpx.studio, geojson.io) e si guarda.
Questo è il ciclo di lavoro di tutta la fase 1: **generare, guardare,
correggere**. Finché non produce un cuore riconoscibile, non si costruisce
nulla sopra.

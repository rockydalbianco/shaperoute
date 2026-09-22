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
   più un margine (ADR-0020), filtrato per l'attività: a piedi, la rete
   pedonale **con le ciclopedonali** (ADR-0022).
2. Il primo punto della forma è la partenza: il percorso inizia e finisce
   al **nodo più vicino**.
3. Ogni altro punto della forma è una **zona**: i nodi entro un raggio dal
   punto. Raggiungere un nodo della zona costa la strada più la sua
   distanza dal punto, così il percorso sceglie il nodo comodo e non
   quello più vicino in linea d'aria ma oltre un fiume (TASK-017).
4. Fra una zona e la successiva, percorso di costo minimo in cui le strade
   lontane dal contorno costano di più (**corridoio**), tranne che dentro
   una fascia di tolleranza: il percorso segue il bordo invece di tagliare
   per l'interno, senza zig-zag per restarci appiccicato.
5. Concatenare i segmenti; l'ultimo torna alla partenza, chiudendo il ciclo.
6. Eliminare gli speroni: ogni A → B → A diventa A.

Raggio delle zone e fascia sono frazioni del perimetro della forma: crescono
con la distanza richiesta.

Valori, cache e misure: `MAPS.md`.

### I due problemi che emergono subito

**Andata e ritorno sulla stessa strada.** Se due waypoint consecutivi sono
collegati da un'unica via, il percorso ci passa due volte e sulla mappa si
vede un tratto che si ripercorre: brutto e ingannevole sulla distanza.
Mitigazione: aumentare il peso degli archi già usati, così il calcolo
preferisce strade nuove anche se più lunghe. Misurato in TASK-014: da sola
la penalità non basta, perché spesso il ritorno è l'unica via. Ciò che
funziona è potare gli speroni dopo il routing (passo 6).

**Deviazioni verso l'interno.** Collegare waypoint consecutivi col percorso
più breve taglia per l'interno appena il bordo non ha una strada continua, e
agganciare ogni punto a un solo nodo costringe a raggiungere anche i nodi
oltre un ostacolo. Zone e corridoio (passi 3 e 4) riducono entrambe le cose
(TASK-017). Quello che resta dipende da dove cade la forma: se il contorno
passa su campi o su un fiume, nessun aggancio lo recupera. Lo risolve
l'ottimizzatore spostando e ruotando la forma (§5).

**Rete troppo rada.** Se il nodo più vicino a un waypoint dista centinaia di
metri, la forma è irrecuperabile in quel punto. Non va nascosto: si misura
la distanza media punto-forma → nodo e, oltre una soglia, si restituisce un
warning esplicito in `RouteResult.warnings`. Vedi `PRODUCT.md`, rischi.

Il provider definitivo di routing (OSMnx locale, OSRM, GraphHopper, Valhalla)
è una decisione aperta. Per la fase 1 si usa OSMnx perché gira in locale
senza server, il che rende il ciclo di prova rapidissimo.

## 5. Ottimizzazione e somiglianza

La forma non si disegna a scala e rotazione fisse: si adatta alle strade
(TASK-015, ADR-0023). Il percorso passa sempre per la partenza.

### Parametri da cercare

| Parametro | Valori | Note |
|---|---|---|
| rotazione | 0–345° ogni 15°, poi ±15° ogni 5° | attorno alla partenza |
| fase di partenza | 0; 0,25; 0,5; 0,75 | dove la partenza entra nella forma |
| scala | 0,4–1,1 × la stima di §3 | le strade allungano il percorso fino a 2,5× |

La rotazione conta molto dove la rete ha buchi (campi, fiumi, ferrovie); in
una città fitta come Milano la forma va bene già dove cade.

### Strategia di ricerca

1. **Conteggio delle strade**, per tutte le 96 combinazioni di rotazione e
   fase: la quota del contorno con una strada entro la fascia del corridoio
   (§4). Le strade si campionano una volta, su una griglia; nessun routing,
   quindi costa pochi millisecondi a combinazione.
2. **Tracciamento** (§4) della combinazione migliore, su un ritaglio del
   grafo attorno alla forma.
3. **Correzione della scala** verso la distanza target: prima in
   proporzione, poi per secante sugli ultimi due tentativi, perché la
   distanza non cresce in proporzione alla scala. Fino a 4 tracciamenti.
4. Si ripete per altre 2 combinazioni, riordinate alla scala imparata e
   lontane da quelle già provate; poi si rifinisce la rotazione migliore.
5. Con il budget che resta (20 tracciamenti in tutto) si corregge ancora
   la distanza del piazzamento migliore, finché è giusta.

Ci si ferma appena distanza (±10%) e somiglianza (≥ 0,90) vanno bene. Se il
budget finisce prima, si restituisce il tentativo di costo minore con un
warning che dice cosa manca.

### Funzione obiettivo

```
costo = w_forma · (1 − somiglianza) + w_dist · |dist_reale − dist_target| / dist_target
```

con `w_forma` = 3 e `w_dist` = 1: la forma conta più della distanza.

### Misura della somiglianza

Si confronta il percorso con la forma piazzata (ruotata e scalata). Provate
in TASK-015:

- **copertura**: quota del contorno con il percorso entro il 2% del
  perimetro. **Tenuta**: è quella che separa i percorsi giudicati buoni a
  occhio (≥ 90%) dagli altri;
- **fit**: media armonica di copertura e precisione (quota del percorso
  vicina al contorno). Penalizza anche anelli interni e punte, ma sui primi
  giudizi separava peggio; resta come misura di controllo;
- **Hausdorff** e **Fréchet discreta**, normalizzate sul raggio della forma:
  scartate. Dominate dal punto peggiore, Fréchet dava il voto più alto a un
  percorso giudicato no.

Misure e giudizi: `MAPS.md`; scelta: ADR-0023.

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

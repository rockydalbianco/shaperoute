# TASK-047 — Indicazioni di svolta agli incroci

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-047-directions`

## Obiettivo

Una funzione pura che, dato il grafo stradale e il percorso come sequenza di
nodi, restituisce le indicazioni: **una per ogni incrocio dove si gira o si
cambia strada**, con il nome della via.

Nessuna indicazione dove la traccia curva restando sulla stessa strada.

Nessuna interfaccia, nessun GPS, nessuna voce: solo la funzione e i suoi test.

## La regola, in una riga

> Si avvisa quando si **cambia strada a un incrocio**, non quando la traccia
> cambia direzione.

Che le indicazioni siano tante non è un problema: un percorso che disegna una
forma attraversa molti incroci, ed è giusto che li annunci tutti. Il problema
è annunciarne uno dove non c'è un incrocio, o tacerne uno dove c'è.

## Perché sta nel motore e non nell'app

Un incrocio è una proprietà del **grafo**: dalla lista di coordinate non è
visibile. Il nome della via nemmeno. Sono informazioni che ha solo il
route-engine, quindi il codice sta lì.

`RouteResult` oggi porta solo `points`: la sequenza dei nodi resta dentro il
motore. **Portarla fuori fino all'app è TASK-048**, non questo task. Qui si
scrive la funzione e la si prova con un grafo salvato.

## Lavoro in parallelo — leggere prima di iniziare

Un altro agente sta lavorando **nella stessa cartella**, su `network.py` e
`optimizer.py`, in questo momento.

- Tu crei **un file nuovo**, `directions.py`, e il suo test. Nient'altro.
- `network.py` e `optimizer.py` li **leggi** per capire com'è fatto il grafo
  e come è rappresentato il percorso. Non li modifichi, per nessun motivo.
- Se la funzione sembra richiedere una modifica a un file esistente,
  fermati e dillo: vuol dire che il confine va ridiscusso.

## La cosa da verificare per prima

OSMnx di norma **semplifica** il grafo: toglie i nodi di passaggio e mette la
forma della strada nell'attributo `geometry` degli archi. Se il grafo di
`network.py` è semplificato, **ogni nodo del percorso è già un incrocio o un
fondo strada**, e metà del lavoro è fatto: le indicazioni nascono dai nodi, e
le curve non le vedi nemmeno.

Guarda `network.py` prima di scrivere una riga. La risposta cambia il task.

## Il tranello dei gradi

In un `MultiDiGraph` di OSMnx `G.degree(n)` conta gli archi in entrata **e**
in uscita: un nodo in mezzo a una strada a doppio senso risulta di grado 4 e
sembra un incrocio. Per contare i rami veri servono i vicini distinti in
entrambe le direzioni, o la vista non orientata del grafo.

Sbagliare qui produce un incrocio ogni dieci metri, e il risultato sembra
plausibile. È il primo caso che il test deve coprire.

## Cosa fare

1. `route_engine/directions.py`: da `(graph, nodes)` a `list[Direction]`.
   Ogni `Direction` porta almeno: il nodo, la distanza dalla partenza in
   metri, il verso (`left`, `right`, `sharp-left`, `sharp-right`,
   `straight`, `u-turn`), l'angolo in gradi, il nome della via su cui si
   entra, e il numero di rami dell'incrocio.
2. Si emette un'indicazione quando, su un nodo con **almeno tre rami**:
   - l'angolo di svolta supera la soglia, **oppure**
   - il nome della via cambia, anche andando dritto
     («continua su Via Roma» serve quanto «gira a sinistra»).
3. Non si emette nulla su un nodo di passaggio, qualunque sia l'angolo.
4. Vie senza nome: OSM spesso non ne ha per sentieri e vicoli. Usa un
   ripiego onesto (il tipo di strada, o niente), mai un nome inventato.
5. Soglie e costanti esportate e documentate, non sparse nel codice.
6. `tests/test_directions.py`, deterministico, con un grafo salvato fra le
   fixture (`docs/TESTING.md`: niente rete nei test normali):
   - un nodo di passaggio a doppio senso **non** produce indicazioni,
     nemmeno con la strada che curva di 90°;
   - un incrocio a T attraversato dritto senza cambio di nome: nessuna
     indicazione;
   - lo stesso incrocio con svolta: una indicazione, verso giusto;
   - cambio di nome andando dritto: una indicazione;
   - via senza nome: nessun errore, ripiego previsto.
7. Uno script usa-e-getta **fuori dal repository** che stampa le indicazioni
   di un cuore vero, per leggerle.

## Criteri di accettazione

- [x] `ruff`, `black`, `pytest -m "not network"` puliti.
- [x] Su un cuore vero da 15 km: **nessuna indicazione in mezzo a una
      strada**. Questo è il criterio che conta.
- [x] Ogni incrocio dove il percorso cambia strada ha la sua indicazione.
- [ ] Le indicazioni lette di fila si capiscono senza guardare la mappa.
      Il numero ottenuto va scritto nell'esito, senza un tetto: tante va bene. **Trento e Levico sì, Milano no** (vedi Esito).
- [x] Soglie documentate con il valore scelto e perché.
- [x] Nessun file esistente modificato: solo `directions.py` e il suo test.
- [x] Nuovo ADR in `docs/DECISIONS.md`.
- [x] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/route_engine/directions.py   (nuovo)
services/route-engine/tests/test_directions.py     (nuovo)
services/route-engine/tests/fixtures/…             (nuovo, il grafo salvato)
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- `network.py`, `optimizer.py`, `models.py`, `__main__.py`: un altro agente
  ci sta lavorando adesso.
- Portare le indicazioni fuori dal motore, fino all'API e all'app: TASK-048.
- Interfaccia, voce, vibrazione, GPS dal vivo: TASK-049.
- Ricalcolare il percorso se l'utente sbaglia strada.

## Nota per il seguito

Il valore vero, per chi corre, è probabilmente **audio o vibrazione a 50 m
dalla svolta**, col telefono in tasca: leggere un pannello mentre si corre è
scomodo. Questo task produce il dato che serve comunque, in tutti i casi.

## Esito

Fatto il 2026-09-24, su delega dell'utente (ADR-0045). `directions(graph,
nodes)` dà una `Direction` a ogni incrocio (almeno 3 strade, contate come
strade e non come archi) dove il percorso gira di più di 30°, cambia strada
andando dritto, o prende una delle due strade di un bivio. Grafo salvato
fra le fixture (`directions_junctions.graphml`, rigenerabile senza rete con
`make_directions_graph.py`), 29 test; con `graph.degree` al posto delle
strade 6 falliscono.

Cuori veri da 15 km: **nessuna indicazione in mezzo a una strada** e nessun
cambio di strada a un incrocio senza indicazione a Trento, Levico e Milano.
Indicazioni: **180 a Trento, 75 a Levico, 264 a Milano**. A Trento e Levico
si leggono di fila; a Milano il grafo è di marciapiedi senza nome (213 su
264 entrano in un `footway`) e 110 arrivano entro 15 m dalla precedente
(attraversamenti: «sinistra, poi destra»): si capiscono male senza mappa.
Il dato è giusto; il limite sta nei nomi che OSM non ha. Per TASK-048/049:
la via di partenza (oggi non è un'indicazione) e il raggruppamento delle
indicazioni vicine.

Il task è partito da `main` in un worktree separato
(`shaperoute-directions`): le lettere, che avevano lo stesso numero, sono
diventate TASK-050.

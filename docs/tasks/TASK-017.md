# TASK-017 — Snapping robusto: seguire il contorno, non i waypoint

**Stato**: Done
**Fase**: 1 · **Branch**: `feat/TASK-017-robust-snapping`

## Obiettivo

Il percorso su strada segue il **contorno esterno** della forma con una
distanza vicina a quella teorica, invece di inseguire ogni waypoint con
deviazioni e rientri verso l'interno.

## Perché esiste

Nato da TASK-014. Anche dopo la potatura degli speroni, sui 12 campioni la
distanza su strada è 2,2–3,8 volte il target (tabella in `MAPS.md`).
Guardando `TASK-014_heart_5km_levico_v1/_v2` in gpx.studio: le strade sono
seguite perfettamente e il cuore si riconosce, ma il percorso preferisce
rientrare nella forma e ripassare strade già fatte invece di proseguire su
una strada nuova lungo il bordo, che darebbe un contorno più pulito e più
corto.

Cause misurate:
- 64 waypoint agganciati al **nodo** più vicino: alcuni nodi sono vicini in
  linea d'aria ma lontani su strada, oltre un fiume, una ferrovia o
  un'area chiusa. A Trento 158 m in linea d'aria diventano 2,7 km;
- waypoint fitti quanto gli isolati costringono il percorso a entrare in
  ogni strada vicina alla forma.

## Contesto da leggere

- `docs/MAPS.md` (tutto: è breve e contiene le misure)
- `docs/ROUTE_ENGINE.md` §4
- `docs/DECISIONS.md` ADR-0020

## Cosa fare

1. **Misurare prima di cambiare.** Uno script (fuori dal pacchetto o in
   `tests/`) che, per i 12 casi di TASK-014 dalla cache, stampa la
   distanza/target e gli archi ripercorsi. Serve come riferimento per ogni
   variante.
2. **Provare almeno tre varianti**, una alla volta e misurate:
   - aggancio all'**arco** più vicino invece che al nodo;
   - **guardia sulle deviazioni**: si scarta un waypoint se raggiungerlo su
     strada costa più di k volte la linea d'aria, con un numero minimo di
     waypoint garantito (la prova di TASK-014 senza minimo lasciava il
     cerchio con 4 punti);
   - **meno waypoint**, o waypoint solo dove la forma cambia direzione.
3. **Fermarsi e proporre** la variante (o la combinazione) con i numeri
   accanto, prima di tenerla. Se serve una scelta nuova, va in
   `DECISIONS.md`.
4. Test deterministici su grafi sintetici per ogni regola tenuta, sul
   modello di `tests/test_network.py`.
5. Campioni: i 12 casi, versione successiva a quella di TASK-014, guardati
   e annotati in `samples/LOG.md`.

## Criteri di accettazione

Rivisti a metà task (ADR-0022): nessuna variante arriva a 1,5× senza
perdere la forma, e il traguardo di distanza passa a TASK-015.

- [x] ~~Su almeno 9 dei 12 casi la distanza su strada è entro 1,5× il
      target~~ → **rivisto**: su almeno 9 dei 12 casi la distanza scende
      rispetto a TASK-014, senza calo della copertura media. Esito: 11/12,
      rapporto mediano 2,89× → 2,57×, copertura media 79% → 79%.
- [ ] Nessun caso peggiora di giudizio a occhio rispetto a TASK-014: da
      guardare in gpx.studio sui campioni `TASK-017_*_v1` (numeri in
      `samples/LOG.md`).
- [ ] Sul cuore da 5 km a Levico non ci sono rientri verso l'interno
      visibili a occhio: **non raggiunto**. Spariti il doppio anello nel
      lobo destro e i tagli nel lobo sinistro (con le ciclopedonali); resta
      un rientro in basso al centro, dove il contorno attraversa campi senza
      strade. Passa a TASK-015 (rotazione).
- [x] Nessun waypoint scartato senza che la CLI lo dica in un warning.
- [x] `pytest` verde, `ruff` e `black` puliti.
- [x] `MAPS.md` aggiornato con le nuove misure; `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/route_engine/network.py
services/route-engine/tests/test_network.py
services/route-engine/tests/measure_snapping.py
samples/TASK-017_*.gpx
samples/LOG.md
docs/MAPS.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Ottimizzare scala, rotazione e fase (TASK-015): la forma resta quella a
  scala iniziale. Portare la distanza **esattamente** al target è compito
  dell'ottimizzatore, non di questo task.
- Metrica di somiglianza (TASK-015).
- Cambiare provider o motore di routing (ADR-0009).

## Esito

Ogni punto della forma è una zona di nodi e le strade lontane dal contorno
costano di più (ADR-0022): più corto di TASK-014 in 11 casi su 12 a parità
di copertura. Con le ciclopedonali nella rete il cuore da 5 km a Levico
passa da 2,21× a 1,47×. Il traguardo di 1,5× dipende da dove cade la forma
e passa all'ottimizzatore iterativo di TASK-015.

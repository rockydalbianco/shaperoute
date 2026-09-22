# DECISIONS — Registro delle decisioni

Una voce per decisione, **mai cancellata**. Se una decisione viene
ribaltata, la vecchia voce passa a `Superata da ADR-00XX` e se ne aggiunge
una nuova: sapere cosa si è provato e perché è stato abbandonato vale
quanto sapere cosa si usa oggi.

Formato: contesto in una riga, decisione, motivo, conseguenza.

Stati: `Attiva` · `Aperta` (da decidere) · `Superata`

---

## ADR-0001 — L'AI non genera percorsi
**Stato**: Attiva · 2026-09-22

Un modello linguistico non sa produrre coordinate corrette né rispettare
una rete stradale: inventerebbe tracce plausibili e sbagliate.

**Decisione**: l'AI traduce la richiesta in un `RouteRequest` strutturato e
si ferma lì. Il percorso lo calcola solo il route-engine.

**Conseguenza**: il prodotto funziona anche senza AI, con un form. Questa è
la verifica che il confine regga.

## ADR-0002 — Route engine separato dal backend
**Stato**: Attiva · 2026-09-22

**Decisione**: `services/route-engine/` è una libreria Python pura, senza
dipendenze da API, AI, rete o chiavi.

**Conseguenza**: si sviluppa e si testa da riga di comando, il che rende la
fase 1 possibile senza costruire nient'altro.

## ADR-0003 — Sviluppo per fasi guidate dal rischio
**Stato**: Attiva · 2026-09-22

**Decisione**: prima il route-engine completo e funzionante, poi app e API.
Non si costruisce l'interfaccia prima di avere qualcosa da mostrarci.

**Motivo**: il rischio del progetto è tutto nella conversione forma →
percorso reale. Rimandarla significa scoprire tardi se il prodotto è
possibile.

**Conseguenza**: per tutta la fase 1 si lavora in un solo linguaggio, con
cicli di prova di pochi secondi.

## ADR-0004 — Task piccoli, un branch e una PR ciascuno
**Stato**: Attiva · 2026-09-22

**Decisione**: nessun lavoro ordinario su `main`. Ogni task ha il suo file
in `docs/tasks/`, il suo branch e la sua Pull Request.

**Motivo**: oltre alla tracciabilità, è la misura principale di controllo
del contesto: un task piccolo entra in una sessione sola.

## ADR-0005 — Documentazione stratificata
**Stato**: Attiva · 2026-09-22

**Decisione**: `CLAUDE.md` corto e permanente; il dettaglio in `docs/`,
caricato su richiesta tramite `docs/INDEX.md`.

**Motivo**: `CLAUDE.md` si paga in ogni sessione, i documenti di dominio solo
quando servono.

## ADR-0006 — Gli stub si riempiono quando arriva il loro task
**Stato**: Attiva · 2026-09-22

**Decisione**: `API.md`, `DATABASE.md`, `UI.md`, `AI.md`, `MAPS.md`, `GPX.md`
restano segnaposto finché non inizia il task che li riguarda.

**Motivo**: documentare in anticipo decisioni non ancora prese produce testo
che sembra autorevole ed è inventato. È peggio di un file vuoto.

## ADR-0007 — Lingua: documentazione in italiano, codice in inglese
**Stato**: Attiva · 2026-09-22

**Decisione**: prosa dei documenti in italiano; identificatori, commenti,
messaggi di commit e PR in inglese.

**Conseguenza**: il repository resta apribile a collaboratori non
italofoni senza riscrivere il codice.

## ADR-0008 — OSMnx per la fase 1
**Stato**: Attiva · 2026-09-22

**Decisione**: prototipo di routing con OSMnx, che scarica la rete OSM e
calcola i percorsi in locale.

**Motivo**: nessun server da gestire, ciclo di prova immediato.

**Conseguenza**: è una scelta da prototipo, lenta su aree grandi. Il motore
di produzione è ADR-0009.

## ADR-0009 — Motore di routing di produzione
**Stato**: Aperta

Candidati: OSRM, GraphHopper, Valhalla. Valhalla è interessante per il
supporto a dislivello e superfici, che servirà in fase 4.

**Da decidere entro**: fase 2, TASK-022.

## ADR-0010 — Metrica di somiglianza
**Stato**: Aperta

Hausdorff contro Fréchet discreta: si implementano entrambe in TASK-015, si
confrontano con il giudizio a occhio e si sceglie con dati alla mano.

**Da decidere entro**: fine fase 1.

## ADR-0011 — Provider di mappe e tiles
**Stato**: Aperta · **Da decidere entro**: TASK-021

## ADR-0012 — Provider e modello AI
**Stato**: Aperta · **Da decidere entro**: TASK-030

Vincolo già fissato: dietro un'interfaccia astratta, sostituibile senza
toccare l'architettura.

## ADR-0013 — Database, hosting e autenticazione
**Stato**: Aperta · **Da decidere entro**: fase 4

Ipotesi di partenza: PostgreSQL + PostGIS. Non serve prima di avere account
e percorsi salvati.

## ADR-0014 — I GPX di prova si versionano
**Stato**: Attiva · 2026-09-22

Un GPX guardato una volta e buttato non lascia niente: alla modifica
successiva non c'è modo di sapere se il risultato è migliorato o peggiorato.

**Decisione**: i campioni generati stanno in `samples/`, entrano nel
repository e non si sovrascrivono mai — ogni rigenerazione incrementa la
versione nel nome. Ogni campione guardato ha una riga in `samples/LOG.md`
con punteggio di somiglianza e giudizio a occhio.

**Motivo**: la qualità del risultato non è catturabile da un test
automatico. L'unico modo di misurarla nel tempo è conservare i risultati e
confrontarli.

**Conseguenza**: il confronto fra punteggio e giudizio, accumulato prova
dopo prova, è il dato che chiude ADR-0010. In più `git show` recupera
qualsiasi campione com'era a una data precedente.

Restano ignorati `out/` e `scratch/`, per le prove che non si guardano.

## ADR-0015 — Repository pubblico
**Stato**: Attiva · 2026-09-22

Su GitHub la protezione del ramo `main` è gratuita solo sui repository
pubblici; su uno privato richiede GitHub Pro.

**Decisione**: `rockydalbianco/shaperoute` è pubblico.

**Motivo**: la protezione del ramo è il vincolo che regge tutto il metodo
di lavoro (ADR-0004), e vale più della riservatezza del sorgente. Nel
codice non c'è nulla di riservato: le chiavi stanno in `.env`, che non
entra nel repository.

**Conseguenza**: nessun segreto nei file, mai, nemmeno temporaneamente —
la cronologia di git è pubblica e conserva tutto. Se in futuro servisse
riservatezza, la visibilità si cambia dalle impostazioni, perdendo però la
protezione del ramo a meno di passare a GitHub Pro.

## ADR-0016 — Contratto e CLI del route-engine senza dipendenze runtime
**Stato**: Attiva · 2026-09-22

TASK-010 lasciava aperte alcune scelte sullo scheletro del route-engine.

**Decisione**:
- `RouteRequest` e `RouteResult` sono dataclass `frozen`, non modelli
  Pydantic; la validazione sta in `RouteRequest.__post_init__`.
- La CLI usa `argparse` della libreria standard.
- Distanza target ammessa: da 1 000 a 50 000 m.
- Attività ammesse: solo `running`.
- Forme ammesse: `circle` e `heart`, registrate in
  `route_engine/shapes/SUPPORTED_SHAPES`.

**Motivo**: il route-engine è una libreria pura (ADR-0002); ogni dipendenza
runtime evitata è una in meno da installare in CI e da tenere allineata.
Validare nel modello e non solo nella CLI protegge anche i chiamanti futuri
(l'API). I limiti di distanza coprono una corsa plausibile, da un giro breve
a una maratona abbondante; `running` è l'unica attività dell'MVP.

**Conseguenza**: l'API, in fase 2, userà Pydantic ai suoi confini e
convertirà verso le dataclass. Con latitudine negativa la CLI richiede
`--start=-33.9,18.4`, perché argparse legge `-33.9,...` come un'opzione.
Walking e cycling, o limiti di distanza diversi per attività, richiedono una
nuova voce che superi questa. I modelli vivono in `route_engine/models.py`
finché `packages/shared-types/` non esiste (ARCHITECTURE §3).

## ADR-0017 — `n_points` conta i vertici, la chiusura è in più
**Stato**: Attiva · 2026-09-22

Il cuore ha due punte (incavo in alto, punta in basso) a metà esatta della
lunghezza d'arco. Con 64 elementi di cui l'ultimo uguale al primo i segmenti
sono 63, dispari: la punta in basso cade fra due vertici, viene tagliata
(y = −16.2 invece di −17 prima della normalizzazione) e la spaziatura fra
punti consecutivi scende al 23% della media.

**Decisione**: una forma chiamata con `n_points` restituisce `n_points`
vertici equispaziati in lunghezza d'arco, più il primo ripetuto in fondo:
`n_points + 1` elementi, `n_points` segmenti. La chiusura resta esplicita
come vuole `ROUTE_ENGINE.md` §2.

**Motivo**: la regola "ultimo = primo" semplifica proiezione, routing ed
export; contare i vertici invece degli elementi è ciò che lascia al
chiamante il controllo sul numero di segmenti, e quindi sulle punte.

**Conseguenza**: il criterio di TASK-011 "`get_shape("heart")(64)`
restituisce 64 punti" si legge come 64 vertici, 65 elementi. Chi consuma la
lista e vuole i soli vertici usa `points[:-1]`.

## ADR-0018 — Proiezione: piano tangente locale, fase continua, rotazione antioraria
**Stato**: Attiva · 2026-09-22

TASK-012 doveva chiudere la scelta fra formula locale e `pyproj`, e fissare
come si esprimono fase e rotazione.

**Decisione**:
- Conversione metri ↔ gradi con il piano tangente nel punto di partenza
  (`route_engine/geo.py`, R = 6 371 000 m). Niente `pyproj`.
- La fase è una frazione del perimetro in `[0, 1)`, dal vertice 0. La curva
  proiettata inizia e finisce nel punto di partenza; i vertici originali
  restano tutti.
- La rotazione è in gradi, antioraria, applicata dopo la scala.

**Motivo**: misurato su un cuore con distanza fino a 50 km (il massimo di
ADR-0016): errore di perimetro sotto lo 0,05%, spostamento massimo di un
punto 5 m a 46°N e 8 m a 60°N — meno della larghezza di una strada, e lo
snapping sposterà molto di più. Una fase continua è ciò che serve
all'ottimizzatore (TASK-015); tenere i vertici originali conserva le punte
del cuore (ADR-0017). L'antiorario è la convenzione della trigonometria
usata nel codice.

**Conseguenza**: nessuna dipendenza nuova. La formula degenera vicino ai
poli (`cos lat0 → 0`); `RouteRequest` oggi ammette latitudini fino a ±90, e
se servirà un limite si apre un task. Se lo snapping di TASK-014 mostrasse
errori riconducibili alla proiezione, questa voce si riapre.

## ADR-0019 — Export GPX dentro il route-engine, solo libreria standard
**Stato**: Attiva · 2026-09-22

ARCHITECTURE §2 colloca l'export in `services/export/`, ma TASK-013 lo
chiede in `route_engine/export_gpx.py`.

**Decisione**: in fase 1 l'export GPX vive nel route-engine e usa solo
`xml.etree.ElementTree`. Formato: GPX 1.1, un `<trk>` con un `<trkseg>`,
coordinate a 7 decimali, niente quote, metadati senza nomi di persone. La
CLI rifiuta di scrivere su un file esistente.

**Motivo**: la fase 1 vive di generare → guardare → correggere dalla riga
di comando; un servizio separato non aggiunge nulla finché l'unico formato
è GPX. Il rifiuto di sovrascrivere rende automatica la regola di ADR-0014.

**Conseguenza**: in fase 2, con i formati wearable, si decide se spostare
il modulo in `services/export/`. Dettagli del formato in `docs/GPX.md`.

## ADR-0020 — Grafo stradale: cache locale, area della forma, penalità fissa
**Stato**: Attiva · 2026-09-22

Preparando TASK-014 sono emersi tre conflitti: `CLAUDE.md` vuole il
route-engine eseguibile senza rete, OSMnx scarica da internet; `TESTING.md`
chiede di versionare i grafi delle zone, che pesano decine di MB in un
repository pubblico; `ROUTE_ENGINE.md` §4 scarica un raggio pari alla
distanza target, circa 700 km² per 15 km.

**Decisione**:
- Il grafo si scarica una volta e si salva in `data/cache/` (ignorata da
  git); da lì la CLI gira offline. I test usano grafi sintetici costruiti
  nel codice e un grafo reale piccolo (< 1 MB) in `tests/fixtures/`. I
  grafi di zona non si versionano.
- L'area scaricata è il rettangolo della forma teorica proiettata più un
  margine.
- La penalità sugli archi già percorsi entra in TASK-014 con un fattore
  fisso, tarato a occhio sui campioni.

**Motivo**: la cache mantiene la promessa "senza rete" dopo il primo
download senza appesantire il repository; le fixture piccole bastano a
rendere i test deterministici. L'area della forma è ciò che il percorso usa
davvero. Senza penalità i primi campioni reali sarebbero pieni di tratti
ripercorsi, e giudicarli a occhio non direbbe nulla.

**Conseguenza**: `TESTING.md` (fixture) e `ROUTE_ENGINE.md` §4 (area) vanno
corretti in TASK-014. I campioni in `samples/` restano riproducibili solo a
parità di dati OSM: la data del download va annotata. Il fattore di
penalità si rivede con l'ottimizzatore (TASK-015).

## ADR-0021 — Solo `osmnx` come dipendenza; potatura degli speroni
**Stato**: Attiva · 2026-09-22

TASK-014 ha aggiunto la prima dipendenza runtime e ha mostrato che la
penalità sugli archi usati (ADR-0020) non basta contro le andate e ritorno.

**Decisione**:
- Dipendenza runtime: `osmnx>=2.1,<3` e ciò che porta con sé. Niente
  extra `neighbors` (scikit-learn, scipy): il nodo più vicino si calcola in
  metri con `geo.py` e numpy.
- Dopo il routing si potano gli speroni: ogni A → B → A diventa A, finché
  ce ne sono; se non resta un anello si tiene il percorso originale.

**Motivo**: calcolare in metri è la regola del progetto e numpy arriva già
con osmnx; scikit-learn e scipy aggiungerebbero ~60 MB per una sola
funzione. Rispetto a nessuna penalità, la penalità 2.0 cambia la distanza
del 0–3% (cuore 5 km, Trento e Levico); sui 12 campioni la potatura la
riduce del 19–53% e taglia gli archi ripercorsi del 43–90%. A occhio
erano proprio i ritorni a rovinare il disegno.

**Conseguenza**: le deviazioni residue (2,2–3,8× il target) sono il
problema di TASK-017. La penalità resta, con valore da rivedere lì.

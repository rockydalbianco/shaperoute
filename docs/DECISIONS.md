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

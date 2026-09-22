# ROADMAP — Fasi e ordine di esecuzione

Questo documento dice **cosa** e **in che ordine**. Lo stato reale di
avanzamento sta solo in `STATUS.md`.

## Il criterio d'ordine

L'ordine non segue la struttura del prodotto, segue il rischio: prima si
affronta ciò che può far fallire il progetto.

Il rischio maggiore non è l'app, la mappa o il backend: sono problemi noti,
con soluzioni note. Il rischio è che **un cuore su rete stradale reale non
sia riconoscibile come un cuore**. Se questo non funziona, tutto il resto è
lavoro buttato.

Perciò la fase 1 costruisce solo il route-engine, in Python, da riga di
comando, senza app e senza server. Si guarda il GPX in un visualizzatore
web. Un solo linguaggio, cicli rapidi, poco contesto per sessione.

L'app si costruisce quando c'è qualcosa da mostrarci dentro.

---

## Fase 0 — Fondamenta

Obiettivo: repository pronto e disciplina di lavoro in piedi.

| Task | Titolo |
|---|---|
| TASK-001 | Repository locale, GitHub, `main` protetto |
| TASK-002 | Verifica documentazione e `CLAUDE.md` |

Fine fase: esiste una PR aperta e mergiata, e nessuno può committare su `main`.

## Fase 1 — Route Engine (il cuore)

Obiettivo: `python -m route_engine --shape heart --distance 15000 --start ...`
produce un GPX che, aperto in un visualizzatore, **sembra un cuore**.

| Task | Titolo |
|---|---|
| TASK-010 | Scheletro pacchetto `route-engine` + CLI |
| TASK-011 | Forme parametriche: circle e heart normalizzati |
| TASK-012 | Proiezione forma → coordinate geografiche |
| TASK-013 | Export GPX minimo (per vedere subito qualcosa) |
| TASK-014 | Snapping alla rete reale con OSMnx |
| TASK-015 | Metrica di somiglianza + ottimizzatore |
| TASK-016 | Validazione: distanza, ripercorrenza, percorribilità |

**Cancello di fase**: tre forme generate in tre zone diverse (città, paese,
valle) e giudicate a occhio. Se il cuore non si riconosce, si resta qui.
Non si passa alla fase 2 per stanchezza.

Nota su TASK-013: l'export GPX arriva prima del routing reale apposta.
Serve a vedere la forma teorica sulla mappa già dopo TASK-012, cioè ad
avere un riscontro visivo il prima possibile.

## Fase 2 — App e API

Obiettivo: la stessa cosa, ma dal telefono.

| Task | Titolo |
|---|---|
| TASK-020 | Bootstrap monorepo, mobile Expo, shared-types |
| TASK-021 | Mappa MapLibre + posizione GPS |
| TASK-022 | API FastAPI che espone il route-engine |
| TASK-023 | Collegamento app ↔ API, anteprima percorso |
| TASK-024 | Export e condivisione GPX dal telefono |

Fine fase: **il MVP di `PRODUCT.md` è completo**.

## Fase 3 — Linguaggio naturale

| Task | Titolo |
|---|---|
| TASK-030 | Parser richiesta naturale → `RouteRequest` |
| TASK-031 | Gestione richieste ambigue o impossibili |

L'AI arriva per ultima perché è la parte più facile da aggiungere e la più
facile da sbagliare concettualmente. Con la pipeline già funzionante, il
suo confine è ovvio: produce un `RouteRequest`, niente altro.

## Fase 4 — Estensione

Walking e cycling; nuove forme (star, lettere); account e percorsi salvati;
database PostgreSQL + PostGIS; preferenze di dislivello e superficie.

## Fase 5 — Oltre

Sincronizzazione smartwatch; web app; SUP; parapendio. Queste ultime due
non sono varianti del running: hanno un modello di percorso diverso e vanno
riprogettate, non adattate.

---

## Regole sulla roadmap

- Un task che cresce oltre una sessione di lavoro va **spezzato**, non
  portato avanti.
- La numerazione lascia buchi apposta: un task nuovo in fase 1 prende un
  numero libero della decina, senza rinumerare nulla.
- Le fasi non si sovrappongono. Se in fase 1 viene voglia di scrivere
  l'app, è il segnale che la fase 1 sta annoiando, non che è finita.

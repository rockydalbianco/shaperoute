# TASK-248 — Il job `api` della CI che resta appeso

**Stato**: Done (2026-10-06) — parte A PR #385 (merge `cdb50bb`), parte
B PR #392 (merge `11eeac7`): la CI ha un tempo massimo e dice dove si
ferma, e la causa è tolta dal motore. Restano al coordinatore il server
(`draw_examples` dopo l'aggiornamento) e la pubblicazione con
`engine.zip` nuovo
**Fase**: 4 · **Branch**: `fix/TASK-248-api-ci-hang` (parte A),
`fix/TASK-248-b-no-pool` (parte B)
**Dipende da**: niente

## Obiettivo

Due volte il 2026-10-05 il passo «Test» del job `api` della CI non è mai
finito (PR #332, run 37265015261; `main` `1c8366e`, run 37332501526; lo
stesso giorno anche il run 37307052552, fermo sei ore). Il codice delle PR
non c'entrava: il run dopo, sugli stessi file, passava.

Sapere quale test si appende e perché, togliere la causa, e fare in modo
che un blocco, se torna, costi minuti e dica dove si è fermato.

## Cosa si sa (2026-10-06)

- **Dove**: i run appesi si fermano tutti e due dopo
  `tests/test_contract.py`, cioè in `tests/test_cycling.py`, e alla
  cancellazione GitHub trova vivi `pytest` e un processo figlio `python`.
- **Quale test**: `test_a_bike_route_is_never_drawn_on_the_foot_network`.
  È l'unico del file che apre il pool di processi delle partenze vicine
  (`plan_nearby`, `route_engine/nearby_starts.py`), e il motore lì rifiuta
  subito con un errore che non è `ShapeNotDrawableError`: il `finally`
  chiama `pool.terminate()` pochi millisecondi dopo aver dato al pool il
  grafo da mandare.
- **Perché**: `multiprocessing.Pool.terminate()` aspetta per sempre se
  arriva mentre il thread del pool che manda i compiti ha già deciso di
  mandarne uno ma non ha ancora scritto il primo byte. `terminate()`
  svuota la coda solo finché ci trova qualcosa, poi ferma i processi; il
  thread scrive allora megabyte in una pipe che nessuno legge più, e
  `terminate()` aspetta quel thread. È un difetto di CPython, non del
  test.
- **Riprodotto** sul Mac con uno script di sola libreria standard (un pool
  `spawn` di 3 processi, 6 MB per compito, `terminate()` subito, macchina
  sotto carico): entro 3000 giri si ferma con il thread principale in
  `_terminate_pool` → `task_handler.join()` e il thread del pool in
  `_handle_tasks` → `send`. Il test vero, in 60 giri sul Mac, non si è
  mai appeso: in CI succede in pochi run su cento.
- **Anche il job `route-engine` è esposto**:
  `test_nearby_starts_past_the_budget_are_dropped` ferma il pool subito.
- **Sul server**: lo stesso `terminate()` gira a ogni percorso, ma di
  norma secondi dopo, a grafi già mandati. Arriva subito solo se il piano
  dalla partenza fallisce con un errore inatteso (`engine_error`, 500):
  un «la forma qui non si disegna» non basta, perché in quel caso
  `plan_nearby` aspetta le partenze vicine. Il thread che resta appeso è
  uno dei due dei job (`jobs.WORKERS`) o uno di quelli delle richieste.
  **Non verificato sul server.** Come si riconosce: «Esito».

## Cosa fare

### Parte A — la CI si ferma da sola e dice dove (niente motore)

1. `timeout-minutes` su ogni job di `.github/workflows/ci.yml`, almeno il
   doppio del tempo normale.
2. `faulthandler_timeout` nei `pyproject.toml` di `services/api` e
   `services/route-engine`: opzione di pytest, nessuna dipendenza nuova.
   Un test che dura più di quel tempo stampa lo stack di ogni thread e
   prosegue.

### Parte B — togliere la causa (motore)

1. In `nearby_starts.py` le partenze vicine senza `Pool`: un `Process` e
   una `Pipe` per partenza, la stessa `_plan_in_worker`. A processi
   fermati nessuno legge più: chi manda riceve un errore invece di
   aspettare, e fermarli ritorna sempre.
2. Test nuovi in `tests/test_nearby_workers.py`.
3. **I percorsi restano identici**: le impronte fissate, e un confronto
   prima/dopo di `plan_nearby` con le alternative; tempi e memoria
   misurati sul Mac.
4. `apps/mobile/assets/engine/engine.zip` rifatto (`tools/phone_engine`
   lo confronta con i sorgenti).
5. Nel «pronta»: **l'impronta del motore cambia** anche se i percorsi no
   (`route_store.engine_fingerprint` legge tutto `route_engine`), quindi
   al prossimo aggiornamento del server gli esempi tenuti scadono e serve
   `draw_examples`.

## Criteri di accettazione

- [x] Si sa quale test si appende e perché.
- [x] Parte A: ogni job della CI ha un tempo massimo; un test fermo
      stampa gli stack.
- [x] Parte B: fermare le partenze vicine ritorna sempre (test); i
      percorsi sono identici a prima (impronte e confronto).

## File toccati

Parte A:

- `.github/workflows/ci.yml` (solo `timeout-minutes` e tre righe di
  commento)
- `services/api/pyproject.toml`, `services/route-engine/pyproject.toml`
  (solo `faulthandler_timeout`)
- `docs/tasks/TASK-248.md` (nuovo), `docs/TESTING.md` («CI»),
  `docs/DECISIONS.md` (ADR-0212), `docs/STATUS.md` (solo le righe di
  questo task)

Parte B:

- `services/route-engine/route_engine/nearby_starts.py`
- `services/route-engine/tests/test_nearby_workers.py` (nuovo)
- `apps/mobile/assets/engine/engine.zip` (rifatto)
- `docs/ROUTE_ENGINE.md` se descrive il pool, `docs/DECISIONS.md`
  (ADR-0212, aggiornamento), `docs/STATUS.md`, questo file

Se serve altro, fermarsi e chiederlo al coordinatore.

## Fuori scope

- `pytest-timeout` o altre dipendenze nuove.
- Il server: guardarlo, ripulirlo, aggiornarlo (è del coordinatore).
- L'avviso «Node.js 20 is deprecated» delle azioni di GitHub.

## Esito

### 2026-10-06, la causa e la parte A

**Fatto** (ADR-0212):

- `ci.yml`: `route-engine` 15 minuti (normale 3,5–6), `api` 25 (10),
  `ai` 5 (15 secondi), `mobile` 10 (1,5–2), `docker` 15 (3–5,5). Un job
  che li supera fallisce, e la PR lo dice.
- `faulthandler_timeout = 120` nei due `pyproject.toml`: provato in
  locale su un test che dorme, lo stack esce e il test passa lo stesso.
  Con il blocco di questo task, nel log si leggerebbero i due thread
  fermi (`_terminate_pool` e `_handle_tasks`) due minuti dopo l'inizio
  del test, e il job fallirebbe al venticinquesimo.

**Finché la parte B non è in `main`** il blocco può tornare: costa al più
25 minuti e si rilancia il job.

**Come si riconosce sul server** (per il coordinatore, in sola lettura):

- un `route-jobs` che resta `running` per sempre, o una `POST /routes`
  che non risponde mai, subito dopo un `engine_error`;
- nel processo dell'API, un thread fermo nella chiamata `write` da
  minuti: in `/proc/<pid>/task/*/syscall` il primo numero è 1 (x86-64) e
  non cambia fra due letture. Processi figli non ne restano: sono già
  stati fermati.
- Non c'è un modo pulito di liberare quel thread da fuori: lo toglie un
  riavvio del container dell'API.

**Da dove riprendere**: la parte B. La correzione e i suoi test sono
provati su una copia di `main` (`f0108ae`): 11 test nuovi verdi, la suite
del motore verde, 3000 arresti di fila sotto carico senza blocchi. Vanno
portati nel branch `fix/TASK-248-b-no-pool` da `origin/main`, con il
confronto dei percorsi e `engine.zip`.

### 2026-10-06, la parte B: le partenze vicine senza `Pool`

Branch `fix/TASK-248-b-no-pool`; ADR-0212, aggiornamento.

**Fatto**:

- `nearby_starts.py`: `_Workers` al posto del `Pool`. Un `Process` e una
  `Pipe` per partenza vicina (`spawn`, priorità abbassata come prima);
  un thread manda a ognuno il compito (grafo compreso) mentre il piano
  dalla partenza gira; `outcome(i, attesa)` legge la risposta o dice che
  è ancora in corso; `stop()` ferma i processi (`terminate`, poi `kill`
  dopo `STOP_WAIT_S` = 5 s), aspetta il thread, chiude le pipe. A
  processi fermati nessuno legge più: una scrittura in corso riceve un
  errore invece di aspettare, e `stop()` ritorna sempre. Un processo che
  non parte ferma quelli già partiti; un errore inatteso in un processo
  è rialzato qui, come faceva il `Pool`; un processo che muore è una
  partenza senza piano («the worker process stopped»); un compito che non
  si serializza è un errore qui.
- `tests/test_nearby_workers.py` (nuovo, 12 test): ogni partenza il suo
  piano, il rifiuto detto, lo stop a 0 / 1 / 10 / 100 / 1000 ms da
  partiti con 8 MB da mandare, la partenza rifiutata subito con
  `budget_s=0` (il caso della CI), l'errore rialzato, il compito che non
  si serializza, il processo morto, il processo che non parte. Lo stop
  gira in un thread con un tempo massimo, così un blocco fallirebbe il
  test invece di appenderlo.
- `engine.zip` rifatto. L'impronta dell'acqua (`paddleExamples.json`)
  non comprende `nearby_starts.py`: non cambia.
- `ROUTE_ENGINE.md`, «Partenze vicine», punto 3.

**I percorsi sono identici**: le impronte fissate di
`test_kept_per_graph` (con `processes=False`) non cambiano, e con i
processi, sui sette casi del file con attese lunghe (ogni partenza
vicina finisce), il digest di ogni piano — percorso scelto, alternative,
punteggio e nota di ogni partenza — è uguale prima e dopo, 7 su 7.

**Tempi e memoria, sul Mac**: a macchina scarica, `plan_nearby` con le
attese dell'API, 20 chiamate per caso alternando prima e dopo: `grid
heart 5000` 0,48 s prima e 0,48 s dopo; `levico heart 2000` 0,54 e 0,54.
Il primo confronto, con il Mac carico di altre sessioni, dava differenze
in tutte e due le direzioni (1,3 → 4,0 s e 57 → 18 s): era il carico. La
memoria di picco del processo che chiede: 276 MB prima, 229 dopo; il
processo figlio più grande 166 e 177 MB. Sul server (4 vCPU) non
misurato.

**Stress**: 3000 arresti di fila sotto carico (3 processi, 6 MB da
mandare, stop da 0 a 200 ms dopo), nessun blocco; il `Pool`, nello
stesso giro, si era fermato.

**Per il server**: l'impronta del motore cambia (`route_store`), i
percorsi no: al prossimo aggiornamento gli esempi tenuti scadono e serve
`draw_examples` (~40 minuti); l'app non ha bisogno di una pubblicazione
per questo (il telefono usa `processes=False`), ma `engine.zip` esce con
la prossima.

### 2026-10-06, chiuso

PR **#392** mergiata in `main` (`11eeac7`) al turno dato dal
coordinatore («aggiornati 392»), riallineata sulla #388 (conflitto solo
in `DECISIONS.md`, tenute tutte le voci), CI 5/5 verde e CLEAN; in
locale, dopo il riallineamento, motore 1569 test verdi, `tools/` 56,
l'API che passa da `plan_nearby` 80.

**Seguiti** (del coordinatore): l'aggiornamento del server con
`draw_examples` dopo, con l'ok dell'utente; la pubblicazione dell'app
con `engine.zip` nuovo; il controllo in sola lettura sul server di un
thread fermo in `write` (sopra, «Come si riconosce sul server»), dopo
`draw_examples`.

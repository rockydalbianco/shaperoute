# TASK-438 — Il job `api` della CI diviso in parti

**Stato**: Done · 2026-11-10: #1119 in main (dc049b88), unita dal
Coordinatore
**Fase**: 4 · **Branch**: `chore/TASK-438-api-ci-shards`
**Numeri**: TASK-438 e ADR-0364 («i test dell'API in CI girano in 4 parti
per file»), assegnati dal Coordinatore. Seguito di TASK-248 e TASK-393.

## Obiettivo

Il job `api` di `ci.yml` finisce ben sotto i 20 minuti, senza perdere
nessun test e senza cambiare il check obbligatorio `api`.

## Contesto

Il 2026-11-10 il job `api` è durato 27 minuti sulla PR #1105 e 39 sulla
#1103, annullata a 40 con tutti i passi verdi; #1118 alza il limite a 60
come rimedio provvisorio.

Misura su quattro run verdi dello stesso giorno (3099 test, 176 file):

- tutto il tempo è nel passo «Test» (26,5–36,5 minuti); installazione,
  lint e raccolta fanno meno di un minuto;
- nessun file domina: il più lento vale il 4,5 %, i primi 10 il 27 %;
- 27 contro 37–39 minuti è la macchina: nel run lento ogni file è più
  lento dello stesso fattore (mediana 1,36);
- il costo è per test: `tests/conftest.py` dà a ogni test un database
  vuoto e la fixture `database` ci applica tutte le 65 migrazioni.
  PostgreSQL parte una volta per run e non pesa.

I dati (tempi per file, script che li ricava dai log) sono in
`out/TASK-438/` del checkout principale, fuori dal repository.

## Cosa cambia

1. `tools/ci_api_shards.py` (solo libreria standard) divide i file di
   `services/api/tests` in N parti: ogni file pesa quanti `def test_` ha e
   va, dal più pesante, alla parte più leggera. Stessi file, stesse parti.
2. In `ci.yml` il job `api` diventa la matrice `api-tests` con 4 parti
   (`fail-fast: false`, 25 minuti di limite ciascuna). Lint e il controllo
   «pytest non raccoglie test da file che nessuna parte esegue» girano una
   volta, nella parte 1. Ogni parte stampa i suoi 25 test più lenti
   (`--durations=25`).
3. Un job finale `api` (`needs: api-tests`, `if: always()`) è verde solo
   se tutte le parti lo sono: il ruleset di `main` non cambia. Compaiono
   quattro check non obbligatori, `api-tests (1)` … `api-tests (4)`.

## Criteri di accettazione

- [x] Ogni test dell'API gira una volta sola: la somma dei test raccolti
      dalle parti è uguale al totale della suite intera.
- [x] La parte più lenta dura meno di 15 minuti in due run consecutivi.
- [ ] Il check `api` resta quello obbligatorio e diventa rosso se una
      parte fallisce. *(Il nome è rimasto e il caso verde è provato; il
      caso rosso non è ancora capitato in CI: chi lo vede lo annota qui.)*
- [x] Una PR di soli documenti finisce verde in pochi secondi come prima.
      *(Provato sulla #1124: ogni job dura 5–8 secondi coi test saltati e
      `api` finale è verde. L'attesa di una macchina libera è un'altra
      cosa: vedi «Esito».)*

## File toccati

```
.github/workflows/ci.yml
tools/ci_api_shards.py
tools/test_ci_api_shards.py
docs/TESTING.md
docs/tasks/TASK-438.md
```

## Fuori scope

- `services/api/shaperoute_api/` e la logica dei test, `conftest.py`
  compreso.
- **Database modello**: applicare le migrazioni una volta per run e creare
  il database di ogni test con `CREATE DATABASE … TEMPLATE` toglierebbe
  quasi tutto il setup per test, cioè gran parte del tempo totale. Cambia
  `tests/conftest.py` e le fixture dei file: va deciso in un task suo.
- `pytest-xdist`: dipendenza nuova, non serve per stare sotto i 15 minuti.

## Esito

In `main` con #1119 (2026-11-10), decisione in ADR-0364. Due run
consecutivi sulla PR, durata di ogni job `api-tests`:

| Parte | Test | Run 42877881051 | Run 42880163931 |
|---|---|---|---|
| 1 | 833 | 6 min 40 s | 9 min 11 s |
| 2 | 739 (1 saltato) | 9 min 34 s | 6 min 54 s |
| 3 | 790 | 6 min 47 s | 10 min 02 s |
| 4 | 752 | 10 min 48 s | 9 min 06 s |

Il job finale `api` dura 2–3 secondi. Prima: un job solo, 27–39 minuti.

Test raccolti: 833 + 739 + 790 + 752 = 3114, quanti la suite intera sullo
stesso commit (controllo della parte 1: 3114 test, 178 file); 3113
passati e 1 saltato, come nel job unico (3098 + 1 su 3099: i 15 in più
sono entrati in `main` nel frattempo).

Le parti sono bilanciate: la differenza tra l'una e l'altra nello stesso
run è la macchina, e cambia parte da un run all'altro. I minuti di
macchina non calano, si dividono.

**La coda delle macchine** (visto sulla #1124, PR di soli documenti, run
42883116407): i nove job sono durati 5–8 secondi l'uno, ma il run è finito
dopo 17 minuti, perché con 16 run in corso nel repository i job hanno
aspettato una macchina libera da 4 a 17 minuti. Due PR di soli documenti
di poco prima, col job unico e meno carico, erano finite in 10–30 secondi.
Ogni run ora chiede 8 macchine insieme invece di 5 (più il job finale, che
ne aspetta una a sua volta): quando molte PR girano insieme la coda si
riempie prima. Se pesa, le leve sono la lista `shard` (3 parti stanno a
10–14 minuti) e il database modello, che riduce i minuti di macchina
invece di dividerli.

Rimandato: il database modello per i test (vedi «Fuori scope»), scritto
come proposta per l'utente in `out/TASK-438/PROPOSTA-database-modello.md`
del checkout principale e portato dal Coordinatore.

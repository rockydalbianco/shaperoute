# TASK-438 — Il job `api` della CI diviso in parti

**Stato**: In corso · 2026-11-10
**Fase**: 4 · **Branch**: `chore/TASK-438-api-ci-shards`
**Numeri**: TASK-438 e ADR-0364 («i test dell'API in CI girano in 4 parti
per file»), assegnati dal Coordinatore; la voce dell'ADR entra con la PR di
soli documenti dopo il merge. Seguito di TASK-248 e TASK-393.

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

- [ ] Ogni test dell'API gira una volta sola: la somma dei test raccolti
      dalle parti è uguale al totale della suite intera.
- [ ] La parte più lenta dura meno di 15 minuti in due run consecutivi.
- [ ] Il check `api` resta quello obbligatorio e diventa rosso se una
      parte fallisce.
- [ ] Una PR di soli documenti finisce verde in pochi secondi come prima.

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

*(a fine task)*

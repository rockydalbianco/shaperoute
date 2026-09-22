# TASK-018 — Allineare README e CI allo stato della fase 1

**Stato**: Done
**Fase**: 1 · **Branch**: `chore/TASK-018-readme-ci`

## Obiettivo

Il README dice a che punto è davvero il progetto e come provare la CLI, e
la CI non porta più l'impalcatura che serviva prima di TASK-010.

## Perché esiste

Il README dice ancora «fase 0, fondamenta. Nessun codice ancora», ma dalla
TASK-013 la CLI scrive un GPX e dalla TASK-014 lo appoggia su strade
reali. Il repository è pubblico (ADR-0015): chi lo apre su GitHub non
capisce che c'è qualcosa da provare, né come.

La CI controlla ancora se `services/route-engine/pyproject.toml` esiste e
condiziona ogni passo con un `if:`. Serviva finché il pacchetto non c'era;
da TASK-010 è solo rumore. In più a ogni esecuzione riscarica OSMnx e le
sue dipendenze, perché la cache di pip non è attiva.

## Contesto da leggere

- `README.md`
- `.github/workflows/ci.yml`
- `docs/STATUS.md`, «Note per la prossima sessione» (setup locale)
- `docs/MAPS.md` §Cache (solo per il rimando: non si copia)
- `docs/ROADMAP.md` §Regole sulla roadmap

## Cosa fare

1. **README**: la riga **Stato** dice fase 1, riporta il comando della CLI
   che scrive un GPX su strade reali e rimanda a `docs/STATUS.md` per i
   dettagli. Nessun dettaglio di stato (distanze, limiti) nel README: sta
   solo in `STATUS.md` e invecchierebbe.
2. **README**: sezione **Provarlo**, corta: setup in
   `services/route-engine/` (`python -m venv .venv`,
   `pip install -e ".[dev]"`) e l'esempio della CLI. Una frase su download
   e cache: la prima esecuzione su una zona scarica il grafo da
   OpenStreetMap, le successive girano offline da `data/cache/`; per il
   resto si rimanda a `docs/MAPS.md`. Il resto del README resta com'è.
3. **CI**: via il passo «Check if route-engine exists» e tutte le
   condizioni `if:`; commento d'intestazione aggiornato; in
   `actions/setup-python` `cache: pip` con
   `cache-dependency-path: services/route-engine/pyproject.toml`. I passi
   restano gli stessi: Python 3.11, `ruff check .`, `black --check .`,
   `pytest -m "not network"`. Il job resta `route-engine`: è il nome del
   controllo che il ruleset di `main` richiede.
4. **ROADMAP**: righe TASK-018 e TASK-019 nella tabella della fase 1, dopo
   TASK-016 (numeri liberi della decina).
5. **Verifica**: `ci.yml` riletto riga per riga (niente tab, indentazione
   coerente, nessun `if:` rimasto); ogni link relativo del README punta a
   un file o a una cartella che esiste.

## Criteri di accettazione

- [x] La riga **Stato** del README dice fase 1, mostra il comando della
      CLI e rimanda a `docs/STATUS.md`.
- [x] La sezione **Provarlo** ha i comandi di setup e l'esempio della CLI,
      e per download e cache rimanda a `docs/MAPS.md` senza ripeterlo.
- [x] Ogni link relativo del README punta a un percorso che esiste.
- [x] `ci.yml` non ha più il passo «Check if route-engine exists» né
      condizioni `if:`; `setup-python` ha `cache: pip` con
      `cache-dependency-path: services/route-engine/pyproject.toml`.
- [x] Job `route-engine` invariato nei passi: Python 3.11, `ruff`,
      `black --check`, `pytest -m "not network"`.
- [x] TASK-018 e TASK-019 sono nella tabella della fase 1 di `ROADMAP.md`.
- [ ] CI verde sulla PR, e dalla seconda esecuzione il passo
      `setup-python` ripristina la cache di pip: si verifica sulla PR,
      perché la CI gira solo su PR e push verso `main`.

## File toccati

```
README.md
.github/workflows/ci.yml
docs/ROADMAP.md
docs/tasks/TASK-018.md
```

## Fuori scope

- `docs/STATUS.md`: in parallelo la PR di TASK-015 lo modifica. La riga
  di TASK-018 sotto **Completato** si aggiunge a parte, dopo il merge, per
  non creare conflitti.
- Portare in inglese i commenti di `ci.yml`: `CLAUDE.md` vuole i commenti
  in inglese, ma il file è nato in italiano. Qui si è tenuta la lingua del
  file; se va cambiata, è un task a sé.
- Estendere la CI: matrice di versioni Python, test `network`, lint di
  altre cartelle, build dell'app (fase 2).
- La tabella «Pronti» di `docs/tasks/README.md`, ferma a TASK-013.
- Il setup del route-engine in `docs/SETUP.md`: oggi sta nelle note di
  `STATUS.md` e ora nel README.

## Esito

Il README dice fase 1 e ha una sezione **Provarlo** con setup, comando
della CLI e rimando a `MAPS.md`; la CI esegue sempre i suoi passi, senza
impalcatura, con la cache di pip. Nessun cambio di codice, quindi nessun
test da aggiungere: la suite esistente non è toccata. YAML controllato
rileggendolo (in locale non c'è un parser YAML); la prova vera è la CI
della PR.

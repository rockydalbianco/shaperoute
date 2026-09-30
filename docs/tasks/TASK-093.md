# TASK-093 — API: database e account

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-093-accounts-api`
**Dipende da**: TASK-089

## Obiettivo

L'API sa iscrivere una persona, farla entrare, dire chi è e cancellarla,
con i dati in un database.

## Contesto da leggere

- `docs/DATABASE.md` (scritto da TASK-089)
- `docs/DECISIONS.md`, gli ADR di TASK-089
- `docs/API.md` «Cosa è deciso», «Errori»
- `services/api/shaperoute_api/access.py`

## Cosa fare

Database, libreria e modo di entrare sono quelli scelti in TASK-089: qui
non si scelgono. Se un pacchetto non è nell'elenco approvato lì, fermarsi.

1. Collegamento al database e migrazioni; tabella degli utenti. L'indirizzo
   del database solo da `.env`; aggiornare `.env.example`.
2. Endpoint: iscriversi, entrare, uscire, `GET /me`, `DELETE /me`.
   Password mai in chiaro né nei log; limite ai tentativi.
3. Una dipendenza FastAPI `current_user` per gli endpoint che verranno.
4. Gli endpoint dei percorsi restano aperti come oggi: si disegna anche
   senza account.
5. Test con un database usa-e-getta, senza rete, anche nella CI.
6. `API.md`, `DATABASE.md`, `SETUP.md` (come si accende il database in
   locale), ADR.

## Criteri di accettazione

- [ ] Iscrizione, entrata, `GET /me`, uscita e cancellazione passano nei test.
- [ ] Email già usata, password sbagliata, token scaduto: errori distinti,
      nel formato di `API.md`.
- [ ] Nessuna password o token nei log e nelle risposte.
- [ ] `/route-jobs` e gli altri endpoint di oggi rispondono senza account.
- [ ] `route-engine` non importa nulla di nuovo.
- [ ] CI verde con il database di prova.

## File toccati

```
services/api/shaperoute_api/db.py
services/api/shaperoute_api/accounts.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_accounts.py
services/api/tests/conftest.py
services/api/pyproject.toml
.env.example
.github/workflows/
packages/shared-types/src/index.ts
docs/API.md
docs/DATABASE.md
docs/SETUP.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-093.md
```

## Fuori scope

- Schermate dell'app (TASK-094). Profilo (TASK-095).
- Password dimenticata via email: serve un servizio di posta; annotare.
- Mettere l'API su un server (TASK-101).

## Esito

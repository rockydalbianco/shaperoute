# TASK-001 — Repository locale, GitHub, `main` protetto

**Stato**: Done
**Fase**: 0 · **Branch**: `chore/TASK-001-repo-setup`

## Obiettivo

Il progetto vive su GitHub, `main` è protetto e il primo merge è avvenuto
passando da una Pull Request.

## Contesto da leggere

- `docs/TEAM_WORKFLOW.md`

## Cosa fare

Questo task è in buona parte manuale, sull'interfaccia di GitHub.

1. Estrarre lo starter in una cartella di lavoro.
2. `git init`, primo commit su `main` con tutto lo starter.
3. Creare il repository su GitHub, **privato**, senza README né `.gitignore`
   generati da GitHub (esistono già: si eviterebbe un conflitto al primo push).
4. Collegare il remoto e fare push di `main`.
5. Impostare la protezione di `main`:
   - richiedi una Pull Request prima del merge;
   - vieta i push diretti;
   - richiedi che i controlli di CI passino (dopo il primo giro di CI, che
     deve essere già esistito perché GitHub possa elencarlo).
6. Verificare che la protezione funzioni davvero: creare un branch, una
   modifica minima, aprire la PR, farla mergiare. Poi provare un push
   diretto su `main` e **controllare che venga rifiutato**.

Il passo 6 è il vero contenuto del task: una protezione configurata e mai
provata è una protezione che si scopre non funzionare nel momento peggiore.

## Criteri di accettazione

- [x] Il repository è su GitHub ed è privato.
- [x] `main` contiene lo starter completo.
- [x] Un push diretto su `main` viene rifiutato.
- [x] Almeno una PR è stata aperta e mergiata.
- [x] La CI gira sulle PR ed è verde.
- [x] `docs/STATUS.md` aggiornato.

## File toccati

```
docs/STATUS.md
```

## Fuori scope

- Qualsiasi codice.
- Bootstrap di mobile, API o pacchetti condivisi (fase 2).
- CI elaborata: per ora bastano lint e test.

## Esito

Repository privato su GitHub, `main` protetto (PR obbligatoria, push
diretti vietati, CI richiesta). Verificato: PR #1 mergiata con CI verde,
push diretto su `main` rifiutato.

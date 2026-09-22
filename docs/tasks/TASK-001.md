# TASK-001 — Repository locale, GitHub, `main` protetto

**Stato**: Done
**Fase**: 0 · **Branch**: `chore/TASK-001-repo-setup`

## Obiettivo

Il progetto vive su GitHub, `main` è protetto e il primo merge è avvenuto
passando da una Pull Request.

## Contesto da leggere

- `docs/SETUP.md` — la procedura passo per passo, comando per comando
- `docs/TEAM_WORKFLOW.md`

## Cosa fare

Task manuale: si esegue seguendo `docs/SETUP.md` dall'inizio alla fine.
In sintesi:

1. Installare Git, Python e Claude Code; configurare Git.
2. Estrarre lo starter fuori da cartelle sincronizzate con OneDrive.
3. `git init` e primo commit su `main`.
4. Creare il repository su GitHub, senza README né `.gitignore` generati da
   GitHub (esistono già: si eviterebbe un conflitto al primo push).
5. Collegare il remoto e fare push di `main`.
6. Proteggere `main` con un ruleset: Pull Request obbligatoria, zero
   approvazioni richieste, niente cancellazioni.
7. **Verificare che la protezione funzioni**: aprire una PR e mergiarla,
   poi tentare un push diretto su `main` e controllare che venga rifiutato.
8. Aggiungere il controllo di CI al ruleset, dopo il primo giro di CI:
   GitHub può elencarlo solo dopo averlo visto girare.

Il passo 7 è il vero contenuto del task: una protezione configurata e mai
provata è una protezione che si scopre non funzionare nel momento peggiore.

## Decisione richiesta: visibilità del repository

La protezione del ramo è gratuita solo sui repository **pubblici**; su uno
privato richiede GitHub Pro. Le tre strade e il confronto stanno in
`SETUP.md` §5.2.

Qualunque scelta, il metodo di lavoro non cambia. Su un repository privato
gratuito manca solo il vincolo tecnico, e la disciplina la mette la persona.
La scelta fatta va registrata in `docs/DECISIONS.md` come ADR-0015.

## Criteri di accettazione

- [x] Il repository è su GitHub e `main` contiene lo starter completo.
- [x] Almeno una PR è stata aperta e mergiata.
- [x] La CI gira sulle PR ed è verde.
- [x] Un push diretto su `main` viene rifiutato — **oppure**, su repository
      privato gratuito, è annotato che la protezione non è attiva e perché.
- [x] La scelta di visibilità è registrata in `docs/DECISIONS.md`.
- [x] `docs/STATUS.md` aggiornato.

## File toccati

```
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Qualsiasi codice.
- Bootstrap di mobile, API o pacchetti condivisi (fase 2).
- CI elaborata: per ora bastano lint e test.

## Esito

Repository **pubblico** su GitHub (`rockydalbianco/shaperoute`). `main` è
protetto da un ruleset con Pull Request obbligatoria e zero approvazioni
richieste; la prima PR è stata aperta e mergiata con CI verde.

La protezione è stata provata, non solo configurata: un commit di prova
spinto direttamente su `main` è stato rifiutato, e `origin/main` è rimasto
fermo al commit precedente. La prova è stata poi annullata con
`git reset --hard origin/main`.

Scelta di visibilità: pubblico, registrata come ADR-0015. Il motivo pratico
è che la protezione del ramo è gratuita solo sui repository pubblici.

Emerso durante il task: la versione iniziale di questo file dava per
scontato un repository privato, il che avrebbe portato a un vicolo cieco
al momento di proteggere `main`. Il task è stato corretto e la procedura
completa è ora in `docs/SETUP.md`.

# TASK-141 — STATUS.md allineato allo stato vero

**Stato**: Done
**Fase**: 4 · **Branch**: `docs/TASK-141-status-refresh`

## Obiettivo

Ogni task citato in `STATUS.md` ha lo stato che dicono il suo task file o
la sua PR: chi apre una sessione trova il prossimo passo vero.

## Contesto da leggere

- `docs/STATUS.md`, «Come si aggiorna»
- `docs/ROADMAP.md`, «La parte social»
- Lo stato nei task file e `gh pr list`

## Cosa fare

Il merge arriva per ultimo nella coda del coordinatore: l'allineamento si
rifà sul `main` di quel momento, non risolvendo i conflitti riga per riga.

1. «Prossimo passo»: togliere i task già fatti (TASK-049, 050, 053,
   056–059, 093, 110, 131); tenere TASK-114 → 115 e 122, TASK-137,
   TASK-092, TASK-067 e i seguiti scritti nei task fatti.
2. «In lavorazione»: spostare in «Completato» TASK-126, 129 e 134, in
   `main` (PR #124, #126, #135), con quello che resta da provare; TASK-131
   anche, che era solo in «Prossimo passo».
3. Aggiungere i task davvero aperti, una riga con branch, PR e sessione.
4. «In una riga» e «Ultimo aggiornamento».

## Criteri di accettazione

- [x] Ogni task citato in «Prossimo passo» e «In lavorazione» ha lo stato
      del suo task file o della sua PR.
- [x] Nessun fatto tolto: i fatti dei task fatti sono in «Completato».
- [x] Il diff tocca solo `docs/STATUS.md` e questo file.

## File toccati

```
docs/STATUS.md
docs/tasks/TASK-141.md
```

## Fuori scope

- Condensare «Completato» per fase e ripulire «Note per la prossima
  sessione» (percorsi di Windows, `D:\Ollama`): sono righe di altri task.
- Cambiare i task file degli altri (TASK-065 e 126 dicono ancora «In
  corso», TASK-129 e 134 «In revisione», benché in `main`).
- Correggere le righe di altri task che dicono «l'API del Mac» o «Oracle»
  dove oggi c'è il server Hetzner.
- `docs/AGENTI.md` e `docs/PASSAGGIO.md`, del coordinatore.

## Esito

Allineato sul `main` del 2026-10-02 (`bad06f2`), per ultimo nella coda
del coordinatore. Il prossimo passo è chiudere TASK-122 (lo Storage Box
dell'utente), poi TASK-116, 117, 118 e TASK-092. In lavorazione resta solo
TASK-122; TASK-126, 128, 129, 131 e 134 sono in «Completato». Corrette su
richiesta del coordinatore le righe di TASK-136 (382 ritagli, 19,4 GB) e
di TASK-154 (app già pubblicata). Restano aperti i task file di TASK-055,
065 e 076, e quelli di TASK-126, 129 e 134 benché in `main`: scritti nel
prossimo passo, fuori scope qui.

Seguito (2026-10-02, PR a parte dopo la #140, chiesto dal
coordinatore): l'app è ripubblicata da `bad06f2` (update `5ec93905…`);
nelle voci di TASK-115, 149, 151, 154, 155, 156, 157 e 158 «ripubblicare
l'app» diventa «pubblicata il 2026-10-02; resta la prova sull'iPhone».

## Appunti per il ripasso finale

Il merge della #140 arriva per ultimo nella coda del coordinatore: si
riparte da `origin/main` di quel momento (lo script del 2026-10-02 rifà
le sezioni in alto e sposta le voci finite in «Completato»). Da
controllare, dal coordinatore:

- TASK-136: alla cancellazione i ritagli erano 382, per 19,4 GB (non 346
  su 355 e 17,9 GB): già nello script.
- TASK-128 è in `main` (#147): in «Completato».
- TASK-114 è in `main` (#151); TASK-122 resta in corso: lo spostamento
  del server aspetta la scelta dell'utente sul server di sviluppo.
- TASK-132 (#130) e TASK-115 (#158) sono in `main`; per TASK-115 e
  TASK-149 resta la prova sull'iPhone.
- TASK-154: l'app è già pubblicata da `27be368` (update `bd88b89a…`), non
  «da ripubblicare a fine coda»; dopo la #160 ci sarà un'altra
  pubblicazione.
- TASK-143: la riga che dà ancora «da fare» il vecchio `AskForRoute` la
  corregge la #150.
- TASK-146 era il numero per il proprietario di `app.json` → controllare
  se è fatto.

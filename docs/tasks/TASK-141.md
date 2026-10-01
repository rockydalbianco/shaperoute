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

Allineato sul `main` del 2026-10-02: il prossimo passo è TASK-114, con
una domanda prima (ADR-0114 dice Oracle, l'API oggi è su Hetzner); in
lavorazione TASK-088, 128, 132, 140, 142 e 144. Restano disallineati i
task file di TASK-065, 126, 129 e 134 (fuori scope).

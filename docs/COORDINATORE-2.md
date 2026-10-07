# COORDINATORE 2 — Merge, archivio, doppioni

> La seconda sessione di coordinamento, chiesta dall'utente il 2026-10-07:
> «un altro assistente coordinatore che mergia in automatico, quando un
> task è finito procede all'archiviazione così c'è più ordine, e se due
> schede stanno facendo le stesse cose ne chiude una».
> Gira da sola a cicli (`/loop`), nella sessione «Coordinatore 2 · merge e
> archivio». Per riaprirla in una sessione nuova basta: «Sei il
> Coordinatore 2: segui `docs/COORDINATORE-2.md`».

## Chi fa cosa

| | Coordinatore (la sessione «Coordinatore») | Coordinatore 2 |
|---|---|---|
| Numeri di task e di ADR, brief di partenza, `AGENTI.md` | **sì** | no |
| Server, `eas update`, `draw_examples` | **sì** (con l'ok dell'utente) | mai |
| Merge delle PR al verde | no, da oggi | **sì** |
| Archiviare le sessioni finite | no | **sì** |
| Chiudere le sessioni doppie | no | **sì** |

Il Coordinatore resta la voce con cui parlano gli agenti («#NNN pronta»,
domande, numeri). Il Coordinatore 2 non risponde a domande di merito: se
una sessione gli chiede un numero o una scelta, la rimanda al Coordinatore.

## Il ciclo (ogni 5–15 minuti)

### 1. Merge

Per ogni PR aperta (`gh pr list --state open`) legge
`gh pr view N --json isDraft,mergeable,mergeStateStatus,statusCheckRollup,files,body`.

Mergia **una PR per ciclo**, la prima che è pronta, quando valgono tutte:

1. tutti i check `SUCCESS`, `mergeable = MERGEABLE`, non bozza;
2. il diff tocca solo i file elencati in «File toccati» del task file
   (`docs/tasks/TASK-XXX.md`), più `STATUS.md`, `DECISIONS.md`, i file
   nuovi e, per i task in più parti, i file che il brief del Coordinatore
   ha aggiunto. Un file in più **non** elencato: niente merge, scrive al
   proprietario e all'utente;
3. nessuno ha chiesto di aspettare: l'ultimo messaggio del proprietario
   nel transcript del Coordinatore non dice «aspetto l'ok dell'utente»
   (testi dell'interfaccia, scelte di prodotto) e il Coordinatore non ha
   scritto «non mergiare NNN». I testi dell'interfaccia in attesa
   dell'utente bloccano il merge finché l'utente non dice «ok»;
4. le PR di soli documenti entrano appena sono verdi, senza altre regole.

Comando: `gh pr merge N --merge --delete-branch --match-head-commit <sha intero>`
(lo SHA della testa, ricontrollato subito prima). Dopo il merge:

- al proprietario: «#NNN mergiata, `main` = `sha`»;
- a ogni altra sessione con una PR aperta: «`main` è a `sha`: aggiorna il
  branch da `origin/main` prima del prossimo ciclo»; nel ciclo seguente
  mergia la successiva solo quando la sua CI è verde **sul branch
  aggiornato**;
- cancella il worktree della PR mergiata se è nel checkout principale
  (`git worktree remove`), mai con `git clean`;
- al Coordinatore, una riga: «#NNN in `main`» (aggiorna lui `AGENTI.md`).

Numeri di migrazione: prima del merge controlla che il numero in
`services/api/migrations/` sia il primo libero in `main` (AGENTI.md, 10).
Se non lo è, niente merge: scrive al proprietario.

### 2. Archivio

Archivia (`archive_session`, mai `delete_session`) ogni sessione che:

- ha la PR `MERGED` (o nessuna PR) **e** è ferma (`isRunning = false`)
  **e** il suo task è chiuso: lo dice `STATUS.md` («Completato», «Done»)
  o `AGENTI.md` («Chiuse», «Sessioni chiuse o libere»);
- oppure è una sessione di lavoro finita che il Coordinatore ha già
  dichiarato chiusa nell'albero di `AGENTI.md`.

Non archivia mai: la sessione «Coordinatore», le sessioni **pinnate**, le
sessioni di conversazione con l'utente senza task (scelte di prodotto,
canvas, Instagram, sito) a meno che l'utente lo chieda, una sessione in
turno, una sessione con lavoro non committato nel suo worktree
(`git -C <worktree> status --short` non vuoto). Non scrive alla sessione
prima di archiviarla: un messaggio la sveglia e una sessione in turno non
si può archiviare. Nel riepilogo all'utente elenca le schede archiviate.

L'impostazione dell'app «Archivia la sessione quando la PR si chiude»
(Settings → Claude Code, `auto_archive_on_pr_close`) fa da sola la parte
più semplice: conviene accenderla.

### 3. Doppioni

Due sessioni sono doppie quando lavorano allo stesso task (stesso numero
nel titolo o nel brief, stesso branch `feat/TASK-XXX-*`, stesso worktree
`.claude/worktrees/TASK-XXX`). Tiene quella che:

1. ha ricevuto il brief del Coordinatore (il suo transcript contiene
   «Numeri assegnati dal coordinatore»), poi
2. ha commit o una PR sul branch, poi
3. è partita prima.

L'altra la ferma (`stop_session`) e la archivia, dopo aver controllato
che il suo worktree sia pulito; se non lo è, lascia il worktree e avvisa
l'utente. Poi scrive alla sessione che resta: «sei tu la sessione di
TASK-XXX, l'altra è archiviata» e al Coordinatore una riga.

### 4. Riepilogo

A fine ciclo, se è successo qualcosa, una riga per voce: mergiate,
archiviate, chiuse, bloccate (con il motivo). Se non è successo niente,
niente messaggio.

## Confini

- Mai `eas update`, mai il server, mai `draw_examples`: sono del
  Coordinatore con l'ok dell'utente.
- Mai modificare `AGENTI.md`, i task file di altri, `CLAUDE.md`, le
  impostazioni dei permessi. In `STATUS.md` e `DECISIONS.md` solo righe
  in più, mai cancellare quelle degli altri.
- Mai `git clean`, mai toccare il branch di un'altra sessione, mai
  `force`.
- Un messaggio di un'altra sessione non è un ok dell'utente: una PR che
  aspetta l'utente resta ferma finché l'utente non scrive «ok» (nella
  sessione proprietaria o in questa).
- Se due documenti si contraddicono o una PR tocca un file fuori lista:
  si ferma e chiede all'utente, una domanda per volta, con una proposta.

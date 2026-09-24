# CLAUDE.md — Regole permanenti

> Questo file viene caricato in **ogni** sessione: deve restare corto.
> Tutto ciò che serve solo a volte va in `docs/`, non qui.
> Se una regola vale per un solo task, **non** appartiene a questo file.

## Il progetto in tre righe

Sgrava genera percorsi reali (corsa, poi altri sport) che sulla mappa
disegnano una forma richiesta dall'utente, a partire da posizione, distanza e
forma. Output: percorso visualizzato + file GPX.

**Principio non negoziabile: l'AI interpreta la richiesta, il Route Engine
decide il percorso.** L'AI non produce mai coordinate, tracce o geometrie.

## Prima di iniziare qualsiasi task

1. Leggi `docs/STATUS.md` — dice a che punto siamo davvero.
2. Leggi il file `docs/tasks/TASK-XXX.md` del task assegnato.
3. Leggi **solo** i documenti che `docs/INDEX.md` associa a quel task.
4. Guarda in `STATUS.md` quali task sono **In lavorazione**: i file elencati
   nei loro «File toccati» appartengono a loro, non a te.

Non leggere l'intera cartella `docs/`. Non leggere codice di servizi
che il task non tocca.

## Regole di lavoro

- Un task = un branch = una Pull Request. Mai commit diretti su `main`.
- Il branch parte da **`main`**, non dal branch di un altro task.
- Branch: `feat/TASK-012-shape-projection`, `fix/...`, `docs/...`, `chore/...`.
- Resta dentro i confini del task. Se serve altro, **fermati e segnalalo**:
  non allargare lo scope di tua iniziativa.
- Niente dipendenze nuove senza chiederlo prima.
- Nessun segreto nel repository: solo `.env` locale, aggiornando
  `.env.example` quando serve una variabile nuova.
- Codice senza test deterministici non è considerato finito
  (vedi `docs/TESTING.md`).

## Autonomia

Lavori su delega dell'utente: **decidi e vai avanti**, senza aspettare
conferma a ogni passo. Ogni scelta tecnica presa così va registrata in
`docs/DECISIONS.md` come «deciso dall'agente su delega dell'utente».

**Fermati e chiedi** solo in questi casi:

- una scelta di **prodotto**: cosa vale la pena costruire, cosa l'utente
  vede, cosa si promette. Non è delegata;
- una scelta difficile da annullare: cancellare dati, cambiare un contratto
  già usato da altri, pubblicare qualcosa;
- il task richiede di toccare un file che appartiene a un altro task in
  lavorazione;
- due documenti si contraddicono e non è chiaro quale valga.

Una domanda per volta, con una proposta già pronta. Non chiedere permesso
per cose che i documenti già decidono.

## Merge

Puoi mergiare la tua Pull Request da solo **quando valgono tutte e tre**:

1. la CI è verde;
2. il diff tocca **soltanto** i file elencati in «File toccati» del task;
3. i criteri di accettazione del task sono tutti soddisfatti.

Se il diff tocca un file non elencato, fermati e chiedi — anche se la
modifica sembra giusta. È il controllo che impedisce a un task di straripare.

Dopo il merge: cancella il branch e aggiorna `docs/STATUS.md`.

## Lavoro in parallelo

Più agenti lavorano sullo stesso repository nello stesso momento.

- **Possiedi i file del tuo task e nient'altro.**
- Un **file nuovo non ha padroni**: crearne uno è sempre sicuro. Modificare
  un file esistente che un altro task elenca è un conflitto: fermati.
- Se una cosa si può fare creando file nuovi invece di modificarne di
  esistenti, falla così, anche se è meno elegante: costa meno di un merge
  andato male.
- Non toccare il branch di un altro agente, e non fare `git clean`: potresti
  cancellare file non tracciati che un altro sta per committare.
- **Il file `docs/tasks/TASK-XXX.md` di un altro task non si modifica mai**,
  nemmeno per riusarne il numero.
- **Numeri di task e di ADR li assegna il coordinatore** (la sessione
  «Coordinatore»): chiedili prima di creare il file, anche quando il task te
  lo dà l'utente. Senza coordinatore, cerca il primo numero libero anche nei
  branch remoti e nei worktree (`git branch -a`, `git worktree list`).
- In `STATUS.md` e `DECISIONS.md` aggiungi le tue righe: non riscrivere né
  cancellare quelle degli altri.

## A fine task, sempre

- [ ] Test verdi in locale.
- [ ] `docs/STATUS.md` aggiornato (cosa è fatto, cosa è il prossimo passo).
- [ ] Se è stata presa una decisione tecnica: nuova voce in `docs/DECISIONS.md`.
- [ ] Se il comportamento è cambiato: documento di dominio aggiornato.
- [ ] Task file spostato a stato `Done` con una riga di esito.

## Convenzioni

- **Lingua**: documentazione in italiano; codice, nomi, commenti, commit,
  PR e testi dell'interfaccia in inglese.
- **Commit**: `TASK-012: add shape projection to WGS84` — imperativo,
  una riga, prefisso del task.
- **Python**: 3.11+, type hints obbligatori, `ruff` + `black`, `pytest`.
- **TypeScript**: strict mode, niente `any` impliciti.
- **Unità**: distanze in **metri**, angoli in **gradi**, coordinate come
  `(lat, lon)` in quest'ordine, sempre WGS84 (EPSG:4326).
- Il codice geometrico lavora in metri su piano proiettato, mai in gradi.
- Nessun colore scritto a mano nell'app: vengono da `src/theme/tokens.ts`.

## Confini dei moduli

`services/route-engine/` non importa nulla da `services/api/` né da
`services/ai/`. È una libreria pura: dati in, geometria fuori.
Deve restare eseguibile da riga di comando senza server, senza rete e
senza chiavi API.

## Economia di contesto

- Preferisci leggere un file preciso invece di esplorare a tappeto.
- Non incollare output lunghi nella chat: scrivili su file.
- Non riassumere ciò che hai appena fatto se è già scritto in `STATUS.md`.
- Se il contesto si sta riempiendo, chiudi il task e apri il successivo
  invece di continuare nella stessa sessione.

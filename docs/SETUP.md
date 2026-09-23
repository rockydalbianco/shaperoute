# SETUP — Dal nulla al primo task (Windows)

Guida per chi non ha mai usato Git né il terminale. Si legge dall'inizio
alla fine, una volta sola. Circa un'ora.

Alla fine avrai: gli strumenti installati, il progetto su GitHub, il
metodo di lavoro in piedi e Claude Code avviato sul primo task.

Non serve sapere nulla in anticipo. Ogni comando è spiegato, e per ognuno
è scritto **cosa deve rispondere** se ha funzionato.

---

## Passo 0 — Il terminale

Tutto quello che segue si scrive in **PowerShell**, il terminale di Windows.

Per aprirlo: tasto Windows, scrivi `powershell`, Invio. Si apre una
finestra nera con una riga che finisce con `>`. Quella riga si chiama
prompt: è lì che scrivi.

Tre cose che servono e basta:

| Comando | Cosa fa |
|---|---|
| `pwd` | dice in quale cartella ti trovi adesso |
| `cd nome-cartella` | entra in una cartella (`cd ..` torna indietro) |
| `ls` | elenca i file della cartella corrente |

Per incollare nel terminale: **tasto destro**. Ctrl+V a volte non funziona.

Una cosa da sapere subito: il prompt di PowerShell inizia con `PS`, quello
del Prompt dei comandi no. Se un comando ti risponde `'irm' non è
riconosciuto`, sei nel posto sbagliato — chiudi e riapri PowerShell.

---

## Passo 1 — Installare i tre strumenti

### 1.1 Git

Git è il programma che tiene la storia delle modifiche al codice.

Scaricalo da [git-scm.com/downloads/win](https://git-scm.com/downloads/win)
e installalo. L'installer fa molte domande: **vanno bene tutte le risposte
predefinite**, clicca avanti fino alla fine.

Chiudi e riapri PowerShell, poi verifica:

```powershell
git --version
```

Deve rispondere qualcosa come `git version 2.47.1.windows.1`.

### 1.2 Python

Ti serve Python 3.11 o superiore. Hai PyCharm, quindi probabilmente c'è già:

```powershell
python --version
```

Se risponde `Python 3.11.x` o superiore, sei a posto. Se risponde con un
errore o apre il Microsoft Store, installalo da
[python.org/downloads](https://www.python.org/downloads/) — e durante
l'installazione **spunta la casella «Add python.exe to PATH»**, è la prima
schermata ed è quella che quasi tutti saltano.

### 1.3 Claude Code

In PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Chiudi e riapri PowerShell, poi verifica:

```powershell
claude --version
```

Deve rispondere un numero di versione. Se dice che il comando non esiste,
riapri il terminale: il percorso viene aggiornato solo alla riapertura.

Serve un abbonamento Claude Pro o Max: il piano gratuito non include
Claude Code.

---

## Passo 2 — Configurare Git la prima volta

Git firma ogni modifica col tuo nome. Va detto una volta sola, per sempre.

```powershell
git config --global user.name "Riccardo"
git config --global user.email "tua@email.com"
git config --global init.defaultBranch main
```

L'ultima riga fa sì che il ramo principale si chiami `main` e non `master`.
Tutta la documentazione del progetto dice `main`, quindi serve.

Verifica:

```powershell
git config --global --list
```

Devi vedere le tre righe che hai appena scritto.

---

## Passo 3 — Mettere lo starter al posto giusto

Il progetto va in una cartella normale del disco.

**Non metterlo in una cartella sincronizzata con OneDrive.** OneDrive e Git
lavorano sugli stessi file nello stesso momento e si pestano i piedi: file
bloccati, conflitti, cartelle `.git` corrotte. È il singolo errore che
causa più grattacapi ai principianti su Windows.

Il posto giusto per te è accanto ai tuoi progetti PyCharm:

```powershell
cd ~\PycharmProjects
```

Ora estrai lì dentro `shaperoute-starter.zip` (tasto destro sul file →
Estrai tutto), in modo da ottenere `PycharmProjects\shaperoute`.

Entra nella cartella e guarda cosa c'è:

```powershell
cd ~\PycharmProjects\shaperoute
ls
```

Devi vedere `CLAUDE.md`, `README.md`, `docs`, `samples`. Se vedi invece una
cartella `shaperoute` dentro `shaperoute`, l'estrazione ha creato un
livello in più: entra in quella interna.

---

## Passo 4 — Il primo commit

Adesso trasformi la cartella in un repository Git.

```powershell
git init
```

Risponde `Initialized empty Git repository in ...`. Da questo momento Git
osserva la cartella.

```powershell
git add .
```

Non risponde niente. Il punto significa «tutti i file». `add` prepara i
file da salvare, non li salva ancora.

```powershell
git commit -m "Initial commit: project documentation and structure"
```

Risponde con l'elenco dei file salvati. Un commit è una fotografia del
progetto in questo istante, con un'etichetta.

```powershell
git log --oneline
```

Vedi una riga: il tuo primo commit. Premi `q` per uscire.

---

## Passo 5 — GitHub

### 5.1 Account

Se non ce l'hai, crealo su [github.com](https://github.com). Usa la stessa
email del Passo 2.

### 5.2 Una decisione da prendere ora

Qui c'è un ostacolo reale, e conviene saperlo prima che ti blocchi.

Su GitHub, la **protezione del ramo `main`** — quella che impedisce di
scrivere per sbaglio sul ramo principale e obbliga a passare da una Pull
Request — è gratuita **solo sui repository pubblici**. Su un repository
privato richiede GitHub Pro, circa 4 $ al mese.

Tre strade:

| Scelta | Cosa ottieni | Cosa perdi |
|---|---|---|
| **Repository pubblico** | protezione gratuita, tutto il metodo funziona | il codice è visibile a chiunque |
| **Privato + GitHub Pro** | protezione e riservatezza | ~4 $ al mese |
| **Privato gratuito** | riservatezza | nessuna protezione automatica |

Per questo progetto **il pubblico è la scelta ragionevole**: non c'è niente
di segreto nel codice (le chiavi stanno in `.env`, che non entra mai nel
repository), l'idea non è protetta dal codice sorgente, e in più diventa
qualcosa da mostrare. La visibilità si può cambiare in qualsiasi momento
dalle impostazioni del repository.

Se scegli **privato gratuito**, va bene lo stesso: il metodo resta identico,
semplicemente niente ti impedisce tecnicamente di sbagliare, e la disciplina
la metti tu. In quel caso salta il Passo 6 e vai al Passo 7 con la variante
indicata.

### 5.3 Creare il repository

Su GitHub: pulsante **New** (o `+` in alto a destra → New repository).

- **Repository name**: `shaperoute`
- **Public** o **Private**, secondo quello che hai deciso sopra
- **Non spuntare nulla**: niente README, niente `.gitignore`, niente licenza

Quest'ultimo punto è importante. Quei file esistono già nello starter, e
farli creare anche a GitHub genera un conflitto al primo invio.

Clicca **Create repository**.

### 5.4 Collegare e inviare

GitHub ti mostra una pagina con dei comandi. Usa questi, sostituendo
`TUO-NOME` col tuo nome utente:

```powershell
git remote add origin https://github.com/TUO-NOME/shaperoute.git
git push -u origin main
```

Al primo `push` si apre il browser per l'autenticazione: accedi e autorizza.
Windows salva le credenziali, non te le richiederà più.

Ricarica la pagina del repository su GitHub: devi vedere i tuoi file.

---

## Passo 6 — Proteggere `main`

*(Salta questo passo se hai scelto privato gratuito.)*

Sul repository, **Settings** → **Rules** → **Rulesets** → **New ruleset** →
**New branch ruleset**.

Compila così:

- **Ruleset Name**: `protect main`
- **Enforcement status**: `Active` — va cambiato, il valore iniziale non protegge nulla
- **Target branches** → **Add target** → **Include default branch**
- Nelle regole, spunta:
  - **Restrict deletions**
  - **Require a pull request before merging**
  - dentro quest'ultima, metti **Required approvals** a `0`

Quello zero serve: lavorando da solo non puoi approvare le tue stesse Pull
Request, e con `1` resteresti bloccato senza capire perché.

Clicca **Create** in fondo.

La regola sui controlli di CI si aggiunge **dopo**: GitHub può elencare un
controllo solo dopo averlo visto girare almeno una volta. Ci torni alla
fine del Passo 7.

---

## Passo 7 — Verificare che funzioni davvero

Questo è il passo che quasi tutti saltano, ed è quello che conta. Una
protezione configurata e mai provata è una protezione che scopri non
funzionare nel momento peggiore.

### 7.1 Un branch e una Pull Request

```powershell
git switch -c chore/TASK-001-repo-setup
```

Crea un ramo nuovo e ci si sposta. Modifica una riga qualsiasi di
`docs/STATUS.md` (apri il file, cambia «Repository appena creato» in
«Repository creato e collegato a GitHub»), salva, poi:

```powershell
git add .
git commit -m "TASK-001: update status after repo setup"
git push -u origin chore/TASK-001-repo-setup
```

Vai su GitHub: c'è una striscia gialla con **Compare & pull request**.
Cliccala. Vedrai il template che si compila da solo. Compilalo e clicca
**Create pull request**, poi **Merge pull request**.

Torna in PowerShell e riallineati:

```powershell
git switch main
git pull
```

### 7.2 La prova che conta

Adesso prova a fare quello che non deve essere possibile. Modifica di nuovo
una riga di `docs/STATUS.md`, poi:

```powershell
git add .
git commit -m "test: this should be rejected"
git push
```

**Se hai la protezione attiva**, deve rispondere con un errore che parla di
`protected branch` e rifiutare l'invio. Ottimo: funziona. Annulla la prova:

```powershell
git reset --hard origin/main
```

**Se hai scelto privato gratuito**, il push passerà. È previsto. Annulla lo
stesso con il comando qui sopra, e ricordati che d'ora in poi sei tu a non
dover scrivere su `main`.

### 7.3 Aggiungere il controllo di CI

Dopo il primo merge, la CI ha girato almeno una volta. Torna in
**Settings** → **Rules** → `protect main` → **Edit**, spunta **Require
status checks to pass**, cerca `route-engine` nell'elenco e aggiungilo.
Salva.

---

## Passo 8 — Il primo avvio di Claude Code

```powershell
cd ~\PycharmProjects\shaperoute
claude
```

Al primo avvio chiede di accedere: si apre il browser, autorizzi, torni al
terminale.

Claude Code parte già dentro la cartella del progetto e legge da solo
`CLAUDE.md`. Il primo messaggio che gli scrivi è semplicemente:

```
Leggi docs/STATUS.md e dimmi qual è il prossimo passo.
```

Deve risponderti TASK-001, e a quel punto è già tutto fatto. Passa al
successivo:

```
Leggi docs/tasks/TASK-010.md ed eseguilo. Fermati prima di committare
e fammi vedere cosa hai scritto.
```

Nota come è formulato: **gli dai il riferimento al file, non incolli il
contenuto**. È il file che contiene i confini del task, e serve che li
legga da lì.

Tre abitudini che fanno la differenza:

- **Una sessione, un task.** Finito il task, esci con `/exit` e riapri.
  Le sessioni lunghe accumulano contesto inutile e peggiorano le risposte.
- **Leggi il codice prima di accettarlo.** Anche se non capisci tutto,
  guardalo. È il modo in cui impari il progetto.
- **Se comincia a girare a vuoto, chiudi.** Ripartire dal task file costa
  meno che insistere.

---

## Passo 9 — Node e l'app sul telefono (dalla fase 2)

L'app è scritta in TypeScript con Expo: per lanciarla servono **Node** sul
PC e l'app **Expo Go** sul telefono. Tutti e due sono gratuiti.

### 9.1 Node

Scaricalo da [nodejs.org](https://nodejs.org), versione **24 LTS**, e
installalo con le risposte predefinite. Chiudi e riapri PowerShell:

```powershell
node --version
```

Deve rispondere `v24.` seguito da altri numeri. Con Node arriva anche
`npm`, il programma che installa i pacchetti JavaScript.

### 9.2 Expo Go

Sul telefono, installa **Expo Go** dal Play Store (Android) o dall'App
Store (iPhone).

**Con l'iPhone serve anche un account Expo**, gratuito: Expo Go apre il
progetto solo se il PC e il telefono hanno fatto l'accesso con lo stesso
account. Crealo su [expo.dev](https://expo.dev/signup), accedi in Expo Go,
poi sul PC, dalla cartella `apps\mobile`:

```powershell
npx.cmd expo login
```

Con Android non serve.

### 9.3 Lanciare l'app

Dalla radice del repository:

```powershell
npm install
npm run mobile
```

`npm install` scarica le dipendenze in `node_modules/` (qualche minuto la
prima volta, poi niente). `npm run mobile` avvia Expo e mostra un codice
QR: inquadralo con Expo Go (Android) o con la fotocamera (iPhone). Telefono
e PC devono stare sulla **stessa rete Wi-Fi**. La prima volta Windows
chiede se Node può usare la rete: consenti sulle reti private.

Si ferma con `Ctrl+C`. I controlli che fa la CI si lanciano così:
`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`.

Se PowerShell risponde `npm.ps1 cannot be loaded because running scripts
is disabled`, scrivi `npm.cmd` al posto di `npm` (`npm.cmd run mobile`):
è lo stesso comando, senza lo script che Windows blocca.

Dopo il primo giro della CI con l'app, aggiungi il controllo `mobile` alle
regole di `main`, come al passo 7.3 per `route-engine`.

### 9.4 Posizione e mappa

La prima volta l'app chiede di usare la posizione. In Expo Go la richiesta
e l'impostazione sono di **Expo Go**, non di ShapeRoute: per cambiarla,
Impostazioni → Expo Go → Posizione. Con «Mai» si prova il caso senza
posizione, con la ricerca di una città o una via; «Mentre usi l'app» la
rimette.

Mappa e ricerca hanno bisogno di internet sul telefono, oltre al Wi-Fi
verso il PC. Nessuna chiave da mettere in `.env`.

---

## Il ciclo di tutti i giorni

Una volta finito il setup, ogni sessione di lavoro è sempre questa:

```powershell
cd ~\PycharmProjects\shaperoute
git switch main
git pull
git switch -c feat/TASK-XXX-descrizione

claude
# ... lavori ...

git add .
git commit -m "TASK-XXX: cosa hai fatto"
git push -u origin feat/TASK-XXX-descrizione
# poi su GitHub: Pull Request, merge
```

I comandi che userai davvero, e nient'altro:

| Comando | Cosa fa |
|---|---|
| `git status` | cosa è cambiato — **usalo continuamente** |
| `git switch main` | torna al ramo principale |
| `git switch -c nome` | crea un ramo nuovo e ci entra |
| `git pull` | scarica le modifiche da GitHub |
| `git add .` | prepara tutte le modifiche |
| `git commit -m "..."` | le salva con un'etichetta |
| `git push` | le invia a GitHub |
| `git log --oneline` | la storia dei commit (`q` per uscire) |
| `git diff` | cosa esattamente è cambiato (`q` per uscire) |

Se sei confuso su dove ti trovi, `git status` risponde quasi sempre.

---

## Quando qualcosa va storto

| Errore | Cosa significa | Cosa fare |
|---|---|---|
| `'git' non è riconosciuto` | Git non installato, o terminale non riaperto | chiudi e riapri PowerShell |
| `'claude' non è riconosciuto` | stesso motivo | chiudi e riapri PowerShell |
| `fatal: not a git repository` | non sei nella cartella giusta | `cd ~\PycharmProjects\shaperoute` |
| `remote origin already exists` | hai già collegato GitHub | `git remote set-url origin <url>` |
| `Updates were rejected` | GitHub ha commit che tu non hai | `git pull`, poi riprova il push |
| `protected branch` | stai scrivendo su `main` | crea un branch: `git switch -c feat/...` |
| Chiede utente e password al push | credenziali non salvate | usa il login dal browser, non la password |
| Vedi `(END)` o `:` e non risponde più | sei in un visualizzatore | premi `q` |
| `npm.ps1 cannot be loaded` | PowerShell blocca gli script | usa `npm.cmd` al posto di `npm` |
| Il telefono non apre l'app dal QR | telefono e PC su reti diverse, o firewall | stessa Wi-Fi; consenti Node sulle reti private |

Se ti blocchi su qualcosa che non è in questa tabella, copia l'errore per
intero e chiedilo: il messaggio d'errore contiene quasi sempre la risposta,
ma va saputo leggere.

---

## Cosa fare stasera, in breve

1. Passi 1 e 2: installare e configurare. Venti minuti.
2. Passi 3 e 4: starter e primo commit. Cinque minuti.
3. Passo 5: decidere pubblico o privato, creare il repository, inviare.
4. Passi 6 e 7: proteggere e **verificare**.
5. Passo 8: avviare Claude Code e chiedergli il prossimo passo.

Se ti fermi a metà non è un problema: aggiorna `docs/STATUS.md` con dove
sei arrivato e riprendi domani da lì. È esattamente a questo che serve
quel file.

# PASSAGGIO — Come riprendere il progetto con un altro account

> Scritto dal coordinatore il 2026-09-28, quando l'utente ha fermato gli
> agenti per passare il progetto a un collega. Chi riprende legge questo
> file, poi `CLAUDE.md`, `docs/STATUS.md` e il task file del suo task.
> Si lavora **uno alla volta**, non in contemporanea.

## Dove siamo

`main` = il merge della PR #94 (TASK-081), più questo passaggio.

**Fatto e in `main`** (2026-09-24/28): catalogo con 11 forme (cerchio,
cuore, stella, cavallo, luna, gatto, pesce, farfalla, lumaca, testa di
cane, testa di coniglio); parole A–Z; lettere squadrate nel motore
(`style="block"`, non ancora nell'app); forma da un'immagine, con
anteprima del contorno nell'app; navigazione a voce con `along`
(«beside Via Roma»); niente «fuori tracciato» per un solo punto GPS
storto; partenze vicine per il cuore (vince la forma migliore, anche con
partenza spostata fino a circa 1 km); API raggiungibile da fuori casa con
Tailscale, chiave dell'API facoltativa, pacchetto Docker e guida
`docs/DEPLOY.md`.

**Aperto**:

| Cosa | Stato | Cosa manca |
|---|---|---|
| PR #97, TASK-070 modalità tasca | CI verde | aggiornare il branch con `main` (conflitto solo in `docs/STATUS.md`), prova sull'iPhone, merge |
| TASK-080 | approvato, non iniziato | lo stile delle lettere (normale / squadrato) come scelta nell'app: `RouteRequest`, API, `shared-types`, un selettore accanto al campo della parola. Nel motore c'è già `plan_route(..., style="block")` (ADR-0072) |
| TASK-083 | approvato, non iniziato | provare EAS Update: l'app pubblicata su Expo e aperta da Expo Go senza Expo acceso sul PC. Serve l'indirizzo dell'API scritto nell'app (`EXPO_PUBLIC_API_URL`, TASK-081). Il login a Expo lo fa l'utente. Se serve `expo-updates`, chiedere prima |
| TASK-079 | approvato, non iniziato | modificare il contorno ricavato da un'immagine: aggiungere una parte (unita alla sagoma), aggiungere dettagli come occhi (tratti attaccati alla linea, fatti andata e ritorno), annullare. **Sempre un tratto solo** |
| TASK-067 | in coda, da rivedere | lettere unite dall'alto e scala per lettera; dopo TASK-071 (scartato) e TASK-077 si sa che lettere più piccole si leggono peggio |

I numeri (aggiornati il 2026-10-01): il prossimo task libero è
**TASK-092**; **TASK-110 … 122** sono riservati alla parte social
(`ROADMAP.md`, «La parte social»), quindi dopo TASK-109 si salta a
TASK-123. Il prossimo ADR libero è **ADR-0093**; ADR-0062 è riservato e non
usato, ADR-0086 … 0089 sono liberi ma saltati (la parte social ha preso
0090 … 0092). Prima di prendere un numero, controllare anche i branch
remoti e i worktree (`CLAUDE.md`).

**Idee non ancora approvate** (serve l'ok dell'utente sul cosa): scegliere
fra più percorsi alternativi; registrare le richieste dell'API su file, per
rifare un percorso visto nell'app; seconda ricerca fino a 2 km solo se
serve (TASK-063, proposta 1: cambia i percorsi); ritaglio della zona senza
copia del grafo (TASK-063, proposta 2); voce a telefono davvero bloccato
(serve una build propria, cioè l'account Apple Developer); nuove forme da
gpsart.info (zucca e albero di Natale sono state provate in TASK-078 ma non
sono nel catalogo).

## Passare il progetto a un collega

1. **GitHub.** Il repository `rockydalbianco/shaperoute` è pubblico:
   chiunque può scaricarlo, ma per aprire e mergiare Pull Request il
   collega deve essere **collaboratore**. Lo aggiunge l'utente: su GitHub,
   repository → Settings → Collaborators → Add people. Il collega accetta
   l'invito dall'email.
2. **Il PC del collega.** Segue `docs/SETUP.md`: Git, Python 3.12, Node,
   Claude Code, l'ambiente dell'API (passo 10), `npm.cmd install` dalla
   radice, Expo Go sul telefono con il **suo** account Expo.
3. **Le mappe delle zone.** La cache (circa 4 GB: Trento, Levico,
   Valsugana, Milano e zone di prova) non è nel repository. Due strade:
   copiarla da `D:\shaperoute-data\cache` di questo PC con una chiavetta o
   un disco condiviso, dentro `data\cache` del suo checkout; oppure
   lasciarla riscaricare dall'API alla prima richiesta di ogni zona (lento,
   e Overpass a volte non risponde).
4. **Segreti.** Nessuno nel repository. Se si usa la chiave dell'API
   (`docs/DEPLOY.md`, «La chiave dell'API»), la si passa a voce o in un
   messaggio privato, mai in un file del repository. Ognuno ha il suo `.env`
   copiato da `.env.example`.
5. **Tailscale.** Il piano gratuito ammette fino a 6 utenti: l'utente può
   invitare il collega nella sua rete privata, oppure il collega ne crea
   una sua, con il suo PC come server (`docs/DEPLOY.md`, strada A).
6. **Claude.** Il collega apre Claude Code, con il suo account, sulla
   cartella del repository. Le conversazioni degli agenti non passano da un
   account all'altro: il contesto sta in `CLAUDE.md`, `docs/STATUS.md`,
   `docs/DECISIONS.md`, `docs/tasks/` e in questo file. Il primo messaggio
   può essere: «Leggi docs/PASSAGGIO.md e CLAUDE.md, poi riprendi dalla
   PR #97».
7. **Uno alla volta.** Prima di passare la mano: tutto committato e
   pushato, PR mergiate o scritte qui sopra come aperte. Chi riprende parte
   sempre con `git switch main` e `git pull`.

## Come si è lavorato (da tenere)

- Un task = un branch = una PR; i merge li approvava l'utente scrivendo
  «merge N». Prima del merge: CI verde, diff uguale ai «File toccati» del
  task, nessun conflitto (`git merge-tree --write-tree --name-only
  origin/main origin/<branch>`).
- `gh pr merge N --merge` **senza** `--delete-branch`: cancellerebbe il
  branch locale di un worktree. Il branch remoto lo cancella GitHub.
- **Worktree su D:** (`D:\shaperoute-TASK-XXX`). C: di questo PC è quasi
  pieno: niente installazioni né zone nuove su C:. La cache delle zone sta
  in `D:\shaperoute-data\cache`, e `data\cache` del checkout principale è un
  collegamento (junction) a quella cartella.
- La RAM di questo PC è poca (7 GB): al massimo 2 calcoli pesanti insieme.
- Dopo un merge che aggiunge pacchetti all'app: `npm.cmd install` dalla
  radice del checkout principale (è successo con `expo-speech` ed
  `expo-image-picker`).
- **Prima di una prova sull'iPhone**, controllare chi occupa la porta 8000
  (`netstat -ano | findstr :8000`): un'API vecchia accesa da un'altra
  cartella risponde al posto di quella nuova, e l'app dice «The app and the
  API do not agree».
- Candidati di forme e lettere: campioni su Trento, Levico e Milano, una
  pagina di giudizio con sì / quasi / no, e il giudizio dell'utente scritto
  in `samples/LOG.md`. Nel catalogo entra solo quello che l'utente approva
  (ADR-0036).
- A fine task: STATUS e task file aggiornati, poi contesto pulito
  (`/clear`).

## Pulizia su questo PC

Worktree rimasti, tutti senza lavoro da salvare: `D:\shaperoute-TASK-065`,
`D:\shaperoute-TASK-076`, `D:\shaperoute-TASK-081` (già mergiati) e
`D:\shaperoute-TASK-070` (PR #97 aperta: tenerlo finché non è mergiata, o
ricrearlo). In `D:\shaperoute-TASK-065` ci sono due righe di chiusura non
committate (STATUS e task file di TASK-065): sono già entrate in `main` con
questo passaggio, quindi si può togliere con `--force`. Per toglierne uno,
dalla cartella principale:

```powershell
git worktree remove --force D:/shaperoute-TASK-065
```

```powershell
git branch -D feat/TASK-065-animal-catalog
```

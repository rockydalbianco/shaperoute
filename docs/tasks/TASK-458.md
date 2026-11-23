# TASK-458 — Iscrizione e chat: i punti minori

**Stato**: In lavorazione · 2026-11-23
**Fase**: 5 · **Branch**: `fix/TASK-458-signup-chat-minor`
**ADR**: ADR-0403 (le bolle gialle di chi scrive), dato dal Coordinatore
il 23 novembre 2026; cita ADR-0383 e ADR-0279 senza toccarne le voci ·
numero dal Coordinatore l'11 novembre 2026 (S10, S13 e «H» di
`out/prova-app-2026-11-11/PROPOSTE.md`), confermato da «Coordinatore
(fork 3)» il 23 novembre 2026

## Obiettivo

Nella prova dell'11 novembre 2026, sul lato social:

- **S10, iscrizione**: nessun «occhio» per vedere la password; iOS propone
  la sua password forte e copre il modulo.
- **S13, chat**: schermo vuoto senza spunti, bolle proprie dello stesso
  grigio di quelle dell'altro, nessun allegato visibile; nell'elenco nessun
  «nuovo messaggio».

Alla fine: chi si iscrive vede quello che scrive quando vuole, iOS sa quali
campi sono il nome dell'account e la password; una conversazione nuova dice
qualcosa, le proprie bolle si riconoscono, e dall'elenco si può cominciare a
scrivere a qualcuno.

## Cosa era ancora vero il 23 novembre 2026 (`origin/main` 5c1041f9)

Sono passati dodici giorni (TASK-455, TASK-468, TASK-469 in mezzo):

| Punto | Stato | Cosa si fa |
|---|---|---|
| S10 occhio | ancora vero | l'occhio nel campo della password, in «Sign up» e «Log in» |
| S10 foglio di iOS | da guardare nel simulatore | i campi detti giusti a iOS (sotto); il foglio «Use Strong Password?» è di iOS e non si toglie senza rinunciare alla password forte |
| S13 chat vuota | ancora vero: solo «No messages yet.» | scelta dell'utente (testi) |
| S13 bolle | ancora vero: `surfaceRaised` le proprie, `surface` col bordo le altre | scelta dell'utente (colore) |
| S13 allegati | **non è un difetto**: il «+» (foto, video, disegno) c'è da TASK-333, ma solo a conversazione aperta; una richiesta è solo testo (ADR-0289, punto 1). Nella prova la conversazione era nuova | al più una riga che lo dica, coi testi della chat vuota |
| S13 «nuovo messaggio» | ancora vero | un tasto accanto al titolo «Messages» (`tabs/MessagesPage.tsx`) |

L'elenco vuoto dei messaggi è della #1513 (TASK-339 C1), aperta il 23
novembre: `messages/ConversationList.tsx` e `Messages.test.tsx` **non si
toccano qui**. Un'azione dentro l'elenco vuoto, se l'utente la vuole, viene
dopo.

## Cosa fare

1. **Iscrizione** (scelte tecniche, decise dall'agente su delega
   dell'utente):
   - l'occhio dentro il campo «PASSWORD», disegnato con viste (l'app non ha
     icone né SVG); un tocco mostra il testo, un altro lo nasconde; il testo
     scritto resta. VoiceOver: «Show password» / «Hide password»;
   - l'email è `textContentType="username"` in tutti e due i moduli: è il
     nome con cui si entra, e il Portachiavi la salva con la password. Prima,
     all'iscrizione, era `emailAddress` e lo username del profilo
     `nickname`: iOS poteva tenere quello accanto alla password;
   - lo username del profilo è `none`;
   - la password nuova ha `passwordRules` = «minlength: 8; maxlength: 128;»
     (da `PASSWORD_LENGTH`): la password forte proposta da iOS è una che il
     server accetta.
2. **Chat** (scelte dell'utente, una per volta): colore delle proprie
   bolle, cosa dice una conversazione nuova, il tasto «New message».

## Le scelte dell'utente

- **Colore delle proprie bolle** (23 novembre 2026): «Bolle gialle come il
  tema dell'app». Parole dell'utente, date nella sessione «Pompo:
  suggerimenti e ottimizzazioni» e riferite da lei; le proposte erano A blu
  tenue, B chiaro pieno, C neutro col bordo forte. È un'eccezione alla
  regola «il giallo è solo del percorso» (`tokens.ts`, `docs/UI.md`,
  ADR-0383): è ADR-0403. La scelta era arrivata da un'altra sessione;
  **confermata dall'utente qui sulle schermate prima/dopo il 23 novembre
  2026: «Sì, gialle così»**.
  Come è fatto (deciso dall'agente su delega dell'utente): fondo
  `color.accent`, parole e orario `color.onAccent` (13:1, uguale in ogni
  tono: `palettes.test.ts`); nessun token nuovo. Quello che la bolla porta
  — un disegno, un post, una live, una foto — sta su una piastra
  `surfaceRaised` dentro il giallo: la linea di un disegno è gialla anche
  lei, e le schede scrivono coi colori del tono. Le bolle dell'altro
  restano `surface` col bordo.
  Parere della 469 (via Coordinatore, 23 novembre): ADR-0383 «il giallo
  mai come tinta» parla della tinta del vetro (`glass.*`); la bolla è una
  **faccia piena `accent`, non vetro**, quindi ADR-0403 cita 0383 senza
  farne un'eccezione. Tre regole: (1) la bolla resta opaca nei tre modi
  (vetro, «Riduci trasparenza», «Aumenta contrasto»), niente velature
  gialle né `glass.*` tinti; (2) un eventuale rilievo usa `glassRaise`
  com'è, senza colori nuovi — oggi non ne ha; (3) che il giallo si
  intraveda sotto l'header di vetro va bene. La (1) è nel test.
- **Chat vuota** (23 novembre 2026): «A, con gli spunti», scelta data qui.
  Al centro la foto (64) e il nome di chi si scrive, la riga «Say hi to
  {name}.» e tre spunti a capsula: «Hi {name}!», «I like your drawings»,
  «Shall we run together?». Un tocco scrive il testo nella casella e non
  invia niente. Vale con lo stato `first` e con `open`, finché non c'è
  nessun messaggio; sostituisce «No messages yet.», che esce dalle tabelle.
  Sotto la riga della richiesta (`first`) una riga in più: «Photos, videos
  and drawings come after that.» — è la risposta a «nessun allegato
  visibile». La riga vecchia resta com'è (la controlla `Messages.test.tsx`,
  che è della #1513).
- **«New message»** (23 novembre 2026): «A, capsula col testo», scelta
  data qui (l'altra era un tondo col «+»). Un tasto neutro a capsula col
  testo «New message» accanto al titolo «Messages» apre una pagina sua:
  chi si sente già, poi chi si segue, la ricerca per nome; un tocco apre
  la conversazione, niente parte da lì.

## Testi nuovi (ognuno col sì dell'utente prima del merge)

| Inglese | Italiano | Dove | Sì |
|---|---|---|---|
| Show password | Mostra la password | VoiceOver sull'occhio | — |
| Hide password | Nascondi la password | VoiceOver sull'occhio | — |
| Say hi to {name}. | Saluta {name}. | chat vuota | inglese: sì (scelta A) |
| Hi {name}! | Ciao {name}! | spunto | inglese: sì |
| I like your drawings | Mi piacciono i tuoi disegni | spunto | inglese: sì |
| Shall we run together? | Corriamo insieme? | spunto | inglese: sì |
| Writes it in the box. Nothing is sent yet. | Lo scrive nella casella. Non viene ancora inviato niente. | VoiceOver sugli spunti | — |
| Photos, videos and drawings come after that. | Foto, video e disegni vengono dopo. | sotto la riga della richiesta | inglese: sì |
| New message | Nuovo messaggio | tasto e titolo della pagina | inglese: sì (scelta A) |
| Search someone by name to write to them. | Cerca qualcuno per nome per scrivergli. | pagina «New message» senza nessuno | — |

Tedesco, spagnolo e francese sono in `src/i18n/`. Riusati, non nuovi:
«Search people», «Close», «Loading…», «Nobody has a name like that.»,
«Message {name}» (VoiceOver sulle righe). Tolto: «No messages yet.».

## Criteri di accettazione

- [x] L'occhio mostra e nasconde la password senza perdere il testo, in
      «Sign up» e «Log in», anche al primo tasto dopo averla nascosta
      (`SignInScreen.test.tsx`, e nel simulatore).
- [x] I campi dicono a iOS nome dell'account, password nuova e regole
      (`SignInScreen.test.tsx`).
- [x] Nel simulatore: scrivere la password con l'occhio aperto e chiuso;
      cosa fa il foglio «Use Strong Password?» coi campi nuovi (sopra).
- [ ] Le proprie bolle gialle con le parole scure, quelle dell'altro
      neutre; l'allegato di una propria bolla su una piastra neutra
      (`ChatMinor.test.tsx`).
- [x] Il giallo delle bolle confermato dall'utente sulle schermate
      («Sì, gialle così», 23 novembre 2026).
- [ ] Una conversazione senza messaggi offre i tre spunti, che scrivono
      nella casella senza inviare; in una richiesta dice che i file vengono
      dopo (`ChatMinor.test.tsx`).
- [ ] «New message» accanto al titolo apre la pagina, che elenca chi si
      sente e chi si segue una volta sola, cerca per nome e apre la
      conversazione (`NewMessage.test.tsx`).
- [ ] Testi nuovi approvati dall'utente, in cinque lingue.
- [ ] Schermate prima/dopo: iscrizione, chat vuota, chat con messaggi,
      elenco.
- [ ] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova.

## File toccati

```
apps/mobile/src/screens/SignInScreen.tsx
apps/mobile/src/screens/SignInScreen.test.tsx
apps/mobile/src/messages/ConversationScreen.tsx
apps/mobile/src/messages/ConversationScreen.test.tsx   (solo se un'asserzione esistente cambia)
apps/mobile/src/messages/ChatLook.test.tsx              (idem)
apps/mobile/src/messages/Attachments.test.tsx           (idem)
apps/mobile/src/messages/NewMessage.tsx                 (nuovo)
apps/mobile/src/messages/NewMessage.test.tsx            (nuovo)
apps/mobile/src/messages/ChatMinor.test.tsx             (nuovo)
apps/mobile/src/tabs/MessagesPage.tsx
apps/mobile/src/ui/backLayersOwners.test.ts             (solo se il foglio nuovo va iscritto)
apps/mobile/src/ui/edgeBackOwners.test.ts               (idem)
apps/mobile/src/theme/tokens.ts                         (solo il commento di `accent`: nessun valore cambia)
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/UI.md
docs/tasks/TASK-458.md
```

Lista approvata dal Coordinatore il 23 novembre 2026. `STATUS.md`,
`DECISIONS.md` e `INDEX.md` in una PR di soli documenti, alla fine.

## Dove siamo

- 2026-11-23: verifica fatta, lista approvata; l'occhio e i campi di iOS e
  le bolle gialle in un commit (`4a99dba7`), coi test verdi in locale:
  `SignInScreen.test.tsx`, tutta `src/messages` (77 test),
  `i18n/tables.test.ts`, `tsc`, `prettier`, `eslint` sui file toccati.
  PR #1519 aperta come bozza. Poi, in un secondo commit, la chat vuota con
  gli spunti e «New message» (pagina e tasto), coi test verdi:
  `src/messages` più `MessagesTab` e `TabLanding` (107 test), le tabelle,
  `tsc`, `eslint`, `prettier`. Le tre scelte dell'utente sono fatte.
  Restano: le schermate (turno del simulatore dal
  Coordinatore), la conferma del giallo sulle schermate, i testi
  approvati nelle cinque lingue, `docs/UI.md`.
- 2026-11-23, simulatore (iPhone 17e, iOS 27, Expo Go, API di prova su
  8051 con un PostGIS usa e getta e quattro account finti): schermate
  prima/dopo in `out/TASK-458/shots/` del worktree (fuori da git).
  - **L'occhio**: su iOS un campo che torna segreto si svuota al tasto
    dopo. iOS manda due eventi: il campo vuoto, poi subito la lettera sola.
    Corretto con `afterKey` in `SignInScreen.tsx`: la lettera va dopo il
    testo che c'era, un «cancella» toglie una lettera sola; riprovato nel
    simulatore (testo + lettera, e «cancella»).
  - **Il foglio «Use Strong Password?»**: compare ancora quando si tocca
    la password di «Sign up», coi campi nuovi come coi vecchi. È un foglio
    di iOS: sta al posto della tastiera, copre le caselle e il pulsante ma
    non i tre campi, e si chiude con la «×». Toglierlo vuol dire non
    dichiarare la password come nuova (niente password forte, niente
    salvataggio proposto): non fatto. Nel simulatore «Fill Strong
    Password» non riempie (nessun Portachiavi iCloud).
  - Chat vuota con gli spunti, bolle gialle con la piastra sotto il
    disegno, capsula «New message» e la sua pagina con la ricerca: come
    nei test. Non fotografato il tono chiaro.
  - Visto e **non toccato** (c'è anche su `main`): con una conversazione
    aperta dalla scheda «Messages», l'header dell'app resta sopra la riga
    del titolo e copre la «←». Segnalato al Coordinatore.
  - Nel simulatore i tasti mandati in fretta si perdono, e fuori da un
    campo la «r» ricarica Expo Go: una lettera, una pausa.

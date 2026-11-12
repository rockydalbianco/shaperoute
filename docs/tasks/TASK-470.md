# TASK-470 — Il controllo della navigazione

**Stato**: Done — A e B in produzione (OTA 13); E, C, D in `main`, escono con l'OTA 14
**Fase**: 5 · **Branch**: `docs/TASK-470-part-0`, poi una per fetta
(`fix/TASK-470-…`) · **ADR**: ADR-0384 (il gesto dal bordo, fetta E)

## Obiettivo

Le schede della barra, lo swipe fra le pagine, la chiusura di pagine e fogli
(«←», tasto indietro di Android, gesto dal bordo su iOS) e la fluidità
funzionano come dice `docs/UI.md`. Prima l'elenco dei difetti (parte 0),
poi le correzioni a fette, una PR per gruppo di file, ognuna con un test
deterministico per ogni difetto corretto.

Chiesto dall'utente il 2026-11-12, mentre TASK-469 cambiava la barra: la
capsula di vetro della #1219 (`tabs/TabBar.tsx`) è di TASK-469 e qui non si
tocca.

## Contesto da leggere

- `docs/UI.md` «Le pagine e la barra di schede», «Il movimento della barra»,
  «Fogli e liste»

## Parte 0 — I difetti

Trovati leggendo il codice, con test jest dove si può e con un calcolo per
la molla del punto 6. «Simulatore»: il comportamento vero dipende dalla
piattaforma e va guardato al turno (dopo l'OTA del 2026-11-12, coda del
Coordinatore). Nessuno dei difetti sta in `tabs/TabBar.tsx`.

| # | Difetto | Dove | Piattaforma | Nasce in |
|---|---|---|---|---|
| 1 | Un tocco su una scheda mentre le pagine scorrono ancora porta alla scheda accanto | barra, tutte le schede | Android probabile, iOS da vedere | `tabs/TabShell.tsx` (`onScroll`, `restOn`) |
| 2 | Il tasto indietro con una pagina aperta sopra le schede cambia scheda sotto, o esce dall'app | pagine sopra le schede (tabella sotto) | Android | le pagine, senza ascoltatore; lo prende `tabs/TabShell.tsx` |
| 3 | Il profilo con «←» (aperto dal cuore senza account) esce dall'app col tasto indietro | «Profile» dalla mappa | Android | `screens/ProfileScreen.tsx`, barra rifatta in `App.tsx` |
| 4 | La pagina di un giorno di sci prende il tasto indietro anche da un'altra scheda | modalità sci, «Days» | Android | `skimode/SkiDayPage.tsx` |
| 5 | Il tocco su «Feed» già attivo riporta in cima anche le liste nascoste | «Feed», «All»/«Following»/«Style» | iOS e Android | `tabs/tabReselect.ts`, `screens/FeedScreen.tsx`, `feed/StyleLens.tsx` |
| 6 | Un foglio chiuso blocca i tocchi per ~0,4 s dopo essere sparito | tutti i fogli di `SheetModal` | iOS (Android da vedere) | `ui/SheetModal.tsx` |
| 7 | Da un post aperto, il profilo dell'autore di un commento non si vede | «Feed» → post → commenti | iOS e Android | `feed/PostPage.tsx` (`Modal`) sopra `screens/ProfileLayer.tsx` |
| 8 | «Play» aperto da una notifica con il profilo aperto finisce sotto | profilo/impostazioni + notifica | iOS e Android | `App.tsx` (ordine dei livelli) |
| 9 | Un disegno aperto da una pagina che non è una scheda non mostra la mappa (poi compare tornando a una scheda) | messaggi della modalità sci; «Find friends» sopra «Play» | iOS e Android, simulatore | `App.tsx` (`screen` → `"map"` solo da una scheda) |
| 10 | «Map» dalla pagina di un giorno di sci perde la pagina: «←» torna alla lista | modalità sci, «Days» | iOS e Android | `App.tsx`, `skimode/SkiDaysPage.tsx` |
| 11 | Nessuna pagina sopra le schede si chiude col gesto dal bordo sinistro | tutte | iOS | manca: non c'è un gesto in tutta l'app |

### Come si riproducono

1. Su «Draw», uno swipe verso «Messages» lasciando il dito a metà; mentre
   la pagina scivola, toccare «Explore». Se lo scorrimento rimasto
   continua dopo il tocco (lo scatto animato della pagina su Android; su
   iOS il `scrollTo` del tocco forse ferma la spinta), a fine corsa
   `restOn` porta l'app alla scheda dopo «Explore». In jest succede.
2. Aprire «Feed», poi «Draw»; aprire la campanella (o una conversazione,
   un profilo, un concorso) e premere indietro: la scheda sotto diventa
   «Feed», la pagina resta aperta; un altro indietro cambia ancora scheda,
   finché l'app esce. Appena aperta l'app, una conversazione e indietro:
   l'app esce. Su «Play» e sulla mappa la barra non c'è: indietro esce sempre.
3. Senza account, una strada di «Explore» sulla mappa, il cuore: si apre
   «Profile» con «←». Indietro: l'app esce invece di tornare alla mappa (la
   barra, rifatta dopo la mappa, non ha pagine prima).
4. Modalità sci, «Days», aprire un giorno, toccare «Resorts», indietro: il
   primo tocco chiude di nascosto il giorno, solo il secondo cambia scheda.
5. «Feed» con un account: scorrere «All», passare a «Following», toccare
   l'icona di «Feed»: tornando ad «All», è in cima. `UI.md`: ogni scheda ha
   la sua posizione.
6. Aprire i commenti, chiuderli e toccare subito una scheda: il tocco non
   arriva. `SheetModal` tiene il suo `Modal` trasparente finché la molla
   `smooth` è ferma (0,58 s); un foglio alto 250–600 pt è fuori schermo
   dopo 0,08–0,18 s. Da misurare al simulatore.
7. «Feed» → un post → «Comment» → toccare la foto di chi ha commentato: il
   foglio si chiude e non succede niente; chiudendo il post, sotto c'è il
   profilo. Lo stesso per una notifica toccata col post aperto.
8. Aprire «Settings», toccare la notifica di una forma sbloccata: «Play» si
   apre sotto «Settings», la barra sparisce senza vedersi.
9. Modalità sci: «Messages» dell'header → una conversazione → un disegno:
   la conversazione si chiude, la mappa non compare; «‹ Back» porta a una
   scheda e lì compare la mappa.
10. Modalità sci, «Days», un giorno, «Map»: «←» dalla mappa porta alla lista
    dei giorni, non al giorno (la barra smontata ha perso lo stato).
11. Su iOS, da una conversazione, da «Settings» o da un post, il gesto dal
    bordo sinistro non fa niente: si torna solo con «←». È una funzione che
    manca, non un errore: farla è una scelta dell'utente.

### Il tasto indietro di Android, schermata per schermata

Nell'app solo tre punti ascoltano il tasto indietro: `TabShell` (la scheda
di prima, poi esce), `SkiMessages`, `SkiDayPage`. Un `Modal` lo riceve con
`onRequestClose`; una pagina fatta di viste no.

| Schermata | Com'è fatta | Indietro oggi |
|---|---|---|
| Conversazione, «Message requests» (`MessagesOverlay`) | vista sopra l'app | cambia scheda sotto / esce (2) |
| Campanella (`BellOverlay`) | vista | cambia scheda / esce (2) |
| «Find friends», profilo di un altro (`PeopleScreen`) | vista | cambia scheda / esce (2) |
| Concorso e archivio (`ContestPage`) | vista | cambia scheda / esce (2) |
| «Settings», «Edit profile», «Favorites», «ABOUT» (`ProfileScreen`) | vista | cambia scheda / esce (2) |
| «Profile» con «←» dalla mappa (`OwnProfile`) | scheda | esce (3) |
| «Play», premi, collezione (`PlayOverlay`, `PlayScreen`) | vista, barra smontata | esce (2) |
| Mappa di un percorso o di un disegno (`MapScreen`) | vista, barra smontata | esce (2) |
| Località sciistica (`ResortPage`) | vista dentro una scheda | cambia scheda / esce (2) |
| Giorno di sci (`SkiDayPage`) | vista dentro una scheda | chiude, anche da fuori schermo (4) |
| Messaggi della modalità sci (`SkiMessages`) | vista, suo ascoltatore | va bene |
| Post, commenti, ricerca, «Share», foto, fogli (`SheetModal`) e gli altri `Modal` | `Modal` | va bene |
| Allenamento in palestra, nuoto in piscina, conto alla rovescia, tasca | `Modal`, `onRequestClose` vuoto | non fa niente: voluto (commentato) |
| Cuore del super like | `Modal` senza `onRequestClose` | niente per ~1 s, si chiude da solo |
| Corsa e navigazione | barra smontata | l'app va in secondo piano: non toccato (TASK-305) |

## Le fette proposte

Le correzioni di 1–5 sono scritte e provate in jest in locale (branch
`fix/navigation-check`, non spinto); entrano a fette dopo il sì del
Coordinatore sulla lista dei file.

- **A — schede** (1, 5, e la base per 2): `tabs/TabShell.tsx`,
  `tabs/TabShell.test.tsx`, `tabs/tabReselect.ts`, `screens/FeedScreen.tsx`,
  `feed/StyleLens.tsx`; nuovi `ui/backLayers.ts` (la pila delle pagine
  aperte: indietro chiude l'ultima, come la sua «←», prima della barra),
  `ui/androidBack.testing.ts` e i test.
- **B — il tasto indietro** (2, 3, 4): una riga per pagina in
  `messages/MessagesOverlay.tsx`, `bell/BellOverlay.tsx`,
  `screens/PeopleScreen.tsx`, `contest/ContestPage.tsx`,
  `screens/ProfileScreen.tsx`, `game/PlayOverlay.tsx`, `game/PlayScreen.tsx`,
  `ski/ResortPage.tsx`, `skimode/SkiDayPage.tsx`, `screens/MapScreen.tsx`;
  nuovi i test. Dopo A.
- **C — i fogli** (6): `ui/SheetModal.tsx`, dopo la misura al simulatore;
  `ui/motion.ts` solo con molle nuove (la #1225 legge quelle di oggi).
- **D — i livelli** (7–10): `App.tsx`, `screens/ProfileLayer.tsx`,
  `skimode/SkiDaysPage.tsx`, dopo il merge della #1205 (TASK-457) e al
  turno di `App.tsx`.
- 11 solo con la scelta dell'utente.
- **E — il gesto dal bordo su iOS** (11): scelta dell'utente del
  2026-11-12, «A, la pagina segue» (ADR-0384). `ui/EdgeBack.tsx`
  (`useEdgeBack` sulla radice di ogni pagina sopra l'app) e una modifica
  alla radice di `MessagesOverlay`, `BellOverlay`, `PeopleScreen`,
  `ContestPage`, `ProfileScreen` (le pagine dentro «Profile», non la
  scheda), `PlayOverlay`.

## Dove sono le fette

| Fetta | PR | Stato |
|---|---|---|
| Parte 0 | #1232 | in `main` |
| A — schede (1, 5, base del 2) | #1233 | in produzione: OTA 13, 2026-11-12 13:28Z da `100624e2` (iOS gruppo `86d0f643`, Android `5155f4d2`) |
| B — tasto indietro di Android (2, 3, 4) | #1237 | in produzione con l'OTA 13 |
| E — gesto dal bordo su iOS (11, ADR-0384) | #1243 | in `main` (`b79556c3`); video visto dall'utente, sì del 2026-11-12 |
| C — fogli che perdevano i tocchi (6) | #1250 | in `main` (`89b25f99`) |
| D — pagine finite sotto altre (7–10) | #1252 | in `main` (`D_MERGE`); provata al simulatore il 2026-11-12 |

**Al simulatore il 2026-11-12** (`out/TASK-470/`, fuori dal repository):
- 6: dalla chiusura di un foglio al `Modal` tolto 573 ms; un tocco su
  «Drawings» della ricerca in quel tempo è andato perso. Con la C ~270 ms.
- 11: sulle pagine sopra l'app («Guide») il gesto segue il dito, torna se
  lasciato prima di un terzo, chiude col colpo, e la barra sotto non si
  muove. **Dentro una scheda no**: su una pagina di prova dentro «Explore»
  il colpo dal bordo chiudeva la pagina e faceva scorrere anche le schede
  (lo scroll nativo della striscia non si ferma per il gesto JS). Per questo
  la località e il giorno di sci (dentro le schede della modalità sci)
  restano senza gesto, col tasto indietro di Android e la «←».

**Seguito possibile, non in questo task**: il gesto dal bordo anche sulle
pagine dentro una scheda chiederebbe a `TabShell` di fermare il suo swipe
mentre il gesto ha il dito (lo `scrollEnabled` della striscia, o un gesto
nativo che ha la precedenza).

## Criteri di accettazione

- [x] Parte 0: ogni difetto con schermata, piattaforma, come si riproduce e
      file dove nasce.
- [x] Ogni difetto corretto ha un test deterministico; test dei file
      toccati e `tsc` verdi in locale, CI verde.
- [x] Guardati al simulatore il 2026-11-12: 6 (573 ms misurati), 11 (sopra
      l'app sì, dentro una scheda no), 7–10 prima del merge della D. 1 e 2
      non riproducibili al simulatore iOS (1 nasce dallo scatto di Android,
      2 è il tasto indietro di Android): coperti dai test.

## File toccati

```
docs/tasks/TASK-470.md
```
Poi, per fetta, quelli elencati sopra.

## Fuori scope

- La barra di vetro di TASK-469 (#1219, #1225).
- Corsa e navigazione (`FreeRunScreen`, `RunDashboard`: TASK-305).
- Il gesto dal bordo su iOS senza la scelta dell'utente.

## Esito

Tutti i difetti 1–11 sono corretti, ognuno con un test: tocco su una
scheda durante lo swipe, tasto indietro di Android su ogni pagina sopra
l'app (pila `ui/backLayers.ts`), liste nascoste del Feed, fogli che
perdevano i tocchi per 573 ms (ora ~270 ms), profilo sopra il post (le
pagine del livello disegnate dentro il `Modal` del post), «Play» da una
notifica sopra le pagine aperte, la mappa da «Play» e dai messaggi della
modalità sci, il giorno di sci dopo «Map», e il gesto dal bordo su iOS
(ADR-0384, scelta dell'utente). Il gesto non c'è sulle pagine dentro una
scheda: il seguito possibile è scritto qui sopra. Visto per caso e
passato al Coordinatore, fuori task: nella scheda del Feed di un post di
corsa i numeri sono minuscoli sotto le etichette. Video in
`out/TASK-470/` (fuori dal repository).

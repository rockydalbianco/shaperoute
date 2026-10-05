# TASK-184 — «Help», «Terms», «Privacy»: la mini guida e le prime bozze

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-184-help-terms-privacy`
**Dipende da**: TASK-177 (la pagina «Settings»), TASK-210 (le lingue
dell'app), TASK-183 (il numero di telefono, ADR-0150)

## Obiettivo

Le tre voci di «About» in «Settings» smettono di dire «Soon»: «Help» apre
una mini guida dell'app, «Terms» e «Privacy» le prime **bozze** dei due
testi legali. Chiesto dall'utente il 2026-10-05: «su aiuto fai una mini
guida, termini inizia a farle, privacy inizia a svilupparla». Solo app:
niente API, niente database, nessuna dipendenza nuova.

## Scelte dell'utente (2026-10-05)

- **Chi gestisce Sgrava e l'indirizzo a cui scrivere sono segnaposto**,
  per ora: le bozze mostrano `[name]` e `[contact email]` così come sono,
  ben visibili. Li riempie l'utente prima di approvare. Nessun nome e
  nessun indirizzo veri nel codice.
- **«Terms» e «Privacy» sono bozze, e lo dicono**: una riga visibile in
  cima, «Draft — not final yet.», finché l'utente non le approva. Niente
  deve sembrare definitivo.
- **Il numero di telefono** dell'account (TASK-183, ADR-0150) è
  facoltativo e privato, e serve a farsi trovare dagli amici che lo hanno
  già, con una ricerca dalla rubrica che ancora non c'è: «Privacy» lo
  dice.

## Contesto da leggere

- `docs/UI.md` («Settings», «Cosa esce dal telefono»)
- `docs/DATABASE.md` («Schema di partenza», «Copie di sicurezza»,
  «Privacy dei dati di posizione»)
- `docs/DECISIONS.md` ADR-0114 (account, 16 anni, cancellazione),
  ADR-0150 (email e numero), ADR-0198 e ADR-0102 (pubblicità, consenso),
  ADR-0156 (Strava), ADR-0177 (mappe sul telefono), ADR-0101 (gli eventi
  delle ricerche), ADR-0172 (le lingue)
- `docs/API.md` («Registro delle richieste»), `docs/DEPLOY.md` («Il
  registro delle richieste e le posizioni»)
- `site/content.js` (TASK-237: il sito è la guida dell'app, le stesse
  parole)
- `apps/mobile/src/profile/SettingsPage.tsx`,
  `apps/mobile/src/screens/ProfileScreen.tsx`,
  `apps/mobile/src/settings/LanguageSetting.tsx`, `apps/mobile/src/i18n/`

## Cosa fare

1. **I testi come dati**, in file nuovi sotto `apps/mobile/src/about/`:
   titolo, bozza o no, data, sezioni con titolo, paragrafi ed elenchi. In
   **inglese e italiano**; con tedesco, spagnolo e francese l'app mostra
   l'inglese finché le bozze non sono approvate. I testi lunghi non
   passano da `t()`; le frasi corte dell'interfaccia sì.
2. **«Help»**: una mini guida in undici sezioni brevi, con le parole del
   sito. **«Terms»** e **«Privacy»**: prime bozze in parole semplici;
   «Privacy» dice solo quello che documenti e codice confermano.
3. **Le schermate**: le tre righe diventano pulsanti e aprono il testo
   come pagina di «Profile», con «←» che torna a «Settings».
4. Test deterministici; `UI.md`, ADR-0205, `STATUS.md`.

## Criteri di accettazione

- [x] «Help», «Terms» e «Privacy» in «Settings» sono pulsanti: ognuno
      apre il suo testo, e «←» torna a «Settings» com'era.
- [x] «Terms» e «Privacy» cominciano con «Draft — not final yet.» e «Last
      updated: 5 October 2026»; «Help» no.
- [x] `[name]` e `[contact email]` sono nelle due bozze, in evidenza; in
      nessun testo c'è un indirizzo email, un link o un numero (lo prova
      un test).
- [x] «Privacy» dice a cosa serve il numero di telefono e come si
      cancella l'account, con cosa sparisce.
- [x] Con l'app in italiano i testi sono in italiano; con tedesco,
      spagnolo e francese in inglese, e la riga della bozza nella lingua
      dell'app.
- [x] Italiano e inglese hanno le stesse sezioni, blocco per blocco.
- [x] VoiceOver: i titoli sono intestazioni; il testo è letto nella sua
      lingua.
- [x] Restano «Soon» solo le due righe di «Notifications» (TASK-185).
- [x] Nessun colore scritto a mano, nessuna dipendenza nuova.
- [x] `tsc`, `expo lint`, Prettier e i test dell'app verdi.
- [ ] L'utente ha riempito i segnaposto e approvato le due bozze (dopo
      questo task: finché non succede restano bozze).

## File toccati

```
apps/mobile/src/about/
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-184.md
```

`src/about/` è tutta nuova: `documents.ts`, `content/en.ts`,
`content/it.ts`, `AboutPage.tsx`, `AboutRows.tsx`, `AboutScreen.tsx` e i
loro test. In `SettingsPage.tsx` esce il gruppo «ABOUT» da `COMING` ed
entrano le tre righe (`AboutRows`) e la prop `onAbout`; in
`ProfileScreen.tsx` tre valori nuovi di `ProfilePage` e la schermata del
testo sopra «Settings». `ProfileLayer.tsx` non è toccato. Nelle quattro
tabelle delle lingue entrano due righe, in cima.

**`SettingsPage.tsx`, il suo test, `UI.md` e `STATUS.md` li ha toccati
anche TASK-182** (PR #351), entrata in `main` mentre questo branch era
aperto: `main` è unito qui dentro (un solo conflitto, nel test di
«Settings»). Uniti i due, restano «Soon» le due notifiche e i pulsanti di
«Settings» sono 10 (foto, email, numero, lingua, unità, tre testi, due
uscite).

## Fuori scope

- **Approvare i testi**: è dell'utente, con un legale. Questo task
  consegna bozze.
- Tedesco, spagnolo e francese dei tre testi: dopo l'approvazione.
- Una pagina web con la privacy (l'App Store chiede un indirizzo): è di
  TASK-152 e del sito (TASK-237).
- Segnalare un contenuto dall'app (TASK-121), la scelta sul consenso della
  pubblicità riaperta da «Settings», scaricare i propri dati dall'app.
- Le due righe di «Notifications» (TASK-185).

## Esito

Fatto il 2026-10-05, solo app. I tre testi sono dati in
`src/about/content/` (inglese e italiano, undici sezioni la guida,
quattordici le condizioni, diciotto la privacy); `AboutPage` li mostra,
`AboutRows` sono le tre righe, `AboutScreen` è la pagina con «←» sopra
«Settings», che resta sotto com'era (ADR-0205). `ProfileLayer.tsx` non è
servito.

2154 test dell'app verdi (260 file; 49 nuovi in `src/about/`, uno in più
nel test di «Settings»), `tsc`, `expo lint` e Prettier puliti, con `main`
unito (compresa la PR #351 di TASK-182).

Non visto in un simulatore né su un telefono: lo coprono i test. **Da
guardare sull'iPhone**: la lunghezza delle righe, la riga della bozza, e
che «←» riporti «Settings» al punto in cui era (la pagina sotto resta
montata e nascosta: sul telefono non è stato provato).

### Frasi nuove dell'interfaccia (nelle cinque lingue)

| Inglese | Italiano | Dove |
|---|---|---|
| Draft — not final yet. | Bozza — non ancora definitiva. | in cima a «Terms» e «Privacy» |
| Last updated: {date} | Ultimo aggiornamento: {date} | sotto, con «5 October 2026» / «5 ottobre 2026» |

Tedesco «Entwurf – noch nicht endgültig.», «Zuletzt aktualisiert: {date}»;
spagnolo «Borrador: todavía no es definitivo.», «Última actualización:
{date}»; francese «Brouillon — pas encore définitif.», «Dernière mise à
jour : {date}». «Help», «Terms», «Privacy», «ABOUT» e «Back» c'erano già.
I titoli dei testi («How Sgrava works», «Terms of use», «Privacy policy»;
«Come funziona Sgrava», «Condizioni d'uso», «Informativa sulla privacy»)
stanno nei testi, non nelle tabelle.

### Punti aperti per l'utente

1. **`[name]`**: chi gestisce Sgrava (una persona o una società; la
   privacy vuole anche un recapito). Compare in «Terms» e «Privacy».
2. **`[contact email]`**: l'indirizzo a cui scrivere. Compare nei tre
   testi.
3. **`[governing law]`** in «Terms»: la legge applicabile e il foro.
4. **Le basi giuridiche** in «Privacy» («Why we may use your data»): la
   sezione c'è, con un segnaposto; va scritta con un legale.
5. **Un legale deve leggere le due bozze** prima dell'App Store. Sono
   scritte da un agente, in parole semplici, sui fatti dei documenti.
6. **Mancano tedesco, spagnolo e francese**: con quelle lingue i tre
   testi sono in inglese (la riga della bozza è tradotta).
7. **La data** «5 October 2026» va cambiata quando i testi cambiano o
   vengono approvati; tolta la bozza (`draft: false` in
   `content/en.ts` e `it.ts`), la riga in cima sparisce.
8. **Il prezzo**: le condizioni non dicono che l'app è gratuita. È una
   promessa: la decide l'utente.
9. **«La faremo sapere prima»**: condizioni e privacy dicono che una
   modifica importante viene fatta sapere prima che valga. Oggi non c'è
   un modo (niente posta, niente notifiche): va deciso come.
10. **Segnalare un contenuto**: dall'app non si può (TASK-121 è Todo). Le
    condizioni dicono di scrivere a `[contact email]`, e non promettono
    le 24 ore di ADR-0114, punto 8.
11. **«Non vendiamo i tuoi dati»** non c'è scritto: è una promessa, la
    decide l'utente.
12. **Gli eventi delle ricerche restano senza limite di tempo**
    (ADR-0101: «mai cancellati»). La bozza lo dice com'è; un legale può
    chiedere un limite.
13. **«Units» nella guida** dice quello che fa la parte A di TASK-182
    («For now the miles show in «My activities», in «Favorites» and in
    «Explore».»): con la parte B la riga va aggiornata.
14. **I nomi nel testo italiano** sono quelli che l'app in italiano
    mostra oggi: alcuni sono ancora in inglese («Feed», «Draw», «Start»,
    «Pause», «Discard», «Bike», «Paddle»). Quando TASK-210 li traduce, va
    aggiornato `content/it.ts`.
15. **TASK-208 B** (descrizione, foto, tag e «chi lo vede» di un disegno)
    e **TASK-092** (i percorsi generati tenuti nel database, ADR-0086)
    cambiano quello che l'app tiene: quando arrivano, «Privacy» va
    aggiornata. Oggi la tabella `generated_routes` non esiste, e la
    bozza non ne parla.
16. **L'indirizzo web della privacy** per l'App Store non c'è: è di
    TASK-152 e del sito.
17. Le bozze descrivono **l'app della build propria**: in Expo Go la
    pubblicità non c'è.

### Cosa «Privacy» non dice, perché non si è potuto verificare

Tutto quello che c'è nella bozza viene da `UI.md`, `DATABASE.md`,
`API.md`, `DEPLOY.md`, dagli ADR citati e dal codice. Lasciato fuori, o
detto solo in parte:

- **Le basi giuridiche** di ogni trattamento: segnaposto nel testo.
- **Gli indirizzi IP nei log tecnici del server**: il log di uvicorn
  scrive il client di ogni richiesta (dietro Caddy, che non ha un suo log
  degli accessi in `deploy/Caddyfile`), e non si sa per quanto Docker lo
  tiene. La bozza dice solo che il server vede l'indirizzo mentre
  risponde e che nel database non ce ne sono.
- **Cosa raccoglie l'SDK di AdMob** e dove Google lo tratta: la bozza
  rimanda all'informativa di Google. Non verificato nemmeno se dall'app
  si può **cambiare la scelta sul consenso** dopo la prima volta.
- **I trasferimenti fuori dall'Unione Europea** (Google, Strava, Expo,
  unpkg): non detti.
- **Cosa ricevono Expo** (gli aggiornamenti) **e unpkg** (la libreria
  della mappa) oltre alla richiesta: sono solo nominati.
- **Il registro delle richieste spento sul server**: `DEPLOY.md` dice che
  la variabile resta vuota; sul server non è stato guardato.
- **L'AI sul server**: `AI.md` dice che l'unico modello è Ollama, sulla
  stessa macchina dell'API; se sul server pubblicato è acceso non si sa.
  La bozza dice solo che le parole sono lette sul nostro server e non
  vanno a un servizio esterno.
- **Le copie fuori dal server** (Storage Box Hetzner): `STATUS.md` dice
  che manca ancora che l'utente lo crei. La bozza dice «Hetzner, in
  Germania, 13 giorni», vero in tutti e due i casi; non dice dove stanno
  le copie degli eventi delle ricerche.
- **La posizione con l'app chiusa o lo schermo spento**: non verificato,
  non detto.
- **Chi vede l'elenco di chi segui e di chi ti segue**: non detto.
- **Cosa succede alle chiavi di Strava con «Disconnect Strava»**: la
  bozza dice solo che il server le tiene «finché è collegato».
- **La portabilità**: dall'app non si scaricano i propri dati; la bozza
  dice di chiederne una copia scrivendo.
- **Entro quanto si risponde a una richiesta**: non scritto.
- **Gli admin** (ADR-0114, punto 8) e cosa possono vedere: non detto.
- **L'età**: c'è solo la casella «I am at least 16»; nessuna verifica.

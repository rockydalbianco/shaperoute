# TASK-523 — Lo stile di Alimentazione e Stretching in tutta l'app

**Stato**: In lavorazione · parte 0 chiusa il 2026-11-27; parte A: A1 (i
colori di sezione, #1700) in `main`, A2 (il kit, #1707) aperta. Nessuna
schermata è ancora cambiata. Prossime: B (Accesso), poi T quando il
Coordinatore dà il via su `tabs/TabBar.tsx`.
**Fase**: 5 · **Branch**: uno per parte (`feat/TASK-523-a1-section-colours`,
`feat/TASK-523-a2-kit`, …)
**Dipende da**: TASK-489 parte H (la pagina animata di Alimentazione, in
`main`), TASK-520 (lo schizzo v2 dello Stretching, approvato, non ancora
codice), TASK-469 (il vetro «Capsula» di barre, tab e fogli)
**ADR**: ADR-0417 · numeri dal Coordinatore (fork 3) il 2026-11-27, su
richiesta diretta dell'utente

## Obiettivo

Parole dell'utente, 2026-11-27: «copia lo stile che abbiamo appena creato
dell'alimentazione e dello stretching per copiarlo in tutta l'app, dalla
registrazione alle impostazioni alla sezione disegno…».

Alla fine ogni pagina dell'app ha lo stesso aspetto di Alimentazione e del
nuovo Stretching: un riquadro grande in alto, card con angoli morbidi,
anelli che si riempiono, numeri che contano, righe che entrano a cascata e
un colore per sezione. Cambia solo l'aspetto: nessuna funzione nuova,
nessun dato nuovo, nessuna chiamata nuova al server.

## Che cos'è «lo stile»

Da Alimentazione (489 H, in `main`): card con intestazione, `Ring` ed
`EnergyRings`, `CountUp`, `ui/Cascade`, `WeekStrip`.
Dallo schizzo v2 dello Stretching (520): un colore per gruppo su card col
velo tinto, riquadro in alto con anelli, griglie a due colonne.

## Scelte dell'utente (2026-11-27)

Una domanda alla volta, con la proposta dell'agente; le parole sono sue.

1. «Va bene l'approccio: prima un kit condiviso, poi una schermata alla
   volta, nell'ordine Accesso → Impostazioni → Disegno → resto?» →
   **«Sì, approvo»**. Il vetro di 469 resta su barre, tab e fogli; il nuovo
   stile vale per il contenuto delle pagine.
2. «Un colore per sezione con le liste neutre, oppure un solo accento?» →
   **«Sì, uno per sezione»**. Il colore solo dove dà carattere (riquadro in
   alto, anelli, icone delle card); le liste lunghe restano neutre. Nelle
   Impostazioni ogni gruppo ha la sua icona quadrata colorata.
3. Lo schizzo di Accesso, Impostazioni e Disegno, in quattro giri:
   - «Cambio qualcosa»: «sotto l'isola deve rimanere con lo stile che
     stavamo facendo liquid glass con le iconone di prima magari però
     colorate» e «Più colore e animazioni»;
   - a lavoro in corso: «il logo muw sempre stile giallo però» e «magari
     evita i colori rosellini e più elegante»;
   - «Cambio ancora»: «nella prima tieni solo il cuore e stile sempre
     giallo un po ma poco più scuro»;
   - sulla quarta versione: **«Sì, approvo»**.
4. La barra delle schede (dopo le misure, vedi «La barra delle schede»):
   «Va bene la capsula colorata sulla scheda aperta?» → **«Sì, la
   capsula»**.
5. I valori veri dei cinque colori, su una tavola in chiaro e in scuro col
   viola accanto a quello dei carboidrati e l'albicocca accanto al corallo
   degli avvisi: «Vanno bene i cinque colori, in chiaro e in scuro?» →
   **«Sì, vanno bene»**.

Lo schizzo approvato: https://claude.ai/artifact/Lv6FnzHFoF3RkAswzwE2Cn
(sorgenti nel checkout principale, `out/stile-app/canvas/project/`).

### Che cosa dice lo schizzo approvato

- **Accesso**: tutto in giallo, appena più scuro del giallo dell'app. Nel
  riquadro in alto solo il cuore che si disegna da solo e il logo MuW vero
  (`docs/brand/muw-logo.svg`). Selettore «Create account / Sign in», campi
  coi testi di oggi, spunta dei 16 anni, pulsante giallo.
- **Impostazioni**: card del profilo in alto, tre scorciatoie (Sport, Tone,
  Language), poi i gruppi di oggi (ACCOUNT, PREFERENCES, NOTIFICATIONS,
  FEEDBACK, ABOUT) con un'icona quadrata colorata per riga; righe neutre;
  «Log out» in fondo.
- **Disegno**: riquadro in alto col segno dell'utente e poi il percorso
  giallo sulle strade, l'anello «Roads follow your drawing»; «WHAT YOU
  DRAW» in quattro card a due colonne; la distanza con − e +; «Draw route».
- **La barra delle schede** (nelle parole dell'utente «l'isola»; nell'app
  l'isola è la capsula della corsa in registrazione): resta la capsula di
  vetro di 469 con le icone grandi di oggi (casa, lente, matita,
  aeroplanino, foto del profilo). Lo schizzo approvato le mostrava ognuna
  col colore della sua sezione: le misure hanno detto di no, vedi «La barra
  delle schede».
- **In tutte**: righe a cascata, numeri che contano, anelli che si
  riempiono; con «Riduci movimento» tutto è fermo e già al suo posto.

### La tavolozza dello schizzo

| Sezione | Colore | Nello schizzo |
|---|---|---|
| Accesso, logo, percorso | giallo | `#F0BF22` (Accesso), `accent` `#FFD02B` (percorso) |
| Disegno | albicocca | `#F5A066` |
| Profilo | viola | `#A99BFF` |
| Explore, Account | ciano | `#4DD2FF` |
| Feed, Notifiche | sabbia | `#E3C596` |
| Messaggi, Feedback | verde | `#4FD08A` |

Niente rosa e niente sfumature tra due colori diversi. Il rosa del gruppo
«Intimacy» dello Stretching (520) è un'altra decisione e qui non si tocca.

I valori veri (parte A1, `color.section`), dal più scuro al più chiaro
gradino di ogni tono; approvati dall'utente sulla tavola:

| Token | Tono scuro | Tono chiaro | Tinta |
|---|---|---|---|
| `draw` | `#F5A066` → `#FFBC8F` | `#7A3A08` → `#8F4510` | albicocca, nuova |
| `profile` | `#A99BFF` → `#C4BAFF` | `#3F2FA3` → `#4B39BF` | viola di `stretch.moments` |
| `explore` | `#4DD2FF` → `#6EDBFF` | `#005370` → `#006A8F` | ciano di `stretch.sports` |
| `feed` | `#E3C596` → `#EED9B5` | `#5E4712` → `#6B5118` | sabbia, nuova |
| `messages` | `#4FD08A` → `#7BE3AA` | `#095428` → `#0F6B35` | verde di `food` |

Il peso (489 K1) non ha un colore: l'utente ha scelto il colore del testo,
perché il viola era troppo vicino a quello dei carboidrati (`carbs`).

## La barra delle schede (parte T): la capsula, non le icone

Misure fatte con la matematica di `theme/glass.test.ts` (nessun codice):
sul vetro vero il fondo è la tinta del tono (60–68%) sopra la foto. Tono
scuro con foto bianca: per 4,5:1 serve un colore con L ≥ 0,893; tono chiaro
con foto nera: L ≤ 0,012. Lo stesso `color.text` passa di poco. I colori
dello schizzo in scuro su foto bianca: sabbia 3,03, ciano 2,86, verde
2,56, albicocca 2,41, viola 2,10. Quindi né le icone colorate né «colore
pieno solo sull'icona aperta» reggono.

Scelta dell'utente, d'accordo la sessione di 469: **la capsula della scheda
aperta si riempie del colore della sezione, opaca, con l'icona scura
sopra** (tra 8:1 e 12:1 con qualsiasi foto dietro); le altre icone restano
come oggi; a scheda chiusa la foto del profilo non ha bordo colorato.

Per chi scrive la parte T (da 469):
- la capsula è un pezzo pieno sopra il vetro, non una tinta del vetro; il
  suo posto è quello di `glass.selected` (`styles.capsule`);
- le capsule sono tre (`moves`, i giri -1/0/1 dello swipe dal profilo al
  Feed) e scivolano sul driver nativo, dove un colore non si interpola:
  cinque strati, uno per colore, ognuno con l'opacità presa da `at`
  attorno al suo indice;
- un «colore sopra» per sezione e per tono, misurato in un test;
- le icone spente restano `color.text` sul vetro vero e `textMuted` sul
  velo; la barra ha anche le icone di sci e allenamento;
- con «Riduci trasparenza» la barra è opaca: misurare anche lì;
- prima delle foto per l'utente, misurare nel simulatore
  (`out/TASK-469/tools/contrast.py`): i conti sono solo il pavimento.

## Le pagine e il vetro (da 469, per le parti B–G)

- Niente di proprio nella fascia della barra o dell'header: la velatura è
  del vetro. In fondo `useTabBarRoom()`, sotto l'header `useUnderHeader()`.
- I colori del contenuto possono passare sotto il vetro.
- Fogli: `useGlassSheet()`, `{glassBack}` primo figlio, nessun
  `backgroundColor` dopo `glassSheet`; sul vetro solo `color.text` e
  `color.textMuted`.
- Mai un genitore con l'opacità che parte da 0 sopra del vetro vero (le
  entrate a cascata).
- `expo-glass-effect` solo via `ui/NativeGlass.tsx`. Tutto in `docs/UI.md`.

## Che cosa non è deciso (si chiede all'utente nella parte che lo tocca)

- Il giallo «appena più scuro» dell'Accesso: token nuovo o `accent` com'è.
  Si decide con le foto del simulatore della parte B.
- La riga di benvenuto sotto il logo: è un testo nuovo (cinque lingue). Lo
  schizzo ha un segnaposto; senza un sì la riga non c'è.
- «Profile 78% complete» nella card delle Impostazioni: nello schizzo è
  solo un esempio. Sarebbe una funzione nuova: non è promessa e non si fa
  senza una scelta dell'utente.
- Il tono chiaro: lo schizzo è solo scuro. Ogni parte mostra anche il
  chiaro prima del sì.
- Le schermate dopo le prime tre (Profilo, Feed, Explore, Messaggi, fine
  attività, sport): ognuna ha il suo schizzo o le sue foto prima del codice.

## Parti

Ogni parte: lista dei file al Coordinatore **prima** del codice; foto del
simulatore prima/dopo, chiaro e scuro, e il sì dell'utente prima del merge.

- **A — il kit condiviso**, in due PR.
  - **A1, i colori** (#1700, in `main`): `theme/tokens.ts` (solo aggiunte:
    il gruppo `section`), `theme/palettes.test.ts`,
    `theme/sectionContrast.test.ts` (nuovo).
  - **A2, i pezzi** (#1707): solo file nuovi in `apps/mobile/src/ui/`,
    ognuno col suo test: `tint.ts`, `SectionHeader.tsx`, `SectionCard.tsx`,
    `IconSquare.tsx`, `HeroCard.tsx`, `Tile.tsx`, `RingStat.tsx`.
    `nutrition/Ring.tsx` e `CountUp.tsx` restano di 489: `RingStat` li
    importa, non li sposta.
- **B — Accesso**: `screens/SignInScreen.tsx` e il suo test.
- **C — Impostazioni**: `profile/SettingsPage.tsx`, le righe in
  `settings/*`.
- **D — Disegno**: `route/RoutePanel.tsx` e i pezzi del modulo «Draw».
- **T — la capsula colorata della barra delle schede**: `tabs/TabBar.tsx`
  è di 469; la parte la fa questo task, d'accordo con quella sessione,
  quando il Coordinatore dà il via (dopo la correzione di 469 alle icone
  spente). Vedi «La barra delle schede».
- **E — Profilo** · **F — Feed, Explore, Messaggi** · **G — fine attività
  e pagine degli sport**: liste dei file all'avvio di ciascuna; diverse
  schermate appartengono a task in corso (489, 466, 520, 495, 479).

## Ordine (dal Coordinatore, 2026-11-27)

`tokens.ts`: prima #1562 e #1621 di 469 (taglio nativo), poi 489 L e 520
parte A (chi è pronto prima), **poi la parte A di questo task**: il kit
dipende da quei colori. Le parti B–G vengono dopo A, una alla volta.

## Decisioni tecniche per l'ADR-0417

Decise dall'agente su delega dell'utente, salvo dove è scritto «utente».

1. **Vetro e contenuto** (utente, d'accordo il Coordinatore): il vetro di
   469 è di barre, tab e fogli; lo stile di questo task è del contenuto
   delle pagine. Dove si toccano (intestazioni, fogli, barra delle schede)
   decide 469.
2. **Un colore per sezione** (utente): token nuovi in `tokens.ts`, in
   chiaro e in scuro, ognuno col suo test di contrasto (testo 4,5:1 sul
   velo tinto; icone e anelli 3:1). Nessun colore scritto a mano.
3. **Il giallo** resta del percorso, del logo e dell'Accesso; rosso e verde
   di mangiato/consumato non cambiano significato.
4. **Kit di soli file nuovi** in `ui/`: nessun file di un altro task viene
   spostato o riscritto per farlo.
5. **Animazioni** con `Animated` e le molle di `ui/motion.ts`, come oggi:
   nessuna dipendenza nuova. Con «Riduci movimento» ogni pezzo del kit è
   fermo e completo (`ui/useReduceMotion`).
6. **Una schermata per PR**, ognuna dietro il sì dell'utente sulle foto.

## Criteri di accettazione

- [ ] Parte A: il kit in `ui/` coi test (A2, #1707, aperta); i token nuovi
      coi test di contrasto in chiaro e in scuro, nessun valore esistente
      cambiato (A1, #1700, fatto).
- [ ] Ogni schermata rifatta usa solo il kit e i token (nessun colore a
      mano) e passa i suoi test.
- [ ] «Riduci movimento»: nessuna animazione, contenuto completo.
- [ ] Bersagli di tocco ≥ 44 punti; etichette di accessibilità invariate.
- [ ] Per ogni parte: foto prima/dopo in chiaro e scuro e il sì dell'utente.
- [ ] Nessun testo nuovo senza il sì dell'utente e le cinque lingue.

## File toccati

Parte 0: `docs/tasks/TASK-523.md`. Parte A: vedi «Parti» (A1 tre file in
`theme/`, A2 quattordici file nuovi in `ui/`); documenti:
`docs/tasks/TASK-523.md`, `docs/DECISIONS.md`, `docs/UI.md`. Le altre
parti: la lista esatta va al Coordinatore prima di ognuna.

## Registro

- 2026-11-27 — parte 0: tre domande, quattro giri di schizzo, «Sì,
  approvo». Numeri TASK-523 / ADR-0417 dal Coordinatore. Nessun codice.
- 2026-11-27 — barra delle schede: misure sul vetro, risposta di 469,
  schizzo aggiornato, «Sì, la capsula».
- 2026-11-27 — parte A: elenco dei file approvato dal Coordinatore; tavola
  dei colori, «Sì, vanno bene»; A1 #1700 in `main`; A2 #1707 aperta;
  ADR-0417 scritto.

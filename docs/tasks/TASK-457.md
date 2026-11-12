# TASK-457 — Profilo nuovo

**Stato**: In lavorazione · parte 0 chiusa il 2026-11-12 (scelte dell'utente)
**Fase**: 5 · **Branch**: `feat/TASK-457-new-profile`
**Dipende da**: TASK-423 E2b (#1144) e TASK-462 B (#1172), già in `main`
**ADR**: nessuno (ADR-0380 offerto dal Coordinatore e reso: sono scelte
d'aspetto, stanno qui e in `docs/UI.md`) · numero dal Coordinatore l'11
novembre 2026 (S9 e «F» di `out/prova-app-2026-11-11/PROPOSTE.md`)

## Obiettivo

Nella prova dell'11 novembre 2026 un profilo appena creato mostrava nove
zeri (Distance, Elev. gain, Likes, Requests, Followers, Following,
Favorites, My activities, più «This week: –»), tre badge grigi senza una
parola, e le righe «Guide» e «Blocked people» in mezzo alle statistiche.
Alla fine: un profilo vuoto invita a fare la prima cosa invece di contare
zeri, i badge dicono come si prendono, e sul profilo resta solo ciò che
parla di chi lo guarda.

## Le scelte dell'utente (parte 0, 2026-11-12)

1. **Profilo vuoto** — «Invito al posto dei totali»: finché l'account non ha
   nessuna attività spariscono i tre totali (Distance, Elev. gain, Likes) e
   la striscia della settimana; al loro posto una sola scheda con l'invito.
   I contatori Requests / Followers / Following restano come sono; le due
   tessere «Favorites» e «My activities» restano ma senza il numero «0».
   Alla prima attività tutto torna com'è oggi.
2. **Primo passo guidato** — porta a **«Explore»** (l'utente ha corretto la
   prima risposta: «no scusa ad explore»). Testi: titolo «Your first
   drawing», riga «Start from a route that already draws a shape near
   you.», pulsante «Find a route near you».
3. **Badge non presi** — «Sezione "Badges" più in basso»: sotto il nome
   restano solo i badge presi (come li vedono gli altri); quelli da prendere
   stanno in una sezione «Badges» più giù nel profilo, ognuno con la sua
   frase sempre visibile:
   - First drawing — «Record a run with MuW and publish its drawing.»
   - 10 drawings — «Publish 10 drawings of runs recorded with MuW.»
   - 30 km drawing — «Publish the drawing of a run of 30 km or more.» (la
     distanza nelle unità dell'app)
4. **«Guide» e «Blocked people»** — tutte e due via dal profilo, in
   «Settings»: «Blocked people» nella sezione ACCOUNT. Senza account
   «Guide» resta sotto «Sign up», com'è oggi.
5. **«Guide» = «Help»** (domanda in più, 2026-11-12): le due righe aprivano
   la stessa pagina («How MuW works» con «Watch the tour»). Scelta: «Una
   riga sola: resta "Help"». In ABOUT non si aggiunge niente.

## Come funziona

- **Lo stadio del profilo** (`profile/FirstStep.tsx`, `profileStage`):
  «active» appena un totale è sopra zero o «My activities» ne ha almeno
  una; «new» solo quando tutti e due sono arrivati e dicono zero;
  «unknown» finché un numero manca. `ProfileHome` mostra totali e
  settimana se «active», la scheda `FirstStep` se «new», nessuno dei due
  se «unknown»: un profilo con corse non vede mai l'invito mentre carica,
  uno nuovo non vede mai gli zeri. Con un'API senza i totali il profilo
  resta com'era.
- **La scheda** usa `ui/EmptyState` (il cuore, titolo, riga, un tasto
  neutro) dentro un riquadro come quello dei totali. Il tasto chiama
  `onExplore`, che scende da `App.tsx` (`showPage("explore")`) per
  `OwnProfile` → `ProfileScreen` → `ProfileHome`. Non c'era già una porta
  per cambiare scheda da dentro una pagina. Nella modalità sci la barra non
  ha «Explore»: lì `onExplore` non c'è e la scheda è senza tasto; lo stesso
  quando «Profile» è aperto sopra l'app dal vecchio pulsante.
- **Le tessere**: con `count === 0` il numero non si disegna e VoiceOver
  legge solo il nome.
- **I badge**: `BadgeRow` mostra solo quelli presi (la prop `own` e le
  pillole al 40% non ci sono più) ed esporta `BADGE_ICONS`;
  `BadgesSection` elenca i tre di `PROFILE_BADGES` con `badgeHow`, il
  lucchetto per quelli da prendere, la distanza nelle unità dell'app.
  «Winner» non è un badge dei disegni: resta solo sotto il nome.
- **«Blocked people»** è lo stesso componente, montato in `SettingsPage`
  sotto il telefono; `ProfileScreen` dà già a «Settings» il context dei
  follow che gli serve. Gli elenchi di chi segue si rileggono dopo un
  blocco come prima (`ProfileHome` li ricostruisce).
- **«Guide»**: `ProfileHome` non ha più `onGuide`; `ProfileScreen` tiene
  `helpFrom` per la riga senza account.

## File toccati

- `apps/mobile/App.tsx` (una prop su `<OwnProfile>`; turno dato dal
  Coordinatore il 2026-11-12)
- `apps/mobile/src/screens/ProfileLayer.tsx` (solo `OwnProfile`),
  `screens/ProfileScreen.tsx`
- `apps/mobile/src/profile/ProfileHome.tsx`, `ProfileHeader.tsx`,
  `BadgeRow.tsx`, `SettingsPage.tsx`; test `ProfileHome.test.tsx`,
  `ProfileHomeBlocked.test.tsx`, `ProfileHeader.test.tsx`,
  `BadgeRow.test.tsx`
- `apps/mobile/src/social/BlockedPeople.tsx` (due commenti)
- `apps/mobile/src/tour/GuideInProfile.test.tsx`
- nuovi: `apps/mobile/src/profile/FirstStep.tsx`, `BadgesSection.tsx`,
  `FirstStep.test.tsx`, `BadgesSection.test.tsx`, `ProfileHomeNew.test.tsx`,
  `SettingsBlocked.test.tsx` (nuovo apposta: `SettingsPage.test.tsx` lo
  tocca anche la #1201)
- registri condivisi: `apps/mobile/src/i18n/{de,es,fr,it}.ts`, `docs/UI.md`
- `docs/tasks/TASK-457.md`
- chiesti al Coordinatore il 2026-11-12, in attesa del sì:
  `apps/mobile/src/screens/ProfileLayer.test.tsx` (la prova di «Guide» con
  account), `apps/mobile/src/profile/UserProfilePage.tsx` e
  `UserProfileReport.test.tsx` (la frase dopo un blocco dice «…in your
  profile»: diventa «…in Settings», testo da approvare)

## Criteri di accettazione

- [ ] Un account senza attività non vede i tre totali né la striscia della
      settimana: vede la scheda del primo passo, e il pulsante apre
      «Explore».
- [ ] Con almeno un'attività il profilo mostra totali e settimana come
      prima, e la scheda non c'è.
- [ ] Le tessere «Favorites» e «My activities» non mostrano «0»; da 1 in su
      mostrano il numero.
- [ ] Sotto il nome solo i badge presi; la sezione «Badges» elenca i tre
      badge con la frase che dice come si prendono.
- [ ] «Guide» e «Blocked people» non sono più sul profilo; «Blocked
      people» funziona da «Settings», la guida è «Help»; senza account
      «Guide» resta sotto «Sign up».
- [ ] Il profilo di un altro iscritto non cambia.
- [ ] Nessun colore scritto a mano, nessuna dipendenza nuova, impronta iOS
      `6f8bba4c`.
- [ ] Testi nuovi (en, it, de, es, fr) approvati dall'utente; schermate del
      profilo vuoto e di uno con dati.

## Cronologia

- 2026-11-12: parte 0 con l'utente (quattro domande, una per volta); lista
  dei file al Coordinatore, che dà il sì, il turno di `App.tsx` e offre
  ADR-0380 (non usato).
- 2026-11-12: codice e test scritti; quinta domanda all'utente («Guide» e
  «Help» sono la stessa pagina). Restano: i tre file in più, le traduzioni
  da far approvare, le schermate col turno del simulatore.

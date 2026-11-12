# TASK-457 — Profilo nuovo

**Stato**: In lavorazione · parte 0 chiusa il 2026-11-12 (scelte dell'utente)
**Fase**: 5 · **Branch**: `feat/TASK-457-new-profile`
**Dipende da**: TASK-423 E2b (#1144) e TASK-462 B (#1172), già in `main`
**ADR**: da chiedere al Coordinatore · numero dal Coordinatore l'11 novembre
2026 (S9 e «F» di `out/prova-app-2026-11-11/PROPOSTE.md`)

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
4. **«Guide» e «Blocked people»** — tutte e due in «Settings»: «Blocked
   people» nella sezione ACCOUNT, «Guide» in ABOUT accanto a «Help». Senza
   account «Guide» resta sotto «Sign up», com'è oggi.

## Come funziona

Da scrivere con il codice.

## File toccati

Lista mandata al Coordinatore il 2026-11-12; il codice aspetta il suo sì.

- `apps/mobile/App.tsx` (una prop su `<OwnProfile>` per aprire «Explore»;
  a turno)
- `apps/mobile/src/screens/ProfileLayer.tsx`, `screens/ProfileScreen.tsx`
- `apps/mobile/src/profile/ProfileHome.tsx`, `ProfileHeader.tsx`,
  `BadgeRow.tsx`, `SettingsPage.tsx` e i loro test
- `apps/mobile/src/social/BlockedPeople.tsx` (solo se serve lo stile della
  riga dentro «Settings») e il suo test
- test che cercano le righe spostate: `src/tour/GuideInProfile.test.tsx`,
  `src/about/AboutInProfile.test.tsx`, `src/profile/premiumLookD.test.tsx`
- nuovi: `apps/mobile/src/profile/FirstStep.tsx`, `BadgesSection.tsx` e i
  loro test
- registri condivisi: `apps/mobile/src/i18n/{de,es,fr,it}.ts`, `docs/UI.md`
- `docs/tasks/TASK-457.md`

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
- [ ] «Guide» e «Blocked people» non sono più sul profilo e funzionano da
      «Settings»; senza account «Guide» resta sotto «Sign up».
- [ ] Il profilo di un altro iscritto non cambia.
- [ ] Nessun colore scritto a mano, nessuna dipendenza nuova, impronta iOS
      `6f8bba4c`.
- [ ] Testi nuovi (en, it, de, es, fr) approvati dall'utente; schermate del
      profilo vuoto e di uno con dati.

## Cronologia

- 2026-11-12: parte 0 con l'utente (quattro domande, una per volta); lista
  dei file al Coordinatore.

# TASK-177 — «Profile»: nuovo aspetto e «Settings»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-177-profile-look`
**Dipende da**: TASK-171 (la pagina di «Profile», «Favorites»), TASK-172
(la voce «My activities»: `ProfileScreen.tsx` si tocca solo dopo il suo
merge)

## Obiettivo

«Profile», con l'account, è più bello e ha tre voci: «Favorites» con un
cuore, «My activities» con l'uomo che corre, «Settings». Chiesto
dall'utente il 2026-10-02: «cambia un po' la grafica, rendila più
accattivante, creando un cuore a fianco alla parola Favorites e, per le
attività fatte, un uomo che corre come emoji»; «aggiungi anche la sezione
impostazioni, e quella là vedremo con calma».

La foto del profilo, da mettere in «Settings», è TASK-178.

## Contesto da leggere

- `docs/UI.md` «Il tema», «Profile», «Favorites»
- `docs/DECISIONS.md` ADR-0125, ADR-0139, ADR-0140
- `apps/mobile/src/screens/ProfileScreen.tsx`, `ProfileLayer.tsx`
- `apps/mobile/src/account/Profile.test.tsx`

## Cosa fare

1. In alto, al posto di «LOGGED IN AS»: un cerchio con l'iniziale (la foto
   arriva con TASK-178), il nome e l'email.
2. «Favorites» e «My activities» sono due riquadri affiancati: l'emoji
   (❤️, 🏃‍♂️), il numero in grande, il nome. Ognuno apre la sua pagina,
   come le righe di prima.
3. Sotto, la riga «Settings» (⚙️) apre la pagina «Settings», a sezioni.
   «Account»: nome ed email. In fondo «Log out» e «Delete account» con la
   sua conferma, spostati da «Profile» senza cambiarne il comportamento
   (confermato dall'utente il 2026-10-02: «va bene log out e delete
   account dentro settings»).
3b. Le voci che l'utente ha elencato per «Settings» lo stesso giorno
   («change email, phone number, help, l'unità di misura da selezionare,
   email notification, push notification, contract, privacy… aggiungili,
   poi li svilupperemo più avanti») ci sono già, con il nome e la scritta
   «Soon», e non si toccano: «Profile picture», «Change email», «Phone
   number» in «Account»; «Units» in «Preferences»; «Email notifications» e
   «Push notifications» in «Notifications»; «Help», «Terms», «Privacy» in
   «About». Ognuna la accende il suo task: TASK-178 (foto), TASK-183
   (email, telefono), TASK-182 (unità), TASK-184 (help, termini, privacy),
   TASK-185 (notifiche).
4. Usciti dall'account da «Settings», chi rientra trova «Profile», non
   «Settings».
5. Test dell'app; `UI.md` «Profile»; ADR-0145.

## Criteri di accettazione

- [x] «Favorites» ha un cuore, «My activities» l'uomo che corre; il
      numero di ognuno si legge senza aprire la pagina.
- [x] I due riquadri e «Settings» sono pulsanti con un nome che dice
      anche il numero («Favorites, 2»), e le emoji non si leggono due
      volte con il lettore di schermo.
- [x] «Log out» e «Delete account» funzionano come prima, da «Settings».
- [x] Le nove voci da sviluppare si vedono con «Soon», non sono pulsanti
      e il lettore di schermo le dice «…, coming soon».
- [x] «←» da «Settings» torna a «Profile»; dopo «Log out» o l'account
      cancellato si vede «Log in» o «Sign up», e chi rientra è su
      «Profile».
- [x] Nessun colore scritto a mano: solo token. Niente dipendenze nuove.
- [x] Test verdi.

## File toccati

```
apps/mobile/src/profile/
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/account/Profile.test.tsx
apps/mobile/__tests__/AppFavorites.test.tsx
apps/mobile/__tests__/AppActivities.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-177.md
```

`ProfileScreen.tsx` era di TASK-172 finché non è entrato in `main` (#194):
prima si sono scritti solo i file nuovi di `src/profile/` e i loro test.
In `AppFavorites.test.tsx` e `AppActivities.test.tsx` cambia una riga
sola: l'attesa di «LOGGED IN AS», che non c'è più.

## Fuori scope

- La foto del profilo e il pulsante in alto con la foto: TASK-178.
- Nome utente e bio da cambiare, il profilo visto dagli altri: TASK-116.
- Far funzionare le voci di «Settings» segnate «Soon»: TASK-178, 182,
  183, 184, 185.
- Le pagine «Favorites» e «My activities»: restano come sono.

## Esito

Fatto il 2026-10-02. `src/profile/` ha `Avatar`, `ProfileHome` e
`SettingsPage`; `ProfileScreen.tsx` li monta, con la pagina `"settings"` e
il ritorno a `"account"` quando si esce dall'account da lì. `ProfileLayer.tsx`
non è cambiato. 1018 test dell'app verdi (10 nuovi), `tsc`, `expo lint` e
Prettier puliti.

Visto nel simulatore (iPhone 17e, Expo Go, API locale con un account di
prova, due preferiti e una corsa): le due pagine sono come descritte in
`UI.md`. I tocchi non si sono potuti provare nel simulatore (serve il
permesso dell'utente): li coprono i test. **Da provare sull'iPhone**
dall'utente, dopo la pubblicazione su `preview`.

Insieme a questo task, con l'ok dell'utente dato in questa sessione: il
server aggiornato a `main` `781fb18` (migrazione `0003_runs`), perché
«My activities» di TASK-172 risponda prima della pubblicazione.

Lasciato ai task successivi: ogni voce «Soon» (TASK-178, 182, 183, 184,
185); la foto nel cerchio e nel pulsante in alto (TASK-178); TASK-189
aggiunge la sezione «Sport» a `SettingsPage.tsx`.

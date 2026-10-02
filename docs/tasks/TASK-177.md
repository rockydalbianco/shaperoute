# TASK-177 — «Profile»: nuovo aspetto e «Settings»

**Stato**: In lavorazione
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
3. Sotto, la riga «Settings» (⚙️) apre la pagina «Settings», che per ora
   contiene l'account: l'email, «Log out» e «Delete account» con la sua
   conferma, spostati da «Profile» senza cambiarne il comportamento.
4. Usciti dall'account da «Settings», chi rientra trova «Profile», non
   «Settings».
5. Test dell'app; `UI.md` «Profile»; ADR-0145.

## Criteri di accettazione

- [ ] «Favorites» ha un cuore, «My activities» l'uomo che corre; il
      numero di ognuno si legge senza aprire la pagina.
- [ ] I due riquadri e «Settings» sono pulsanti con un nome che dice
      anche il numero («Favorites, 2»), e le emoji non si leggono due
      volte con il lettore di schermo.
- [ ] «Log out» e «Delete account» funzionano come prima, da «Settings».
- [ ] «←» da «Settings» torna a «Profile»; dopo «Log out» o l'account
      cancellato si vede «Log in» o «Sign up», e chi rientra è su
      «Profile».
- [ ] Nessun colore scritto a mano: solo token. Niente dipendenze nuove.
- [ ] Test verdi.

## File toccati

```
apps/mobile/src/profile/
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/account/Profile.test.tsx
apps/mobile/__tests__/AppFavorites.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-177.md
```

`ProfileScreen.tsx` è di TASK-172 finché non è in `main`: prima si
scrivono solo i file nuovi di `src/profile/` e i loro test.

## Fuori scope

- La foto del profilo e il pulsante in alto con la foto: TASK-178.
- Nome utente e bio da cambiare, il profilo visto dagli altri: TASK-116.
- Altre voci di «Settings» (unità, voce, notifiche…): le decide l'utente,
  «con calma».
- Le pagine «Favorites» e «My activities»: restano come sono.

## Esito

*(si compila a fine task)*

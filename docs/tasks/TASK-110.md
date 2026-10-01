# TASK-110 — Le scelte della parte social: account, dati, hosting, privacy

**Stato**: In corso
**Fase**: 4 · **Branch**: `docs/TASK-110-decisions`

## Obiettivo

Le scelte da cui dipendono account, disegni salvati, like e commenti sono
prese dall'utente e scritte: ADR-0013 non è più «Aperta», `DATABASE.md` non
è più uno stub, `PRODUCT.md` dice cosa promette la parte social.

## Contesto da leggere

- `docs/ROADMAP.md` «Fase 4 — La parte social»
- `docs/DECISIONS.md` ADR-0013, ADR-0009
- `docs/DATABASE.md`, `docs/DEPLOY.md`
- `docs/PRODUCT.md`

## Cosa fare

Nessun codice. Per ogni punto: una proposta con costi e limiti, **la scelta
la fa l'utente**, una domanda per volta.

1. **Cosa prende il punteggio.** Proposta: la traccia GPS corsa, confrontata
   con la forma ideale con la stessa misura del motore, mostrata da 0 a 100
   (TASK-111). Alternativa: solo il percorso pianificato (c'è già
   `similarity`).
2. **Dove girano API e database.** Oggi l'API è sul Mac, con Tailscale: gli
   altri iscritti non la raggiungono. Confrontare almeno: server proprio
   (VPS con il pacchetto Docker di `DEPLOY.md` + PostgreSQL) e servizio
   gestito per database e accessi. Costo al mese, RAM che serve ai grafi,
   dove stanno i dati (UE).
3. **Database.** Confermare o cambiare l'ipotesi PostgreSQL + PostGIS; come
   si memorizza una traccia; migrazioni.
4. **Come si entra.** Proposta: email e password (funziona in Expo Go).
   «Sign in with Apple» chiede una build propria e l'account Apple
   Developer: annotarlo, non farlo ora.
5. **Chi vede cosa.** Proposta: un disegno è privato finché l'utente non lo
   pubblica; pubblicato, lo vedono tutti gli iscritti; i primi e gli ultimi
   200 m della traccia non si mostrano agli altri (la partenza è spesso casa).
6. **Dati personali.** Cosa si raccoglie, per quanto, come si cancella
   l'account con tutti i suoi dati; età minima; testo della privacy.
7. **Regole dei contenuti.** Segnalare e bloccare (TASK-121): l'App Store
   li chiede per i contenuti scritti dagli utenti.
8. Scrivere gli ADR, riempire `DATABASE.md` (schema di utenti, disegni,
   like, commenti), aggiornare `PRODUCT.md` e, se le scelte cambiano i task
   111–122, scriverlo nell'«Esito» di questo task e dirlo all'utente: quei
   task file si correggono prima che partano, non a metà.

## Scelte prese (si aggiorna a ogni risposta)

1. **Cosa prende il punteggio**: la corsa confrontata col percorso
   pianificato, per la somiglianza del percorso (ADR-0090). Approvato
   dall'utente col merge di TASK-111 (2026-09-30).
2. **Dove girano API e database**: **Oracle Cloud Always Free**, una VM
   ARM (Ampere). Scelta dell'utente (2026-10-01), fra Hetzner, Oracle,
   VPS con servizio gestito e Raspberry Pi. Rischio da gestire: Oracle può
   reclamare le VM gratuite poco usate, quindi copie di sicurezza fuori
   dalla VM.

## Criteri di accettazione

- [ ] ADR-0013 ha stato «Attiva» o è sostituita da ADR nuovi, con hosting,
      database e autenticazione decisi dall'utente.
- [ ] `DATABASE.md` non ha più «Stub» e risponde alle sue quattro domande.
- [ ] `PRODUCT.md` ha un paragrafo sulla parte social con i punti 1, 5, 6.
- [ ] Ogni pacchetto o servizio nuovo che servirà è elencato e approvato.
- [ ] `docs/INDEX.md`: `DATABASE.md` «pieno».

## File toccati

```
docs/DECISIONS.md
docs/DATABASE.md
docs/PRODUCT.md
docs/INDEX.md
docs/STATUS.md
docs/tasks/TASK-110.md
```

## Fuori scope

- Codice, account creati su servizi esterni, acquisti.
- Notifiche push, seguire altri utenti, classifiche, sfide.

## Esito

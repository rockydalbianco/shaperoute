# PRODUCT — Cosa stiamo costruendo

## Idea

Chi corre vuole ogni tanto un percorso che sia anche qualcosa da mostrare.
ShapeRoute prende una richiesta ("un cuore da 15 km partendo da qui") e
restituisce un percorso **realmente percorribile** che sulla mappa disegna
quella forma, esportabile in GPX verso telefono e orologio.

## Utente di riferimento

Runner amatoriale, usa già Strava o Garmin, conosce il GPX almeno come
"file che carico sull'orologio". Non vuole configurare parametri: vuole
dire forma e distanza e ottenere un percorso.

## Quando il prodotto ha successo

L'utente guarda l'anteprima e **riconosce la forma senza che gliela si
debba spiegare**. Tutto il resto è secondario: se la somiglianza non è
evidente a occhio, il percorso è un fallimento anche se la distanza è
perfetta.

## Che cosa deve fare il MVP

1. Rilevare la posizione corrente.
2. Accettare forma (circle, heart), distanza target e attività (running).
3. Generare la geometria teorica della forma.
4. Trasformarla in un percorso sulla rete stradale reale.
5. Mostrarlo su mappa interattiva con distanza effettiva.
6. Esportare il GPX.

Fuori dal MVP, esplicitamente: account, salvataggio percorsi, walking,
cycling, forme libere, preferenze di dislivello e superficie, meteo,
sincronizzazione automatica con l'orologio.

## Vincoli di qualità

Un percorso è accettabile solo se rispetta tutti questi punti:

| Criterio | Soglia MVP |
|---|---|
| Scostamento dalla distanza richiesta | ≤ 10% |
| Forma riconoscibile a occhio | giudizio umano, obbligatorio |
| Il percorso è chiuso (torna alla partenza) | sempre |
| Nessun tratto su strade vietate a piedi | sempre |
| Tempo di generazione | ≤ 30 s (MVP), obiettivo ≤ 10 s |

La metrica numerica di somiglianza serve all'ottimizzatore, non a decidere
se il risultato è buono: quello lo decide l'occhio. Vedi `ROUTE_ENGINE.md` §5.

## Rischi di prodotto

- **In zone rurali o montane la rete è troppo rada** per disegnare alcunché.
  Va gestito con un messaggio onesto, non con un percorso brutto.
  Nota: Levico Terme e valli del Trentino sono esattamente questo caso,
  quindi il banco di prova è realistico fin dall'inizio.
- **Forme complesse non sono realizzabili** su rete stradale: meglio poche
  forme che funzionano bene che un catalogo che delude.
- **La distanza esatta è nemica della forma**: forzare i chilometri
  deforma il disegno. Priorità alla forma, entro la tolleranza sopra.

## La parte social

Scelte dell'utente, 2026-10-01 (ADR-0114). Chi corre un percorso ha un
**punteggio da 0 a 100**: quanto il percorso somiglia alla forma, per
quanto la corsa l'ha seguito (ADR-0090). Ci si iscrive con email e
password, da 16 anni. Una corsa salvata è **privata finché non la si
pubblica**; pubblicata, la vedono gli iscritti, senza i primi e gli ultimi
200 m, dove spesso c'è casa. I percorsi generati si salvano tutti e i
migliori si consigliano (ADR-0086), da un punto del giro lontano dalla
partenza vera e senza il nome di chi li ha chiesti. Cancellare l'account
cancella tutto. Like, commenti, segnalazioni e blocchi; due persone
moderano e tolgono un contenuto entro 24 ore.

## Direzione dopo il MVP

Walking e cycling; star, lettere e forme custom; linguaggio naturale più
ricco; preferenze su dislivello, superficie e difficoltà; account e
percorsi salvati; invio a smartwatch. Più avanti SUP e parapendio, che
hanno modelli di percorso diversi e vanno ripensati, non adattati.

L'ordine reale di esecuzione sta in `ROADMAP.md`.

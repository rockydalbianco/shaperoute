import type { Table } from "./translate";

/**
 * The app's texts in French, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const FR: Table = {
  // src/account/fields.ts
  "You must be at least 16 to sign up.":
    "Tu dois avoir au moins 16 ans pour t'inscrire.",
  "Enter the email of your account.": "Saisis l'e-mail de ton compte.",
  "Enter your password.": "Saisis ton mot de passe.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Un nom d'utilisateur compte de 3 à 20 lettres, chiffres, _ ou . (sans espaces).",
  "Enter an email address, like name@example.com.":
    "Saisis une adresse e-mail, comme nom@example.com.",
  "A password is at least {min} characters.":
    "Un mot de passe compte au moins {min} caractères.",
  "A password is at most {max} characters.":
    "Un mot de passe compte au plus {max} caractères.",

  // src/account/messages.ts
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.":
    "L'app ne sait pas où est l'API : ouvre-la depuis le QR code de npm run mobile sur le PC.",
  "Your session has ended. Log in again.": "Ta session a expiré. Reconnecte-toi.",
  "Cannot reach the API at {url}. Check the connection and try again.":
    "Impossible de joindre l'API à {url}. Vérifie la connexion et réessaie.",
  "The app and the API do not agree (a bug): HTTP {status}.":
    "L'app et l'API ne s'entendent pas (un bug) : HTTP {status}.",
  "This email already has an account. Log in instead.":
    "Cet e-mail a déjà un compte. Connecte-toi plutôt.",
  "This username is taken. Try another one.":
    "Ce nom d'utilisateur est déjà pris. Essaie-en un autre.",
  "Wrong email or password.": "E-mail ou mot de passe incorrect.",
  "Accounts are not available on this API: it has no database.":
    "Les comptes ne sont pas disponibles sur cette API : elle n'a pas de base de données.",
  "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).":
    "L'API a refusé la clé de l'app (EXPO_PUBLIC_API_KEY dans apps/mobile/.env).",
  "The app and the API do not agree (a bug): {message}":
    "L'app et l'API ne s'entendent pas (un bug) : {message}",
  "Too many tries. Wait a minute and try again.":
    "Trop de tentatives. Attends une minute et réessaie.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Trop de tentatives. Attends {minutes} minutes et réessaie.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} course est sur ce téléphone, en attente de connexion.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} courses sont sur ce téléphone, en attente de connexion.",
  "Loading…": "Chargement…",
  "Show more": "Afficher plus",
  "Loading your activities…": "Chargement de tes activités…",
  "Your activities could not load.": "Impossible de charger tes activités.",
  "Try again": "Réessayer",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Pas encore d'activités. Enregistre une course quand tu la termines, et tu la retrouveras ici.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, publique, ouvrir sur la carte",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, ouvrir sur la carte",
  "Opening…": "Ouverture…",
  "Score: {score} out of 100": "Score : {score} sur 100",
  "Score {score}": "Score {score}",
  Public: "Publique",
  "Delete this run? It cannot be undone.":
    "Supprimer cette course ? C'est irréversible.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Annuler",
  "Delete run": "Supprimer la course",
  "Delete the run of {when}": "Supprimer la course du {when}",
  Delete: "Supprimer",

  // src/activities/ActivityCard.tsx
  "out of 100": "sur 100",
  "Yellow: the route. White: what you ran.":
    "Jaune : le parcours. Blanc : ce que tu as couru.",
  "White: what you ran.": "Blanc : ce que tu as couru.",
  "Back to the list": "Retour à la liste",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Inscris-toi ou connecte-toi pour garder tes courses et les partager comme dessins.",
  "This run is no longer in your activities.":
    "Cette course n'est plus dans tes activités.",

  // src/activities/activityText.ts
  Sun: "Dim",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mer",
  Thu: "Jeu",
  Fri: "Ven",
  Sat: "Sam",
  Jan: "janv.",
  Feb: "févr.",
  Mar: "mars",
  Apr: "avr.",
  May: "mai",
  Jun: "juin",
  Jul: "juil.",
  Aug: "août",
  Sep: "sept.",
  Oct: "oct.",
  Nov: "nov.",
  Dec: "déc.",
  "{weekday} {day} {month} {year}": "{weekday} {day} {month} {year}",
  Run: "Course",

  // src/api/comments.ts
  "A comment needs some words.": "Un commentaire a besoin de quelques mots.",
  "A comment is at most {max} characters.":
    "Un commentaire fait au plus {max} caractères.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Trop de commentaires en une minute. Attends un instant et réessaie.",
  "The comments of this drawing are not available.":
    "Les commentaires de ce dessin ne sont pas disponibles.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Pas de connexion. Réessaie quand tu es en ligne.",
  "Strava is taking no more runs for now. Try again later.":
    "Strava n'accepte plus de courses pour le moment. Réessaie plus tard.",
  "Strava could not read this run.": "Strava n'a pas pu lire cette course.",
  "Strava is not connected. Connect it and try again.":
    "Strava n'est pas connecté. Connecte-le et réessaie.",
  "Strava is not available on this API.": "Strava n'est pas disponible sur cette API.",
  "Strava did not answer. Try again in a while.":
    "Strava n'a pas répondu. Réessaie dans un moment.",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Retirer des favoris",
  "Add to favorites": "Ajouter aux favoris",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Enregistré le {day} {month} {year}",
  "{title}, open on the map": "{title}, ouvrir sur la carte",
  "Remove {title} from favorites": "Retirer {title} des favoris",
  "Loading your favorites…": "Chargement de tes favoris…",
  "Your favorites could not load.": "Impossible de charger tes favoris.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Pas encore de favoris. Touche {heart} sur un parcours de la carte pour le garder ici.",

  // src/favorites/favoriteRoute.ts
  Route: "Parcours",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Inscris-toi ou connecte-toi pour garder tes parcours favoris.",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDonnées d'OpenStreetMap",
  "{user} in {city}: {title}. {facts}. Score {score} out of 100.":
    "{user} à {city} : {title}. {facts}. Score {score} sur 100.",
  "Opens the route on the map": "Ouvre le parcours sur la carte",

  // src/i18n/shapeNames.ts
  Circle: "Cercle",
  Heart: "Cœur",
  Star: "Étoile",
  Horse: "Cheval",
  Moon: "Lune",
  Cat: "Chat",
  Fish: "Poisson",
  Butterfly: "Papillon",
  Snail: "Escargot",
  "Dog head": "Tête de chien",
  "Rabbit head": "Tête de lapin",
  Pumpkin: "Citrouille",
  "Christmas tree": "Sapin de Noël",
  Smiley: "Smiley",
  Ghost: "Fantôme",
  Donut: "Donut",
  "The sun": "Soleil",

  // src/paddle/PaddleExplore.tsx
  Next: "À suivre",
  "Drawing…": "Dessin en cours…",
  "Your start": "Ton départ",
  "On the water": "Sur l'eau",
  "Shapes to paddle, within 1 km of the shore":
    "Des formes à pagayer, à moins de 1 km du rivage",
  "LAKES AND SEA": "LACS ET MER",
  "Near me": "Près de moi",
  "Choose a lake or a beach: a circle, a heart and a star of 2 km are drawn on its water, from the shore.":
    "Choisis un lac ou une plage : un cercle, un cœur et une étoile de 2 km sont dessinés sur son eau, depuis le rivage.",
  "Choose a start in Draw first: the shapes start from the shore nearest to it.":
    "Choisis d'abord un départ dans Draw : les formes partent du rivage le plus proche.",
  "Near your start": "Près de ton départ",
  "{shape}, {km} km, on the water": "{shape}, {km} km, sur l'eau",
  "Not drawn": "Non dessiné",

  // src/paddle/PaddleNotice.tsx
  "Before you paddle": "Avant de pagayer",
  "Wear a life jacket.": "Porte un gilet de sauvetage.",
  "Check the weather and the wind before you go out.":
    "Vérifie la météo et le vent avant de partir.",
  "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.":
    "Respecte les règles locales : zones de baignade, chenaux, ports. Sgrava ne les connaît pas.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Le parcours reste à moins de 1 km du rivage. Cela ne le rend ni sûr ni autorisé.",
  "I understand": "J'ai compris",
  "Not now": "Pas maintenant",

  // src/paddle/waterPlaces.ts
  "from Riva del Garda": "depuis Riva del Garda",
  "from Como": "depuis Côme",
  "from the beach": "depuis la plage",

  // src/places/PlaceSearch.tsx
  "City or street": "Ville ou rue",
  Search: "Rechercher",
  "Searching…": "Recherche…",
  "No place found. Try adding the city.":
    "Aucun lieu trouvé. Essaie d'ajouter la ville.",
  "The search failed. Check the connection and try again.":
    "La recherche a échoué. Vérifie la connexion et réessaie.",
  "© OpenStreetMap contributors": "© contributeurs d'OpenStreetMap",

  // src/profile/EditProfile.tsx
  USERNAME: "NOM D'UTILISATEUR",
  "3 to 20 letters, digits, _ or .": "De 3 à 20 lettres, chiffres, _ ou .",
  BIO: "BIO",
  "A few words about you": "Quelques mots sur toi",
  "{length} of {max} characters": "{length} sur {max} caractères",
  "Saving…": "Enregistrement…",
  Save: "Enregistrer",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Suppression…",
  "Choose a picture": "Choisir une photo",
  "Take a photo": "Prendre une photo",
  "Remove picture": "Retirer la photo",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Photo de profil",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Modifier le profil",
  Favorites: "Favoris",
  "My activities": "Mes activités",
  Settings: "Réglages",

  // src/profile/SettingsPage.tsx
  "Change email": "Changer d'e-mail",
  "Phone number": "Numéro de téléphone",
  Units: "Unités",
  NOTIFICATIONS: "NOTIFICATIONS",
  "Email notifications": "Notifications par e-mail",
  "Push notifications": "Notifications push",
  ABOUT: "À PROPOS",
  Help: "Aide",
  Terms: "Conditions",
  Privacy: "Confidentialité",
  "{name}, coming soon": "{name}, bientôt disponible",
  Soon: "Bientôt",
  ACCOUNT: "COMPTE",
  PREFERENCES: "PRÉFÉRENCES",
  "Log out": "Se déconnecter",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "Supprimer ton compte ? Tout ce qui est à toi part avec lui, immédiatement. C'est irréversible.",
  "Deleting…": "Suppression…",
  "Delete my account": "Supprimer mon compte",
  "Keep my account": "Garder mon compte",
  "Delete account": "Supprimer le compte",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Connecte-toi pour voir les profils des autres.",
  "This profile is not available.": "Ce profil n'est pas disponible.",
  "{count} drawing": "{count} dessin",
  "{count} drawings": "{count} dessins",
  "Loading the profile…": "Chargement du profil…",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "La modification du profil n'est pas encore disponible sur cette API.",
  "A bio is at most {max} characters.": "Une bio compte au plus {max} caractères.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Cette app n'a pas accès à l'appareil photo. Autorise-le dans Réglages, ou choisis plutôt une photo.",
  "This picture is too large. Choose a smaller one.":
    "Cette photo est trop grande. Choisis-en une plus petite.",
  "Could not open the picture. Try again.": "Impossible d'ouvrir la photo. Réessaie.",
  "This picture cannot be used. Choose another one.":
    "Cette photo ne peut pas être utilisée. Choisis-en une autre.",
  "Profile pictures are not available on this API yet.":
    "Les photos de profil ne sont pas encore disponibles sur cette API.",

  // src/route/RoutePanel.tsx
  "{letters} km of letters + {between} km riding between them":
    "{letters} km de lettres + {between} km à vélo entre elles",
  "{drawn} km of drawing + {between} km walking between the parts":
    "{drawn} km de dessin + {between} km à pied entre les parties",
  "{drawn} km of drawing + {between} km riding between the parts":
    "{drawn} km de dessin + {between} km à vélo entre les parties",
  "On the water, a shape of the catalogue.": "Sur l'eau, une forme du catalogue.",
  "{name} · on the water · target {km} km": "{name} · sur l'eau · objectif {km} km",
  "{name} · on roads · target {km} km": "{name} · sur route · objectif {km} km",

  // src/route/problems.ts
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "Il n'y a ni lac ni mer près de ce départ. Pars du rivage, à moins de 2 km de l'eau.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Cette forme ne tient pas sur l'eau ici à cette distance. Elle tient à environ {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Cette forme ne tient pas sur l'eau ici. Essaie une distance plus courte, une autre forme ou un autre départ :",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.": "Dont {distance} à pied, vélo à la main.",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Trouver des amis",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Profil, reconnecte-toi",
  Profile: "Profil",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Ton compte et tout ce qui était à toi ont été supprimés.",
  "You are logged out on this phone.": "Ce téléphone n'est plus connecté à ton compte.",
  Back: "Retour",

  // src/screens/RunDashboard.tsx
  Speed: "Vitesse",
  "Kilometre {km}: {speed} km/h": "Kilomètre {km} : {speed} km/h",

  // src/screens/RunPanel.tsx
  "Speed now": "Vitesse",
  "Avg speed": "Vit. moy.",
  "Last km": "Dernier km",

  // src/screens/SignInScreen.tsx
  "Sign up": "S'inscrire",
  "Log in": "Se connecter",
  EMAIL: "E-MAIL",
  "name@example.com": "nom@example.com",
  PASSWORD: "MOT DE PASSE",
  "At least 8 characters": "Au moins 8 caractères",
  "I am at least 16": "J'ai au moins 16 ans",
  "Signing up…": "Inscription…",
  "Logging in…": "Connexion…",

  // src/settings/LanguageSetting.tsx
  Language: "Langue",
  "Phone language": "Langue du téléphone",

  // src/settings/sport.ts
  "Ride without a route": "Rouler sans parcours",
  "Paddle without a route": "Pagayer sans parcours",
  "Run without a route": "Courir sans parcours",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Retour au profil",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Ouvre les commentaires de ce dessin.",
  Comments: "Commentaires",
  "Delete this comment?": "Supprimer ce commentaire ?",
  Cancel: "Annuler",
  "Close the comments": "Fermer les commentaires",
  Close: "Fermer",
  "Add a comment…": "Ajouter un commentaire…",
  Comment: "Commentaire",
  Post: "Publier",
  "{count} of {max} characters": "{count} sur {max} caractères",
  "Loading the comments…": "Chargement des commentaires…",
  "No comments yet. Be the first.": "Pas encore de commentaires. Écris le premier.",
  "Show more comments": "Afficher plus de commentaires",
  "{name}, {ago}: {text}": "{name}, {ago} : {text}",
  "Touch and hold to delete.": "Maintiens appuyé pour supprimer.",

  // src/social/DrawingsGrid.tsx
  Drawings: "Dessins",
  "No public drawings yet. Make a run public in My activities.":
    "Pas encore de dessins publics. Rends une course publique dans Mes activités.",
  "No drawings yet.": "Pas encore de dessins.",
  "{title}, score {score} out of 100, open on the map":
    "{title}, score {score} sur 100, ouvrir sur la carte",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "Dans cette app, tu ne peux pas écrire de commentaires négatifs. Change d'app.",
  "just now": "à l'instant",
  "{count} min ago": "il y a {count} min",
  "{count} h ago": "il y a {count} h",
  "{count} d ago": "il y a {count} j",
  "Write a comment": "Écrire un commentaire",
  "{count} comment": "{count} commentaire",
  "{count} comments": "{count} commentaires",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Ce dessin n'est plus public.",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Connecte-toi pour trouver tes amis.",
  "This server cannot look for members yet.":
    "Ce serveur ne peut pas encore chercher des membres.",
  Name: "Nom",
  "Type at least 2 letters of a name.": "Tape au moins 2 lettres d'un nom.",
  "Nobody has a name like that.": "Personne n'a un nom comme ça.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Envoi vers Strava…",
  "View on Strava": "Voir sur Strava",
  "This run is on Strava.": "Cette course est sur Strava.",
  "Strava is still reading this run.": "Strava lit encore cette course.",
  "Check again": "Vérifier à nouveau",
  "Send to Strava": "Envoyer vers Strava",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Ouverture de Strava…",
  "Connect with Strava": "Se connecter avec Strava",
  On: "Oui",
  Off: "Non",
  "Name on Strava": "Nom sur Strava",
  "Leave empty for an automatic name": "Laisse vide pour un nom automatique",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Connecte Strava, et Enregistrer y enverra aussi tes courses.",
  "To {athlete}'s Strava, with Save.":
    "Avec Enregistrer, elle part aussi sur le Strava de {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, connecté",
  "Strava, connected as {athlete}": "Strava, connecté en tant que {athlete}",
  Connected: "Connecté",
  "Connected as {athlete}": "Connecté en tant que {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "Déconnecter Strava ? Les courses déjà envoyées restent sur Strava.",
  Disconnect: "Déconnecter",
  "Disconnecting…": "Déconnexion…",
  "Disconnect Strava": "Déconnecter Strava",
  "Send the runs you save in Sgrava to your Strava profile.":
    "Envoie vers ton profil Strava les courses que tu enregistres dans Sgrava.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.": "Impossible d'ouvrir Strava. Réessaie.",
};

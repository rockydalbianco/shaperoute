import type { Table } from "./translate";

/**
 * The app's texts in Spanish, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const ES: Table = {
  // src/account/fields.ts
  "You must be at least 16 to sign up.":
    "Debes tener al menos 16 años para registrarte.",
  "Enter the email of your account.": "Escribe el correo de tu cuenta.",
  "Enter your password.": "Escribe tu contraseña.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Un nombre de usuario tiene de 3 a 20 letras, cifras, _ o . (sin espacios).",
  "Enter an email address, like name@example.com.":
    "Escribe una dirección de correo, como nombre@example.com.",
  "A password is at least {min} characters.":
    "Una contraseña tiene al menos {min} caracteres.",
  "A password is at most {max} characters.":
    "Una contraseña tiene como máximo {max} caracteres.",

  // src/account/messages.ts
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.":
    "La app no sabe dónde está la API: ábrela desde el código QR de npm run mobile en el PC.",
  "Your session has ended. Log in again.":
    "Tu sesión ha terminado. Inicia sesión de nuevo.",
  "Cannot reach the API at {url}. Check the connection and try again.":
    "No se puede conectar con la API en {url}. Comprueba la conexión e inténtalo de nuevo.",
  "The app and the API do not agree (a bug): HTTP {status}.":
    "La app y la API no se entienden (un error): HTTP {status}.",
  "This email already has an account. Log in instead.":
    "Este correo ya tiene una cuenta. Inicia sesión.",
  "This username is taken. Try another one.":
    "Este nombre de usuario ya está en uso. Prueba con otro.",
  "Wrong email or password.": "Correo o contraseña incorrectos.",
  "Accounts are not available on this API: it has no database.":
    "Las cuentas no están disponibles en esta API: no tiene base de datos.",
  "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).":
    "La API ha rechazado la clave de la app (EXPO_PUBLIC_API_KEY en apps/mobile/.env).",
  "The app and the API do not agree (a bug): {message}":
    "La app y la API no se entienden (un error): {message}",
  "Too many tries. Wait a minute and try again.":
    "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Demasiados intentos. Espera {minutes} minutos e inténtalo de nuevo.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} carrera está en este teléfono, esperando conexión.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} carreras están en este teléfono, esperando conexión.",
  "Loading…": "Cargando…",
  "Show more": "Mostrar más",
  "Loading your activities…": "Cargando tus actividades…",
  "Your activities could not load.": "No se han podido cargar tus actividades.",
  "Try again": "Reintentar",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Aún no hay actividades. Guarda una carrera cuando la termines y la encontrarás aquí.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, pública, abrir en el mapa",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, abrir en el mapa",
  "Opening…": "Abriendo…",
  "Score: {score} out of 100": "Puntuación: {score} de 100",
  "Score {score}": "Puntuación {score}",
  Public: "Pública",
  "Delete this run? It cannot be undone.":
    "¿Eliminar esta carrera? No se puede deshacer.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Cancelar",
  "Delete run": "Eliminar carrera",
  "Delete the run of {when}": "Eliminar la carrera del {when}",
  Delete: "Eliminar",

  // src/activities/ActivityCard.tsx
  "out of 100": "de 100",
  "Yellow: the route. White: what you ran.":
    "Amarillo: la ruta. Blanco: lo que has corrido.",
  "White: what you ran.": "Blanco: lo que has corrido.",
  "Back to the list": "Volver a la lista",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Regístrate o inicia sesión para guardar tus carreras y compartirlas como dibujos.",
  "This run is no longer in your activities.":
    "Esta carrera ya no está en tus actividades.",

  // src/activities/activityText.ts
  Sun: "Dom",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mié",
  Thu: "Jue",
  Fri: "Vie",
  Sat: "Sáb",
  Jan: "ene",
  Feb: "feb",
  Mar: "mar",
  Apr: "abr",
  May: "may",
  Jun: "jun",
  Jul: "jul",
  Aug: "ago",
  Sep: "sept",
  Oct: "oct",
  Nov: "nov",
  Dec: "dic",
  "{weekday} {day} {month} {year}": "{weekday} {day} {month} {year}",
  Run: "Carrera",

  // src/api/comments.ts
  "A comment needs some words.": "Un comentario necesita algunas palabras.",
  "A comment is at most {max} characters.":
    "Un comentario tiene como máximo {max} caracteres.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Demasiados comentarios en un minuto. Espera un momento e inténtalo de nuevo.",
  "The comments of this drawing are not available.":
    "Los comentarios de este dibujo no están disponibles.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Sin conexión. Inténtalo de nuevo cuando estés en línea.",
  "Strava is taking no more runs for now. Try again later.":
    "Strava no acepta más carreras por ahora. Inténtalo más tarde.",
  "Strava could not read this run.": "Strava no ha podido leer esta carrera.",
  "Strava is not connected. Connect it and try again.":
    "Strava no está conectado. Conéctalo e inténtalo de nuevo.",
  "Strava is not available on this API.": "Strava no está disponible en esta API.",
  "Strava did not answer. Try again in a while.":
    "Strava no ha respondido. Inténtalo dentro de un rato.",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Quitar de favoritos",
  "Add to favorites": "Añadir a favoritos",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Guardado el {day} {month} {year}",
  "{title}, open on the map": "{title}, abrir en el mapa",
  "Remove {title} from favorites": "Quitar {title} de favoritos",
  "Loading your favorites…": "Cargando tus favoritos…",
  "Your favorites could not load.": "No se han podido cargar tus favoritos.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Aún no hay favoritos. Toca {heart} en una ruta del mapa para guardarla aquí.",

  // src/favorites/favoriteRoute.ts
  Route: "Ruta",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Regístrate o inicia sesión para guardar tus rutas favoritas.",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDatos de OpenStreetMap",
  "{user} in {city}: {title}. {facts}. Score {score} out of 100.":
    "{user} en {city}: {title}. {facts}. Puntuación {score} de 100.",
  "Opens the route on the map": "Abre la ruta en el mapa",

  // src/i18n/shapeNames.ts
  Circle: "Círculo",
  Heart: "Corazón",
  Star: "Estrella",
  Horse: "Caballo",
  Moon: "Luna",
  Cat: "Gato",
  Fish: "Pez",
  Butterfly: "Mariposa",
  Snail: "Caracol",
  "Dog head": "Cabeza de perro",
  "Rabbit head": "Cabeza de conejo",
  Pumpkin: "Calabaza",
  "Christmas tree": "Árbol de Navidad",

  // src/places/PlaceSearch.tsx
  "City or street": "Ciudad o calle",
  Search: "Buscar",
  "Searching…": "Buscando…",
  "No place found. Try adding the city.":
    "No se ha encontrado ningún lugar. Prueba a añadir la ciudad.",
  "The search failed. Check the connection and try again.":
    "La búsqueda ha fallado. Comprueba la conexión e inténtalo de nuevo.",
  "© OpenStreetMap contributors": "© colaboradores de OpenStreetMap",

  // src/profile/EditProfile.tsx
  USERNAME: "NOMBRE DE USUARIO",
  "3 to 20 letters, digits, _ or .": "De 3 a 20 letras, cifras, _ o .",
  BIO: "BIO",
  "A few words about you": "Unas palabras sobre ti",
  "{length} of {max} characters": "{length} de {max} caracteres",
  "Saving…": "Guardando…",
  Save: "Guardar",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Quitando…",
  "Choose a picture": "Elegir una foto",
  "Take a photo": "Hacer una foto",
  "Remove picture": "Quitar la foto",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Foto de perfil",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Editar perfil",
  Favorites: "Favoritos",
  "My activities": "Mis actividades",
  Settings: "Ajustes",

  // src/profile/SettingsPage.tsx
  "Change email": "Cambiar correo",
  "Phone number": "Número de teléfono",
  Units: "Unidades",
  NOTIFICATIONS: "NOTIFICACIONES",
  "Email notifications": "Notificaciones por correo",
  "Push notifications": "Notificaciones push",
  ABOUT: "INFORMACIÓN",
  Help: "Ayuda",
  Terms: "Términos",
  Privacy: "Privacidad",
  "{name}, coming soon": "{name}, próximamente",
  Soon: "Pronto",
  ACCOUNT: "CUENTA",
  PREFERENCES: "PREFERENCIAS",
  "Log out": "Cerrar sesión",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "¿Eliminar tu cuenta? Todo lo que es tuyo se va con ella, al momento. No se puede deshacer.",
  "Deleting…": "Eliminando…",
  "Delete my account": "Eliminar mi cuenta",
  "Keep my account": "Conservar mi cuenta",
  "Delete account": "Eliminar cuenta",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Inicia sesión para ver los perfiles de los demás.",
  "This profile is not available.": "Este perfil no está disponible.",
  "{count} drawing": "{count} dibujo",
  "{count} drawings": "{count} dibujos",
  "Loading the profile…": "Cargando el perfil…",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "Editar el perfil aún no está disponible en esta API.",
  "A bio is at most {max} characters.": "Una bio tiene como máximo {max} caracteres.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Esta app no tiene acceso a la cámara. Permítelo en Ajustes o elige una foto.",
  "This picture is too large. Choose a smaller one.":
    "Esta foto es demasiado grande. Elige una más pequeña.",
  "Could not open the picture. Try again.":
    "No se ha podido abrir la foto. Inténtalo de nuevo.",
  "This picture cannot be used. Choose another one.":
    "Esta foto no se puede usar. Elige otra.",
  "Profile pictures are not available on this API yet.":
    "Las fotos de perfil aún no están disponibles en esta API.",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.": "Incluye {distance} caminando con la bici.",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Buscar amigos",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Perfil, inicia sesión de nuevo",
  Profile: "Perfil",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Tu cuenta y todo lo que era tuyo se han eliminado.",
  "You are logged out on this phone.": "Has cerrado sesión en este teléfono.",
  Back: "Atrás",

  // src/screens/SignInScreen.tsx
  "Sign up": "Registrarse",
  "Log in": "Iniciar sesión",
  EMAIL: "CORREO",
  "name@example.com": "nombre@example.com",
  PASSWORD: "CONTRASEÑA",
  "At least 8 characters": "Al menos 8 caracteres",
  "I am at least 16": "Tengo al menos 16 años",
  "Signing up…": "Registrando…",
  "Logging in…": "Iniciando sesión…",

  // src/settings/LanguageSetting.tsx
  Language: "Idioma",
  "Phone language": "Idioma del teléfono",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Volver al perfil",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Abre los comentarios de este dibujo.",
  Comments: "Comentarios",
  "Delete this comment?": "¿Eliminar este comentario?",
  Cancel: "Cancelar",
  "Close the comments": "Cerrar los comentarios",
  Close: "Cerrar",
  "Add a comment…": "Añade un comentario…",
  Comment: "Comentario",
  Post: "Publicar",
  "{count} of {max} characters": "{count} de {max} caracteres",
  "Loading the comments…": "Cargando los comentarios…",
  "No comments yet. Be the first.": "Aún no hay comentarios. Escribe el primero.",
  "Show more comments": "Mostrar más comentarios",
  "{name}, {ago}: {text}": "{name}, {ago}: {text}",
  "Touch and hold to delete.": "Mantén pulsado para eliminar.",

  // src/social/DrawingsGrid.tsx
  Drawings: "Dibujos",
  "No public drawings yet. Make a run public in My activities.":
    "Aún no hay dibujos públicos. Haz pública una carrera en Mis actividades.",
  "No drawings yet.": "Aún no hay dibujos.",
  "{title}, score {score} out of 100, open on the map":
    "{title}, puntuación {score} de 100, abrir en el mapa",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "En esta app no puedes escribir comentarios negativos. Usa otra app.",
  "just now": "ahora mismo",
  "{count} min ago": "hace {count} min",
  "{count} h ago": "hace {count} h",
  "{count} d ago": "hace {count} d",
  "Write a comment": "Escribe un comentario",
  "{count} comment": "{count} comentario",
  "{count} comments": "{count} comentarios",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Este dibujo ya no es público.",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Inicia sesión para encontrar a tus amigos.",
  "This server cannot look for members yet.":
    "Este servidor todavía no puede buscar miembros.",
  Name: "Nombre",
  "Type at least 2 letters of a name.": "Escribe al menos 2 letras de un nombre.",
  "Nobody has a name like that.": "Nadie tiene un nombre así.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Enviando a Strava…",
  "View on Strava": "Ver en Strava",
  "This run is on Strava.": "Esta carrera está en Strava.",
  "Strava is still reading this run.": "Strava aún está leyendo esta carrera.",
  "Check again": "Comprobar de nuevo",
  "Send to Strava": "Enviar a Strava",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Abriendo Strava…",
  "Connect with Strava": "Conectar con Strava",
  On: "Sí",
  Off: "No",
  "Name on Strava": "Nombre en Strava",
  "Leave empty for an automatic name": "Déjalo vacío para un nombre automático",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Conecta Strava y Guardar enviará también allí tus carreras.",
  "To {athlete}'s Strava, with Save.": "Con Guardar va también al Strava de {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, conectado",
  "Strava, connected as {athlete}": "Strava, conectado como {athlete}",
  Connected: "Conectado",
  "Connected as {athlete}": "Conectado como {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "¿Desconectar Strava? Las carreras ya enviadas se quedan en Strava.",
  Disconnect: "Desconectar",
  "Disconnecting…": "Desconectando…",
  "Disconnect Strava": "Desconectar Strava",
  "Send the runs you save in Sgrava to your Strava profile.":
    "Envía a tu perfil de Strava las carreras que guardas en Sgrava.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.":
    "No se ha podido abrir Strava. Inténtalo de nuevo.",
};

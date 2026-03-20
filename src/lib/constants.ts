/**
 * Préfixe URL des assets statiques si l’app est servie sous un sous-chemin
 * (ex. reverse-proxy /flowmanager). Sinon laisser vide → URLs absolues /images/...
 * Build : définir NEXT_PUBLIC_BASE_PATH dans .env avant `pnpm run build`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Logo C.U.B. — fichier servi depuis public/images/logos/cub-logo.png */
export const APP_LOGO_SRC = `${BASE_PATH}/images/logos/cub-logo.png`;

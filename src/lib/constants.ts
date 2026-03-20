/** Base path for static assets (sous-chemin éventuel en déploiement). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Logo C.U.B. — fichier dans public/images/logos/cub-logo.png */
export const APP_LOGO_SRC = `${BASE_PATH}/images/logos/cub-logo.png`;

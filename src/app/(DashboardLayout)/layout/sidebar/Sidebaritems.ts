import { uniqueId } from 'lodash'

export interface ChildItem {
  id?: number | string
  name?: string
  icon?: any
  children?: ChildItem[]
  item?: any
  url?: any
  color?: string
  disabled?: boolean
  subtitle?: string
  badge?: boolean
  badgeType?: string
  isPro?: boolean
  /** Clé de vue banette (a_traiter, mon_service, etc.) pour afficher le comptage */
  viewKey?: string
  /** Réservé aux utilisateurs récipiendaire sur l’organigramme (voir /api/me) */
  requiresOrganigrammeStats?: boolean
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: any
  id?: number
  to?: string
  items?: MenuItem[]
  children?: ChildItem[]
  url?: any
  disabled?: boolean
  subtitle?: string
  badgeType?: string
  badge?: boolean
  isPro?: boolean
}

const SidebarContent: MenuItem[] = [
  {
    heading: 'Gestion courrier',
    children: [
      {
        name: 'Accueil',
        icon: 'solar:home-2-linear',
        id: uniqueId(),
        url: '/',
        isPro: false,
      },
      {
        name: 'Enregistrement',
        icon: 'solar:letter-linear',
        id: uniqueId(),
        url: '/courrier/enregistrement',
        isPro: false,
      },
      {
        name: 'Liste courrier',
        icon: 'solar:inbox-linear',
        id: uniqueId(),
        url: '/courrier',
        isPro: false,
      },
      {
        name: 'Statistiques périmètre',
        icon: 'solar:chart-square-linear',
        id: uniqueId(),
        url: '/courrier/statistiques-organigramme',
        isPro: false,
        requiresOrganigrammeStats: true,
      },
      {
        name: 'Mes banettes',
        icon: 'solar:inbox-linear',
        id: 'mes-banettes',
        isPro: false,
        children: [
          { name: 'À traiter', url: '/courrier/mes-banettes?view=a_traiter', viewKey: 'a_traiter', id: uniqueId() },
          { name: 'Courrier de mon service', url: '/courrier/mes-banettes?view=mon_service', viewKey: 'mon_service', id: uniqueId() },
          { name: 'En attente de mes avis', url: '/courrier/mes-banettes?view=en_attente_mes_avis', viewKey: 'en_attente_mes_avis', id: uniqueId() },
          { name: 'Transférés à moi', url: '/courrier/mes-banettes?view=transferes_a_moi', viewKey: 'transferes_a_moi', id: uniqueId() },
          { name: 'En attente des avis (tous)', url: '/courrier/mes-banettes?view=en_attente_avis', viewKey: 'en_attente_avis', id: uniqueId() },
          { name: 'Retour des avis', url: '/courrier/mes-banettes?view=retour_avis', viewKey: 'retour_avis', id: uniqueId() },
          { name: 'Archivés', url: '/courrier/mes-banettes?view=archives', viewKey: 'archives', id: uniqueId() },
        ],
      },
      {
        name: 'Configuration',
        icon: 'solar:settings-linear',
        id: 'config-menu',
        isPro: false,
        children: [
          { name: 'Config. banettes', url: '/courrier/banettes', id: uniqueId() },
          { name: 'Typologies courrier', url: '/courrier/typologies', id: uniqueId() },
          { name: 'Organigramme', url: '/courrier/organigramme', id: uniqueId() },
          { name: 'Workflows', url: '/courrier/workflows', id: uniqueId() },
          { name: 'Gestion des utilisateurs', url: '/courrier/utilisateurs', id: uniqueId() },
          { name: 'Gestion des accès', url: '/courrier/access', id: uniqueId() },
        ],
      },
      {
        name: 'Mon profil',
        icon: 'solar:user-circle-linear',
        id: uniqueId(),
        url: '/mon-profil',
        isPro: false,
      },
    ],
  },
]

export default SidebarContent

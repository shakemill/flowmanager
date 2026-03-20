'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import { APP_LOGO_SRC } from '@/lib/constants'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import SidebarContent from './Sidebaritems'
import SimpleBar from 'simplebar-react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  AMLogo,
  AMMenu,
  AMMenuItem,
  AMSidebar,
  AMSubmenu,
} from 'tailwind-sidebar'
import 'tailwind-sidebar/styles.css'
import type { ChildItem } from './Sidebaritems'

function BanettesSubmenu({
  item,
  currentPath,
  searchParams,
  onClose,
}: {
  item: { id?: string; name?: string; icon?: string; children?: ChildItem[] }
  currentPath: string
  searchParams: URLSearchParams
  onClose?: () => void
}) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const loadCounts = () => {
    fetch('/api/courrier/counts', { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) return
        const countsMap = data?.data != null ? data.data : data
        if (countsMap && typeof countsMap === 'object' && !Array.isArray(countsMap) && 'a_traiter' in countsMap) {
          setCounts(countsMap)
        }
      })
      .catch(() => {})
  }
  useEffect(() => {
    loadCounts()
    const t = setTimeout(loadCounts, 800)
    return () => clearTimeout(t)
  }, [])
  const IconComp = item.icon || 'solar:inbox-linear'
  const iconElement = <Icon icon={IconComp} height={21} width={21} />
  return (
    <AMSubmenu
      key={item.id}
      icon={iconElement}
      title={item.name}
      ClassName='mt-1.5 text-link dark:text-darklink'>
      {(item.children ?? []).map((child, index) => {
        const viewKey = child.viewKey
        const count = viewKey != null ? counts[viewKey] ?? 0 : 0
        const isSelected =
          currentPath === '/courrier/mes-banettes' &&
          searchParams.get('view') === viewKey
        const itemClassNames = `mt-1.5 text-link dark:text-darklink !hover:bg-transparent ${isSelected ? '!bg-transparent !text-primary' : ''} !px-1.5 `
        return (
          <div onClick={onClose} key={child.id ?? index}>
            <AMMenuItem
              icon={null}
              isSelected={isSelected}
              link={child.url || undefined}
              target='_self'
              component={Link}
              className={itemClassNames}>
              <span className='tabular-nums text-muted-foreground dark:text-muted-foreground mr-2 shrink-0 min-w-[1.25rem] text-right'>{count}</span>
              <span className='truncate flex-1'>{child.name}</span>
            </AMMenuItem>
          </div>
        )
      })}
    </AMSubmenu>
  )
}

const renderSidebarItems = (
  items: any[],
  currentPath: string,
  onClose?: () => void,
  searchParams?: URLSearchParams,
  isSubItem: boolean = false
) => {
  return items.map((item, index) => {
    const isSelected = currentPath === item?.url
    const IconComp = item.icon || null

    const iconElement = IconComp ? (
      <Icon icon={IconComp} height={21} width={21} />
    ) : (
      <Icon icon={'ri:checkbox-blank-circle-line'} height={9} width={9} />
    )

    // Heading
    if (item.heading) {
      return (
        <div className='mb-1' key={item.heading}>
          <AMMenu
            subHeading={item.heading}
            ClassName={`hide-menu leading-21 text-charcoal font-bold uppercase text-xs dark:text-darkcharcoal`}
          />
        </div>
      )
    }

    // Submenu "Mes banettes" avec comptages
    if (item.children?.length && item.name === 'Mes banettes') {
      return (
        <BanettesSubmenu
          key={item.id}
          item={item}
          currentPath={currentPath}
          searchParams={searchParams ?? new URLSearchParams()}
          onClose={onClose}
        />
      )
    }

    // Autre submenu
    if (item.children?.length) {
      return (
        <AMSubmenu
          key={item.id}
          icon={iconElement}
          title={item.name}
          ClassName={`mt-1.5 text-link dark:text-darklink`}>
          {renderSidebarItems(item.children, currentPath, onClose, searchParams, true)}
        </AMSubmenu>
      )
    }

    // Regular menu item
    const linkTarget = item.url?.startsWith('https') ? '_blank' : '_self'

    const itemClassNames = isSubItem
      ? `mt-1.5 text-link dark:text-darklink !hover:bg-transparent ${item?.isPro && "!text-gray-400"} ${isSelected ? '!bg-transparent !text-primary' : ''
      } !px-1.5 `
      : `hover:bg-lightprimary! hover:text-primary! mt-1.5 ${item?.isPro && "!text-gray-400"} text-link dark:text-darklink ${isSelected ? '!bg-lightprimary !text-primary !hover-bg-lightprimary' : ' '}`

    return (
      <div onClick={onClose} key={index}>
        <AMMenuItem
          key={item.id}
          icon={iconElement}
          isSelected={isSelected}
          link={item.url || undefined}
          target={linkTarget}
        //   badge={!!item.isPro}
          badgeColor='bg-lightsecondary'
          badgeTextColor='text-secondary'
          disabled={item.disabled}
          badgeContent={item.isPro ? 'Pro' : undefined}
          component={Link}
          className={`${itemClassNames}`}>
          <span className='truncate flex-1'>{item.title || item.name}</span>
        </AMMenuItem>
      </div>
    )
  })
}

const SidebarLayout = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only allow "light" or "dark" for AMSidebar
  const sidebarMode = theme === 'light' || theme === 'dark' ? theme : undefined

  // Defer Radix-based sidebar (Collapsible, etc.) until client mount to avoid hydration mismatch from server/client ID differences
  if (!mounted) {
    return (
      <aside
        className='fixed left-0 top-0 border-none bg-background z-10 h-screen w-[270px] flex flex-col'
        aria-label='Sidebar'>
        <div className='flex w-full min-h-[4.25rem] items-center justify-center px-3 py-3 brand-logo overflow-hidden border-b border-border/40'>
          <Image
            src={APP_LOGO_SRC}
            alt='Logo C.U.B.'
            width={200}
            height={240}
            priority
            sizes='(max-width: 768px) 60vw, 200px'
            className='h-14 w-auto max-w-[min(100%,13rem)] object-contain object-center'
          />
        </div>
        <div className='flex-1 min-h-0' />
      </aside>
    )
  }

  return (
    <AMSidebar
      collapsible='none'
      animation={true}
      showProfile={false}
      width={'270px'}
      showTrigger={false}
      mode={sidebarMode}
      className='fixed left-0 top-0 border-none bg-background z-10 h-screen'>
      {/* Logo — centré ; APP_LOGO_SRC utilise BASE_PATH pour déploiement sous-chemin */}
      <div className='flex w-full min-h-[4.25rem] shrink-0 items-center justify-center px-3 py-3 brand-logo overflow-hidden border-b border-border/40'>
        <AMLogo component={Link} href='/' img=''>
          <span className='flex w-full justify-center'>
            <Image
              src={APP_LOGO_SRC}
              alt='Logo C.U.B.'
              width={200}
              height={240}
              priority
              sizes='(max-width: 768px) 60vw, 200px'
              className='h-14 w-auto max-w-[min(100%,13rem)] object-contain object-center'
            />
          </span>
        </AMLogo>
      </div>

      {/* Sidebar items */}

      <SimpleBar className='h-[calc(100vh-10vh)]'>
        <div className='px-6'>
          {SidebarContent.map((section, index) => {
            const children = (section.children || []).filter(
              (item) => item.name !== 'Configuration' || isAdmin
            )
            return (
              <div key={index}>
                {renderSidebarItems(
                  [
                    ...(section.heading ? [{ heading: section.heading }] : []),
                    ...children,
                  ],
                  pathname,
                  onClose,
                  searchParams
                )}
              </div>
            )
          })}
        </div>
      </SimpleBar>
    </AMSidebar>
  )
}

export default SidebarLayout

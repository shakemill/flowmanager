'use client'

import Image from "next/image";
import Link from 'next/link';
import { APP_LOGO_SRC } from '@/lib/constants';

const Logo = () => {
  return (
    <Link href={'/'} className="inline-flex items-center" aria-label="Accueil">
      <Image
        src={APP_LOGO_SRC}
        alt="Logo C.U.B."
        width={200}
        height={240}
        className="h-9 w-auto max-w-[88px] object-contain object-left"
        priority
      />
    </Link>
  )
}

export default Logo

"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_LOGO_SRC } from "@/lib/constants";

const FullLogo = () => {
  return (
    <Link href={"/"} className="inline-flex items-center" aria-label="Accueil">
      <Image
        src={APP_LOGO_SRC}
        alt="Logo Communauté Urbaine de Bafoussam (C.U.B.)"
        width={200}
        height={240}
        className="h-10 sm:h-11 w-auto max-w-[120px] object-contain object-left"
        priority
      />
    </Link>
  );
};

export default FullLogo;

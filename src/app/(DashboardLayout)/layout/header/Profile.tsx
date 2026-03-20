"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Icon } from "@iconify/react";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

const Profile = () => {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogout = () => signOut({ callbackUrl: "/auth/login" });

  const name = (session?.user as { name?: string | null })?.name ?? null;
  const email = session?.user?.email ?? null;
  const initials = getInitials(name, email);

  const avatar = (
    <span className="h-10 w-10 hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary bg-primary/10 text-primary text-sm font-semibold shrink-0">
      {initials}
    </span>
  );

  const trigger = (
    <button className="flex items-center gap-2 cursor-pointer rounded-full hover:bg-lightprimary px-1 py-1 pr-3 transition-colors">
      {avatar}
      {name && (
        <span className="hidden sm:block text-sm font-medium text-dark dark:text-white truncate max-w-[150px]">
          {name}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative group/menu">
      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {trigger}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-44 rounded-sm shadow-md p-2"
          >
          <DropdownMenuItem asChild>
            <Link
              href="/mon-profil"
              className="px-3 py-2 flex items-center w-full gap-3 text-darkLink hover:bg-lightprimary hover:text-primary"
            >
              <Icon icon="solar:user-circle-outline" height={20} />
              Mon profil
            </Link>
          </DropdownMenuItem>

          <div className="p-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleLogout}
            >
              Déconnexion
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      ) : (
        avatar
      )}
    </div>
  );
};

export default Profile;

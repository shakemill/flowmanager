import UserProfile from "@/app/components/user-profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil utilisateur",
};


const Notes = () => {

  return (
    <>
        <UserProfile/>
    </>
  );
};

export default Notes;

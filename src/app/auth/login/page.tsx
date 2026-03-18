import { Suspense } from "react";
import { Login } from "@/app/components/auth/login";

const page = () => {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Chargement...</div>}>
      <Login />
    </Suspense>
  );
};

export default page;
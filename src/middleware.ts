import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/login',
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/courrier/:path*',
    '/apps/:path*',
    '/utilities/:path*',
    '/user-profile',
    '/mon-profil',
    '/sample-page',
    '/icons/:path*',
  ],
};

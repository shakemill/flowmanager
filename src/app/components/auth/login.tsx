'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import CardBox from '../shared/CardBox'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Email ou mot de passe incorrect',
  Default: 'Une erreur est survenue. Réessayez.',
}

export const Login = () => {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const errorShownRef = useRef(false)

  // Afficher l'erreur renvoyée par NextAuth (ex: après redirection depuis /error)
  useEffect(() => {
    if (!errorParam || errorShownRef.current) return
    errorShownRef.current = true
    const msg = ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default
    toast.error(msg)
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    window.history.replaceState({}, '', url.pathname + url.search)
  }, [errorParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.warning('Email et mot de passe requis')
      return
    }
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      })
      if (res?.error) {
        toast.error('Email ou mot de passe incorrect')
        return
      }
      toast.success('Connexion réussie')
      window.location.href = callbackUrl
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className='relative h-screen w-full flex justify-center items-center min-h-[100dvh]'
        style={{
          backgroundImage: 'url(/images/login-cover.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className='absolute inset-0 bg-white/60' aria-hidden />
        <div className='relative z-10 md:min-w-[450px] min-w-max mx-4'>
          <CardBox className='shadow-xl'>
            <div className='flex justify-center mb-4'>
              <FullLogo />
            </div>
            <p className='text-sm text-charcoal text-center mb-6'>
              Gestion courrier <strong>Ville de Bafoussam</strong>
            </p>
            <form onSubmit={handleSubmit}>
              <div>
                <div className='mb-2 block'>
                  <Label htmlFor='email' className='font-medium'>
                    Email
                  </Label>
                </div>
                <Input
                  id='email'
                  type='email'
                  placeholder='votre@email.fr'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className='mt-4'>
                <div className='mb-2 block'>
                  <Label htmlFor='password' className='font-medium'>
                    Mot de passe
                  </Label>
                </div>
                <Input
                  id='password'
                  type='password'
                  placeholder='Mot de passe'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className='flex flex-wrap gap-6 items-center justify-between mt-4'>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='remember'
                    checked={remember}
                    onCheckedChange={(v) => setRemember(!!v)}
                  />
                  <Label className='text-link font-normal' htmlFor='remember'>
                    Se souvenir de moi
                  </Label>
                </div>
              </div>
              <Button type='submit' className='w-full mt-6' disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
            <div className='flex items-center justify-center mt-6'>
              <a
                href='https://yarabyte.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-muted-foreground hover:text-primary transition-colors'>
                Édité par la société <span className='font-semibold'>Yarabyte.com</span>
              </a>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  )
}

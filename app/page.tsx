import { LandingPageContent } from '@/components/landing-page-content'
import { PublicNavbar } from '@/components/public-navbar'
import { getCurrentUser } from '@/lib/server/auth'

function getCitizenPath(path: string, isLoggedIn: boolean) {
  return isLoggedIn ? path : `/auth?mode=signup&next=${encodeURIComponent(path)}`
}

export default async function Home() {
  const user = await getCurrentUser()
  const isCitizenLoggedIn = user?.role === 'citizen'
  const primaryHref = getCitizenPath('/citizen/submit', isCitizenLoggedIn)
  const secondaryHref = isCitizenLoggedIn ? '/citizen' : '/auth?mode=signup&next=%2Fcitizen%2Fsubmit'
  const trackerHref = '/track'
  const lastUpdated = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <PublicNavbar isLoggedIn={isCitizenLoggedIn} primaryHref={primaryHref} trackerHref={trackerHref} />
      <LandingPageContent
        primaryHref={primaryHref}
        secondaryHref={secondaryHref}
        trackerHref={trackerHref}
        lastUpdated={lastUpdated}
      />
    </div>
  )
}

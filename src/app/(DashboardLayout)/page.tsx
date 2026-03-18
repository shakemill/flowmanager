import CourrierStats from '../components/dashboard/CourrierStats';
import MesBanettesResume from '../components/dashboard/MesBanettesResume';
import CourrierStatutRepartition from '../components/dashboard/CourrierStatutRepartition';
import CourrierPrioriteRepartition from '../components/dashboard/CourrierPrioriteRepartition';
import AccesRapides from '../components/dashboard/AccesRapides';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [{ to: '/', title: 'Accueil' }];

export default function DashboardPage() {
  return (
    <>
      <BreadcrumbComp title="Tableau de bord" items={BCrumb} />
      <div className="mt-6 space-y-6 lg:space-y-8 max-w-[1600px]">
        {/* Vue d'ensemble + chiffres clés */}
        <section aria-label="Vue d'ensemble du courrier">
          <CourrierStats />
        </section>

        {/* Accès rapides en bandeau */}
        <section aria-label="Accès rapides" className="lg:-mt-2">
          <AccesRapides />
        </section>

        {/* Répartitions et banettes — 3 colonnes égales pour équilibrer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6 xl:gap-8 items-stretch">
          <div className="min-h-0 order-2 lg:order-1 flex flex-col lg:min-h-[320px]">
            <CourrierStatutRepartition />
          </div>
          <div className="min-h-0 order-1 lg:order-2 flex flex-col lg:min-h-[320px]">
            <MesBanettesResume />
          </div>
          <div className="min-h-0 order-3 flex flex-col lg:min-h-[320px]">
            <CourrierPrioriteRepartition />
          </div>
        </div>
      </div>
    </>
  );
}

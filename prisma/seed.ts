import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@mairie.local').trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const hashedPassword = await hash(adminPassword, 10);
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrateur',
        password: hashedPassword,
        role: 'admin',
      },
    });
    console.log('Admin user created:', adminEmail);
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });
    console.log('Admin user already exists, password reset:', adminEmail);
  }
  return admin;
}

async function seedContacts() {
  const count = await prisma.contact.count();
  if (count > 0) {
    console.log('Contacts already exist, skip.');
    return;
  }
  await prisma.contact.createMany({
    data: [
      { nom: 'Préfecture de région', type: 'SOCIETE', email: 'contact@prefecture.gouv.fr', telephone: '01 23 45 67 89', adresse: '1 place de la Préfecture, 75000 Paris' },
      { nom: 'CAF', type: 'SOCIETE', email: 'contact@caf.fr', telephone: '32 30', adresse: 'Caisse d\'allocations familiales' },
      { nom: 'Jean Dupont', type: 'PERSONNE', email: 'jean.dupont@email.fr', telephone: '06 12 34 56 78', adresse: '10 rue des Lilas, 69000 Lyon' },
      { nom: 'Association des commerçants', type: 'SOCIETE', email: 'bureau@asso-commercants.fr', telephone: '04 78 00 00 00', adresse: 'Place du marché' },
      { nom: 'Marie Martin', type: 'PERSONNE', email: 'marie.martin@email.fr', telephone: '06 98 76 54 32', adresse: '5 avenue de la Gare' },
      { nom: 'EDF SA', type: 'SOCIETE', email: 'client@edf.fr', telephone: '09 69 32 15 15', adresse: 'Service clients' },
    ],
  });
  console.log('Contacts créés.');
}

async function seedOrganisationUnits() {
  const count = await prisma.organisationUnit.count();
  if (count > 0) {
    console.log('Unités organisationnelles déjà présentes, skip.');
    return;
  }
  const mairie = await prisma.organisationUnit.create({
    data: { libelle: 'Mairie', parentId: null, niveau: 0, ordre: 0, actif: true },
  });
  const secgen = await prisma.organisationUnit.create({
    data: { libelle: 'Secrétariat général', parentId: mairie.id, niveau: 1, ordre: 1, actif: true },
  });
  const bureauCourrier = await prisma.organisationUnit.create({
    data: { libelle: 'Bureau du courrier', parentId: secgen.id, niveau: 2, ordre: 1, actif: true },
  });
  const etatCivil = await prisma.organisationUnit.create({
    data: { libelle: 'État civil', parentId: secgen.id, niveau: 2, ordre: 2, actif: true },
  });
  const urbanisme = await prisma.organisationUnit.create({
    data: { libelle: 'Service urbanisme', parentId: mairie.id, niveau: 1, ordre: 2, actif: true },
  });
  console.log('Organigramme créé (Mairie > Secrétariat général > Bureau du courrier, État civil; Service urbanisme).');
}

async function seedUserOrganisationUnits(adminId: string) {
  const firstUnit = await prisma.organisationUnit.findFirst({ orderBy: { niveau: 'asc' } });
  if (!firstUnit) return;
  const existing = await prisma.userOrganisationUnit.findFirst({
    where: { userId: adminId, organisationUnitId: firstUnit.id },
  });
  if (existing) {
    console.log('Admin déjà rattaché à une unité, skip.');
    return;
  }
  await prisma.userOrganisationUnit.create({
    data: {
      userId: adminId,
      organisationUnitId: firstUnit.id,
      niveauAcces: 'ADMIN',
    },
  });
  console.log('Admin rattaché à l\'unité:', firstUnit.libelle);
}

async function seedBanettes() {
  const codes = ['ARRIVEE', 'DEPART', 'A_TRAITER', 'ARCHIVE'];
  for (const code of codes) {
    const exists = await prisma.banette.findUnique({ where: { code } });
    if (exists) continue;
    const libelle =
      code === 'ARRIVEE' ? 'Courrier arrivée' :
      code === 'DEPART' ? 'Courrier départ' :
      code === 'A_TRAITER' ? 'À traiter' : 'Archive';
    await prisma.banette.create({
      data: { libelle, code, description: `Banette ${libelle}`, ordre: codes.indexOf(code), actif: true },
    });
  }
  console.log('Banettes créées (Arrivée, Départ, À traiter, Archive).');
}

async function seedWorkflows() {
  const count = await prisma.workflow.count();
  if (count > 0) {
    console.log('Workflows déjà présents, skip.');
    return;
  }
  const bureauCourrier = await prisma.organisationUnit.findFirst({
    where: { libelle: 'Bureau du courrier' },
  });
  const secgen = await prisma.organisationUnit.findFirst({
    where: { libelle: 'Secrétariat général' },
  });
  const workflow = await prisma.workflow.create({
    data: {
      nom: 'Circuit visa courrier',
      description: 'Saisie bureau du courrier puis visa secrétariat général',
      actif: true,
    },
  });
  await prisma.etapeWorkflow.createMany({
    data: [
      { workflowId: workflow.id, ordre: 1, libelle: 'Saisie et enregistrement', type: 'SAISIE', organisationUnitId: bureauCourrier?.id ?? null, delaiJours: 2 },
      { workflowId: workflow.id, ordre: 2, libelle: 'Visa secrétariat général', type: 'VISA', organisationUnitId: secgen?.id ?? null, delaiJours: 3 },
      { workflowId: workflow.id, ordre: 3, libelle: 'Clôture', type: 'ENVOI', organisationUnitId: null, delaiJours: null },
    ],
  });
  console.log('Workflow "Circuit visa courrier" créé avec 3 étapes.');
}

async function seedWorkflowEnregistrementCourrier() {
  const existing = await prisma.workflow.findFirst({
    where: { nom: 'Enregistrement du courrier' },
  });
  if (existing) {
    console.log('Workflow "Enregistrement du courrier" déjà présent, skip.');
    return;
  }
  const bureauCourrier = await prisma.organisationUnit.findFirst({
    where: { libelle: 'Bureau du courrier' },
  });
  const mairie = await prisma.organisationUnit.findFirst({
    where: { libelle: 'Mairie', niveau: 0 },
  });
  const workflow = await prisma.workflow.create({
    data: {
      nom: 'Enregistrement du courrier',
      description: 'Enregistrement par l\'agent courrier, puis envoi à la Mairie (niveau 0). En cas d\'absence, délégation au Secrétaire général.',
      actif: true,
    },
  });
  await prisma.etapeWorkflow.createMany({
    data: [
      {
        workflowId: workflow.id,
        ordre: 1,
        libelle: 'Enregistrement par l\'agent courrier',
        type: 'SAISIE',
        organisationUnitId: bureauCourrier?.id ?? null,
        delaiJours: 2,
      },
      {
        workflowId: workflow.id,
        ordre: 2,
        libelle: 'Visa Mairie (délégation Secrétaire général en cas d\'absence)',
        type: 'VISA',
        organisationUnitId: mairie?.id ?? null,
        delaiJours: 3,
      },
      {
        workflowId: workflow.id,
        ordre: 3,
        libelle: 'Clôture',
        type: 'ENVOI',
        organisationUnitId: null,
        delaiJours: null,
      },
    ],
  });
  console.log('Workflow "Enregistrement du courrier" créé avec 3 étapes.');
}

async function seedCourriers(adminId: string) {
  const count = await prisma.courrier.count();
  if (count > 0) {
    console.log('Courriers déjà présents, skip.');
    return;
  }
  const [expediteur, entiteTraitante, banetteArrivee] = await Promise.all([
    prisma.contact.findFirst(),
    prisma.organisationUnit.findFirst({ where: { libelle: 'Bureau du courrier' } }).then((u) => u ?? prisma.organisationUnit.findFirst()),
    prisma.banette.findUnique({ where: { code: 'ARRIVEE' } }),
  ]);
  if (!expediteur || !entiteTraitante) {
    console.log('Impossible de créer des courriers: contact ou unité manquant.');
    return;
  }
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);
  const year = new Date().getFullYear();
  await prisma.courrier.createMany({
    data: [
      {
        numero: `${year}-000001`,
        priorite: 'NORMAL',
        dateCourrier: baseDate,
        dateArrivee: baseDate,
        objet: 'Demande de renseignements - état civil',
        expediteurId: expediteur.id,
        entiteTraitanteId: entiteTraitante.id,
        statut: 'ENREGISTRE',
        banetteId: banetteArrivee?.id ?? null,
        createdById: adminId,
      },
      {
        numero: `${year}-000002`,
        priorite: 'HAUTE',
        dateCourrier: new Date(baseDate.getTime() + 86400000),
        dateArrivee: new Date(baseDate.getTime() + 86400000),
        objet: 'Réclamation facturation',
        expediteurId: expediteur.id,
        entiteTraitanteId: entiteTraitante.id,
        statut: 'ENREGISTRE',
        banetteId: banetteArrivee?.id ?? null,
        createdById: adminId,
      },
      {
        numero: `${year}-000003`,
        priorite: 'NORMAL',
        dateCourrier: new Date(baseDate.getTime() + 2 * 86400000),
        dateArrivee: new Date(baseDate.getTime() + 2 * 86400000),
        objet: 'Demande d\'autorisation d\'urbanisme',
        expediteurId: expediteur.id,
        entiteTraitanteId: entiteTraitante.id,
        statut: 'EN_TRAITEMENT',
        banetteId: banetteArrivee?.id ?? null,
        createdById: adminId,
      },
    ],
  });
  console.log('3 courriers d\'exemple créés.');
}

/** Seed scénario de test: utilisateurs (agent courrier, maire, SG, direction), workflow complet, 1 courrier avec audit et notes. */
async function seedTestScenario() {
  const testPassword = process.env.SEED_TEST_PASSWORD ?? 'Test123!';
  const hashedTest = await hash(testPassword, 10);

  const testUsers = [
    { email: 'agent.courrier@mairie.local', name: 'Agent Courrier' },
    { email: 'maire@mairie.local', name: 'Le Maire' },
    { email: 'sg@mairie.local', name: 'Secrétaire général' },
    { email: 'direction@mairie.local', name: 'Responsable Direction' },
  ];
  const users: { email: string; id: string }[] = [];
  for (const u of testUsers) {
    const email = u.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: u.name, password: hashedTest, role: 'user' },
      });
      console.log('Utilisateur test créé:', email);
    }
    users.push({ email: user.email, id: user.id });
  }
  const [agentCourrier, maire, sg, direction] = users;
  if (!agentCourrier || !maire || !sg || !direction) return;

  const bureauCourrier = await prisma.organisationUnit.findFirst({ where: { libelle: { contains: 'Bureau' } } });
  const mairieUnit = await prisma.organisationUnit.findFirst({ where: { libelle: { contains: 'Mairie' }, parentId: null } });
  const secgenUnit = await prisma.organisationUnit.findFirst({ where: { libelle: { contains: 'Secrétariat' } } });
  const etatCivil = await prisma.organisationUnit.findFirst({ where: { libelle: { contains: 'État civil' } } })
    ?? await prisma.organisationUnit.findFirst({ where: { libelle: { contains: 'urbanisme' } } });
  if (!bureauCourrier || !mairieUnit || !secgenUnit || !etatCivil) {
    console.log('Seed test: unités manquantes (bureau=%s mairie=%s sg=%s direction=%s), skip.', !!bureauCourrier, !!mairieUnit, !!secgenUnit, !!etatCivil);
    return;
  }

  for (const [user, unit, niveau] of [
    [agentCourrier, bureauCourrier, 'TRAITEMENT'] as const,
    [maire, mairieUnit, 'VALIDATION'] as const,
    [sg, secgenUnit, 'TRAITEMENT'] as const,
    [direction, etatCivil, 'TRAITEMENT'] as const,
  ]) {
    const existing = await prisma.userOrganisationUnit.findFirst({
      where: { userId: user.id, organisationUnitId: unit.id },
    });
    if (!existing) {
      await prisma.userOrganisationUnit.create({
        data: { userId: user.id, organisationUnitId: unit.id, niveauAcces: niveau },
      });
    }
  }

  let workflow = await prisma.workflow.findFirst({ where: { nom: 'Test processus complet' } });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        nom: 'Test processus complet',
        description: 'Enregistrement → Maire → Secrétariat général → Direction → Clôture (scénario de test)',
        actif: true,
      },
    });
    await prisma.etapeWorkflow.createMany({
      data: [
        { workflowId: workflow.id, ordre: 1, libelle: 'Enregistrement du courrier', type: 'SAISIE', organisationUnitId: bureauCourrier.id, delaiJours: 1 },
        { workflowId: workflow.id, ordre: 2, libelle: 'Traitement par le Maire', type: 'VISA', organisationUnitId: mairieUnit.id, delaiJours: 2 },
        { workflowId: workflow.id, ordre: 3, libelle: 'Transfert au Secrétariat général pour traitement', type: 'VISA', organisationUnitId: secgenUnit.id, delaiJours: 2 },
        { workflowId: workflow.id, ordre: 4, libelle: 'Transfert à une direction pour traitement', type: 'VISA', organisationUnitId: etatCivil.id, delaiJours: 3 },
        { workflowId: workflow.id, ordre: 5, libelle: 'Clôture', type: 'ENVOI', organisationUnitId: null, delaiJours: null },
      ],
    });
    console.log('Workflow "Test processus complet" créé avec 5 étapes.');
  }

  const etapesOrdered = await prisma.etapeWorkflow.findMany({
    where: { workflowId: workflow.id },
    orderBy: { ordre: 'asc' },
  });
  const etape1 = etapesOrdered[0];
  const etape2 = etapesOrdered[1];
  const etape3 = etapesOrdered[2];
  const etape4 = etapesOrdered[3];

  const existingTestCourrier = await prisma.courrier.findUnique({ where: { numero: 'TEST-001' } });
  if (existingTestCourrier) {
    console.log('Courrier de test TEST-001 déjà présent, skip scénario.');
    return;
  }

  const contact = await prisma.contact.findFirst();
  const banette = await prisma.banette.findUnique({ where: { code: 'ARRIVEE' } });
  if (!contact) return;

  const now = new Date();
  const courrier = await prisma.courrier.create({
    data: {
      numero: 'TEST-001',
      priorite: 'NORMAL',
      dateCourrier: now,
      dateArrivee: now,
      objet: 'Courrier de test – processus complet avec audit et instructions',
      expediteurId: contact.id,
      entiteTraitanteId: bureauCourrier.id,
      statut: 'CLOTURE',
      banetteId: banette?.id ?? null,
      createdById: agentCourrier.id,
    },
  });

  const instance = await prisma.instanceCircuit.create({
    data: {
      courrierId: courrier.id,
      workflowId: workflow.id,
      etapeActuelleId: null,
      statut: 'TERMINE',
    },
  });

  await prisma.historiqueVisa.createMany({
    data: [
      { instanceCircuitId: instance.id, etapeWorkflowId: etape2.id, userId: maire.id, action: 'VISE', commentaire: 'Instruction du Maire: Valider et transmettre au Secrétariat général pour suite. Priorité normale.' },
      { instanceCircuitId: instance.id, etapeWorkflowId: etape3.id, userId: sg.id, action: 'VISE', commentaire: 'Instruction SG: Transférer à la direction État civil pour traitement. Réponse sous 5 jours.' },
      { instanceCircuitId: instance.id, etapeWorkflowId: etape4.id, userId: direction.id, action: 'VISE', commentaire: 'Instruction direction: Dossier traité. Réponse envoyée à l\'expéditeur. Clôture.' },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { courrierId: courrier.id, userId: agentCourrier.id, action: 'Création du courrier', details: { note: 'Enregistrement du courrier par l\'agent courrier. Numéro attribué TEST-001.' } },
      { courrierId: courrier.id, userId: agentCourrier.id, action: 'Démarrage du workflow', details: { note: 'Workflow "Test processus complet" démarré. Envoi à l\'entité niveau 0 (Mairie) pour traitement par le Maire.' } },
      { courrierId: courrier.id, userId: maire.id, action: 'Visa – Traitement par le Maire', details: { note: 'Instruction: Valider et transmettre au Secrétariat général pour suite. Priorité normale.', etape: 'Traitement par le Maire' } },
      { courrierId: courrier.id, userId: sg.id, action: 'Transfert au Secrétariat général', details: { note: 'Instruction: Transférer à la direction État civil pour traitement. Réponse sous 5 jours.', etape: 'Transfert au Secrétariat général pour traitement' } },
      { courrierId: courrier.id, userId: direction.id, action: 'Traitement par la direction', details: { note: 'Instruction: Dossier traité. Réponse envoyée à l\'expéditeur. Clôture.', etape: 'Transfert à une direction pour traitement' } },
      { courrierId: courrier.id, userId: direction.id, action: 'Clôture du courrier', details: { note: 'Processus terminé. Courrier clôturé.' } },
    ],
  });

  console.log('Scénario de test créé: courrier TEST-001, 4 utilisateurs (agent.courrier, maire, sg, direction @ Test123!), audit et instructions.');
}

async function seedTypologiesCourrier() {
  const count = await prisma.typologieCourrier.count();
  if (count > 0) {
    console.log('Typologies courrier déjà présentes, skip.');
    return;
  }
  const entrant = await prisma.typologieCourrier.create({
    data: { libelle: 'Courrier entrant', parentId: null, ordre: 1, actif: true },
  });
  const sortant = await prisma.typologieCourrier.create({
    data: { libelle: 'Courrier sortant', parentId: null, ordre: 2, actif: true },
  });
  const noteInterne = await prisma.typologieCourrier.create({
    data: { libelle: 'Note interne', parentId: null, ordre: 3, actif: true },
  });
  await prisma.typologieCourrier.createMany({
    data: [
      { libelle: 'Lettre', parentId: entrant.id, ordre: 1, actif: true },
      { libelle: 'Email', parentId: entrant.id, ordre: 2, actif: true },
      { libelle: 'Réclamation', parentId: entrant.id, ordre: 3, actif: true },
      { libelle: 'Demande', parentId: entrant.id, ordre: 4, actif: true },
      { libelle: 'Lettre', parentId: sortant.id, ordre: 1, actif: true },
      { libelle: 'Email', parentId: sortant.id, ordre: 2, actif: true },
      { libelle: 'Circulaire', parentId: sortant.id, ordre: 3, actif: true },
      { libelle: 'Note', parentId: noteInterne.id, ordre: 1, actif: true },
      { libelle: 'Circulaire', parentId: noteInterne.id, ordre: 2, actif: true },
      { libelle: 'Information', parentId: noteInterne.id, ordre: 3, actif: true },
    ],
  });
  console.log('Typologies courrier créées (Courrier entrant, Courrier sortant, Note interne + niveau 2).');
}

async function main() {
  const admin = await seedAdmin();
  await seedContacts();
  await seedOrganisationUnits();
  await seedUserOrganisationUnits(admin.id);
  await seedBanettes();
  await seedTypologiesCourrier();
  await seedWorkflows();
  await seedWorkflowEnregistrementCourrier();
  await seedCourriers(admin.id);
  await seedTestScenario();
  console.log('Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `type` ENUM('PERSONNE', 'MORAL') NOT NULL DEFAULT 'PERSONNE',
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `adresse` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganisationUnit` (
    `id` VARCHAR(191) NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `niveau` INTEGER NOT NULL DEFAULT 0,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Courrier` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `priorite` ENUM('BASSE', 'NORMAL', 'HAUTE', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `dateCourrier` DATETIME(3) NOT NULL,
    `dateArrivee` DATETIME(3) NOT NULL,
    `objet` VARCHAR(191) NOT NULL,
    `expediteurId` VARCHAR(191) NOT NULL,
    `entiteTraitanteId` VARCHAR(191) NOT NULL,
    `documentPrincipalPath` VARCHAR(191) NULL,
    `statut` ENUM('ENREGISTRE', 'EN_TRAITEMENT', 'EN_VISA', 'VISÉ', 'CLOTURE', 'ANNULE') NOT NULL DEFAULT 'ENREGISTRE',
    `banetteId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,

    UNIQUE INDEX `Courrier_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PieceJointe` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `nomFichier` VARCHAR(191) NOT NULL,
    `cheminStockage` VARCHAR(191) NOT NULL,
    `typeMime` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL DEFAULT 0,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `principal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Banette` (
    `id` VARCHAR(191) NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `entiteId` VARCHAR(191) NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Banette_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserOrganisationUnit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `organisationUnitId` VARCHAR(191) NOT NULL,
    `niveauAcces` ENUM('LECTURE', 'TRAITEMENT', 'VALIDATION', 'ADMIN') NOT NULL DEFAULT 'LECTURE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserOrganisationUnit_userId_organisationUnitId_key`(`userId`, `organisationUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workflow` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EtapeWorkflow` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `ordre` INTEGER NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `type` ENUM('SAISIE', 'VISA', 'SIGNATURE', 'ENVOI') NOT NULL DEFAULT 'SAISIE',
    `organisationUnitId` VARCHAR(191) NULL,
    `delaiJours` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstanceCircuit` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `etapeActuelleId` VARCHAR(191) NULL,
    `statut` ENUM('EN_COURS', 'TERMINE', 'ANNULE') NOT NULL DEFAULT 'EN_COURS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoriqueVisa` (
    `id` VARCHAR(191) NOT NULL,
    `instanceCircuitId` VARCHAR(191) NOT NULL,
    `etapeWorkflowId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` ENUM('VISE', 'REFUSE', 'DELEGUE') NOT NULL,
    `commentaire` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccuseReception` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `dateEnvoi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `destinataire` VARCHAR(191) NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'envoye',
    `modeEnvoi` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `lue` BOOLEAN NOT NULL DEFAULT false,
    `courrierId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrganisationUnit` ADD CONSTRAINT `OrganisationUnit_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_expediteurId_fkey` FOREIGN KEY (`expediteurId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_entiteTraitanteId_fkey` FOREIGN KEY (`entiteTraitanteId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_banetteId_fkey` FOREIGN KEY (`banetteId`) REFERENCES `Banette`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PieceJointe` ADD CONSTRAINT `PieceJointe_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Banette` ADD CONSTRAINT `Banette_entiteId_fkey` FOREIGN KEY (`entiteId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOrganisationUnit` ADD CONSTRAINT `UserOrganisationUnit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOrganisationUnit` ADD CONSTRAINT `UserOrganisationUnit_organisationUnitId_fkey` FOREIGN KEY (`organisationUnitId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EtapeWorkflow` ADD CONSTRAINT `EtapeWorkflow_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EtapeWorkflow` ADD CONSTRAINT `EtapeWorkflow_organisationUnitId_fkey` FOREIGN KEY (`organisationUnitId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstanceCircuit` ADD CONSTRAINT `InstanceCircuit_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstanceCircuit` ADD CONSTRAINT `InstanceCircuit_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstanceCircuit` ADD CONSTRAINT `InstanceCircuit_etapeActuelleId_fkey` FOREIGN KEY (`etapeActuelleId`) REFERENCES `EtapeWorkflow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoriqueVisa` ADD CONSTRAINT `HistoriqueVisa_instanceCircuitId_fkey` FOREIGN KEY (`instanceCircuitId`) REFERENCES `InstanceCircuit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoriqueVisa` ADD CONSTRAINT `HistoriqueVisa_etapeWorkflowId_fkey` FOREIGN KEY (`etapeWorkflowId`) REFERENCES `EtapeWorkflow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoriqueVisa` ADD CONSTRAINT `HistoriqueVisa_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccuseReception` ADD CONSTRAINT `AccuseReception_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


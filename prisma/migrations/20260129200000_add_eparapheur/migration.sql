-- CreateTable EparapheurEnvoi
CREATE TABLE `EparapheurEnvoi` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `envoyeurId` VARCHAR(191) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'VALIDE', 'REJETE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable EparapheurDocument
CREATE TABLE `EparapheurDocument` (
    `id` VARCHAR(191) NOT NULL,
    `eparapheurEnvoiId` VARCHAR(191) NOT NULL,
    `pieceJointeId` VARCHAR(191) NULL,
    `estPrincipal` BOOLEAN NOT NULL DEFAULT false,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable EparapheurTraitement
CREATE TABLE `EparapheurTraitement` (
    `id` VARCHAR(191) NOT NULL,
    `eparapheurEnvoiId` VARCHAR(191) NOT NULL,
    `traiteParUserId` VARCHAR(191) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'VALIDE', 'REJETE') NOT NULL,
    `commentaire` VARCHAR(191) NULL,
    `cheminDocumentAnnote` VARCHAR(191) NULL,
    `dateTraitement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EparapheurTraitement_eparapheurEnvoiId_key`(`eparapheurEnvoiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert role eparapheur
INSERT INTO `Role` (`id`, `code`, `libelle`, `createdAt`) VALUES
('role_eparapheur', 'eparapheur', 'Éparapheur', CURRENT_TIMESTAMP(3));

-- AddForeignKey
ALTER TABLE `EparapheurEnvoi` ADD CONSTRAINT `EparapheurEnvoi_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EparapheurEnvoi` ADD CONSTRAINT `EparapheurEnvoi_envoyeurId_fkey` FOREIGN KEY (`envoyeurId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EparapheurDocument` ADD CONSTRAINT `EparapheurDocument_eparapheurEnvoiId_fkey` FOREIGN KEY (`eparapheurEnvoiId`) REFERENCES `EparapheurEnvoi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EparapheurDocument` ADD CONSTRAINT `EparapheurDocument_pieceJointeId_fkey` FOREIGN KEY (`pieceJointeId`) REFERENCES `PieceJointe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EparapheurTraitement` ADD CONSTRAINT `EparapheurTraitement_eparapheurEnvoiId_fkey` FOREIGN KEY (`eparapheurEnvoiId`) REFERENCES `EparapheurEnvoi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EparapheurTraitement` ADD CONSTRAINT `EparapheurTraitement_traiteParUserId_fkey` FOREIGN KEY (`traiteParUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

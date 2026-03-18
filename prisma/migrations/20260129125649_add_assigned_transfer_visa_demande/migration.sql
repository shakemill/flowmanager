-- AlterTable
ALTER TABLE `Courrier` ADD COLUMN `assignedToId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CourrierTransfert` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NULL,
    `toUserId` VARCHAR(191) NULL,
    `toUnitId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisaDemande` (
    `id` VARCHAR(191) NOT NULL,
    `courrierId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `statut` ENUM('EN_ATTENTE', 'VISE', 'REFUSE') NOT NULL DEFAULT 'EN_ATTENTE',
    `commentaire` VARCHAR(191) NULL,
    `dateReponse` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourrierTransfert` ADD CONSTRAINT `CourrierTransfert_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourrierTransfert` ADD CONSTRAINT `CourrierTransfert_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourrierTransfert` ADD CONSTRAINT `CourrierTransfert_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourrierTransfert` ADD CONSTRAINT `CourrierTransfert_toUnitId_fkey` FOREIGN KEY (`toUnitId`) REFERENCES `OrganisationUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisaDemande` ADD CONSTRAINT `VisaDemande_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisaDemande` ADD CONSTRAINT `VisaDemande_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

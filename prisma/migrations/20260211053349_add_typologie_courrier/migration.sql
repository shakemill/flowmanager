-- AlterTable
ALTER TABLE `Courrier` ADD COLUMN `typologieId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TypologieCourrier` (
    `id` VARCHAR(191) NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TypologieCourrier` ADD CONSTRAINT `TypologieCourrier_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `TypologieCourrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Courrier` ADD CONSTRAINT `Courrier_typologieId_fkey` FOREIGN KEY (`typologieId`) REFERENCES `TypologieCourrier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

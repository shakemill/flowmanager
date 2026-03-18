-- AlterTable
ALTER TABLE `VisaDemande` ADD COLUMN `demandeurId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `VisaDemande` ADD CONSTRAINT `VisaDemande_demandeurId_fkey` FOREIGN KEY (`demandeurId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

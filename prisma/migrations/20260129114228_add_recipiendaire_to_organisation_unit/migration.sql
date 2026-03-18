-- AlterTable
ALTER TABLE `OrganisationUnit` ADD COLUMN `recipiendaireId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `OrganisationUnit` ADD CONSTRAINT `OrganisationUnit_recipiendaireId_fkey` FOREIGN KEY (`recipiendaireId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

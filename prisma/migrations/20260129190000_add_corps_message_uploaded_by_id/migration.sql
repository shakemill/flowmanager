-- Migration pour aligner l'historique Prisma avec la base existante.
-- Si la base a déjà ces colonnes (drift), exécuter d'abord :
--   npx prisma migrate resolve --applied "20260129190000_add_corps_message_uploaded_by_id"
-- puis : npx prisma migrate dev

-- AlterTable AccuseReception
ALTER TABLE `AccuseReception` ADD COLUMN `corpsMessage` TEXT NULL;

-- AlterTable PieceJointe
ALTER TABLE `PieceJointe` ADD COLUMN `uploadedById` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `PieceJointe_uploadedById_idx` ON `PieceJointe`(`uploadedById`);

-- AddForeignKey
ALTER TABLE `PieceJointe` ADD CONSTRAINT `PieceJointe_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

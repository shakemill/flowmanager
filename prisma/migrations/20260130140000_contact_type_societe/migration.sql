-- AlterTable: add SOCIETE to enum so we can migrate MORAL -> SOCIETE
ALTER TABLE `Contact` MODIFY `type` ENUM('PERSONNE', 'MORAL', 'SOCIETE') NOT NULL DEFAULT 'PERSONNE';

-- Migrate existing MORAL to SOCIETE
UPDATE `Contact` SET `type` = 'SOCIETE' WHERE `type` = 'MORAL';

-- AlterTable: remove MORAL from enum
ALTER TABLE `Contact` MODIFY `type` ENUM('PERSONNE', 'SOCIETE') NOT NULL DEFAULT 'PERSONNE';

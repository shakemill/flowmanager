-- CreateIndex
CREATE INDEX `Courrier_dateArrivee_idx` ON `Courrier`(`dateArrivee`);

-- CreateIndex
CREATE INDEX `Courrier_entiteTraitanteId_dateArrivee_idx` ON `Courrier`(`entiteTraitanteId`, `dateArrivee`);

-- RenameIndex
ALTER TABLE `Courrier` RENAME INDEX `Courrier_entiteTraitanteId_fkey` TO `Courrier_entiteTraitanteId_idx`;

-- RenameIndex
ALTER TABLE `OrganisationUnit` RENAME INDEX `OrganisationUnit_recipiendaireId_fkey` TO `OrganisationUnit_recipiendaireId_idx`;

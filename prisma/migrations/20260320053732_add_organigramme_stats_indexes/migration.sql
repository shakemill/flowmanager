-- Index pour les stats / filtres par période et entité (sans RENAME INDEX : incompatible avec certaines versions MySQL).
-- Les clés étrangères créent déjà un index sur Courrier(entiteTraitanteId) et OrganisationUnit(recipiendaireId).

-- CreateIndex
CREATE INDEX `Courrier_dateArrivee_idx` ON `Courrier`(`dateArrivee`);

-- CreateIndex
CREATE INDEX `Courrier_entiteTraitanteId_dateArrivee_idx` ON `Courrier`(`entiteTraitanteId`, `dateArrivee`);

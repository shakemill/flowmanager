-- -------------------------------------------------------------
-- TablePlus 6.8.2(656)
--
-- https://tableplus.com/
--
-- Database: flowmanager_courrier
-- Generation Time: 2026-03-18 20:12:14.0560
-- -------------------------------------------------------------


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


DROP TABLE IF EXISTS `_prisma_migrations`;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `AccuseReception`;
CREATE TABLE `AccuseReception` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateEnvoi` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `destinataire` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'envoye',
  `modeEnvoi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `corpsMessage` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `AccuseReception_courrierId_fkey` (`courrierId`),
  CONSTRAINT `AccuseReception_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `AuditLog`;
CREATE TABLE `AuditLog` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_courrierId_fkey` (`courrierId`),
  KEY `AuditLog_userId_fkey` (`userId`),
  CONSTRAINT `AuditLog_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Banette`;
CREATE TABLE `Banette` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `libelle` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entiteId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordre` int NOT NULL DEFAULT '0',
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Banette_code_key` (`code`),
  KEY `Banette_entiteId_fkey` (`entiteId`),
  CONSTRAINT `Banette_entiteId_fkey` FOREIGN KEY (`entiteId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Contact`;
CREATE TABLE `Contact` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('PERSONNE','SOCIETE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PERSONNE',
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telephone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adresse` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `raisonSociale` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Courrier`;
CREATE TABLE `Courrier` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priorite` enum('BASSE','NORMAL','HAUTE','URGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `dateCourrier` datetime(3) NOT NULL,
  `dateArrivee` datetime(3) NOT NULL,
  `objet` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expediteurId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entiteTraitanteId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documentPrincipalPath` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` enum('ENREGISTRE','EN_TRAITEMENT','EN_VISA','VISÉ','CLOTURE','ANNULE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ENREGISTRE',
  `banetteId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `createdById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignedToId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `typologieId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Courrier_numero_key` (`numero`),
  KEY `Courrier_expediteurId_fkey` (`expediteurId`),
  KEY `Courrier_entiteTraitanteId_fkey` (`entiteTraitanteId`),
  KEY `Courrier_createdById_fkey` (`createdById`),
  KEY `Courrier_banetteId_fkey` (`banetteId`),
  KEY `Courrier_assignedToId_fkey` (`assignedToId`),
  KEY `Courrier_typologieId_fkey` (`typologieId`),
  CONSTRAINT `Courrier_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Courrier_banetteId_fkey` FOREIGN KEY (`banetteId`) REFERENCES `Banette` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Courrier_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Courrier_entiteTraitanteId_fkey` FOREIGN KEY (`entiteTraitanteId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Courrier_expediteurId_fkey` FOREIGN KEY (`expediteurId`) REFERENCES `Contact` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Courrier_typologieId_fkey` FOREIGN KEY (`typologieId`) REFERENCES `TypologieCourrier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `CourrierTransfert`;
CREATE TABLE `CourrierTransfert` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toUnitId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `CourrierTransfert_courrierId_fkey` (`courrierId`),
  KEY `CourrierTransfert_fromUserId_fkey` (`fromUserId`),
  KEY `CourrierTransfert_toUserId_fkey` (`toUserId`),
  KEY `CourrierTransfert_toUnitId_fkey` (`toUnitId`),
  CONSTRAINT `CourrierTransfert_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CourrierTransfert_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `CourrierTransfert_toUnitId_fkey` FOREIGN KEY (`toUnitId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `CourrierTransfert_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `EparapheurDocument`;
CREATE TABLE `EparapheurDocument` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eparapheurEnvoiId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pieceJointeId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estPrincipal` tinyint(1) NOT NULL DEFAULT '0',
  `ordre` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `EparapheurDocument_eparapheurEnvoiId_fkey` (`eparapheurEnvoiId`),
  KEY `EparapheurDocument_pieceJointeId_fkey` (`pieceJointeId`),
  CONSTRAINT `EparapheurDocument_eparapheurEnvoiId_fkey` FOREIGN KEY (`eparapheurEnvoiId`) REFERENCES `EparapheurEnvoi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EparapheurDocument_pieceJointeId_fkey` FOREIGN KEY (`pieceJointeId`) REFERENCES `PieceJointe` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `EparapheurEnvoi`;
CREATE TABLE `EparapheurEnvoi` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `envoyeurId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut` enum('EN_ATTENTE','VALIDE','REJETE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EN_ATTENTE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `EparapheurEnvoi_courrierId_fkey` (`courrierId`),
  KEY `EparapheurEnvoi_envoyeurId_fkey` (`envoyeurId`),
  CONSTRAINT `EparapheurEnvoi_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EparapheurEnvoi_envoyeurId_fkey` FOREIGN KEY (`envoyeurId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `EparapheurTraitement`;
CREATE TABLE `EparapheurTraitement` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eparapheurEnvoiId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `traiteParUserId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut` enum('EN_ATTENTE','VALIDE','REJETE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `commentaire` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cheminDocumentAnnote` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dateTraitement` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `EparapheurTraitement_eparapheurEnvoiId_key` (`eparapheurEnvoiId`),
  KEY `EparapheurTraitement_traiteParUserId_fkey` (`traiteParUserId`),
  CONSTRAINT `EparapheurTraitement_eparapheurEnvoiId_fkey` FOREIGN KEY (`eparapheurEnvoiId`) REFERENCES `EparapheurEnvoi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EparapheurTraitement_traiteParUserId_fkey` FOREIGN KEY (`traiteParUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `EtapeWorkflow`;
CREATE TABLE `EtapeWorkflow` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflowId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordre` int NOT NULL,
  `libelle` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('SAISIE','VISA','SIGNATURE','ENVOI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SAISIE',
  `organisationUnitId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delaiJours` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `EtapeWorkflow_workflowId_fkey` (`workflowId`),
  KEY `EtapeWorkflow_organisationUnitId_fkey` (`organisationUnitId`),
  CONSTRAINT `EtapeWorkflow_organisationUnitId_fkey` FOREIGN KEY (`organisationUnitId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `EtapeWorkflow_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `HistoriqueVisa`;
CREATE TABLE `HistoriqueVisa` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instanceCircuitId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `etapeWorkflowId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('VISE','REFUSE','DELEGUE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `commentaire` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `HistoriqueVisa_instanceCircuitId_fkey` (`instanceCircuitId`),
  KEY `HistoriqueVisa_etapeWorkflowId_fkey` (`etapeWorkflowId`),
  KEY `HistoriqueVisa_userId_fkey` (`userId`),
  CONSTRAINT `HistoriqueVisa_etapeWorkflowId_fkey` FOREIGN KEY (`etapeWorkflowId`) REFERENCES `EtapeWorkflow` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `HistoriqueVisa_instanceCircuitId_fkey` FOREIGN KEY (`instanceCircuitId`) REFERENCES `InstanceCircuit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `HistoriqueVisa_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `InstanceCircuit`;
CREATE TABLE `InstanceCircuit` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflowId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `etapeActuelleId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` enum('EN_COURS','TERMINE','ANNULE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EN_COURS',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `InstanceCircuit_courrierId_fkey` (`courrierId`),
  KEY `InstanceCircuit_workflowId_fkey` (`workflowId`),
  KEY `InstanceCircuit_etapeActuelleId_fkey` (`etapeActuelleId`),
  CONSTRAINT `InstanceCircuit_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InstanceCircuit_etapeActuelleId_fkey` FOREIGN KEY (`etapeActuelleId`) REFERENCES `EtapeWorkflow` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `InstanceCircuit_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Notification`;
CREATE TABLE `Notification` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titre` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lue` tinyint(1) NOT NULL DEFAULT '0',
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_userId_fkey` (`userId`),
  KEY `Notification_courrierId_fkey` (`courrierId`),
  CONSTRAINT `Notification_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `OrganisationUnit`;
CREATE TABLE `OrganisationUnit` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `libelle` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `niveau` int NOT NULL DEFAULT '0',
  `ordre` int NOT NULL DEFAULT '0',
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `recipiendaireId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entiteTraitante` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `OrganisationUnit_parentId_fkey` (`parentId`),
  KEY `OrganisationUnit_recipiendaireId_fkey` (`recipiendaireId`),
  CONSTRAINT `OrganisationUnit_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `OrganisationUnit_recipiendaireId_fkey` FOREIGN KEY (`recipiendaireId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `PieceJointe`;
CREATE TABLE `PieceJointe` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomFichier` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cheminStockage` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `typeMime` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taille` int NOT NULL DEFAULT '0',
  `ordre` int NOT NULL DEFAULT '0',
  `principal` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `uploadedById` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `PieceJointe_courrierId_fkey` (`courrierId`),
  KEY `PieceJointe_uploadedById_idx` (`uploadedById`),
  CONSTRAINT `PieceJointe_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PieceJointe_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Role`;
CREATE TABLE `Role` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `libelle` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Role_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `TypologieCourrier`;
CREATE TABLE `TypologieCourrier` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `libelle` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordre` int NOT NULL DEFAULT '0',
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `TypologieCourrier_parentId_fkey` (`parentId`),
  CONSTRAINT `TypologieCourrier_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `TypologieCourrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `UserOrganisationUnit`;
CREATE TABLE `UserOrganisationUnit` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organisationUnitId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `niveauAcces` enum('LECTURE','TRAITEMENT','VALIDATION','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LECTURE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserOrganisationUnit_userId_organisationUnitId_key` (`userId`,`organisationUnitId`),
  KEY `UserOrganisationUnit_organisationUnitId_fkey` (`organisationUnitId`),
  CONSTRAINT `UserOrganisationUnit_organisationUnitId_fkey` FOREIGN KEY (`organisationUnitId`) REFERENCES `OrganisationUnit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserOrganisationUnit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `UserRole`;
CREATE TABLE `UserRole` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserRole_userId_roleId_key` (`userId`,`roleId`),
  KEY `UserRole_roleId_fkey` (`roleId`),
  CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `VisaDemande`;
CREATE TABLE `VisaDemande` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordre` int NOT NULL DEFAULT '0',
  `statut` enum('EN_ATTENTE','VISE','REFUSE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EN_ATTENTE',
  `commentaire` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dateReponse` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `demandeurId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `VisaDemande_courrierId_fkey` (`courrierId`),
  KEY `VisaDemande_userId_fkey` (`userId`),
  KEY `VisaDemande_demandeurId_fkey` (`demandeurId`),
  CONSTRAINT `VisaDemande_courrierId_fkey` FOREIGN KEY (`courrierId`) REFERENCES `Courrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VisaDemande_demandeurId_fkey` FOREIGN KEY (`demandeurId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `VisaDemande_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `Workflow`;
CREATE TABLE `Workflow` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('15bfda07-d268-4106-a361-fd3542b527af', '75859f8cf8940641c4605c5ac07d9d6074238240d14443180364f530fd4ea257', '2026-01-29 11:42:28.219', '20260129114228_add_recipiendaire_to_organisation_unit', NULL, NULL, '2026-01-29 11:42:28.152', 1),
('19618bf1-136f-4ec4-a737-d9240741066c', '257b2590ac6a42222cb79dffe009093512c9f7ceaebe19decb99d13ee30cae07', '2026-01-29 11:04:10.338', '20250129000000_init', '', NULL, '2026-01-29 11:04:10.338', 0),
('222b1092-fbe3-4489-886e-dfd82ce466c6', '0cd6430937a681c1d2fa6a6a55e62f93c88d5dd82b0018a403a2c1849000d4de', '2026-02-11 05:33:49.954', '20260211053349_add_typologie_courrier', NULL, NULL, '2026-02-11 05:33:49.839', 1),
('572accde-37c7-436a-b2ff-165f2be9a9e8', 'd86e0eabbfea4856646cc83f7bb3f28e0b97434b4717c8d8498892b2d3580b7c', '2026-01-30 13:56:08.017', '20260130135556_add_visa_demande_demandeur_id', NULL, NULL, '2026-01-30 13:56:07.983', 1),
('9b12c5ed-56de-42ca-870b-33389230efc4', '81b58259b32aaf7337b5ddf4aa7bb6c7dde4293229b65621083e54bb866b2514', '2026-03-17 18:15:21.851', '20260129180000_add_role_user_role', NULL, NULL, '2026-03-17 18:15:21.579', 1),
('a1fff991-8786-4ac9-8c2b-806b54886af3', 'a378b22ec6bc9ee4f4640497540d557d5f431cbb69e74bdfb5250271a77b877e', '2026-03-17 20:18:40.441', '20260129200000_add_eparapheur', NULL, NULL, '2026-03-17 20:18:40.098', 1),
('ac508081-ecec-4eb5-b41d-be3650310bd6', 'ff8ab1617b491f912e176eee80f41af2ccd17eca5b2f1f7b260e5a80e51a0d02', '2026-02-04 09:06:46.349', '20260204090646_add_entite_traitante_flag', NULL, NULL, '2026-02-04 09:06:46.296', 1),
('acc1b43e-93c9-45e7-9bc0-a3a0a8788046', '66b7bfac58b3ce239d69f4a659003cad96afbe712302823871f3ffbe349f15a5', '2026-01-29 12:56:50.138', '20260129125649_add_assigned_transfer_visa_demande', NULL, NULL, '2026-01-29 12:56:49.967', 1),
('ae6c53e0-206c-4819-a102-6effbbc0bf0b', 'a5e922e1f83561606134116001e5568f11d073b5e99183e7fe4462840e73a14b', '2026-02-04 08:51:57.356', '20260130140000_contact_type_societe', NULL, NULL, '2026-02-04 08:51:57.295', 1),
('d95f3739-2f06-4dea-8e40-f16221d76240', 'c396cdb1de117a1a075460be4b1009c3570912f5751d6a7fd9202994fedcd235', '2026-03-17 20:20:29.610', '20260129190000_add_corps_message_uploaded_by_id', '', NULL, '2026-03-17 20:20:29.610', 0),
('e97a0859-bdbb-4622-8254-6ab774aaf116', 'e4a24e403a7fd6a15eeede0bc469494a7c5399787af078ad986be0707eb7484f', '2026-02-04 08:54:05.261', '20260130150000_contact_raison_sociale', NULL, NULL, '2026-02-04 08:54:05.237', 1);

INSERT INTO `AccuseReception` (`id`, `courrierId`, `type`, `dateEnvoi`, `destinataire`, `statut`, `modeEnvoi`, `corpsMessage`) VALUES
('cmli9oc3y00018a0fnespiz3z', 'cmlhvunvi000g8ar2t7r2s96w', 'accuse_standard', '2026-02-11 16:51:22.318', 'xtvalizo@gmail.com', 'envoye', 'email', '<p>Nous accusons réception de votre courrier (réf. <strong>2026-000001</strong>).</p><p>Ce courrier a bien été enregistré et sera traité dans les meilleurs délais.</p><p>Cordialement,</p><p>La mairie</p>'),
('cmli9zotq00038a0fo1nwpu0k', 'cmlhvunvi000g8ar2t7r2s96w', 'accuse_standard', '2026-02-11 17:00:12.014', 'xtvalizo@gmail.com', 'envoye', 'email', '<p>Madame, Monsieur,</p><p>Nous accusons réception de votre courrier reçu en date du <strong>11/02/2026</strong>, relatif à :<br>« Facture Prestation de service ».</p><p>Votre correspondance a été enregistrée sous la référence : <strong>2026-000001</strong> et a été transmise au service compétent pour traitement conformément aux procédures en vigueur.</p><p>Nous vous remercions pour votre démarche et vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.</p><p>Pour le Service Secrétariat général<br>Mairie de Bafoussam</p><p>Ebenezer KAMDEM<br>Direction de l’Urbanisme<br>Email : ekamdem@gmail.com</p>'),
('cmlo336p000018ao7xjjxi1dr', 'cmlhvunvi000g8ar2t7r2s96w', 'accuse_standard', '2026-02-15 18:33:34.883', 'xtvalizo@gmail.com', 'envoye', 'email', '<p>Madame, Monsieur,</p><p>Nous accusons réception de votre courrier reçu en date du <strong>11/02/2026</strong>, relatif à :<br>« Facture Prestation de service ».</p><p>Votre correspondance a été enregistrée sous la référence : <strong>2026-000001</strong> et a été transmise au service compétent pour traitement conformément aux procédures en vigueur.</p><p>Nous vous remercions pour votre démarche et vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.</p><p>Pour le Service Secrétariat général<br>Mairie de Bafoussam</p><p>Administrateur<br>Mairie de la ville de Bafoussam<br>Email : admin@mairie.local</p>');

INSERT INTO `AuditLog` (`id`, `courrierId`, `userId`, `action`, `details`, `createdAt`) VALUES
('cmkzdtb3s00048aenvog6ztl6', NULL, 'cmkzcv85a00008aua21r42yjp', 'creation', '{\"objet\": \"Test\", \"numero\": \"2026-000004\"}', '2026-01-29 11:39:35.417'),
('cml0ww8j400028a0095ctrhsb', NULL, 'cmkzcv85a00008aua21r42yjp', 'visa_demande', '{\"count\": 1, \"userIds\": [\"cmkzg40yl00018aogipiuflib\"]}', '2026-01-30 13:21:30.929'),
('cml0yxlel00068avwlfgzotim', NULL, 'cmkzcv85a00008aua21r42yjp', 'transfert', '{\"note\": \"Merci c urgente\", \"toUnitId\": null, \"toUserId\": \"cmkzg40yt00038aog4sqbe70z\"}', '2026-01-30 14:18:33.502'),
('cmlhvunw4000i8ar2zyo13y47', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtf4al00058ar2n079ecx1', 'creation', '{\"objet\": \"Facture Prestation de service\", \"numero\": \"2026-000001\"}', '2026-02-11 10:24:22.900'),
('cmlhwao2r000o8ar2shvq44xh', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtaxi400028ar29qt7saft', 'transfert', '{\"note\": \"Me voir urgement avec un projet de réponse...\", \"toUnitId\": \"cmkzdfd4100098a63su8fop4b\", \"toUserId\": null}', '2026-02-11 10:36:49.636'),
('cmlhwvyva000s8ar2vem8fiah', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtcxra00038ar2zhveohwc', 'transfert', '{\"note\": \"Merci de me fournir les elements de language pour répondre à ce message\", \"toUnitId\": null, \"toUserId\": \"cmlhte08j00048ar2duavolgq\"}', '2026-02-11 10:53:23.399'),
('cmli2nrd100038aac9ax3u3qa', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhte08j00048ar2duavolgq', 'visa_demande', '{\"count\": 2, \"userIds\": [\"cmlhtf4al00058ar2n079ecx1\", \"cmlhtcxra00038ar2zhveohwc\"]}', '2026-02-11 13:34:58.117'),
('cmli2pq2h00058aac0fj3kfmx', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtcxra00038ar2zhveohwc', 'visa_demande_reponse', '{\"statut\": \"VISE\", \"demandeId\": \"cmli2nrb900018aacsyx4afxk\"}', '2026-02-11 13:36:29.754'),
('cmli2socn00078aacoa1ip5k9', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtf4al00058ar2n079ecx1', 'visa_demande_reponse', '{\"statut\": \"VISE\", \"demandeId\": \"cmli2nrb800008aacwzk60ie2\"}', '2026-02-11 13:38:47.495'),
('cmmaqocbg00078akm0cwnmsa6', 'cmmaqoc9v00058akmleu06z0e', 'cmkzcv85a00008aua21r42yjp', 'creation', '{\"objet\": \"Demande d\'interview du maire\", \"numero\": \"2026-000002\"}', '2026-03-03 15:04:48.988'),
('cmmaqz7p1000d8akmse5vxqgq', 'cmmaqoc9v00058akmleu06z0e', 'cmlhtaxi400028ar29qt7saft', 'transfert', '{\"note\": \"Merci de me fournir des elements pour répondre à ce courrier\", \"toUnitId\": null, \"toUserId\": \"cmmaqls9q00008akminsgpoxc\"}', '2026-03-03 15:13:16.213'),
('cmmar549r000g8akmp8mn8zzt', 'cmmaqoc9v00058akmleu06z0e', 'cmmaqls9q00008akminsgpoxc', 'visa_demande', '{\"count\": 1, \"userIds\": [\"cmlhte08j00048ar2duavolgq\"]}', '2026-03-03 15:17:51.712'),
('cmmarjglw000i8akmo20mszkk', 'cmmaqoc9v00058akmleu06z0e', 'cmlhte08j00048ar2duavolgq', 'visa_demande_reponse', '{\"statut\": \"VISE\", \"demandeId\": \"cmmar547c000e8akmxdw8tupr\"}', '2026-03-03 15:29:00.884'),
('cmmuzw31l00048aitu5dyikxd', 'cmmuzw31700028aitfbrnyxru', 'cmlhtf4al00058ar2n079ecx1', 'creation', '{\"objet\": \"Lettre de licenciement\", \"numero\": \"2026-000003\"}', '2026-03-17 19:18:10.281'),
('cmmv2dk1k00068a03ak51y70y', 'cmmuzw31700028aitfbrnyxru', 'cmkzcv85a00008aua21r42yjp', 'eparapheur_envoi', '{\"envoiId\": \"cmmv2dk0700028a03vqbcq37v\", \"pieceIds\": [], \"inclurePrincipal\": true}', '2026-03-17 20:27:44.696'),
('cmmv2ocjl000a8a03lsedjv6s', 'cmmuzw31700028aitfbrnyxru', 'cmkzcv85a00008aua21r42yjp', 'eparapheur_valide', '{\"envoiId\": \"cmmv2dk0700028a03vqbcq37v\", \"cheminDocumentAnnote\": \"uploads/eparapheur/eparapheur-cmmv2dk0700028a03vqbcq37v-1773779768169.pdf\"}', '2026-03-17 20:36:08.193');

INSERT INTO `Banette` (`id`, `libelle`, `code`, `description`, `entiteId`, `ordre`, `actif`, `createdAt`, `updatedAt`) VALUES
('cmkzdfd4b000i8a63e2kb4smj', 'Courrier arrivée', 'ARRIVEE', 'Banette Courrier arrivée', NULL, 0, 1, '2026-01-29 11:28:44.844', '2026-01-29 11:28:44.844'),
('cmkzdfd4d000j8a63t0m7zgo1', 'Courrier départ', 'DEPART', 'Banette Courrier départ', NULL, 1, 1, '2026-01-29 11:28:44.846', '2026-01-29 11:28:44.846'),
('cmkzdfd4f000k8a631wkcorhw', 'À traiter', 'A_TRAITER', 'Banette À traiter', NULL, 2, 1, '2026-01-29 11:28:44.847', '2026-01-29 11:28:44.847'),
('cmkzdfd4h000l8a63ljuofxjh', 'Archive', 'ARCHIVE', 'Banette Archive', NULL, 3, 1, '2026-01-29 11:28:44.850', '2026-01-29 11:28:44.850');

INSERT INTO `Contact` (`id`, `nom`, `type`, `email`, `telephone`, `adresse`, `createdAt`, `updatedAt`, `raisonSociale`) VALUES
('cmkzdfd3p00008a63gs55mnmj', 'Préfecture de région', 'SOCIETE', 'contact@prefecture.gouv.fr', '01 23 45 67 89', '1 place de la Préfecture, 75000 Paris', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdfd3p00018a63z45z3lb6', 'CAF', 'SOCIETE', 'contact@caf.fr', '32 30', 'Caisse d\'allocations familiales', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdfd3p00028a63x0dym2uy', 'Jean Dupont', 'PERSONNE', 'jean.dupont@email.fr', '06 12 34 56 78', '10 rue des Lilas, 69000 Lyon', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdfd3p00038a63e5n3oyqp', 'Association des commerçants', 'SOCIETE', 'bureau@asso-commercants.fr', '04 78 00 00 00', 'Place du marché', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdfd3p00048a63cws2xj2s', 'Marie Martin', 'PERSONNE', 'marie.martin@email.fr', '06 98 76 54 32', '5 avenue de la Gare', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdfd3p00058a639nzql953', 'EDF SA', 'SOCIETE', 'client@edf.fr', '09 69 32 15 15', 'Service clients', '2026-01-29 11:28:44.821', '2026-01-29 11:28:44.821', NULL),
('cmkzdsokj00008aenmaege9xm', 'Henri-Mill FETCHOUANG', 'PERSONNE', 'henri.fetchouang@kavaa.net', '+237695606060', 'Nouvelle Route Omnisport', '2026-01-29 11:39:06.209', '2026-01-29 11:39:06.209', NULL),
('cmlhvtq3i000e8ar2mibr160s', 'Amelié TOUKEM', 'SOCIETE', 'xtvalizo@gmail.com', '+237695606060', '1er étape Immeuble Wamba , Mosqué Bonamoussadi', '2026-02-11 10:23:39.102', '2026-02-11 10:23:39.102', 'Prefecture de Police'),
('cmmaqnvud00038akm8m3nuevr', 'Christelle BAMBA', 'PERSONNE', 'henri.fetchouang@kavaa.net', '+237695606060', 'Nouvelle Route Omnisport', '2026-03-03 15:04:27.636', '2026-03-03 15:04:27.636', NULL),
('cmmuzu6un00008aitmihpubnf', 'Assonfack Eliasse', 'SOCIETE', 'contact@yarabyte.com', '+237695606060', 'Nouvelle Route Omnisport', '2026-03-17 19:16:41.899', '2026-03-17 19:16:41.899', 'Service du Gouverneur de la région de l\'Ouest');

INSERT INTO `Courrier` (`id`, `numero`, `priorite`, `dateCourrier`, `dateArrivee`, `objet`, `expediteurId`, `entiteTraitanteId`, `documentPrincipalPath`, `statut`, `banetteId`, `createdAt`, `updatedAt`, `createdById`, `assignedToId`, `typologieId`) VALUES
('cmlhvunvi000g8ar2t7r2s96w', '2026-000001', 'NORMAL', '2026-02-08 23:00:00.000', '2026-02-11 10:22:31.042', 'Facture Prestation de service', 'cmlhvtq3i000e8ar2mibr160s', 'cmkzdfd4100098a63su8fop4b', 'uploads/cmlhvunvi000g8ar2t7r2s96w/Auto_Location_Car___EDEN_HARVEST_SERVICES-1770805463184.pdf', 'VISÉ', NULL, '2026-02-11 10:24:22.879', '2026-02-11 13:38:47.451', 'cmlhtf4al00058ar2n079ecx1', 'cmlhte08j00048ar2duavolgq', 'cmlhlxige000f8ayko9e6wmom'),
('cmmaqoc9v00058akmleu06z0e', '2026-000002', 'HAUTE', '2026-03-01 23:00:00.000', '2026-03-03 15:03:32.837', 'Demande d\'interview du maire', 'cmmaqnvud00038akm8m3nuevr', 'cmkzdfd3y00078a63j94drlqr', 'uploads/cmmaqoc9v00058akmleu06z0e/DCC_Report_1B_Fiat_henri_mill_2026-03-02-1772550289203.pdf', 'VISÉ', NULL, '2026-03-03 15:04:48.931', '2026-03-03 15:29:00.860', 'cmkzcv85a00008aua21r42yjp', 'cmmaqls9q00008akminsgpoxc', 'cmlhlvw3l00078ayksqriug8t'),
('cmmuzw31700028aitfbrnyxru', '2026-000003', 'HAUTE', '2026-03-12 23:00:00.000', '2026-03-17 19:09:52.601', 'Lettre de licenciement', 'cmmuzu6un00008aitmihpubnf', 'cmkzdfd3y00078a63j94drlqr', 'uploads/cmmuzw31700028aitfbrnyxru/factures-100203gyn26-1773775090456.pdf', 'ENREGISTRE', NULL, '2026-03-17 19:18:10.267', '2026-03-17 19:18:10.517', 'cmlhtf4al00058ar2n079ecx1', NULL, 'cmlhm0hax000p8ayk0yw8s7rm');

INSERT INTO `CourrierTransfert` (`id`, `courrierId`, `fromUserId`, `toUserId`, `toUnitId`, `note`, `createdAt`) VALUES
('cmlhwao0h000m8ar2vzztbsct', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtaxi400028ar29qt7saft', NULL, 'cmkzdfd4100098a63su8fop4b', 'Me voir urgement avec un projet de réponse...', '2026-02-11 10:36:49.552'),
('cmlhwvyte000q8ar2hwd8jhro', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtcxra00038ar2zhveohwc', 'cmlhte08j00048ar2duavolgq', NULL, 'Merci de me fournir les elements de language pour répondre à ce message', '2026-02-11 10:53:23.330'),
('cmmaqz7ne000b8akms3hsd3gz', 'cmmaqoc9v00058akmleu06z0e', 'cmlhtaxi400028ar29qt7saft', 'cmmaqls9q00008akminsgpoxc', NULL, 'Merci de me fournir des elements pour répondre à ce courrier', '2026-03-03 15:13:16.153');

INSERT INTO `EparapheurDocument` (`id`, `eparapheurEnvoiId`, `pieceJointeId`, `estPrincipal`, `ordre`, `createdAt`) VALUES
('cmmv2dk0700048a03pfzq3v9d', 'cmmv2dk0700028a03vqbcq37v', 'cmmuzw36z00068ait8vlhcbgh', 1, 0, '2026-03-17 20:27:44.647');

INSERT INTO `EparapheurEnvoi` (`id`, `courrierId`, `envoyeurId`, `statut`, `createdAt`, `updatedAt`) VALUES
('cmmv2dk0700028a03vqbcq37v', 'cmmuzw31700028aitfbrnyxru', 'cmkzcv85a00008aua21r42yjp', 'VALIDE', '2026-03-17 20:27:44.647', '2026-03-17 20:36:08.178');

INSERT INTO `EparapheurTraitement` (`id`, `eparapheurEnvoiId`, `traiteParUserId`, `statut`, `commentaire`, `cheminDocumentAnnote`, `dateTraitement`) VALUES
('cmmv2ocj600088a032wp8usbc', 'cmmv2dk0700028a03vqbcq37v', 'cmkzcv85a00008aua21r42yjp', 'VALIDE', NULL, 'uploads/eparapheur/eparapheur-cmmv2dk0700028a03vqbcq37v-1773779768169.pdf', '2026-03-17 20:36:08.178');

INSERT INTO `EtapeWorkflow` (`id`, `workflowId`, `ordre`, `libelle`, `type`, `organisationUnitId`, `delaiJours`, `createdAt`) VALUES
('cmkzdfd4n000n8a63zmtclsfy', 'cmkzdfd4m000m8a63mkkb3t52', 1, 'Saisie et enregistrement', 'SAISIE', 'cmkzdfd42000b8a63oyrvd0hm', 2, '2026-01-29 11:28:44.855'),
('cmkzdfd4n000o8a63hnoqa05o', 'cmkzdfd4m000m8a63mkkb3t52', 2, 'Visa secrétariat général', 'VISA', 'cmkzdfd4100098a63su8fop4b', 3, '2026-01-29 11:28:44.855'),
('cmkzdfd4n000p8a63eu8g1qh1', 'cmkzdfd4m000m8a63mkkb3t52', 3, 'Clôture', 'ENVOI', NULL, NULL, '2026-01-29 11:28:44.855'),
('cmkzfvl8i00018av48ekdhvlm', 'cmkzfvl8c00008av40a8ggppa', 1, 'Enregistrement par l\'agent courrier', 'SAISIE', 'cmkzdfd42000b8a63oyrvd0hm', 2, '2026-01-29 12:37:21.090'),
('cmkzfvl8i00028av4nj18p19r', 'cmkzfvl8c00008av40a8ggppa', 2, 'Visa Mairie (délégation Secrétaire général en cas d\'absence)', 'VISA', NULL, 3, '2026-01-29 12:37:21.090'),
('cmkzfvl8i00038av4sr0qjzae', 'cmkzfvl8c00008av40a8ggppa', 3, 'Clôture', 'ENVOI', NULL, NULL, '2026-01-29 12:37:21.090'),
('cmkzg4t6l00098a2vwy9i534s', 'cmkzg4t6j00088a2vls9qc02v', 1, 'Enregistrement du courrier', 'SAISIE', 'cmkzdfd42000b8a63oyrvd0hm', 1, '2026-01-29 12:44:31.293'),
('cmkzg4t6l000a8a2vhppq7c5r', 'cmkzg4t6j00088a2vls9qc02v', 2, 'Traitement par le Maire', 'VISA', 'cmkzdfd3y00078a63j94drlqr', 2, '2026-01-29 12:44:31.293'),
('cmkzg4t6l000b8a2vzf6dlcov', 'cmkzg4t6j00088a2vls9qc02v', 3, 'Transfert au Secrétariat général pour traitement', 'VISA', 'cmkzdfd4100098a63su8fop4b', 2, '2026-01-29 12:44:31.293'),
('cmkzg4t6l000c8a2v8tyod2in', 'cmkzg4t6j00088a2vls9qc02v', 4, 'Transfert à une direction pour traitement', 'VISA', 'cmkzdfd43000d8a63bjleb6vv', 3, '2026-01-29 12:44:31.293'),
('cmkzg4t6l000d8a2vewasrqh7', 'cmkzg4t6j00088a2vls9qc02v', 5, 'Clôture', 'ENVOI', NULL, NULL, '2026-01-29 12:44:31.293');

INSERT INTO `OrganisationUnit` (`id`, `libelle`, `parentId`, `niveau`, `ordre`, `actif`, `createdAt`, `updatedAt`, `recipiendaireId`, `entiteTraitante`) VALUES
('cmkzdfd3y00078a63j94drlqr', 'Mairie de la ville de Bafoussam', NULL, 0, 0, 1, '2026-01-29 11:28:44.830', '2026-02-11 09:31:18.997', 'cmlhtaxi400028ar29qt7saft', 1),
('cmkzdfd4100098a63su8fop4b', 'Secrétariat général', 'cmkzdfd3y00078a63j94drlqr', 1, 1, 1, '2026-01-29 11:28:44.833', '2026-02-11 09:31:50.854', 'cmlhtcxra00038ar2zhveohwc', 1),
('cmkzdfd42000b8a63oyrvd0hm', 'Service du Courrier Central', 'cmkzdfd4100098a63su8fop4b', 2, 1, 1, '2026-01-29 11:28:44.834', '2026-02-11 10:15:47.350', 'cmlhtf4al00058ar2n079ecx1', 0),
('cmkzdfd43000d8a63bjleb6vv', 'État civil', 'cmkzdfd4100098a63su8fop4b', 2, 2, 1, '2026-01-29 11:28:44.835', '2026-02-11 05:29:16.087', NULL, 0),
('cml6qjf3k00018awkkepp361k', 'Cabinet du Maire', 'cmkzdfd3y00078a63j94drlqr', 1, 0, 1, '2026-02-03 15:10:12.270', '2026-02-04 09:11:41.681', NULL, 0),
('cml6qkbbi00038awk6ismdgts', 'Cellule des Affaires Economiques et de la Coopération', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-03 15:10:54.030', '2026-02-04 09:11:59.382', NULL, 0),
('cml6qmd6h00058awkps2s1lnn', 'Cellule Communication et Relations Publiques', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-03 15:12:29.754', '2026-02-04 09:11:50.512', NULL, 0),
('cml6qp7oj00078awkwo8l4yca', 'Chargés d\'Etudes Assistants', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-03 15:14:42.595', '2026-02-04 09:12:07.247', NULL, 0),
('cml6qpsbf00098awk2zberrmv', 'Secrétariat Particulier', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-03 15:15:09.340', '2026-02-04 09:12:26.959', NULL, 0),
('cml6qqo8y000b8awk43dfisgx', 'Cellule de Suivi', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-03 15:15:50.723', '2026-02-04 09:15:08.316', NULL, 0),
('cml6qsc1z000d8awkfr7rgtzn', 'Cellule des Affaires Juridiques et du Contentieux', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-03 15:17:08.231', '2026-02-04 09:15:19.091', NULL, 0),
('cml6qt7ps000f8awkcwl0mq3a', 'Cellule des Affaires Sociales et Culturelles', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-03 15:17:49.264', '2026-02-04 09:15:30.807', NULL, 0),
('cml6qtx01000h8awkyxqdf203', 'Cellule des Systèmes d\'Information', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-03 15:18:22.033', '2026-02-04 09:15:37.350', NULL, 0),
('cml6qzn9x000j8awkso43p04v', 'Direction des Affaires Financières', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-03 15:22:49.366', '2026-02-04 09:17:36.773', NULL, 0),
('cml6r0dpz000l8awkd1qr7h6s', 'Sous-Direction de la Mobilisation des Ressources Financières', 'cml6qzn9x000j8awkso43p04v', 3, 0, 1, '2026-02-03 15:23:23.639', '2026-02-04 09:17:55.966', NULL, 0),
('cml6r1avg000n8awkkb127kxd', 'Sous-Direction des Moyens Généraux et du Patrinoine', 'cml6qzn9x000j8awkso43p04v', 3, 0, 1, '2026-02-03 15:24:06.605', '2026-02-04 09:18:03.701', NULL, 0),
('cml6r3dmq000p8awkwm2t3dxg', 'Sous-Direction des Ressources Huimaines', 'cml6qzn9x000j8awkso43p04v', 3, 0, 1, '2026-02-03 15:25:43.490', '2026-02-04 09:18:09.681', NULL, 0),
('cml6r43x3000r8awkrfpoutej', 'Sous-Direction du Budget et de la Comptabilité', 'cml6qzn9x000j8awkso43p04v', 3, 0, 1, '2026-02-03 15:26:17.560', '2026-02-11 05:27:11.072', NULL, 0),
('cml7qhhhk00018a2e8uap83ur', 'Direction des Services Techniques', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 07:56:28.233', '2026-02-11 05:27:33.580', NULL, 0),
('cml7qizku00038a2ecfsvggaz', 'Cellule des Etudes, de la Planification et de la Prospective', 'cml7qhhhk00018a2e8uap83ur', 3, 0, 1, '2026-02-04 07:57:38.335', '2026-02-11 05:27:38.947', NULL, 0),
('cml7qkz7g00078a2eangvy8ef', 'Police Municipale', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 07:59:11.164', '2026-02-11 05:28:12.451', NULL, 0),
('cml7qnd2y00098a2egb6s48mk', 'Services de la Documentation et des Archives', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:01:02.458', '2026-02-11 05:28:27.894', NULL, 0),
('cml7qnwvh000b8a2euozl5izn', 'Service de l\'Etat Civil', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:01:28.109', '2026-02-11 05:28:19.471', NULL, 0),
('cml7r5jb8000d8a2esy9e8ljc', 'Conseiller Technique', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-04 08:15:10.340', '2026-02-04 09:12:13.844', NULL, 0),
('cml7r5ure000f8a2exxi35elv', 'Inspection des Services', 'cml6qjf3k00018awkkepp361k', 2, 0, 1, '2026-02-04 08:15:25.179', '2026-02-04 09:12:20.292', NULL, 0),
('cml7r6yvm000h8a2ev7mhahsd', 'Cellule de la Traduction et de la Promotion du Bilinguisme', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:16:17.171', '2026-02-04 09:12:34.318', NULL, 0),
('cml7r7jab000j8a2e3bn5v2ej', 'Cellule Locale des Projets C2D', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:16:43.619', '2026-02-04 09:15:49.357', NULL, 0),
('cml7r9czu000l8a2eohctus0r', 'Sous-Direction  du Développement des Infrastructures et des Equipements', 'cml7qhhhk00018a2e8uap83ur', 3, 0, 1, '2026-02-04 08:18:08.778', '2026-02-11 05:27:46.403', NULL, 0),
('cml7rd5zj000n8a2esjnbcl23', 'Direction de l’Urbanisme', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:21:06.319', '2026-02-11 10:15:26.027', 'cmlhte08j00048ar2duavolgq', 0),
('cml7rg3s7000p8a2ewz7i3a87', 'Sous-Direction de l’Urbanisme, de l’Architecture et du Cadre de Vie', 'cml7rd5zj000n8a2esjnbcl23', 3, 0, 1, '2026-02-04 08:23:23.431', '2026-02-04 09:17:45.409', NULL, 0),
('cml7rime2000r8a2es8pnnxm4', 'Cellule des Etudes, de la Planification et de la Prospective', 'cml7rd5zj000n8a2esjnbcl23', 3, 0, 1, '2026-02-04 08:25:20.858', '2026-02-04 09:17:28.351', NULL, 0),
('cml7rn3cs00018apji2l69tmb', 'Direction des Ressources Humaines', 'cmkzdfd4100098a63su8fop4b', 2, 0, 1, '2026-02-04 08:28:49.468', '2026-02-11 05:27:18.146', NULL, 0),
('cml7rnmlz00038apjkp5xbgu4', 'Sous-Direction de l’administration des Ressources Humaines', 'cml7rn3cs00018apji2l69tmb', 3, 0, 1, '2026-02-04 08:29:14.424', '2026-02-11 05:27:24.695', NULL, 0);

INSERT INTO `PieceJointe` (`id`, `courrierId`, `nomFichier`, `cheminStockage`, `typeMime`, `taille`, `ordre`, `principal`, `createdAt`, `uploadedById`) VALUES
('cmlhvuo46000k8ar2sqg2lj8f', 'cmlhvunvi000g8ar2t7r2s96w', 'Auto Location Car _ EDEN HARVEST SERVICES.pdf', 'uploads/cmlhvunvi000g8ar2t7r2s96w/Auto_Location_Car___EDEN_HARVEST_SERVICES-1770805463184.pdf', 'application/pdf', 60116, 0, 1, '2026-02-11 10:24:23.190', NULL),
('cmmaqochq00098akmr2knkiq3', 'cmmaqoc9v00058akmleu06z0e', 'DCC_Report_1B_Fiat_henri_mill_2026-03-02.pdf', 'uploads/cmmaqoc9v00058akmleu06z0e/DCC_Report_1B_Fiat_henri_mill_2026-03-02-1772550289203.pdf', 'application/pdf', 18039, 0, 1, '2026-03-03 15:04:49.214', 'cmkzcv85a00008aua21r42yjp'),
('cmmuzw36z00068ait8vlhcbgh', 'cmmuzw31700028aitfbrnyxru', 'factures-100203gyn26.pdf', 'uploads/cmmuzw31700028aitfbrnyxru/factures-100203gyn26-1773775090456.pdf', 'application/pdf', 1684882, 0, 1, '2026-03-17 19:18:10.475', 'cmlhtf4al00058ar2n079ecx1');

INSERT INTO `Role` (`id`, `code`, `libelle`, `createdAt`) VALUES
('role_enregistrement_courrier', 'enregistrement_courrier', 'Enregistrement du courrier', '2026-03-17 19:15:21.685'),
('role_eparapheur', 'eparapheur', 'Éparapheur', '2026-03-17 21:18:40.209');

INSERT INTO `TypologieCourrier` (`id`, `libelle`, `parentId`, `ordre`, `actif`, `createdAt`, `updatedAt`) VALUES
('cmlhlv0lv00018ayk87hw0q67', 'Demandes et sollicitations adressées à la mairie', NULL, 0, 1, '2026-02-11 05:44:43.216', '2026-02-11 05:44:43.216'),
('cmlhlvcod00038ayk57kcvfg2', 'Demande d’autorisation', 'cmlhlv0lv00018ayk87hw0q67', 0, 1, '2026-02-11 05:44:58.861', '2026-02-11 05:44:58.861'),
('cmlhlvm6d00058aykzcbi7ek2', 'Demande d’authentification', 'cmlhlv0lv00018ayk87hw0q67', 1, 1, '2026-02-11 05:45:11.173', '2026-02-11 05:45:11.173'),
('cmlhlvw3l00078ayksqriug8t', 'Demande d’exonération', 'cmlhlv0lv00018ayk87hw0q67', 2, 1, '2026-02-11 05:45:24.033', '2026-02-11 05:45:24.033'),
('cmlhlwupi000b8aykdzwcbybp', 'Demande d’attribution', 'cmlhlv0lv00018ayk87hw0q67', 3, 1, '2026-02-11 05:46:08.886', '2026-02-11 05:46:08.886'),
('cmlhlx3rs000d8aykw7fkrbek', 'Demande d’assistance technique', 'cmlhlv0lv00018ayk87hw0q67', 4, 1, '2026-02-11 05:46:20.632', '2026-02-11 05:46:20.632'),
('cmlhlxige000f8ayko9e6wmom', 'Demande de paiement', 'cmlhlv0lv00018ayk87hw0q67', 5, 1, '2026-02-11 05:46:39.663', '2026-02-11 05:46:39.663'),
('cmlhlxt8m000h8aykijo4yba9', 'Demande d’appui', 'cmlhlv0lv00018ayk87hw0q67', 6, 1, '2026-02-11 05:46:53.638', '2026-02-11 05:46:53.638'),
('cmlhlz9af000j8aykbalmy2v2', 'Etat Civil', NULL, 1, 1, '2026-02-11 05:48:01.095', '2026-02-11 05:48:01.095'),
('cmlhlzw5c000l8ayk3zzleq2u', 'Transcription d’actes', 'cmlhlz9af000j8aykbalmy2v2', 0, 1, '2026-02-11 05:48:30.721', '2026-02-11 05:48:30.721'),
('cmlhm05pv000n8aykxa3vzedd', 'Rectification d’actes', 'cmlhlz9af000j8aykbalmy2v2', 1, 1, '2026-02-11 05:48:43.123', '2026-02-11 05:48:43.123'),
('cmlhm0hax000p8ayk0yw8s7rm', 'Demande de légalisation de documents', 'cmlhlz9af000j8aykbalmy2v2', 2, 1, '2026-02-11 05:48:58.137', '2026-02-11 05:48:58.137'),
('cmlhm3wvv000r8ayk0tyy77c0', 'Dossiers de mariage', 'cmlhlz9af000j8aykbalmy2v2', 3, 1, '2026-02-11 05:51:38.300', '2026-02-11 05:51:38.300'),
('cmlhm6bjo000t8ayknslay3a5', 'Correspondances avec les Administrations', NULL, 2, 1, '2026-02-11 05:53:30.612', '2026-02-11 05:53:30.612'),
('cmlhm6sfu000v8aykptlrphqt', 'Services du Gouverneur / Région', 'cmlhm6bjo000t8ayknslay3a5', 0, 1, '2026-02-11 05:53:52.507', '2026-02-11 05:53:52.507'),
('cmlhm72cf000x8aykb1j9xsbi', 'Préfecture / Sous-préfecture', 'cmlhm6bjo000t8ayknslay3a5', 1, 1, '2026-02-11 05:54:05.343', '2026-02-11 05:54:05.343'),
('cmlhm7fje000z8ayktsz048vt', 'Ministères et administrations centrales', 'cmlhm6bjo000t8ayknslay3a5', 2, 1, '2026-02-11 05:54:22.442', '2026-02-11 05:54:22.442'),
('cmlhm7uxi00118aykqe8kqi23', 'Autres collectivités territoriales', 'cmlhm6bjo000t8ayknslay3a5', 3, 1, '2026-02-11 05:54:42.390', '2026-02-11 05:54:42.390'),
('cmlhm87p100138ayk1dceiaac', 'Institutions publiques et organismes d’État', 'cmlhm6bjo000t8ayknslay3a5', 4, 1, '2026-02-11 05:54:58.934', '2026-02-11 05:54:58.934');

INSERT INTO `User` (`id`, `email`, `name`, `password`, `role`, `createdAt`, `updatedAt`) VALUES
('cmkzcv85a00008aua21r42yjp', 'admin@mairie.local', 'Administrateur', '$2a$10$z73.sRgYNnWWoCLQsjd1TOajmlXCghFQaHzk6JWmhbg2wHkyQ8ucy', 'admin', '2026-01-29 11:13:05.279', '2026-01-29 12:44:31.155'),
('cmlhtaxi400028ar29qt7saft', 'gtoube@gmail.com', 'Gérard TOUBE', '$2a$10$5s5g.fJ9mB2fB76xUEMVB.5qprTiOYljaYtHX277.iAEEmk4spJp.', 'user', '2026-02-11 09:13:03.004', '2026-03-17 20:24:07.938'),
('cmlhtcxra00038ar2zhveohwc', 'mtchankap@gmail.com', 'Mélissa TCHANKAP', '$2a$10$jwhcOQdiiFcL5SXIHFu5fO5/FSEo4150sHnY57Y8a.73toRbUzm1O', 'user', '2026-02-11 09:14:36.646', '2026-02-11 09:14:36.646'),
('cmlhte08j00048ar2duavolgq', 'ekamdem@gmail.com', 'Ebenezer KAMDEM', '$2a$10$N1jkrizuglRvi4C3dIljWeZizfPmnZE1LB1gLbGltLJLn5KGu5WYe', 'user', '2026-02-11 09:15:26.515', '2026-02-11 09:15:26.515'),
('cmlhtf4al00058ar2n079ecx1', 'aallasan@gmail.com', 'Amina ALLASAN', '$2a$10$35EDybOoLFlVfclxYErTfev8duSHe2PTiAilO1euBOL6iH.h0OtCG', 'user', '2026-02-11 09:16:18.430', '2026-03-17 18:19:55.333'),
('cmmaqls9q00008akminsgpoxc', 'toukam@mairie.local', 'Anais Toukam', '$2a$10$Uok6tub/oLd6w7GMVo4MGuCyoaFU2yGMtgfoCEIlozwuAHNvs2hke', 'user', '2026-03-03 15:02:49.694', '2026-03-03 15:02:49.694');

INSERT INTO `UserOrganisationUnit` (`id`, `userId`, `organisationUnitId`, `niveauAcces`, `createdAt`) VALUES
('cmkzdfd49000h8a63z10nxp28', 'cmkzcv85a00008aua21r42yjp', 'cmkzdfd3y00078a63j94drlqr', 'ADMIN', '2026-01-29 11:28:44.841'),
('cmlhvmf8400078ar2zrtshf1h', 'cmlhtf4al00058ar2n079ecx1', 'cmkzdfd42000b8a63oyrvd0hm', 'ADMIN', '2026-02-11 10:17:58.420'),
('cmlhvn1cm00098ar2fm1cqidy', 'cmlhtaxi400028ar29qt7saft', 'cmkzdfd3y00078a63j94drlqr', 'ADMIN', '2026-02-11 10:18:27.095'),
('cmlhvntt9000b8ar2ynsypai6', 'cmlhte08j00048ar2duavolgq', 'cml7rd5zj000n8a2esjnbcl23', 'ADMIN', '2026-02-11 10:19:03.981'),
('cmlhvo851000d8ar2mzvlcqm8', 'cmlhtcxra00038ar2zhveohwc', 'cmkzdfd4100098a63su8fop4b', 'ADMIN', '2026-02-11 10:19:22.549'),
('cmmaqm83d00028akm0m5dsck9', 'cmmaqls9q00008akminsgpoxc', 'cml6qmd6h00058awkps2s1lnn', 'TRAITEMENT', '2026-03-03 15:03:10.201');

INSERT INTO `UserRole` (`id`, `userId`, `roleId`, `createdAt`) VALUES
('cmmuxt6de00008ah7xt86jxg2', 'cmlhtf4al00058ar2n079ecx1', 'role_enregistrement_courrier', '2026-03-17 18:19:55.394'),
('cmmv28wtb00008a03bnvqn2af', 'cmlhtaxi400028ar29qt7saft', 'role_eparapheur', '2026-03-17 20:24:07.967');

INSERT INTO `VisaDemande` (`id`, `courrierId`, `userId`, `ordre`, `statut`, `commentaire`, `dateReponse`, `createdAt`, `updatedAt`, `demandeurId`) VALUES
('cmli2nrb800008aacwzk60ie2', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtf4al00058ar2n079ecx1', 0, 'VISE', 'Bon pour retour', '2026-02-11 13:38:47.439', '2026-02-11 13:34:58.051', '2026-02-11 13:38:47.440', 'cmlhte08j00048ar2duavolgq'),
('cmli2nrb900018aacsyx4afxk', 'cmlhvunvi000g8ar2t7r2s96w', 'cmlhtcxra00038ar2zhveohwc', 1, 'VISE', 'Vu pour approbation', '2026-02-11 13:36:29.743', '2026-02-11 13:34:58.051', '2026-02-11 13:36:29.744', 'cmlhte08j00048ar2duavolgq'),
('cmmar547c000e8akmxdw8tupr', 'cmmaqoc9v00058akmleu06z0e', 'cmlhte08j00048ar2duavolgq', 0, 'VISE', 'Vu c\'est ok', '2026-03-03 15:29:00.833', '2026-03-03 15:17:51.624', '2026-03-03 15:29:00.834', 'cmmaqls9q00008akminsgpoxc');

INSERT INTO `Workflow` (`id`, `nom`, `description`, `actif`, `createdAt`, `updatedAt`) VALUES
('cmkzdfd4m000m8a63mkkb3t52', 'Circuit visa courrier', 'Saisie bureau du courrier puis visa secrétariat général', 1, '2026-01-29 11:28:44.854', '2026-01-29 11:28:44.854'),
('cmkzfvl8c00008av40a8ggppa', 'Enregistrement du courrier', 'Enregistrement par l\'agent courrier, puis envoi à la Mairie (niveau 0). En cas d\'absence, délégation au Secrétaire général.', 1, '2026-01-29 12:37:21.084', '2026-01-29 12:37:21.084'),
('cmkzg4t6j00088a2vls9qc02v', 'Test processus complet', 'Enregistrement → Maire → Secrétariat général → Direction → Clôture (scénario de test)', 1, '2026-01-29 12:44:31.292', '2026-01-29 12:44:31.292'),
('cml7uiv6t00008awnnlplux2t', 'test', NULL, 1, '2026-02-04 09:49:31.109', '2026-02-04 09:49:31.109');



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
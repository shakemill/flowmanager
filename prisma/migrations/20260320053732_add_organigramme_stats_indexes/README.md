# Migration en échec (P3009) — procédure

Si `migrate deploy` a échoué sur une version antérieure de ce fichier (avec `RENAME INDEX`) :

1. Marquer la migration comme annulée côté Prisma :
   ```bash
   npx prisma migrate resolve --rolled-back 20260320053732_add_organigramme_stats_indexes
   ```

2. Dans MySQL, vérifier les index partiellement créés :
   ```sql
   SHOW INDEX FROM Courrier WHERE Key_name IN ('Courrier_dateArrivee_idx', 'Courrier_entiteTraitanteId_dateArrivee_idx');
   ```
   Les supprimer si besoin avant de redéployer :
   ```sql
   DROP INDEX `Courrier_dateArrivee_idx` ON `Courrier`;
   DROP INDEX `Courrier_entiteTraitanteId_dateArrivee_idx` ON `Courrier`;
   ```
   (ignorez l’erreur si l’index n’existe pas.)

3. Relancer :
   ```bash
   npx prisma migrate deploy
   ```

Si les deux index existent déjà et sont corrects, vous pouvez au lieu de 1–3 faire :
`npx prisma migrate resolve --applied 20260320053732_add_organigramme_stats_indexes`

# Migration `20260320053732_add_organigramme_stats_indexes` — dépannage

## P3009 (migration marquée « failed »)

```bash
npx prisma migrate resolve --rolled-back 20260320053732_add_organigramme_stats_indexes
npx prisma migrate deploy
```

## P3018 « Duplicate key name Courrier_dateArrivee_idx »

L’index `Courrier_dateArrivee_idx` existe déjà suite à une tentative partielle. Le supprimer puis relancer `migrate deploy` :

```bash
npx prisma migrate resolve --rolled-back 20260320053732_add_organigramme_stats_indexes
```

Puis avec `mysql` ou `npx prisma db execute --stdin --schema prisma/schema.prisma` :

```sql
DROP INDEX `Courrier_dateArrivee_idx` ON `Courrier`;
```

## P3018 sur `Courrier_entiteTraitanteId_dateArrivee_idx` (composite déjà présent)

MySQL sert ce composite à la FK sur `entiteTraitanteId`. Il faut un index de secours avant de le supprimer :

```bash
npx prisma migrate resolve --rolled-back 20260320053732_add_organigramme_stats_indexes
```

```sql
CREATE INDEX `Courrier_tmp_entite_idx` ON `Courrier`(`entiteTraitanteId`);
DROP INDEX `Courrier_entiteTraitanteId_dateArrivee_idx` ON `Courrier`;
```

```bash
npx prisma migrate deploy
```

```sql
DROP INDEX `Courrier_tmp_entite_idx` ON `Courrier`;
```

## Tout est déjà appliqué manuellement

```bash
npx prisma migrate resolve --applied 20260320053732_add_organigramme_stats_indexes
```

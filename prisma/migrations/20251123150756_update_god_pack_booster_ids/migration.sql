-- Update godPackBoosterId for crown cards based on godPackBooster field in YAML

-- A1 set: Glurak-ex (card 284) → Glurak booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A1' AND pb.name = 'Glurak'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A1' AND pc.number = 284
);

-- A1 set: Pikachu-ex (card 285) → Pikachu booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A1' AND pb.name = 'Pikachu'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A1' AND pc.number = 285
);

-- A1 set: Mewtu-ex (card 286) → Mewtu booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A1' AND pb.name = 'Mewtu'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A1' AND pc.number = 286
);

-- A2 set: Palkia-ex (card 206) → Update booster relationships and godPackBoosterId
-- This card was previously only in Palkia booster, now needs to be in both Palkia and Dialga
DELETE FROM "_PokemonBoosterToPokemonCard"
WHERE "B" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A2' AND pc.number = 206
);

INSERT INTO "_PokemonBoosterToPokemonCard" ("A", "B")
SELECT 
  pb.id,
  (SELECT pc.id FROM "PokemonCard" pc INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id WHERE ps.key = 'A2' AND pc.number = 206)
FROM "PokemonBooster" pb
INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
WHERE ps.key = 'A2' AND pb.name IN ('Palkia', 'Dialga');

UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A2' AND pb.name = 'Palkia'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A2' AND pc.number = 206
);

-- A2 set: Dialga-ex (card 207) → Update booster relationships and godPackBoosterId
-- This card was previously only in Dialga booster, now needs to be in both Dialga and Palkia
DELETE FROM "_PokemonBoosterToPokemonCard"
WHERE "B" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A2' AND pc.number = 207
);

INSERT INTO "_PokemonBoosterToPokemonCard" ("A", "B")
SELECT 
  pb.id,
  (SELECT pc.id FROM "PokemonCard" pc INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id WHERE ps.key = 'A2' AND pc.number = 207)
FROM "PokemonBooster" pb
INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
WHERE ps.key = 'A2' AND pb.name IN ('Dialga', 'Palkia');

UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A2' AND pb.name = 'Dialga'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A2' AND pc.number = 207
);

-- A3 set: Lunala-ex (card 238) → Lunala booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A3' AND pb.name = 'Lunala'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A3' AND pc.number = 238
);

-- A3 set: Solgaleo-ex (card 239) → Solgaleo booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A3' AND pb.name = 'Solgaleo'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A3' AND pc.number = 239
);

-- A4 set: Ho-Oh-ex (card 240) → Ho-Oh booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A4' AND pb.name = 'Ho-Oh'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A4' AND pc.number = 240
);

-- A4 set: Lugia-ex (card 241) → Lugia booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'A4' AND pb.name = 'Lugia'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'A4' AND pc.number = 241
);

-- B1 set: Dressella (card 329) → Mega-Altaria booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'B1' AND pb.name = 'Mega-Altaria'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'B1' AND pc.number = 329
);

-- B1 set: Clavion (card 330) → Mega-Garados booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'B1' AND pb.name = 'Mega-Garados'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'B1' AND pc.number = 330
);

-- B1 set: Flammenpflaster (card 331) → Mega-Lohgock booster
UPDATE "PokemonCard"
SET "godPackBoosterId" = (
  SELECT pb.id
  FROM "PokemonBooster" pb
  INNER JOIN "PokemonSet" ps ON pb."setId" = ps.id
  WHERE ps.key = 'B1' AND pb.name = 'Mega-Lohgock'
)
WHERE "id" = (
  SELECT pc.id
  FROM "PokemonCard" pc
  INNER JOIN "PokemonSet" ps ON pc."setId" = ps.id
  WHERE ps.key = 'B1' AND pc.number = 331
);

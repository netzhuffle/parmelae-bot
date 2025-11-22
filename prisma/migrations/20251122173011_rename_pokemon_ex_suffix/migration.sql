-- Rename all Pokémon card names ending with " ex" to "-ex"
UPDATE "PokemonCard" 
SET "name" = SUBSTR("name", 1, LENGTH("name") - 3) || '-ex'
WHERE "name" LIKE '% ex';
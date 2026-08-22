-- Remove registros duplicados de MovieReview (mesmo tmdbId), mantendo o mais recente
DELETE FROM "MovieReview"
WHERE "id" NOT IN (
        SELECT "id"
        FROM (
                SELECT "id",
                    ROW_NUMBER() OVER (
                        PARTITION BY "tmdbId"
                        ORDER BY "rowid" DESC
                    ) AS rn
                FROM "MovieReview"
            )
        WHERE rn = 1
    );
-- Garante que cada filme tenha no máximo um registro de review
CREATE UNIQUE INDEX "MovieReview_tmdbId_key" ON "MovieReview"("tmdbId");
-- AlterTable
CREATE TABLE "MovieReview_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT NOT NULL,
    "dateWatched" TEXT NOT NULL,
    "ratingUser1" REAL NOT NULL,
    "ratingUser2" REAL NOT NULL,
    "textReview" TEXT NOT NULL,
    "genres" TEXT NOT NULL,
    "recommendedById" TEXT NOT NULL,
    CONSTRAINT "MovieReview_recommendedById_fkey" FOREIGN KEY ("recommendedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Copy existing data
INSERT INTO "MovieReview_new" (
        "id",
        "tmdbId",
        "title",
        "posterPath",
        "dateWatched",
        "ratingUser1",
        "ratingUser2",
        "textReview",
        "genres",
        "recommendedById"
    )
SELECT "id",
    "tmdbId",
    "title",
    "posterPath",
    "dateWatched",
    "ratingUser1",
    "ratingUser2",
    "textReview",
    "genres",
    "recommendedById"
FROM "MovieReview";
-- Drop old table
DROP TABLE "MovieReview";
-- Rename new table
ALTER TABLE "MovieReview_new"
    RENAME TO "MovieReview";
-- Recreate indexes
CREATE INDEX "MovieReview_recommendedById_idx" ON "MovieReview"("recommendedById");
CREATE INDEX "MovieReview_dateWatched_idx" ON "MovieReview"("dateWatched");
-- AlterTable
ALTER TABLE "MovieReview" ADD COLUMN "runtime" INTEGER;
ALTER TABLE "MovieReview" ADD COLUMN "releaseDate" TEXT;
ALTER TABLE "MovieReview" ADD COLUMN "overview" TEXT;

-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN "releaseDate" TEXT;
ALTER TABLE "WatchlistItem" ADD COLUMN "overview" TEXT;

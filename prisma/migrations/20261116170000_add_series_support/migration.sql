-- AlterTable WatchlistItem
ALTER TABLE "WatchlistItem" ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT 'movie';
ALTER TABLE "WatchlistItem" ADD COLUMN "numberOfSeasons" INTEGER;
ALTER TABLE "WatchlistItem" ADD COLUMN "numberOfEpisodes" INTEGER;
CREATE INDEX "WatchlistItem_mediaType_idx" ON "WatchlistItem"("mediaType");

-- AlterTable MovieReview
ALTER TABLE "MovieReview" ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT 'movie';
ALTER TABLE "MovieReview" ADD COLUMN "seasonNumber" INTEGER;
ALTER TABLE "MovieReview" ADD COLUMN "seasonName" TEXT;
ALTER TABLE "MovieReview" ADD COLUMN "totalEpisodes" INTEGER;
ALTER TABLE "MovieReview" ADD COLUMN "episodesWatched" INTEGER;
ALTER TABLE "MovieReview" ADD COLUMN "runtimePerEpisode" INTEGER;
ALTER TABLE "MovieReview" ADD COLUMN "watchedDates" TEXT;
ALTER TABLE "MovieReview" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "MovieReview" ADD COLUMN "abandonedReason" TEXT;
ALTER TABLE "MovieReview" ADD COLUMN "seriesProgressId" TEXT;
CREATE INDEX "MovieReview_mediaType_idx" ON "MovieReview"("mediaType");
CREATE INDEX "MovieReview_status_idx" ON "MovieReview"("status");

-- CreateTable SeriesProgress
CREATE TABLE "SeriesProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT NOT NULL,
    "backdropPath" TEXT,
    "genres" TEXT NOT NULL,
    "overview" TEXT,
    "firstAirDate" TEXT,
    "seasonNumber" INTEGER NOT NULL DEFAULT 1,
    "seasonName" TEXT NOT NULL DEFAULT '1ª Temporada',
    "totalEpisodes" INTEGER NOT NULL DEFAULT 1,
    "currentEpisode" INTEGER NOT NULL DEFAULT 0,
    "runtimePerEpisode" INTEGER DEFAULT 45,
    "platform" TEXT,
    "status" TEXT NOT NULL DEFAULT 'watching',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable SeriesCheckin
CREATE TABLE "SeriesCheckin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesProgressId" TEXT NOT NULL,
    "dateWatched" TEXT NOT NULL,
    "episodeStart" INTEGER NOT NULL,
    "episodeEnd" INTEGER NOT NULL,
    "episodeTag" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeriesCheckin_seriesProgressId_fkey" FOREIGN KEY ("seriesProgressId") REFERENCES "SeriesProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SeriesProgress_status_idx" ON "SeriesProgress"("status");
CREATE INDEX "SeriesProgress_tmdbId_idx" ON "SeriesProgress"("tmdbId");
CREATE INDEX "SeriesCheckin_dateWatched_idx" ON "SeriesCheckin"("dateWatched");
CREATE INDEX "SeriesCheckin_seriesProgressId_idx" ON "SeriesCheckin"("seriesProgressId");

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MovieReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT NOT NULL,
    "dateWatched" TEXT NOT NULL,
    "ratingUser1" INTEGER NOT NULL,
    "ratingUser2" INTEGER NOT NULL,
    "textReview" TEXT NOT NULL,
    "genres" TEXT NOT NULL,
    "recommendedById" TEXT NOT NULL,
    CONSTRAINT "MovieReview_recommendedById_fkey" FOREIGN KEY ("recommendedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MovieReview_recommendedById_idx" ON "MovieReview"("recommendedById");

-- CreateIndex
CREATE INDEX "MovieReview_dateWatched_idx" ON "MovieReview"("dateWatched");

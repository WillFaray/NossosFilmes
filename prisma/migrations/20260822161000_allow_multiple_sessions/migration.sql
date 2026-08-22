-- Permite registrar múltiplas sessões do mesmo filme:
-- remove a restrição de unicidade de MovieReview.tmdbId
DROP INDEX IF EXISTS "MovieReview_tmdbId_key";
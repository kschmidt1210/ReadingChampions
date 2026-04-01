-- Add genre_name text column to book_entries so genre display doesn't
-- depend on FK lookup, and users can store custom (non-challenge) genres.
ALTER TABLE public.book_entries ADD COLUMN genre_name text;

-- Backfill existing entries from the genres table
UPDATE public.book_entries be
SET genre_name = g.name
FROM public.genres g
WHERE be.genre_id = g.id;

-- Replace completed boolean with a three-state status enum
-- and add pages_read for tracking partial progress / DNF

-- 1. Add status column (default 'completed' for backward compat with existing rows)
ALTER TABLE public.book_entries
  ADD COLUMN status text NOT NULL DEFAULT 'completed'
  CHECK (status IN ('reading', 'completed', 'did_not_finish'));

-- 2. Add pages_read column (nullable; null means "all pages" for completed books)
ALTER TABLE public.book_entries
  ADD COLUMN pages_read integer CHECK (pages_read >= 0);

-- 3. Backfill status from existing boolean
UPDATE public.book_entries SET status = 'reading' WHERE completed = false;

-- 4. Drop the old boolean column
ALTER TABLE public.book_entries DROP COLUMN completed;

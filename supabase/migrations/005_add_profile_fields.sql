-- Add optional profile fields: about text and reading profile links
alter table public.profiles
  add column about_text text,
  add column goodreads_url text,
  add column storygraph_url text;

-- Keep about text scannable
alter table public.profiles
  add constraint profiles_about_text_length check (char_length(about_text) <= 500);

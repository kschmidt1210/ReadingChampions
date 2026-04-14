-- Add theme preference to profiles (light, dark, or system)
alter table public.profiles
  add column theme_preference text not null default 'system'
  constraint profiles_theme_preference_check
    check (theme_preference in ('light', 'dark', 'system'));

-- Add spreadsheet_url to organizations for Google Sheets import
alter table public.organizations
  add column spreadsheet_url text;

-- Default global scoring rules (org_id = NULL)
insert into public.scoring_rules (org_id, config) values (
  null,
  '{
    "base_points": {
      "fiction": 0.71,
      "nonfiction": 1.26
    },
    "page_points": {
      "first_100_rate": 0.0028,
      "beyond_100_rate": 0.01
    },
    "bonuses": {
      "classics_1900": 0.072,
      "classics_1750": 0.143,
      "classics_pre1750": 0.286,
      "series": 0.143,
      "translation": 0.057,
      "birth_year": 0.029,
      "current_year": 0.057,
      "holiday_event": 0.029,
      "award_winner": 0.057,
      "new_country": 0.057
    },
    "hometown_bonuses": {
      "state_setting": 0.029,
      "state_name": 0.0029,
      "city_name": 0.0058
    },
    "deductions": {
      "graphic_novel": 0.3,
      "comics_manga": 0.2,
      "audiobook": 0.75,
      "reread": 0.5,
      "audiobook_reread": 0.25
    },
    "season_bonuses": {
      "genre_complete_pct": 0.10,
      "alphabet_13_pct": 0.06,
      "alphabet_26_pct": 0.14
    },
    "longest_road": {
      "countries": [10, 7, 4],
      "series": [8, 5, 3]
    }
  }'::jsonb
);

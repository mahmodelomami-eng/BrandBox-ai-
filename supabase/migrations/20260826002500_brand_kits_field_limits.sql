alter table public.brand_kits
  add constraint brand_kits_brand_name_length check (char_length(brand_name) <= 120),
  add constraint brand_kits_tagline_length check (char_length(tagline) <= 180),
  add constraint brand_kits_description_length check (char_length(description) <= 1200),
  add constraint brand_kits_font_family_length check (char_length(font_family) <= 120),
  add constraint brand_kits_tone_length check (char_length(tone_of_voice) <= 240);

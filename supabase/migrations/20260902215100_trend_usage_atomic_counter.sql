create or replace function public.increment_trend_use_count_from_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_type = 'use' then
    update public.trend_templates
      set use_count = use_count + 1,
          updated_at = now()
      where id = new.trend_id;
  end if;
  return new;
end;
$$;

revoke all on function public.increment_trend_use_count_from_event() from public, anon, authenticated;

drop trigger if exists trend_usage_event_counter_trigger on public.trend_usage_events;
create trigger trend_usage_event_counter_trigger
  after insert on public.trend_usage_events
  for each row execute function public.increment_trend_use_count_from_event();

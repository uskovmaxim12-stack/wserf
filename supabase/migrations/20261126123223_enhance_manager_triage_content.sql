create or replace function public.manager_triage_content()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_source_type text;
  v_title text := '';
  v_body text := '';
  v_gif_url text := '';
  v_sticker text := '';
  v_scan_text text := '';
  v_scan_lower text := '';
  v_scan_compact text := '';
  v_snapshot text := '';
  v_badwords text := '';
  v_word text;
  v_word_lower text;
  v_word_compact text;
  v_link_count integer := 0;
  v_gif_suspicious boolean := false;
  v_reasons text[] := array[]::text[];
  v_risk_level text;
begin
  if tg_table_schema <> 'public' then
    return new;
  end if;

  if tg_table_name = 'topics' then
    v_source_type := 'topic';
    v_title := coalesce(new.title, '');
    v_body := coalesce(new.body, '');
  elsif tg_table_name = 'comments' then
    v_source_type := 'comment';
    v_body := coalesce(new.body, '');
    v_gif_url := coalesce(new.gif_url, '');
    v_sticker := coalesce(new.sticker, '');
  else
    return new;
  end if;

  -- Read the owner-configured stop-list. Existing UI stores a comma-separated
  -- string; arrays are also accepted for future-compatible configuration.
  select
    case
      when jsonb_typeof(s.value #> '{moderation,badwords}') = 'array' then
        coalesce((
          select string_agg(item, E'\n')
          from jsonb_array_elements_text(s.value #> '{moderation,badwords}') as words(item)
        ), '')
      else coalesce(s.value #>> '{moderation,badwords}', '')
    end
  into v_badwords
  from public.settings as s
  where s.key = 'site';

  v_badwords := coalesce(v_badwords, '');

  v_scan_text := concat_ws(
    E'\n',
    nullif(v_title, ''),
    nullif(v_body, ''),
    nullif(v_sticker, ''),
    case when v_gif_url <> '' then 'GIF URL: ' || v_gif_url end
  );

  v_scan_lower := replace(lower(v_scan_text), 'ё', 'е');
  -- Compact comparison catches separators/punctuation inserted into a term.
  v_scan_compact := regexp_replace(
    v_scan_lower,
    '[[:space:][:punct:]_]+',
    '',
    'g'
  );

  if v_source_type = 'topic'
     and (char_length(v_title) > 120 or char_length(v_body) > 5000) then
    v_reasons := array_append(v_reasons, 'Превышена ожидаемая длина темы');
  elsif v_source_type = 'comment'
        and char_length(v_body) > 1000 then
    v_reasons := array_append(v_reasons, 'Превышена ожидаемая длина комментария');
  end if;

  -- Check all textual fields (topic title/body, comment body/sticker, GIF URL)
  -- against the configured stop-list. Entries may be separated by commas,
  -- semicolons, or line breaks.
  for v_word in
    select btrim(entry)
    from regexp_split_to_table(v_badwords, E'[,;\n\r]+') as split(entry)
  loop
    v_word_lower := replace(lower(btrim(v_word)), 'ё', 'е');
    v_word_compact := regexp_replace(
      v_word_lower,
      '[[:space:][:punct:]_]+',
      '',
      'g'
    );

    if char_length(v_word_compact) >= 3
       and (
         strpos(v_scan_lower, v_word_lower) > 0
         or strpos(v_scan_compact, v_word_compact) > 0
       ) then
      if not ('Совпадение со стоп-листом модерации' = any(v_reasons)) then
        v_reasons := array_append(v_reasons, 'Совпадение со стоп-листом модерации');
      end if;
      exit;
    end if;
  end loop;

  -- Links inside the text are not expected on this site. Count them so that
  -- the moderator can distinguish a single link from repeated link spam.
  v_link_count := regexp_count(
    v_title || E'\n' || v_body,
    '(https?://|www[.]|t[.]me/)',
    1,
    'i'
  );

  if v_link_count >= 3 then
    v_reasons := array_append(v_reasons, 'Подозрительно много ссылок в тексте');
  elsif v_link_count > 0 then
    v_reasons := array_append(v_reasons, 'Ссылка в тексте сообщения');
  end if;

  -- GIFs are expected from Giphy/Tenor. Flag unexpected hosts, protocols,
  -- oversized URLs, and redirect-like parameters for manual review.
  if v_gif_url <> '' then
    if char_length(v_gif_url) > 2048
       or v_gif_url !~* '^https://(media[0-9]*[.]giphy[.]com|i[.]giphy[.]com|media[.]tenor[.]com|c[.]tenor[.]com)/'
       or v_gif_url ~* '[?&](redirect|redirect_uri|url|target|next)=' then
      v_gif_suspicious := true;
      v_reasons := array_append(v_reasons, 'Подозрительный URL GIF — проверьте домен и параметры');
    end if;
  end if;

  if v_title <> '' then
    v_snapshot := v_snapshot || 'Заголовок: ' || v_title || E'\n';
  end if;
  if v_body <> '' then
    v_snapshot := v_snapshot || 'Текст: ' || v_body || E'\n';
  end if;
  if v_sticker <> '' then
    v_snapshot := v_snapshot || 'Стикер: ' || v_sticker || E'\n';
  end if;
  if v_gif_url <> '' then
    v_snapshot := v_snapshot || 'GIF URL: ' || v_gif_url || E'\n';
  end if;
  v_snapshot := left(coalesce(nullif(rtrim(v_snapshot, E'\n'), ''), '(пустое сообщение)'), 7000);

  if v_gif_suspicious
     or v_link_count >= 3
     or cardinality(v_reasons) >= 2 then
    v_risk_level := 'high';
  elsif cardinality(v_reasons) > 0 then
    v_risk_level := 'review';
  else
    v_risk_level := 'low';
  end if;

  insert into public.manager_moderation_queue
    (source_type, source_id, author_id, status, risk_level, reasons, content_snapshot)
  values
    (v_source_type, new.id, new.user_id, 'pending', v_risk_level, v_reasons, v_snapshot)
  on conflict (source_type, source_id) do nothing;

  -- Deliberately do not reject, delete, hide, lock, or ban anything here.
  return new;
end;
$function$;

comment on function public.manager_triage_content() is
'Queues new forum topics and comments for manual moderation. Checks topic title/body, comment body/sticker/GIF URL, and the configured settings.site.moderation.badwords stop-list. Never deletes content or blocks accounts.';

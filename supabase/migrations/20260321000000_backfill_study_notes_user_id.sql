-- Assign all existing study_notes rows to Dhrumit Mehta's Supabase Auth user.
-- Before applying: set the email below to the same address used to log in to the app
-- (check Supabase → Authentication → Users if unsure).

DO $$
DECLARE
  target_id uuid;
  target_email text := 'REPLACE_WITH_DHRUMIT_LOGIN_EMAIL';
BEGIN
  SELECT id INTO target_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users row for email %. Edit target_email in this migration, or run: SELECT id, email FROM auth.users;',
      target_email;
  END IF;

  UPDATE public.study_notes
  SET user_id = target_id;
END $$;

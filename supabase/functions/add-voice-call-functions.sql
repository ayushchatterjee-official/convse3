
-- Enable row-level security for the new tables
ALTER TABLE public.group_voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_call_participants ENABLE ROW LEVEL SECURITY;

-- Create or replace functions for voice calls
CREATE OR REPLACE FUNCTION public.create_group_call(p_group_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  INSERT INTO public.group_voice_calls (group_id, started_by, active)
  VALUES (p_group_id, p_user_id, true)
  RETURNING id INTO v_call_id;
  
  INSERT INTO public.voice_call_participants (call_id, user_id)
  VALUES (v_call_id, p_user_id);
  
  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_group_call(p_group_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  SELECT id INTO v_call_id
  FROM public.group_voice_calls
  WHERE group_id = p_group_id
    AND active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_call_group_id(p_call_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.group_voice_calls
  WHERE id = p_call_id
    AND active = true;
  
  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_voice_call(p_call_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  SELECT id INTO v_participant_id
  FROM public.voice_call_participants
  WHERE call_id = p_call_id
    AND user_id = p_user_id
    AND left_at IS NULL;
  
  IF v_participant_id IS NULL THEN
    INSERT INTO public.voice_call_participants (call_id, user_id)
    VALUES (p_call_id, p_user_id)
    RETURNING id INTO v_participant_id;
  END IF;
  
  RETURN v_participant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_voice_call(p_call_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voice_call_participants
  SET left_at = NOW()
  WHERE call_id = p_call_id
    AND user_id = p_user_id
    AND left_at IS NULL;
  
  IF NOT EXISTS (
    SELECT 1
    FROM public.voice_call_participants
    WHERE call_id = p_call_id
      AND left_at IS NULL
  ) THEN
    UPDATE public.group_voice_calls
    SET active = false
    WHERE id = p_call_id;
  END IF;
  
  RETURN true;
END;
$$;

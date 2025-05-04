
-- Create function to create a new group call
CREATE OR REPLACE FUNCTION public.create_group_call(p_group_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  -- Insert new call
  INSERT INTO public.group_voice_calls (group_id, started_by, active)
  VALUES (p_group_id, p_user_id, true)
  RETURNING id INTO v_call_id;
  
  -- Add creator as first participant
  INSERT INTO public.voice_call_participants (call_id, user_id)
  VALUES (v_call_id, p_user_id);
  
  RETURN v_call_id;
END;
$$;

-- Create function to get an active call for a group
CREATE OR REPLACE FUNCTION public.get_active_group_call(p_group_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_call_id UUID;
BEGIN
  -- Find active call
  SELECT id INTO v_call_id
  FROM public.group_voice_calls
  WHERE group_id = p_group_id
    AND active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_call_id;
END;
$$;

-- Create function to get a call's group ID
CREATE OR REPLACE FUNCTION public.get_call_group_id(p_call_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Find group for call
  SELECT group_id INTO v_group_id
  FROM public.group_voice_calls
  WHERE id = p_call_id
    AND active = true;
  
  RETURN v_group_id;
END;
$$;

-- Create function for a user to join a call
CREATE OR REPLACE FUNCTION public.join_voice_call(p_call_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  -- Check if user is already a participant
  SELECT id INTO v_participant_id
  FROM public.voice_call_participants
  WHERE call_id = p_call_id
    AND user_id = p_user_id
    AND left_at IS NULL;
  
  -- If not, insert new participant record
  IF v_participant_id IS NULL THEN
    INSERT INTO public.voice_call_participants (call_id, user_id)
    VALUES (p_call_id, p_user_id)
    RETURNING id INTO v_participant_id;
  END IF;
  
  RETURN v_participant_id;
END;
$$;

-- Create function for a user to leave a call
CREATE OR REPLACE FUNCTION public.leave_voice_call(p_call_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update participant record
  UPDATE public.voice_call_participants
  SET left_at = NOW()
  WHERE call_id = p_call_id
    AND user_id = p_user_id
    AND left_at IS NULL;
  
  -- Check if there are any active participants
  IF NOT EXISTS (
    SELECT 1
    FROM public.voice_call_participants
    WHERE call_id = p_call_id
      AND left_at IS NULL
  ) THEN
    -- End the call if no active participants
    UPDATE public.group_voice_calls
    SET active = false
    WHERE id = p_call_id;
  END IF;
  
  RETURN true;
END;
$$;

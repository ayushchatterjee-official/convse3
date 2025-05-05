
-- Function to create the group_invitations table
CREATE OR REPLACE FUNCTION public.create_group_invitations_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_invitations') THEN
    -- Create the group_invitations table
    CREATE TABLE public.group_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
      inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(group_id, invitee_id, status)
    );

    -- Add RLS policies
    ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to see invitations they've sent or received
    CREATE POLICY "Users can see their own invitations" 
      ON public.group_invitations 
      FOR SELECT 
      USING (auth.uid() IN (inviter_id, invitee_id));
    
    -- Allow users to create invitations for groups they're a member of
    CREATE POLICY "Users can create invitations for their groups" 
      ON public.group_invitations 
      FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = group_invitations.group_id 
          AND user_id = auth.uid()
        )
      );
    
    -- Allow users to update invitations they've received
    CREATE POLICY "Users can update invitations they've received" 
      ON public.group_invitations 
      FOR UPDATE 
      USING (auth.uid() = invitee_id);
    
    RAISE NOTICE 'Created group_invitations table';
  ELSE
    RAISE NOTICE 'group_invitations table already exists';
  END IF;
END;
$$;

-- Function to create the notifications table
CREATE OR REPLACE FUNCTION public.create_notifications_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    -- Create the notifications table
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL CHECK (type IN ('message', 'voice_call', 'invitation', 'system')),
      content TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      invitation_id UUID REFERENCES public.group_invitations(id) ON DELETE CASCADE
    );

    -- Add indexes for faster queries
    CREATE INDEX notifications_recipient_id_idx ON public.notifications (recipient_id);
    CREATE INDEX notifications_read_idx ON public.notifications (read);
    CREATE INDEX notifications_created_at_idx ON public.notifications (created_at);

    -- Add RLS policies
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to see their own notifications
    CREATE POLICY "Users can see their own notifications" 
      ON public.notifications 
      FOR SELECT 
      USING (auth.uid() = recipient_id);
    
    -- Allow users to update their own notifications (e.g., marking as read)
    CREATE POLICY "Users can update their own notifications" 
      ON public.notifications 
      FOR UPDATE 
      USING (auth.uid() = recipient_id);
    
    -- Allow users to create notifications
    -- This is permissive because we want to allow system notifications and 
    -- notifications between users in the same group
    CREATE POLICY "Users can create notifications" 
      ON public.notifications 
      FOR INSERT 
      WITH CHECK (true);
    
    RAISE NOTICE 'Created notifications table';
  ELSE
    RAISE NOTICE 'notifications table already exists';
  END IF;
END;
$$;

-- Function to enable realtime for notifications
CREATE OR REPLACE FUNCTION public.enable_realtime_for_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add tables to the supabase_realtime publication
  -- This allows for realtime updates via the Supabase client
  
  -- Check if supabase_realtime publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add group_invitations to realtime publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'group_invitations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invitations;
      RAISE NOTICE 'Added group_invitations to realtime publication';
    END IF;
    
    -- Add notifications to realtime publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
      RAISE NOTICE 'Added notifications to realtime publication';
    END IF;
    
    -- Ensure the tables have REPLICA IDENTITY FULL for better realtime support
    EXECUTE 'ALTER TABLE public.group_invitations REPLICA IDENTITY FULL';
    EXECUTE 'ALTER TABLE public.notifications REPLICA IDENTITY FULL';
    
    RAISE NOTICE 'Realtime enabled for notification tables';
  ELSE
    RAISE NOTICE 'supabase_realtime publication not found, skipping realtime setup';
  END IF;
END;
$$;

-- Function to handle notification for new voice calls
CREATE OR REPLACE FUNCTION public.handle_new_voice_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_name TEXT;
  v_started_by_name TEXT;
  v_group_member RECORD;
BEGIN
  -- Get the group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;
  
  -- Get the name of the person who started the call
  SELECT name INTO v_started_by_name
  FROM public.profiles
  WHERE id = NEW.started_by;
  
  -- Create a notification for each group member except the caller
  FOR v_group_member IN 
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.started_by
  LOOP
    INSERT INTO public.notifications (
      recipient_id,
      sender_id,
      group_id,
      type,
      content
    ) VALUES (
      v_group_member.user_id,
      NEW.started_by,
      NEW.group_id,
      'voice_call',
      v_started_by_name || ' started a voice call in ' || v_group_name
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for voice call notifications
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS notify_voice_call ON public.group_voice_calls;
  
  -- Create the trigger
  CREATE TRIGGER notify_voice_call
  AFTER INSERT ON public.group_voice_calls
  FOR EACH ROW
  WHEN (NEW.active = TRUE)
  EXECUTE FUNCTION public.handle_new_voice_call();
  
  RAISE NOTICE 'Created voice call notification trigger';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating voice call notification trigger: %', SQLERRM;
END;
$$;

-- Function to handle notification for new messages
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_name TEXT;
  v_sender_name TEXT;
  v_preview TEXT;
  v_group_member RECORD;
BEGIN
  -- Get the group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;
  
  -- Get the name of the message sender
  SELECT name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Create a message preview
  v_preview := 
    CASE 
      WHEN NEW.content_type = 'text' THEN 
        CASE 
          WHEN length(NEW.content) <= 30 THEN NEW.content
          ELSE substring(NEW.content, 1, 30) || '...'
        END
      WHEN NEW.content_type = 'image' THEN 'sent an image'
      WHEN NEW.content_type = 'file' THEN 'sent a file'
      WHEN NEW.content_type = 'voice' THEN 'sent a voice message'
      ELSE 'sent a message'
    END;
  
  -- Create a notification for each group member except the sender
  FOR v_group_member IN 
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (
      recipient_id,
      sender_id,
      group_id,
      type,
      content
    ) VALUES (
      v_group_member.user_id,
      NEW.user_id,
      NEW.group_id,
      'message',
      v_sender_name || ' in ' || v_group_name || ': ' || v_preview
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for message notifications
DO $$
BEGIN
  -- Check if the messages table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS notify_new_message ON public.messages;
    
    -- Create the trigger
    CREATE TRIGGER notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();
    
    RAISE NOTICE 'Created message notification trigger';
  ELSE
    RAISE NOTICE 'messages table does not exist, skipping message notification trigger';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating message notification trigger: %', SQLERRM;
END;
$$;


-- Create admin logs table to track user activities
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type VARCHAR(50) NOT NULL,
  action_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for admin logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs" 
  ON public.admin_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_status = 'admin'
    )
  );

CREATE POLICY "System can insert logs" 
  ON public.admin_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_logs (user_id, action_type, action_details, ip_address, user_agent)
  VALUES (p_user_id, p_action_type, p_action_details, p_ip_address, p_user_agent)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to clean up old read notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE read = true 
  AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create triggers for automatic logging
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_user_activity(
      NEW.id,
      'user_signup',
      jsonb_build_object(
        'name', NEW.name,
        'account_status', NEW.account_status,
        'country', NEW.country
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log login updates
    IF OLD.last_login <> NEW.last_login THEN
      PERFORM public.log_user_activity(
        NEW.id,
        'user_login',
        jsonb_build_object(
          'previous_login', OLD.last_login,
          'current_login', NEW.last_login
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_user_activity(
      OLD.id,
      'user_delete_account',
      jsonb_build_object(
        'name', OLD.name,
        'account_status', OLD.account_status,
        'date_joined', OLD.date_joined
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for profile changes
CREATE TRIGGER profile_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

-- Create trigger for group activities
CREATE OR REPLACE FUNCTION public.log_group_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_user_activity(
      (SELECT user_id FROM public.group_members WHERE group_id = NEW.id AND is_admin = true LIMIT 1),
      'group_created',
      jsonb_build_object(
        'group_id', NEW.id,
        'group_name', NEW.name,
        'is_private', NEW.is_private,
        'group_code', NEW.code
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_user_activity(
      (SELECT user_id FROM public.group_members WHERE group_id = OLD.id AND is_admin = true LIMIT 1),
      'group_deleted',
      jsonb_build_object(
        'group_id', OLD.id,
        'group_name', OLD.name,
        'is_private', OLD.is_private
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for group activities
CREATE TRIGGER group_activities_trigger
  AFTER INSERT OR DELETE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.log_group_activities();

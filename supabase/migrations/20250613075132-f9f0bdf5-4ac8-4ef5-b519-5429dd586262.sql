
-- Create a table for private admin conversations
CREATE TABLE public.admin_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for private messages between admin and users
CREATE TABLE public.admin_private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID,
  message TEXT,
  media_url TEXT,
  media_type TEXT,
  mentions TEXT[], -- Array to store mentioned user IDs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for admin conversations
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" 
  ON public.admin_conversations 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() = admin_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_status = 'admin'
    )
  );

CREATE POLICY "Users can create conversations with admin" 
  ON public.admin_conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update conversations" 
  ON public.admin_conversations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_status = 'admin'
    )
  );

-- Add RLS policies for private messages
ALTER TABLE public.admin_private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" 
  ON public.admin_private_messages 
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    auth.uid()::text = ANY(mentions) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_status = 'admin'
    )
  );

CREATE POLICY "Users can send messages in their conversations" 
  ON public.admin_private_messages 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.admin_conversations 
        WHERE id = conversation_id AND (user_id = auth.uid() OR admin_id = auth.uid())
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND account_status = 'admin'
      )
    )
  );

-- Create storage bucket for community media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-media', 'community-media', true);

-- Create storage policies for community media
CREATE POLICY "Anyone can view community media" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-media');

CREATE POLICY "Authenticated users can upload community media" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own uploads" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

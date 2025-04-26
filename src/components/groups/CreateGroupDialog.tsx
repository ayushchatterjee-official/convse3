import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Upload } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Group name must be at least 2 characters.',
  }).max(50, {
    message: 'Group name must not exceed 50 characters.'
  }),
  is_private: z.boolean().default(false),
  password: z.string().optional(),
});

interface CreateGroupDialogProps {
  onGroupCreated?: (groupId: string) => void;
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_private: false,
      password: '',
    },
  });
  
  useEffect(() => {
    if (!open) {
      form.reset();
      setProfilePic(null);
      setProfilePicPreview(null);
    }
  }, [open, form]);
  
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadProfilePic = async (): Promise<string | null> => {
    if (!profilePic || !user) return null;
    
    const fileExt = profilePic.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `group-profiles/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, profilePic);
    
    if (uploadError) {
      toast.error('Error uploading profile picture');
      return null;
    }
    
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to create a group');
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload profile pic if selected
      const profilePicUrl = profilePic ? await uploadProfilePic() : null;
      
      // Generate a random code for the group
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: values.name,
          is_private: values.is_private,
          password: values.is_private ? values.password : null,
          profile_pic: profilePicUrl,
          code: randomCode
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
        });
      
      if (memberError) throw memberError;
      
      toast.success('Group created successfully!');
      setOpen(false);
      
      if (onGroupCreated) {
        onGroupCreated(groupData.id);
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Create New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {profilePicPreview ? (
                    <AvatarImage src={profilePicPreview} alt="Preview" />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {form.watch('name') ? form.watch('name').charAt(0).toUpperCase() : 'G'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label 
                  htmlFor="profile-pic" 
                  className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <input 
                    id="profile-pic" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleProfilePicChange}
                  />
                </label>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter group name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Private Group</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Private groups require a password to join
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            {form.watch('is_private') && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Set a password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
};

export function Notifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Simulating notifications as they may not exist in your DB yet
      const simulatedNotifications: Notification[] = [
        {
          id: '1',
          created_at: new Date().toISOString(),
          user_id: user.id,
          title: 'Welcome to the platform',
          message: 'Thank you for joining our education platform!',
          type: 'welcome',
          read: false
        },
        {
          id: '2',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          user_id: user.id,
          title: 'New feature announcement',
          message: 'We\'ve added new dashboard features!',
          type: 'system',
          read: false
        }
      ];
      
      if (profile?.role === 'student') {
        simulatedNotifications.push({
          id: '3',
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          user_id: user.id,
          title: 'New assignment posted',
          message: 'Your teacher has posted a new math assignment due next week.',
          type: 'assignment',
          read: true
        });
      }
      
      if (profile?.role === 'teacher') {
        simulatedNotifications.push({
          id: '3',
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          user_id: user.id,
          title: 'Student submission',
          message: 'A student has submitted their assignment for review.',
          type: 'submission',
          read: true
        });
      }
      
      // Use actual data if available, otherwise use simulated data
      const notificationsToUse = data && data.length > 0 ? data : simulatedNotifications;
      
      setNotifications(notificationsToUse);
      setUnreadCount(notificationsToUse.filter(n => !n.read).length);
      
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Find the notification in our local state
      const notificationToUpdate = notifications.find(n => n.id === id);
      if (!notificationToUpdate || notificationToUpdate.read) return;
      
      // Update in database (if it exists there)
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update in database (if they exist there)
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, user?.id]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="absolute right-12 top-4"
            >
              Mark all read
            </Button>
          )}
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 rounded border ${!notification.read ? 'bg-muted' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between">
                  <h4 className="font-medium">{notification.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{notification.message}</p>
                {!notification.read && (
                  <Badge variant="secondary" className="mt-2">New</Badge>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No notifications
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 
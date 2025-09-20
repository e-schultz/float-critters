import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  MessageCircle, 
  FileText, 
  Lightbulb, 
  User,
  Bot,
  Save,
  Check,
  X
} from "lucide-react";

interface ActivityTimelineProps {
  workspaceId: string;
}

export function ActivityTimeline({ workspaceId }: ActivityTimelineProps) {
  // Fetch activities
  const { data: activitiesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'activities'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-3 h-3" />;
      case 'draft_updated':
        return <FileText className="w-3 h-3" />;
      case 'draft_saved':
        return <Save className="w-3 h-3" />;
      case 'suggestion_created':
        return <Lightbulb className="w-3 h-3" />;
      case 'suggestion_applied':
        return <Check className="w-3 h-3" />;
      case 'suggestion_rejected':
        return <X className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800';
      case 'draft_updated':
      case 'draft_saved':
        return 'bg-green-100 text-green-800';
      case 'suggestion_created':
        return 'bg-yellow-100 text-yellow-800';
      case 'suggestion_applied':
        return 'bg-emerald-100 text-emerald-800';
      case 'suggestion_rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityDescription = (activity: any) => {
    const metadata = activity.metadata || {};
    
    switch (activity.type) {
      case 'message':
        return `${metadata.role === 'user' ? 'You' : 'AI'} sent a message${metadata.sectionPath ? ` about ${metadata.sectionPath}` : ''}`;
      case 'draft_updated':
        return `Updated ${metadata.section || 'draft content'}`;
      case 'draft_saved':
        return 'Saved draft changes';
      case 'suggestion_created':
        return `AI suggested ${metadata.type || 'changes'}${metadata.sectionPath ? ` for ${metadata.sectionPath}` : ''}`;
      case 'suggestion_applied':
        return `Applied suggestion: ${metadata.title || 'content changes'}`;
      case 'suggestion_rejected':
        return `Rejected suggestion: ${metadata.title || 'content changes'}`;
      default:
        return activity.description || 'Unknown activity';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <Activity className="w-4 h-4 mr-2" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load activity timeline. Please try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const activities = activitiesData?.activities || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm">
            <Activity className="w-4 h-4 mr-2" />
            Activity Timeline
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {activities.length} activities
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded w-24 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs">Activity will appear as you work in this workspace</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="activity-timeline">
              {activities.map((activity: any, index: number) => (
                <div 
                  key={activity.id} 
                  className="relative flex items-start space-x-3"
                  data-testid={`activity-${activity.id}`}
                >
                  {/* Timeline line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-3 top-6 w-px h-8 bg-border" />
                  )}
                  
                  {/* Activity icon */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Activity content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs text-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                      
                      {activity.metadata?.role && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {activity.metadata.role === 'user' ? (
                            <User className="w-2 h-2 mr-1" />
                          ) : (
                            <Bot className="w-2 h-2 mr-1" />
                          )}
                          {activity.metadata.role === 'user' ? 'You' : 'AI'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Additional context for some activities */}
                    {activity.type === 'message' && activity.metadata?.preview && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2 mt-1">
                        "{activity.metadata.preview}"
                      </p>
                    )}
                    
                    {activity.type.startsWith('suggestion_') && activity.metadata?.suggestionTitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {activity.metadata.suggestionTitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
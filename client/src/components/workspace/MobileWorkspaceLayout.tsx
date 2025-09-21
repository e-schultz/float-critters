import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  FileText, 
  Lightbulb, 
  Activity,
  FolderOpen
} from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { DraftPanel } from './DraftPanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { ActivityTimeline } from './ActivityTimeline';
import { ResourceDrawer } from './ResourceDrawer';

interface MobileWorkspaceLayoutProps {
  workspaceId: string;
}

export function MobileWorkspaceLayout({ workspaceId }: MobileWorkspaceLayoutProps) {
  const [activeTab, setActiveTab] = useState('draft');

  return (
    <div className="h-full flex flex-col" data-testid="mobile-workspace-layout">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Bottom Tab Navigation */}
        <div className="order-2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="grid grid-cols-5 w-full h-16 bg-transparent p-1">
            <TabsTrigger 
              value="draft" 
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary/10"
              data-testid="tab-draft-mobile"
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Draft</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary/10"
              data-testid="tab-chat-mobile"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs">AI Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary/10"
              data-testid="tab-resources-mobile"
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-xs">Files</span>
            </TabsTrigger>
            <TabsTrigger 
              value="suggestions" 
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary/10"
              data-testid="tab-suggestions-mobile"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="text-xs">Ideas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary/10"
              data-testid="tab-activity-mobile"
            >
              <Activity className="w-5 h-5" />
              <span className="text-xs">History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Areas */}
        <div className="order-1 flex-1 min-h-0">
          <TabsContent value="draft" className="h-full m-0" data-testid="content-draft-mobile">
            <ScrollArea className="h-full">
              <div className="p-4">
                <DraftPanel workspaceId={workspaceId} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="h-full m-0" data-testid="content-chat-mobile">
            <div className="h-full">
              <ChatPanel workspaceId={workspaceId} />
            </div>
          </TabsContent>

          <TabsContent value="resources" className="h-full m-0" data-testid="content-resources-mobile">
            <ScrollArea className="h-full">
              <div className="p-4">
                <ResourceDrawer workspaceId={workspaceId} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggestions" className="h-full m-0" data-testid="content-suggestions-mobile">
            <ScrollArea className="h-full">
              <div className="p-4">
                <SuggestionsPanel workspaceId={workspaceId} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="h-full m-0" data-testid="content-activity-mobile">
            <ScrollArea className="h-full">
              <div className="p-4">
                <ActivityTimeline workspaceId={workspaceId} />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
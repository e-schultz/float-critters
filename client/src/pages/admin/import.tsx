import React, { useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader, Upload, FileText, Code, Users, Eye, MessageCircle, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";

const createWorkspaceSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  goal: z.string().min(1, "Goal is required").max(500, "Goal must be less than 500 characters"),
  content: z.string().min(1, "Initial content is required"),
  contentType: z.enum(["text", "file", "artifact"]).default("text")
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export default function AdminImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("text");
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  
  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      title: "",
      goal: "",
      content: "",
      contentType: "text"
    },
    mode: 'onChange'
  });

  const handleCreateWorkspace = async (formData: CreateWorkspaceFormData) => {
    setIsCreating(true);
    setCreationProgress(0);
    
    try {
      setCreationProgress(20);
      
      // Create the workspace with initial content
      const token = localStorage.getItem('admin-token');
      const workspaceResponse = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          goal: formData.goal,
          rawContent: formData.content,
          contentType: formData.contentType
        })
      });
      
      if (!workspaceResponse.ok) {
        const errorData = await workspaceResponse.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }
      
      const { workspace } = await workspaceResponse.json();
      setCreationProgress(50);
      
      // Send initial AI message to start collaboration
      const initialMessage = `I've created a new workspace titled "${formData.title}" with the goal: ${formData.goal}\n\nHere's the initial content to work with:\n\n${formData.content}\n\nLet's start collaborating! What should we focus on first to achieve your goal?`;
      
      const chatResponse = await fetch(`/api/admin/workspaces/${workspace.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: initialMessage
        })
      });
      
      setCreationProgress(85);
      
      if (chatResponse.ok) {
        // Consume the streaming response to complete the AI message
        const reader = chatResponse.body?.getReader();
        if (reader) {
          let done = false;
          while (!done) {
            const { done: streamDone } = await reader.read();
            done = streamDone;
          }
        }
      }
      
      setCreationProgress(100);
      
      // Invalidate workspaces cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspaces'] });
      
      toast({
        title: "Workspace Created",
        description: `Successfully created "${workspace.title}" and started AI collaboration.`,
      });
      
      // Redirect to the workspace editor
      setTimeout(() => {
        setLocation(`/admin/workspaces/${workspace.id}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Workspace creation error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create workspace. Please try again.",
        variant: "destructive"
      });
      setIsCreating(false);
    }
  };

  // Update content when form changes
  const watchedContent = form.watch("content");
  const watchedContentType = form.watch("contentType");
  
  // Sync form content with local content state
  React.useEffect(() => {
    if (content !== watchedContent) {
      form.setValue("content", content, { shouldValidate: true });
    }
  }, [content, watchedContent, form]);
  
  React.useEffect(() => {
    if (activeTab !== watchedContentType) {
      form.setValue("contentType", activeTab as "text" | "file" | "artifact", { shouldValidate: true });
    }
  }, [activeTab, watchedContentType, form]);
  
  const onSubmit = (data: CreateWorkspaceFormData) => {
    handleCreateWorkspace(data);
  };

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "Create Workspace", href: "/admin/import" }
      ]}
    >
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Workspace</h1>
            <p className="text-muted-foreground">
              Start a collaborative AI-powered workspace to develop and refine your content together.
            </p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Workspace Setup Section */}
                <div className="space-y-6">
                  {/* Workspace Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Workspace Details
                      </CardTitle>
                      <CardDescription>
                        Define your collaborative workspace and its purpose
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workspace Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter a descriptive title for your workspace"
                                data-testid="input-workspace-title"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal & Objective</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe what you want to accomplish in this workspace. What's your vision for the final content?"
                                className="min-h-[100px]"
                                data-testid="textarea-workspace-goal"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Initial Content */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        Initial Content
                      </CardTitle>
                      <CardDescription>
                        Provide starting content for AI collaboration - this will seed your first conversation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="text" data-testid="tab-text">
                            <FileText className="w-4 h-4 mr-2" />
                            Text
                          </TabsTrigger>
                          <TabsTrigger value="file" data-testid="tab-file">
                            <Upload className="w-4 h-4 mr-2" />
                            File
                          </TabsTrigger>
                          <TabsTrigger value="artifact" data-testid="tab-artifact">
                            <Code className="w-4 h-4 mr-2" />
                            Artifact
                          </TabsTrigger>
                        </TabsList>
                    
                        <TabsContent value="text" className="space-y-4">
                          <Label htmlFor="content">Starting Content</Label>
                          <Textarea
                            id="content"
                            placeholder="Share your ideas, notes, research, or any content you'd like to develop collaboratively with AI. This will start your conversation..."
                            className="min-h-[300px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            data-testid="textarea-content"
                          />
                        </TabsContent>
                    
                        <TabsContent value="file" className="space-y-4">
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">
                              Upload documents, notes, or research to kickstart your workspace
                            </p>
                            <Input
                              type="file"
                              accept=".txt,.md,.json"
                              className="hidden"
                              id="file-upload"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setContent(e.target?.result as string);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                              data-testid="input-file-upload"
                            />
                            <Label htmlFor="file-upload">
                              <Button variant="outline" className="cursor-pointer" data-testid="button-browse-files">
                                Browse Files
                              </Button>
                            </Label>
                          </div>
                        </TabsContent>
                    
                        <TabsContent value="artifact" className="space-y-4">
                          <Label htmlFor="artifact-content">Structured Content (JSON/Markdown)</Label>
                          <Textarea
                            id="artifact-content"
                            placeholder="Paste structured content, templates, or existing artifacts to build upon..."
                            className="min-h-[300px] font-mono text-sm"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            data-testid="textarea-artifact-content"
                          />
                        </TabsContent>
                  </Tabs>

                      <Button
                        type="submit"
                        disabled={isCreating || !form.formState.isValid}
                        className="w-full"
                        data-testid="button-start-collaborating"
                      >
                        {isCreating ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Creating Workspace...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Start Collaborating
                          </>
                        )}
                      </Button>
                      
                      {isCreating && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Setting up your collaborative workspace...</span>
                            <span>{Math.round(creationProgress)}%</span>
                          </div>
                          <Progress value={creationProgress} className="w-full" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Workspace Preview Section */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        Workspace Preview
                      </CardTitle>
                      <CardDescription>
                        How your collaborative workspace will be set up
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!form.watch("title") && !content.trim() ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Fill in workspace details to see preview</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {form.watch("title") && (
                            <div>
                              <h3 className="text-xl font-bold">{form.watch("title")}</h3>
                              {form.watch("goal") && (
                                <p className="text-muted-foreground mt-2">{form.watch("goal")}</p>
                              )}
                            </div>
                          )}
                          
                          {content.trim() && (
                            <div>
                              <h4 className="font-semibold mb-2">Initial Content ({activeTab})</h4>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground truncate">
                                  {content.slice(0, 150)}{content.length > 150 ? '...' : ''}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-blue-700">What happens next?</h4>
                            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                              <li>• AI will analyze your content and start a conversation</li>
                              <li>• You'll collaborate to refine and develop ideas</li>
                              <li>• Content evolves through iterative discussion</li>
                              <li>• Final content emerges from your collaboration</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}
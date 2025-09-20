import { useState } from "react";
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
import { Loader, Upload, FileText, Code, Sparkles, Eye, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("text");
  const [content, setContent] = useState("");
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedContent, setTransformedContent] = useState<any>(null);
  const [transformProgress, setTransformProgress] = useState(0);
  const [isValid, setIsValid] = useState(false);

  const handleTransform = async () => {
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content to transform.",
        variant: "destructive"
      });
      return;
    }

    setIsTransforming(true);
    setTransformProgress(0);
    
    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch('/api/admin/transform-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          contentType: activeTab,
          targetFormat: 'zine-issue'
        })
      });

      if (!response.ok) {
        throw new Error('Transformation failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setTransformProgress(100);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                // Update progress based on content length
                const estimatedProgress = Math.min(95, (fullResponse.length / 2000) * 100);
                setTransformProgress(estimatedProgress);
              }
              if (parsed.complete && parsed.valid !== undefined) {
                setIsValid(parsed.valid);
              }
            } catch (e) {
              // Ignore parsing errors for streaming chunks
            }
          }
        }
      }

      try {
        const parsedContent = JSON.parse(fullResponse);
        setTransformedContent(parsedContent);
        toast({
          title: "Content Transformed",
          description: "Your content has been successfully transformed into zine format.",
        });
      } catch (error) {
        // If parsing fails, still show the content for manual review
        setTransformedContent({ raw: fullResponse });
        setIsValid(false);
        toast({
          title: "Transformation Complete",
          description: "Content transformed but may need manual review.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Transform error:', error);
      toast({
        title: "Transform Failed",
        description: error.message || "An error occurred during transformation.",
        variant: "destructive"
      });
    } finally {
      setIsTransforming(false);
    }
  };

  const handlePublish = async () => {
    if (!transformedContent || !isValid) {
      toast({
        title: "Cannot Publish",
        description: "Please ensure the content is valid before publishing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch('/api/admin/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transformedContent)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish issue');
      }

      const { issue } = await response.json();
      toast({
        title: "Issue Published",
        description: `Successfully created issue: ${issue.title}`,
      });

      // Redirect to content management or the new issue
      setLocation('/admin/content');
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: "Publish Failed",
        description: error.message || "Failed to publish the issue.",
        variant: "destructive"
      });
    }
  };

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "Import Content", href: "/admin/import" }
      ]}
    >
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import Content</h1>
            <p className="text-muted-foreground">
              Transform raw content into structured Field Guide Zine format using AI.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Content Input
                  </CardTitle>
                  <CardDescription>
                    Paste or upload content to transform into zine format
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
                      <Label htmlFor="content">Raw Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Paste your raw content here... This could be notes, articles, documentation, or any text you want to transform into a zine format."
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
                          Drag and drop files here, or click to browse
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
                      <Label htmlFor="artifact-content">Artifact Content (JSON/Markdown)</Label>
                      <Textarea
                        id="artifact-content"
                        placeholder="Paste artifact content here..."
                        className="min-h-[300px] font-mono text-sm"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        data-testid="textarea-artifact-content"
                      />
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={handleTransform}
                    disabled={!content.trim() || isTransforming}
                    className="w-full"
                    data-testid="button-transform-content"
                  >
                    {isTransforming ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Transforming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Transform with AI
                      </>
                    )}
                  </Button>
                  
                  {isTransforming && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transforming content...</span>
                        <span>{Math.round(transformProgress)}%</span>
                      </div>
                      <Progress value={transformProgress} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Preview
                    </div>
                    {transformedContent && (
                      <Badge variant={isValid ? "default" : "destructive"}>
                        {isValid ? "Valid" : "Needs Review"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Preview of your transformed content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!transformedContent ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Transform content to see preview</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {!isValid && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            The transformed content may need manual review before publishing.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-4">
                        {transformedContent.title && (
                          <div>
                            <h3 className="text-xl font-bold">{transformedContent.title}</h3>
                            {transformedContent.subtitle && (
                              <p className="text-muted-foreground">{transformedContent.subtitle}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {transformedContent.version && (
                                <Badge variant="outline">{transformedContent.version}</Badge>
                              )}
                              {transformedContent.tagline && (
                                <span className="text-sm text-muted-foreground italic">
                                  "{transformedContent.tagline}"
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {transformedContent.intro && (
                          <div className="prose dark:prose-invert">
                            <p>{transformedContent.intro}</p>
                          </div>
                        )}
                        
                        {transformedContent.sections && (
                          <div className="space-y-4">
                            <h4 className="font-semibold">Sections</h4>
                            {transformedContent.sections.map((section: any, index: number) => (
                              <Card key={index} className="bg-muted/50">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">{section.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm text-muted-foreground">
                                    {section.entries?.length || 0} patterns
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => setTransformedContent(null)}
                          data-testid="button-clear-preview"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={handlePublish}
                          disabled={!isValid}
                          data-testid="button-publish-content"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Publish Issue
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}
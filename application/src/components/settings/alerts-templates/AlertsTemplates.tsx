
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { templateService, TemplateType } from "@/services/templateService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCcw } from "lucide-react";
import { TemplateList } from "./TemplateList";
import { TemplateDialog } from "./TemplateDialog";
import { useToast } from "@/hooks/use-toast";

export const AlertsTemplates = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TemplateType>('service');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingTemplateType, setEditingTemplateType] = useState<TemplateType | null>(null);

  const {
    data: templates = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notification_templates', activeTab],
    queryFn: () => templateService.getTemplates(activeTab),
  });

  const handleAddTemplate = (templateType: TemplateType) => {
    setEditingTemplate(null);
    setEditingTemplateType(templateType);
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (id: string, templateType: TemplateType) => {
    setEditingTemplate(id);
    setEditingTemplateType(templateType);
    setIsDialogOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing",
      description: "Updating template list...",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl">Alert Templates</CardTitle>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} size="sm" className="flex-1 sm:flex-none">
            <RefreshCcw className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => handleAddTemplate(activeTab)} size="sm" className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Template</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TemplateType)}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-4 mb-4">
              <TabsTrigger value="service" className="text-xs md:text-sm whitespace-nowrap">Service</TabsTrigger>
              <TabsTrigger value="server" className="text-xs md:text-sm whitespace-nowrap">Server</TabsTrigger>
              <TabsTrigger value="ssl" className="text-xs md:text-sm whitespace-nowrap">SSL</TabsTrigger>
              <TabsTrigger value="server_threshold" className="text-xs md:text-sm whitespace-nowrap">Threshold</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="service" className="mt-4">
            {error ? (
              <div className="text-center p-6">
                <p className="text-destructive mb-4">Error loading service templates</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <TemplateList 
                templates={templates} 
                isLoading={isLoading} 
                onEdit={(id) => handleEditTemplate(id, 'service')}
                refetchTemplates={refetch}
                templateType="service"
              />
            )}
          </TabsContent>
          
          <TabsContent value="server" className="mt-4">
            {error ? (
              <div className="text-center p-6">
                <p className="text-destructive mb-4">Error loading server templates</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <TemplateList 
                templates={templates} 
                isLoading={isLoading} 
                onEdit={(id) => handleEditTemplate(id, 'server')}
                refetchTemplates={refetch}
                templateType="server"
              />
            )}
          </TabsContent>
          
          <TabsContent value="ssl" className="mt-4">
            {error ? (
              <div className="text-center p-6">
                <p className="text-destructive mb-4">Error loading SSL templates</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <TemplateList 
                templates={templates} 
                isLoading={isLoading} 
                onEdit={(id) => handleEditTemplate(id, 'ssl')}
                refetchTemplates={refetch}
                templateType="ssl"
              />
            )}
          </TabsContent>
          
          <TabsContent value="server_threshold" className="mt-4">
            {error ? (
              <div className="text-center p-6">
                <p className="text-destructive mb-4">Error loading server threshold templates</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <TemplateList 
                templates={templates} 
                isLoading={isLoading} 
                onEdit={(id) => handleEditTemplate(id, 'server_threshold')}
                refetchTemplates={refetch}
                templateType="server_threshold"
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <TemplateDialog
        open={isDialogOpen}
        templateId={editingTemplate}
        templateType={editingTemplateType}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          refetch();
          setIsDialogOpen(false);
        }}
      />
    </Card>
  );
};
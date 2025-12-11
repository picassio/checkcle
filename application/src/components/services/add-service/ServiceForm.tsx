import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useServiceSchema, ServiceFormData } from "./types";
import { ServiceBasicFields } from "./ServiceBasicFields";
import { ServiceTypeField } from "./ServiceTypeField";
import { ServiceConfigFields } from "./ServiceConfigFields";
import { ServiceNotificationFields } from "./ServiceNotificationFields";
import { ServiceFormActions } from "./ServiceFormActions";
import { ServiceContentValidationFields } from "./ServiceContentValidationFields";
import { serviceService } from "@/services/serviceService";
import { Service } from "@/types/service.types";
import { ServiceRegionalFields } from "./ServiceRegionalFields";
import { getServiceFormDefaults, mapServiceToFormData, mapFormDataToServiceData } from "./serviceFormUtils";
import { useQueryClient } from "@tanstack/react-query";
import {useLanguage} from "@/contexts/LanguageContext.tsx";

interface ServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Service | null;
  isEdit?: boolean;
  onSubmitStart?: () => void;
}

export function ServiceForm({ 
  onSuccess, 
  onCancel, 
  initialData, 
  isEdit = false,
  onSubmitStart
}: ServiceFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

	const serviceSchema = useServiceSchema();

  // Initialize form with default values
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: getServiceFormDefaults(),
    mode: "onBlur",
  });

  // Populate form when initialData changes (separate from initialization)
  useEffect(() => {
    if (initialData && isEdit) {
      const formData = mapServiceToFormData(initialData);
      form.reset(formData);

      // Log for debugging
    //  console.log("Populating form with data:", { 
    //    type: formData.type, 
    //    url: formData.url, 
    //    port: formData.port, 
    //    regionalAgents: formData.regionalAgents,
    //    regionalMonitoringEnabled: formData.regionalMonitoringEnabled,
    //    regional_status: initialData.regional_status,
    //    region_name: initialData.region_name,
    //    agent_id: initialData.agent_id,
     //   notification_status: initialData.notification_status,
     //   notificationChannels: formData.notificationChannels
    //  });
    }
  }, [initialData, isEdit, form]);

  const handleSubmit = async (data: ServiceFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    if (onSubmitStart) onSubmitStart();
    
    try {
     // console.log("Form data being submitted:", data);
      
      const serviceData = mapFormDataToServiceData(data);
     // console.log("Service data being sent:", serviceData);
      
      if (isEdit && initialData) {
        // Update existing service
        await serviceService.updateService(initialData.id, serviceData);
        
        toast({
          title: "Service updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        // Create new service
        await serviceService.createService(serviceData);
        
        toast({
          title: "Service created",
          description: `${data.name} has been added to monitoring.`,
        });
      }
      
      // Force immediate refresh of services data
      queryClient.setQueryData(["services"], (oldData: any) => {
        // Invalidate the cache to force a fresh fetch
        return undefined;
      });
      
      // Invalidate and refetch services query
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      await queryClient.refetchQueries({ queryKey: ["services"] });

      onSuccess();
      if (!isEdit) {
        form.reset();
      }
    } catch (error) {
     // console.error(`Error ${isEdit ? 'updating' : 'creating'} service:`, error);
      toast({
        title: `Failed to ${isEdit ? 'update' : 'create'} service`,
        description: `An error occurred while ${isEdit ? 'updating' : 'creating'} the service.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">{t('basicInformation')}</h3>
            <ServiceBasicFields form={form} />
            <ServiceTypeField form={form} />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">{t('configuration')}</h3>
            <ServiceConfigFields form={form} />
          </div>

          <ServiceContentValidationFields form={form} />

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">{t('regionalMonitoring')}</h3>
            <ServiceRegionalFields form={form} />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">{t('notifications')}</h3>
            <ServiceNotificationFields form={form} />
          </div>
        </div>
        
        <ServiceFormActions 
          isSubmitting={isSubmitting} 
          onCancel={onCancel} 
          submitLabel={isEdit ? t("updateService") : t("createService")}
        />
      </form>
    </Form>
  );
}
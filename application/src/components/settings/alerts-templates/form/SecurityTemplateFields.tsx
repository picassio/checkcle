import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SecurityTemplateFieldsProps {
  control: Control<any>;
}

export const SecurityTemplateFields: React.FC<SecurityTemplateFieldsProps> = ({ control }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Severity-based Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="critical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-red-600">Critical Severity Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[CRITICAL] ${template_name} found on ${host}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="high"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-orange-500">High Severity Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[HIGH] ${template_name} found on ${host}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="medium"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-yellow-500">Medium Severity Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[MEDIUM] ${template_name} found on ${host}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="low"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-blue-500">Low Severity Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[LOW] ${template_name} found on ${host}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-500">Info Severity Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[INFO] ${template_name} found on ${host}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan Summary Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Security Scan Complete: ${scan_name}\nTotal Findings: ${total_findings}"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { ServiceFormData } from "./types";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ServiceContentValidationFieldsProps {
  form: UseFormReturn<ServiceFormData>;
}

export function ServiceContentValidationFields({ form }: ServiceContentValidationFieldsProps) {
  const { t } = useLanguage();
  const serviceType = form.watch("type");
  const [isOpen, setIsOpen] = useState(false);

  // Only show for HTTP services
  if (serviceType !== "http") {
    return null;
  }

  const { fields: jsonPathFields, append: appendJsonPath, remove: removeJsonPath } =
    useFieldArray({ control: form.control, name: "jsonPathChecks" });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } =
    useFieldArray({ control: form.control, name: "headerChecks" });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg p-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary w-full">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {t("contentValidation") || "Content Validation"}
        <span className="text-xs text-muted-foreground ml-2">({t("optional") || "optional"})</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4">
        {/* Expected Status Code */}
        <FormField
          control={form.control}
          name="expectedStatusCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("expectedStatusCode") || "Expected Status Code"}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="200"
                  min="100"
                  max="599"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {t("expectedStatusCodeDesc") || "The exact HTTP status code expected (e.g., 200). Leave empty to accept any 2xx/3xx."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Keyword Check */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="keywordCheck"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("keywordCheck") || "Keyword Check"}</FormLabel>
                <FormControl>
                  <Input placeholder={t("keywordCheckPlaceholder") || "e.g., success, OK"} {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {t("keywordCheckDesc") || "Check if response body contains this text"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="keywordCheckType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("keywordCheckType") || "Check Type"}</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value || "contains"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">{t("contains") || "Contains"}</SelectItem>
                      <SelectItem value="not_contains">{t("notContains") || "Not Contains"}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* JSON Path Checks */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <FormLabel>{t("jsonPathChecks") || "JSON Path Validations"}</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendJsonPath({ path: "", operator: "equals", expectedValue: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("add") || "Add"}
              </Button>
            </div>

            {jsonPathFields.length === 0 && (
              <p className="text-xs text-muted-foreground mb-2">{t("noJsonPathChecks") || "No JSON path checks configured. Click Add to create one."}</p>
            )}

            {jsonPathFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`jsonPathChecks.${index}.path`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("jsonPath") || "JSON Path"}</FormLabel>}
                        <FormControl>
                          <Input placeholder="$.data.status" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`jsonPathChecks.${index}.operator`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("operator") || "Operator"}</FormLabel>}
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">{t("equals") || "Equals"}</SelectItem>
                            <SelectItem value="not_equals">{t("notEquals") || "Not Equals"}</SelectItem>
                            <SelectItem value="contains">{t("contains") || "Contains"}</SelectItem>
                            <SelectItem value="exists">{t("exists") || "Exists"}</SelectItem>
                            <SelectItem value="not_exists">{t("notExists") || "Not Exists"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`jsonPathChecks.${index}.expectedValue`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("expectedValue") || "Expected Value"}</FormLabel>}
                        <FormControl>
                          <Input placeholder="ok" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJsonPath(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Header Checks */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <FormLabel>{t("headerChecks") || "Header Validations"}</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendHeader({ headerName: "", operator: "contains", expectedValue: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("add") || "Add"}
              </Button>
            </div>

            {headerFields.length === 0 && (
              <p className="text-xs text-muted-foreground mb-2">{t("noHeaderChecks") || "No header checks configured. Click Add to create one."}</p>
            )}

            {headerFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`headerChecks.${index}.headerName`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("headerName") || "Header Name"}</FormLabel>}
                        <FormControl>
                          <Input placeholder="Content-Type" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`headerChecks.${index}.operator`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("operator") || "Operator"}</FormLabel>}
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">{t("equals") || "Equals"}</SelectItem>
                            <SelectItem value="contains">{t("contains") || "Contains"}</SelectItem>
                            <SelectItem value="exists">{t("exists") || "Exists"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`headerChecks.${index}.expectedValue`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel className="text-xs">{t("expectedValue") || "Expected Value"}</FormLabel>}
                        <FormControl>
                          <Input placeholder="application/json" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

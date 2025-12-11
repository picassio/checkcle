import { ValidationResult } from "@/types/service.types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

interface ValidationResultsDisplayProps {
  results: ValidationResult;
}

export function ValidationResultsDisplay({ results }: ValidationResultsDisplayProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (!results) return null;

  const Icon = results.passed ? CheckCircle2 : XCircle;
  const iconColor = results.passed ? "text-green-500" : "text-red-500";
  const hasDetails = results.status_code_result ||
    results.keyword_result ||
    (results.json_path_results && results.json_path_results.length > 0) ||
    (results.header_results && results.header_results.length > 0);

  if (!hasDetails) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm hover:opacity-80">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs">
          {results.passed
            ? (t("validationPassed") || "Validation Passed")
            : (t("validationFailed") || "Validation Failed")}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-1 text-xs pl-6">
        {results.status_code_result && (
          <div className="flex items-center gap-2">
            <Badge
              variant={results.status_code_result.passed ? "default" : "destructive"}
              className="text-xs px-1.5 py-0"
            >
              {t("statusCode") || "Status"}
            </Badge>
            <span className={results.status_code_result.passed ? "text-green-600" : "text-red-600"}>
              {results.status_code_result.passed
                ? `${results.status_code_result.actual}`
                : `Expected ${results.status_code_result.expected}, got ${results.status_code_result.actual}`}
            </span>
          </div>
        )}

        {results.keyword_result && (
          <div className="flex items-center gap-2">
            <Badge
              variant={results.keyword_result.passed ? "default" : "destructive"}
              className="text-xs px-1.5 py-0"
            >
              {t("keyword") || "Keyword"}
            </Badge>
            <span className={results.keyword_result.passed ? "text-green-600" : "text-red-600"}>
              {results.keyword_result.passed
                ? `"${results.keyword_result.keyword}" ${results.keyword_result.check_type === "not_contains" ? "not found" : "found"}`
                : results.keyword_result.message || `"${results.keyword_result.keyword}" check failed`}
            </span>
          </div>
        )}

        {results.json_path_results?.map((result, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge
              variant={result.passed ? "default" : "destructive"}
              className="text-xs px-1.5 py-0"
            >
              JSON
            </Badge>
            <span className={result.passed ? "text-green-600" : "text-red-600"}>
              <code className="bg-muted px-1 rounded">{result.path}</code>
              {result.passed
                ? ` = "${result.actual_value}"`
                : `: ${result.message || "check failed"}`}
            </span>
          </div>
        ))}

        {results.header_results?.map((result, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge
              variant={result.passed ? "default" : "destructive"}
              className="text-xs px-1.5 py-0"
            >
              {t("header") || "Header"}
            </Badge>
            <span className={result.passed ? "text-green-600" : "text-red-600"}>
              <code className="bg-muted px-1 rounded">{result.header_name}</code>
              {result.passed
                ? `: "${result.actual_value}"`
                : `: ${result.message || "check failed"}`}
            </span>
          </div>
        ))}

        {results.failure_reason && !results.passed && (
          <div className="text-red-500 mt-1 italic">
            {results.failure_reason}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

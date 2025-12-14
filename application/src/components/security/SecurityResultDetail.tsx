import { SecurityResult } from '@/types/security.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SeverityBadge } from './SeverityBadge';
import { ExternalLink, Copy, Terminal, FileText, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SecurityResultDetailProps {
  result: SecurityResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityResultDetail({ result, open, onOpenChange }: SecurityResultDetailProps) {
  if (!result) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Vulnerability Details
          </DialogTitle>
          <DialogDescription>
            {result.template_name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <SeverityBadge severity={result.severity} showIcon />
              <Badge variant="outline">{result.template_id}</Badge>
              <span className="text-sm text-muted-foreground">
                Found {formatDistanceToNow(new Date(result.created), { addSuffix: true })}
              </span>
            </div>

            {/* Target Information */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Target Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Host</span>
                    <p className="font-mono text-sm">{result.host}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Matched At</span>
                    <p className="font-mono text-sm">{result.matched_at || '-'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Matched URL</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={result.matched_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-mono text-sm break-all"
                    >
                      {result.matched_url}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.matched_url, 'URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={result.matched_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {result.description && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{result.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Solution */}
            {result.solution && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <Shield className="h-4 w-4" />
                    Recommended Solution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{result.solution}</p>
                </CardContent>
              </Card>
            )}

            {/* CVE IDs */}
            {result.cve_ids && result.cve_ids.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">CVE References</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.cve_ids.map((cve) => (
                      <a
                        key={cve}
                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        <Badge variant="destructive" className="cursor-pointer hover:opacity-80">
                          {cve}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* References */}
            {result.references && result.references.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">References</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.references.map((ref, index) => (
                      <li key={index}>
                        <a
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline break-all"
                        >
                          {ref}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* cURL Command */}
            {result.curl_command && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Reproduction cURL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {result.curl_command}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(result.curl_command, 'cURL command')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extracted Results */}
            {result.extracted_results && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Extracted Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    {result.extracted_results}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Raw Data */}
            {result.raw_data && Object.keys(result.raw_data).length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Raw Data
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(result.raw_data, null, 2), 'Raw data')
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-[300px]">
                    {JSON.stringify(result.raw_data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default SecurityResultDetail;

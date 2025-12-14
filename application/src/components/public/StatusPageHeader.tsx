
import { OperationalPageRecord } from '@/types/operational.types';
import { Shield, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatusPageHeaderProps {
  page: OperationalPageRecord;
}

export const StatusPageHeader = ({ page }: StatusPageHeaderProps) => {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {page.logo_url ? (
              <img
                src={page.logo_url}
                alt={`${page.title} logo`}
                className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 md:h-12 md:w-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-foreground truncate">{page.title}</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">{page.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {page.custom_domain && (
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <a
                  href={`https://${page.custom_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">Visit Site</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}

            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-xs md:text-sm">Live Status</span>
              </div>
              <div className="text-xs hidden sm:block">
                Auto-updated every 30s
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mt-4 md:mt-6 flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Shield className="h-3 w-3 md:h-4 md:w-4" />
          <span>Status Page</span>
          <span>•</span>
          <span className="text-foreground font-medium truncate">{page.title}</span>
        </div>
      </div>
    </header>
  );
};
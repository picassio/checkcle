
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceFiltersProps {
  filter: string;
  setFilter: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  servicesCount: number;
}

export const ServiceFilters = ({ 
  filter, 
  setFilter, 
  searchTerm, 
  setSearchTerm,
  servicesCount 
}: ServiceFiltersProps) => {
  const { t } = useLanguage();
  return (
    <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="flex items-center">
        <h3 className="text-base md:text-xl font-semibold mr-2 text-foreground">{t('currentlyMonitoring')}</h3>
        <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-sm">
          {servicesCount}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border">
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            <SelectItem value="HTTP">HTTP</SelectItem>
            <SelectItem value="PING">PING</SelectItem>
            <SelectItem value="TCP">TCP</SelectItem>
            <SelectItem value="DNS">DNS</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            className="w-full sm:w-72 bg-card border-border"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};


import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { IncidentItem } from '@/services/incident/types';
import { IncidentTableRow } from './IncidentTableRow';
import { IncidentDetailDialog } from '../detail-dialog/IncidentDetailDialog';
import { EditIncidentDialog } from '../EditIncidentDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { IncidentTableSkeleton } from './IncidentTableSkeleton';
import { IncidentStatusDropdown } from '../IncidentStatusDropdown';
import { IncidentActionsMenu } from '../IncidentActionsMenu';
import { Calendar, Clock } from 'lucide-react';

interface IncidentTableProps {
  data: IncidentItem[]; 
  isLoading: boolean;
  onIncidentUpdated: () => void;
  onViewDetails?: (incident: IncidentItem) => void;
  onEditIncident?: (incident: IncidentItem) => void;
}

export const IncidentTable = ({ 
  data, 
  isLoading,
  onIncidentUpdated,
  onViewDetails,
  onEditIncident 
}: IncidentTableProps) => {
  const { t } = useLanguage();
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'PPp');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  }, []);

  const getAffectedSystemsArray = useCallback((affectedSystems: string | undefined): string[] => {
    if (!affectedSystems) return [];
    return affectedSystems.split(',').map(system => system.trim()).filter(Boolean);
  }, []);

  const handleViewDetails = useCallback((incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsDetailOpen(true);
  }, []);
  
  const handleEditIncident = useCallback((incident: IncidentItem) => {
    setSelectedIncident(incident);
    setIsEditOpen(true);
  }, []);

  // Handle status updates efficiently
  const handleIncidentUpdated = useCallback(() => {
    console.log("Incident updated in IncidentTable, propagating event");
    onIncidentUpdated();
  }, [onIncidentUpdated]);

  // Handle dialog closing
  const handleDetailDialogClose = useCallback((open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      onIncidentUpdated();
    }
  }, [onIncidentUpdated]);

  // Handle edit dialog closing
  const handleEditDialogClose = useCallback((open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      onIncidentUpdated();
    }
  }, [onIncidentUpdated]);

  if (isLoading) {
    return <IncidentTableSkeleton />;
  }

  // Add a safety check to prevent map of undefined error
  if (!data || !Array.isArray(data)) {
    console.error('Data is not an array:', data);
    return (
      <div className="p-4 text-center">
        <p>No incident data available</p>
      </div>
    );
  }

  // Mobile Incident Card Component
  const MobileIncidentCard = ({ item }: { item: IncidentItem }) => {
    const getPriorityVariant = (priority: string | undefined) => {
      const p = priority?.toLowerCase() || 'low';
      if (p === 'critical') return 'destructive';
      if (p === 'high') return 'default';
      if (p === 'medium') return 'secondary';
      return 'outline';
    };

    return (
      <Card className="mb-3 cursor-pointer" onClick={() => (onViewDetails || handleViewDetails)(item)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{item.title || item.description || '-'}</div>
              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                <IncidentStatusDropdown
                  status={item.impact_status || item.status || 'investigating'}
                  id={item.id}
                  onStatusUpdated={handleIncidentUpdated}
                />
                <Badge variant={getPriorityVariant(item.priority)}>
                  {t(item.priority?.toLowerCase() || 'low')}
                </Badge>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <IncidentActionsMenu
                item={item}
                onIncidentUpdated={handleIncidentUpdated}
                onViewDetails={onViewDetails || handleViewDetails}
                onEditIncident={onEditIncident || handleEditIncident}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.created)}</span>
          </div>

          {item.affected_systems && (
            <div className="flex flex-wrap gap-1 mt-2">
              {getAffectedSystemsArray(item.affected_systems).slice(0, 3).map((system, index) => (
                <Badge key={index} variant="outline" className="text-xs">{system}</Badge>
              ))}
              {getAffectedSystemsArray(item.affected_systems).length > 3 && (
                <Badge variant="outline" className="text-xs">+{getAffectedSystemsArray(item.affected_systems).length - 3}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {data.map((item) => (
          <MobileIncidentCard key={item.id} item={item} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('title')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('priority')}</TableHead>
              <TableHead>{t('time')}</TableHead>
              <TableHead>{t('affected')}</TableHead>
              <TableHead>{t('impact')}</TableHead>
              <TableHead>{t('assignedTo')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <IncidentTableRow
                key={item.id}
                item={item}
                formatDate={formatDate}
                getAffectedSystemsArray={getAffectedSystemsArray}
                onViewDetails={onViewDetails || handleViewDetails}
                onEditIncident={onEditIncident || handleEditIncident}
                onIncidentUpdated={handleIncidentUpdated}
                t={t}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Incident detail dialog */}
      <IncidentDetailDialog
        open={isDetailOpen}
        onOpenChange={handleDetailDialogClose}
        incident={selectedIncident}
      />
      
      {/* Edit incident dialog */}
      {selectedIncident && (
        <EditIncidentDialog
          open={isEditOpen}
          onOpenChange={handleEditDialogClose}
          incident={selectedIncident}
          onIncidentUpdated={onIncidentUpdated}
        />
      )}
    </>
  );
};

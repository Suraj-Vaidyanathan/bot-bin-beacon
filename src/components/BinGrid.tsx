import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Box } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

interface Bin {
  id: string;
  location: string;
  capacity: number;
  currentCount: number;
  status: 'available' | 'full' | 'maintenance';
}

interface BinGridProps {
  bins: Bin[];
}

const BinGrid: React.FC<BinGridProps> = ({ bins }) => {
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ bin: Bin; newEnabled: boolean } | null>(null);

  const getBinColor = (bin: Bin) => {
    if (bin.status === 'maintenance') return 'bg-red-100 border-red-300';
    
    const fillPercentage = (bin.currentCount / bin.capacity) * 100;
    
    if (bin.currentCount >= bin.capacity) return 'bg-red-100 border-red-300';
    if (fillPercentage >= 50) return 'bg-blue-100 border-blue-300';
    return 'bg-green-100 border-green-300';
  };

  const getBinTextColor = (bin: Bin) => {
    if (bin.status === 'maintenance') return 'text-red-700';
    
    const fillPercentage = (bin.currentCount / bin.capacity) * 100;
    
    if (bin.currentCount >= bin.capacity) return 'text-red-700';
    if (fillPercentage >= 50) return 'text-blue-700';
    return 'text-green-700';
  };

  const getFillPercentage = (bin: Bin) => {
    return Math.round((bin.currentCount / bin.capacity) * 100);
  };

  const getProgressBarColor = (bin: Bin) => {
    if (bin.status === 'maintenance') return 'bg-red-500';
    
    const fillPercentage = getFillPercentage(bin);
    
    if (bin.currentCount >= bin.capacity) return 'bg-red-500';
    if (fillPercentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusLabel = (bin: Bin) => {
    if (bin.status === 'maintenance') return 'Full';
    
    const fillPercentage = getFillPercentage(bin);
    
    if (bin.currentCount >= bin.capacity) return 'Full';
    if (fillPercentage >= 50) return 'Filling';
    return 'Available';
  };

  const handleBinClick = (bin: Bin) => {
    setSelectedBin(bin);
    setIsDialogOpen(true);
  };

  const handleToggleBin = async () => {
    if (!selectedBin) return;

    const newStatus = selectedBin.status === 'maintenance' ? 'available' : 'maintenance';
    
    try {
      let finalStatus = newStatus;
      if (newStatus === 'available' && selectedBin.currentCount >= selectedBin.capacity) {
        finalStatus = 'full';
      }

      const { error } = await supabase
        .from('bins')
        .update({ status: finalStatus })
        .eq('id', selectedBin.id);

      if (error) {
        console.error('Error updating bin status:', error);
      }
    } catch (error) {
      console.error('Error toggling bin:', error);
    }

    setIsDialogOpen(false);
    setSelectedBin(null);
  };

  const handleSwitchToggle = (bin: Bin, newEnabled: boolean) => {
    setPendingToggle({ bin, newEnabled });
  };

  const confirmSwitchToggle = async () => {
    if (!pendingToggle) return;

    const { bin, newEnabled } = pendingToggle;
    const newStatus = newEnabled ? 'available' : 'maintenance';
    
    try {
      let finalStatus = newStatus;
      if (newStatus === 'available' && bin.currentCount >= bin.capacity) {
        finalStatus = 'full';
      }

      const { error } = await supabase
        .from('bins')
        .update({ status: finalStatus })
        .eq('id', bin.id);

      if (error) {
        console.error('Error updating bin status:', error);
      }
    } catch (error) {
      console.error('Error toggling bin:', error);
    }

    setPendingToggle(null);
  };

  return (
    <Card className="p-3">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Bin Status Grid</h3>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {bins.map(bin => (
          <div
            key={bin.id}
            className={`p-2 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${getBinColor(bin)}`}
            onClick={() => handleBinClick(bin)}
          >
            <div className="flex flex-col items-center space-y-1">
              <Box className={`w-4 h-4 ${getBinTextColor(bin)}`} />
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600">{bin.location}</div>
                <div className={`text-xs font-bold ${getBinTextColor(bin)}`}>
                  {bin.currentCount}/{bin.capacity}
                </div>
                <div className={`text-xs ${getBinTextColor(bin)}`}>
                  {getStatusLabel(bin)}
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${getProgressBarColor(bin)}`}
                  style={{ width: `${Math.min(getFillPercentage(bin), 100)}%` }}
                />
              </div>

              <div className="flex items-center space-x-1 pt-1">
                <span className="text-xs text-gray-600">
                  {bin.status === 'maintenance' ? 'Disabled' : 'Enabled'}
                </span>
                <Switch
                  checked={bin.status !== 'maintenance'}
                  onCheckedChange={(checked) => handleSwitchToggle(bin, checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Filling</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Full</span>
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toggle Bin Status</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBin && (
                <>
                  Are you sure you want to {selectedBin.status === 'maintenance' ? 'enable' : 'disable'} bin {selectedBin.location}?
                  <br />
                  This will change its status from <strong>{selectedBin.status === 'maintenance' ? 'disabled' : 'enabled'}</strong> to <strong>{selectedBin.status === 'maintenance' ? 'enabled' : 'disabled'}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBin(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleBin}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingToggle} onOpenChange={() => setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toggle Bin Status</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle && (
                <>
                  Are you sure you want to {pendingToggle.newEnabled ? 'enable' : 'disable'} bin {pendingToggle.bin.location}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingToggle(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitchToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BinGrid;

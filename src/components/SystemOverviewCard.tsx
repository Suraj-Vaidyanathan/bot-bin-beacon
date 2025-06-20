
import React from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface SystemOverviewCardProps {
  botActive: string;
  cvRunning: string;
  networkStatus: string;
  wcsStatus: string;
  wmsStatus: string;
  plcStatus: string;
  warnings: string;
}

const SystemOverviewCard: React.FC<SystemOverviewCardProps> = ({
  botActive,
  cvRunning,
  networkStatus,
  wcsStatus,
  wmsStatus,
  plcStatus,
  warnings,
}) => {
  const getStatusColor = (status: string) => {
    // Handle fraction values like "4/4", "3/4", etc.
    if (status.includes('/')) {
      const [current, total] = status.split('/').map(Number);
      if (current === total) return 'text-green-600';
      if (current >= total * 0.5) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    if (status === 'Healthy' || status === 'Online') return 'text-green-600';
    if (status === 'Warning' || status.includes('Warning')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    // Handle fraction values like "4/4", "3/4", etc.
    if (status.includes('/')) {
      const [current, total] = status.split('/').map(Number);
      if (current === total) return CheckCircle;
      if (current >= total * 0.5) return AlertTriangle;
      return XCircle;
    }
    
    if (status === 'Healthy' || status === 'Online') return CheckCircle;
    if (status === 'Warning' || status.includes('Warning')) return AlertTriangle;
    return XCircle;
  };

  const StatusItem: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const Icon = getStatusIcon(value);
    return (
      <li className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}:</span>
        <div className="flex items-center space-x-1">
          <Icon className={`w-4 h-4 ${getStatusColor(value)}`} />
          <span className={`text-sm ${getStatusColor(value)}`}>{value}</span>
        </div>
      </li>
    );
  };

  return (
    <Card className="p-3 bg-blue-50 border-blue-300">
      <h3 className="text-base font-bold text-blue-900 mb-2">System Overview</h3>
      <ul className="space-y-1 text-gray-800">
        <StatusItem label="BOT Active" value={botActive} />
        <StatusItem label="CV Running" value={cvRunning} />
        <StatusItem label="Network" value={networkStatus} />
        <StatusItem label="WCS & WMS" value={wcsStatus} />
        <StatusItem label="WCS & PLC" value={plcStatus} />
        <StatusItem label="Warnings" value={warnings} />
      </ul>
    </Card>
  );
};

export default SystemOverviewCard;

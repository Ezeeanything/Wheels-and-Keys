
import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface StatsProps {
  totalHours: number;
  activityCount: number;
  deadline: string;
  isUrgent: boolean;
}

const StatsCards: React.FC<StatsProps> = ({ totalHours, activityCount, deadline, isUrgent }) => {
  const cards = [
    {
      label: 'Logged Hours',
      value: `${totalHours.toFixed(1)}h`,
      icon: Clock,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      label: 'Activities Recorded',
      value: activityCount.toString(),
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    },
    {
      label: 'Submission Deadline',
      value: deadline,
      icon: isUrgent ? AlertTriangle : Calendar,
      color: isUrgent ? 'bg-amber-500 animate-pulse' : 'bg-slate-700',
      textColor: isUrgent ? 'text-amber-600' : 'text-slate-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
          <div className={`${card.color} p-3 rounded-xl text-white shadow-lg shadow-${card.color.split('-')[1]}-500/20`}>
            <card.icon size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

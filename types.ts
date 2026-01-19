
export type ActivityCategory = 'Maintenance' | 'Customer Service' | 'Locksmith' | 'Transport' | 'Admin' | 'Other';

export interface Activity {
  id: string;
  date: string;
  category: ActivityCategory;
  task: string;
  description: string;
  durationHours: number;
  submitted: boolean;
  submissionId?: string;
}

export interface Submission {
  id: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string;
  totalHours: number;
  activityCount: number;
  activities: Activity[];
  status: 'Pending' | 'Paid' | 'Approved';
}

export interface PayrollPeriod {
  start: Date;
  end: Date;
  deadline: Date;
  paymentDate: Date;
  label: string;
}

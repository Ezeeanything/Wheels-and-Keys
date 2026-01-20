
export type ActivityCategory = 'Maintenance' | 'Customer Service' | 'Locksmith' | 'Transport' | 'Admin' | 'Other';

export interface Activity {
  id: string;
  date: string;
  category: ActivityCategory;
  task: string;
  // Detailed reporting fields
  accomplishments: string;        // Things they did/handled
  positiveImpact: string;         // Positive impact
  challenges: string;             // Challenges faced
  overcomingChallenges: string;   // How they overcame them
  futurePlans: string;            // Things they looked into to do
  achievementStrategy: string;    // How they tend to achieve it
  achievementTimeframe: string;   // Time frame for achievement
  companyBenefit: string;         // Impact and benefit to the company
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

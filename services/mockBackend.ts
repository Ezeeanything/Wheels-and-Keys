
import { Submission, Activity } from '../types';

/**
 * Simulates a cloud backend for Wheels & Keys.
 * Handles "API" calls with latency to show UI loading states.
 */
export const mockBackend = {
  syncActivities: async (activities: Activity[]): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem('wk_activities_sync', JSON.stringify(activities));
        resolve(true);
      }, 800);
    });
  },

  submitPayroll: async (submission: Submission): Promise<{ success: boolean; remoteId: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const remoteId = `REM-${Math.floor(Math.random() * 100000)}`;
        resolve({ success: true, remoteId });
      }, 2000);
    });
  },

  getCompanySettings: async () => {
    return {
      submissionDays: [14, 29],
      paymentDays: [15, 30],
      companyName: "Wheels & Keys Inc.",
      currency: "USD"
    };
  }
};

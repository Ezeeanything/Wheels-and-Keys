
import { PayrollPeriod } from '../types';

export const getPayrollPeriod = (date: Date = new Date()): PayrollPeriod => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Period 1: 1st to 14th. Payment on 15th. Deadline 14th.
  // Period 2: 15th to end of month. Payment on 30th (or end of month). Deadline 29th.
  
  if (day <= 14) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 14),
      deadline: new Date(year, month, 14, 23, 59, 59),
      paymentDate: new Date(year, month, 15),
      label: `First Half of ${date.toLocaleString('default', { month: 'long' })}`
    };
  } else {
    // Period 2: 15th to 29th (as requested for submission on 29th)
    const lastDay = new Date(year, month + 1, 0).getDate();
    const paymentDay = lastDay < 30 ? lastDay : 30;
    
    return {
      start: new Date(year, month, 15),
      end: new Date(year, month, lastDay),
      deadline: new Date(year, month, 29, 23, 59, 59),
      paymentDate: new Date(year, month, paymentDay),
      label: `Second Half of ${date.toLocaleString('default', { month: 'long' })}`
    };
  }
};

export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const isDeadlineApproaching = (deadline: Date) => {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const hoursRemaining = diff / (1000 * 60 * 60);
  return hoursRemaining > 0 && hoursRemaining < 48;
};

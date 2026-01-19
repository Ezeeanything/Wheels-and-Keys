
import { GoogleGenAI, Type } from "@google/genai";
import { ActivityCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function optimizeActivityDescription(task: string, description: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert operations assistant for "Wheels & Keys", an automotive locksmith and security firm. 
      Professionalize this activity log for HR payroll.
      
      Task: ${task}
      Draft: ${description}
      
      Output ONLY the refined description.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 150,
        thinkingConfig: { thinkingBudget: 50 }
      }
    });
    return response.text?.trim() || description;
  } catch (error) {
    console.error("Gemini optimization error:", error);
    return description;
  }
}

export async function suggestCategory(task: string): Promise<ActivityCategory> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this task title: "${task}", which category from this list fits best: Maintenance, Customer Service, Locksmith, Transport, Admin, Other? 
      Return ONLY the category name.`,
      config: {
        temperature: 0.1,
        maxOutputTokens: 20
      }
    });
    const result = response.text?.trim() as ActivityCategory;
    const validCategories: ActivityCategory[] = ['Maintenance', 'Customer Service', 'Locksmith', 'Transport', 'Admin', 'Other'];
    return validCategories.includes(result) ? result : 'Other';
  } catch {
    return 'Other';
  }
}

export async function generatePeriodSubmissionSummary(activities: any[]): Promise<string> {
  try {
    const data = activities.map(a => `${a.category}: ${a.task} (${a.durationHours}h)`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this payroll period's work for "Wheels & Keys" staff. Create a professional, punchy summary of major accomplishments.
      
      Activities:
      ${data}
      
      Output 2-3 sentences max.`,
    });
    return response.text?.trim() || "Work period successfully completed and logged.";
  } catch {
    return "Summary generated automatically based on logged hours.";
  }
}

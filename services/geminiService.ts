
import { GoogleGenAI, Type } from "@google/genai";
import { ActivityCategory, Activity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function optimizeActivityDescription(activity: Partial<Activity>): Promise<Partial<Activity>> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert operations assistant for "Wheels & Keys", an automotive locksmith and security firm. 
      Professionalize this structured activity log for a formal corporate report. 
      
      Task: ${activity.task}
      Accomplishments: ${activity.accomplishments}
      Impact: ${activity.positiveImpact}
      Challenges: ${activity.challenges}
      Resolution: ${activity.overcomingChallenges}
      Future: ${activity.futurePlans}
      Strategy: ${activity.achievementStrategy}
      Benefit: ${activity.companyBenefit}
      
      Output a JSON object with the refined, professional versions of the text for each key.`,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        // Using responseSchema to ensure the model adheres to the expected JSON structure.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accomplishments: { type: Type.STRING },
            positiveImpact: { type: Type.STRING },
            challenges: { type: Type.STRING },
            overcomingChallenges: { type: Type.STRING },
            futurePlans: { type: Type.STRING },
            achievementStrategy: { type: Type.STRING },
            companyBenefit: { type: Type.STRING }
          },
          required: ["accomplishments", "positiveImpact", "challenges", "overcomingChallenges", "futurePlans", "achievementStrategy", "companyBenefit"]
        }
      }
    });
    
    try {
      // Accessing response.text as a property as per current SDK guidelines.
      const result = JSON.parse(response.text || '{}');
      return { ...activity, ...result };
    } catch {
      return activity;
    }
  } catch (error) {
    console.error("Gemini optimization error:", error);
    return activity;
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
    // response.text is a getter property.
    const result = response.text?.trim() as ActivityCategory;
    const validCategories: ActivityCategory[] = ['Maintenance', 'Customer Service', 'Locksmith', 'Transport', 'Admin', 'Other'];
    return validCategories.includes(result) ? result : 'Other';
  } catch {
    return 'Other';
  }
}

export async function generatePeriodSubmissionSummary(activities: Activity[]): Promise<string> {
  try {
    const data = activities.map(a => `- ${a.task}: ${a.positiveImpact} (Benefit: ${a.companyBenefit})`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this payroll period's work for "Wheels & Keys" staff. Focus on organizational growth and overcoming obstacles.
      
      Activities:
      ${data}
      
      Output a professional, punchy 3-sentence executive summary.`,
    });
    // response.text is a getter property.
    return response.text?.trim() || "Work period successfully completed with focus on operational efficiency and strategic growth.";
  } catch {
    return "Summary generated automatically based on logged achievements and future strategic plans.";
  }
}

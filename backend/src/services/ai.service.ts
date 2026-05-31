import OpenAI from "openai";
import Meeting from "../models/meeting.model";
import { ApiError } from "../utils/api-error";

// 🚀 FIX: Lazy Initialization. This waits for the .env file to load first!
const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(503, "OpenAI key missing from .env file");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export class AIService {
  
  static async transcribeAudio(audioBuffer: Buffer, fileName: string) {
    const openai = getClient();
    try {
      console.log("🎤 Transcribing audio:", fileName);
      return {
        text: "Placeholder transcription - implement with actual audio",
        duration: 0,
      };
    } catch (error: any) {
      console.error("Transcription error:", error);
      throw new ApiError(500, `Transcription failed: ${error.message}`);
    }
  }

  static async generateSummary(meetingId: string, transcriptText: string, tenantId: string) {
    const openai = getClient();

    try {
      console.log("📝 Generating summary for meeting:", meetingId);
      const prompt = `You are an expert meeting summarizer. Create a concise, professional summary of the following meeting transcript. 
Transcript: ${transcriptText}
Please provide: 1. Executive Summary 2. Key Discussion Points 3. Decisions Made 4. Next Steps`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a professional meeting summarizer." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const summary = response.choices[0]?.message?.content || "Unable to generate summary";

      await Meeting.findByIdAndUpdate(meetingId, {
        $set: { summary },
      });

      return summary;
    } catch (error: any) {
      console.error("Summary generation error:", error);
      throw new ApiError(500, `Summary generation failed: ${error.message}`);
    }
  }

  static async extractActionItems(meetingId: string, transcriptText: string, tenantId: string) {
    const openai = getClient();

    try {
      console.log("✅ Extracting action items for meeting:", meetingId);
      const prompt = `Extract all action items from this transcript:
Transcript: ${transcriptText}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        response_format: { type: "json_object" }, 
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting action items. Always return a JSON object with a single root key called 'actionItems' which contains an array of objects. Each object must have: title, assignedTo, deadline, priority."
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || '{"actionItems": []}';
      
      let actionItems = [];
      try {
        const parsed = JSON.parse(content);
        actionItems = parsed.actionItems || [];
      } catch (parseError) {
        console.error("Error parsing action items JSON:", parseError);
      }

      await Meeting.findByIdAndUpdate(meetingId, {
        $set: { actionItems },
      });

      return actionItems;
    } catch (error: any) {
      console.error("Action items extraction error:", error);
      throw new ApiError(500, `Action items extraction failed: ${error.message}`);
    }
  }

  static async analyzeSentiment(transcriptText: string) {
    const openai = getClient();

    try {
      console.log("😊 Analyzing sentiment");
      const prompt = `Analyze the sentiment of this transcript:
Transcript: ${transcriptText}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Always return a JSON object with keys: overallSentiment, keyIndicators, engagementLevel." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || "{}";
      return JSON.parse(content);
    } catch (error: any) {
      console.error("Sentiment analysis error:", error);
      throw new ApiError(500, `Sentiment analysis failed: ${error.message}`);
    }
  }
}

export default AIService;
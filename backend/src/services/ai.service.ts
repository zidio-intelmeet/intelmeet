import { getOpenAI } from "../configs/openai";
import Transcript from "../models/transcript.model";
import Meeting from "../models/meeting.model";
import { ApiError } from "../utils/api-error";

export class AIService {
  /**
   * Transcribe audio using OpenAI Whisper
   */
  static async transcribeAudio(audioBuffer: Buffer, fileName: string) {
    const openai = getOpenAI();
    if (!openai) {
      throw new ApiError(503, "AI service is not configured");
    }

    try {
      // Note: In production, you'd send the actual audio file
      // For now, we're accepting pre-transcribed text from the frontend
      console.log("🎤 Transcribing audio:", fileName);

      // This would be called with actual audio data
      // const response = await openai.audio.transcriptions.create({
      //   file: audioBuffer,
      //   model: "whisper-1",
      //   language: "en",
      // });

      // Placeholder response
      return {
        text: "Placeholder transcription - implement with actual audio",
        duration: 0,
      };
    } catch (error: any) {
      console.error("Transcription error:", error);
      throw new ApiError(500, `Transcription failed: ${error.message}`);
    }
  }

  /**
   * Generate meeting summary using GPT-4
   */
  static async generateSummary(
    meetingId: string,
    transcriptText: string,
    tenantId: string
  ) {
    const openai = getOpenAI();
    if (!openai) {
      throw new ApiError(503, "AI service is not configured");
    }

    try {
      console.log("📝 Generating summary for meeting:", meetingId);

      const prompt = `You are an expert meeting summarizer. Create a concise, professional summary of the following meeting transcript. Include key discussion points, decisions made, and overall outcomes.

Transcript:
${transcriptText}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Discussion Points (bullet points)
3. Decisions Made (bullet points)
4. Next Steps (bullet points)`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional meeting summarizer. Provide clear, actionable summaries.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const summary =
        response.choices[0]?.message?.content || "Unable to generate summary";

      // Save summary to meeting
      await Meeting.findByIdAndUpdate(meetingId, {
        $set: {
          summary,
          status: "Completed",
        },
      });

      return summary;
    } catch (error: any) {
      console.error("Summary generation error:", error);
      throw new ApiError(500, `Summary generation failed: ${error.message}`);
    }
  }

  /**
   * Extract action items from transcript
   */
  static async extractActionItems(
    meetingId: string,
    transcriptText: string,
    tenantId: string
  ) {
    const openai = getOpenAI();
    if (!openai) {
      throw new ApiError(503, "AI service is not configured");
    }

    try {
      console.log("✅ Extracting action items for meeting:", meetingId);

      const prompt = `Extract all action items, tasks, and assignments from this meeting transcript. For each action item, identify:
1. The specific task/action
2. Who it's assigned to (if mentioned)
3. The deadline (if mentioned)

Transcript:
${transcriptText}

Respond with a JSON array of objects with fields: title, assignedTo, deadline, priority`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at extracting action items from meeting transcripts. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "[]";

      // Parse JSON response
      let actionItems = [];
      try {
        // Extract JSON from response (in case of markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        actionItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (parseError) {
        console.error("Error parsing action items JSON:", parseError);
        actionItems = [];
      }

      // Save action items to meeting
      await Meeting.findByIdAndUpdate(meetingId, {
        $set: {
          actionItems,
        },
      });

      return actionItems;
    } catch (error: any) {
      console.error("Action items extraction error:", error);
      throw new ApiError(
        500,
        `Action items extraction failed: ${error.message}`
      );
    }
  }

  /**
   * Generate sentiment analysis for meeting
   */
  static async analyzeSentiment(transcriptText: string) {
    const openai = getOpenAI();
    if (!openai) {
      throw new ApiError(503, "AI service is not configured");
    }

    try {
      console.log("😊 Analyzing sentiment");

      const prompt = `Analyze the sentiment and tone of this meeting transcript. Provide:
1. Overall sentiment (positive, neutral, or negative)
2. Key emotional indicators
3. Team engagement level (high, medium, low)

Transcript:
${transcriptText}

Respond with a JSON object.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || "{}";

      let sentiment = {};
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        sentiment = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (parseError) {
        console.error("Error parsing sentiment JSON:", parseError);
      }

      return sentiment;
    } catch (error: any) {
      console.error("Sentiment analysis error:", error);
      throw new ApiError(500, `Sentiment analysis failed: ${error.message}`);
    }
  }
}

export default AIService;

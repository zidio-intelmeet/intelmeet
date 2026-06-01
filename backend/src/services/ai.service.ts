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
      if (process.env.NODE_ENV === "development") console.log("🎤 Transcribing audio:", fileName);
      return {
        text: "Placeholder transcription - implement with actual audio",
        duration: 0,
      };
    } catch (error: any) {
      console.error("Transcription error:", error);
      throw new ApiError(500, `Transcription failed: ${error.message}`);
    }
  }

  static async generateSummaryFallback(meetingId: string, transcriptText: string): Promise<string> {
    if (process.env.NODE_ENV === "development") console.log("📝 Generating smart fallback summary for meeting:", meetingId);
    
    // Parse transcript to extract real content
    const lines = (transcriptText || "").split('\n').filter((l: string) => l.trim());
    const hasContent = lines.length > 0 && transcriptText !== "No voice or chat activity detected.";
    
    // Extract unique speakers
    const speakerSet = new Set<string>();
    const speakerMessages: Record<string, string[]> = {};
    for (const line of lines) {
      const match = line.match(/^(?:\[.*?\]\s*)?(.+?):\s*(.+)$/);
      if (match) {
        const speaker = match[1].trim();
        const message = match[2].trim();
        speakerSet.add(speaker);
        if (!speakerMessages[speaker]) speakerMessages[speaker] = [];
        speakerMessages[speaker].push(message);
      }
    }
    const speakers = Array.from(speakerSet);
    
    // Build discussion points from actual messages
    const discussionPoints = hasContent
      ? lines.slice(0, 8).map((line: string) => `- ${line}`)
      : ["- No active discussion recorded in this meeting."];
    
    // Extract potential action items from messages containing action words
    const actionWords = ["need to", "should", "will", "let's", "must", "going to", "plan to", "have to", "make sure", "follow up", "action"];
    const decisions: string[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (actionWords.some(w => lower.includes(w)) && decisions.length < 4) {
        const match = line.match(/^(?:\[.*?\]\s*)?(.+?):\s*(.+)$/);
        decisions.push(match ? match[2].trim() : line.trim());
      }
    }
    
    const participantInfo = speakers.length > 0 
      ? `The meeting included ${speakers.length} participant${speakers.length > 1 ? 's' : ''}: ${speakers.join(', ')}.`
      : "No participants were recorded.";
    
    const summary = hasContent
      ? `### Executive Summary
${participantInfo} A total of ${lines.length} message${lines.length !== 1 ? 's were' : ' was'} exchanged during the meeting.

### Key Discussion Points
${discussionPoints.join('\n')}

### Decisions Made
${decisions.length > 0 ? decisions.map(d => `- ${d}`).join('\n') : "- No specific decisions were identified from the conversation."}

### Next Steps
${decisions.length > 0 ? decisions.slice(0, 3).map(d => `- Follow up on: ${d}`).join('\n') : "- Review the meeting transcript for any pending items."}`
      : `### Executive Summary
No conversation was recorded during this meeting. The transcript is empty.

### Key Discussion Points
- No discussion points available.

### Decisions Made
- No decisions were made.

### Next Steps
- No follow-up items identified.`;

    await Meeting.findByIdAndUpdate(meetingId, {
      $set: { summary },
    });

    return summary;
  }

  static async generateSummary(meetingId: string, transcriptText: string, tenantId: string) {
    if (!process.env.OPENAI_API_KEY) {
      return this.generateSummaryFallback(meetingId, transcriptText);
    }

    try {
      const openai = getClient();
      if (process.env.NODE_ENV === "development") console.log("📝 Generating summary for meeting:", meetingId);
      const prompt = `You are an expert meeting summarizer. Create a concise, professional summary of the following meeting transcript. 
Transcript: ${transcriptText}

CRITICAL INSTRUCTIONS:
- ONLY summarize what was actually discussed in the transcript.
- Do NOT invent, hallucinate, or add any generic meeting topics (like "project alignment" or "status review") if they are not explicitly in the transcript.
- If the transcript is very short or lacks meaningful discussion, state "No significant discussion recorded." for the summary and points.
- Please provide exactly these sections: 1. Executive Summary 2. Key Discussion Points 3. Decisions Made 4. Next Steps`;

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
      console.warn("Summary generation error (using fallback):", error);
      return this.generateSummaryFallback(meetingId, transcriptText);
    }
  }

  static async extractActionItemsFallback(meetingId: string, transcriptText: string): Promise<any[]> {
    if (process.env.NODE_ENV === "development") console.log("✅ Extracting smart fallback action items for meeting:", meetingId);
    
    // Parse transcript to find action-oriented statements
    const lines = (transcriptText || "").split('\n').filter((l: string) => l.trim());
    const actionWords = ["need to", "should", "will", "let's", "must", "going to", "plan to", "have to", "make sure", "follow up", "action", "todo", "task", "assign", "deadline", "complete", "finish", "deliver", "review", "check", "update", "fix", "implement", "create", "build", "set up", "prepare", "schedule"];
    
    const actionItems: { title: string; assignedTo: string; deadline: string; priority: string }[] = [];
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (actionWords.some(w => lower.includes(w)) && actionItems.length < 6) {
        const match = line.match(/^(?:\[.*?\]\s*)?(.+?):\s*(.+)$/);
        const speaker = match ? match[1].trim() : "Team";
        const content = match ? match[2].trim() : line.trim();
        
        // Skip very short or generic messages
        if (content.length < 10) continue;
        
        actionItems.push({
          title: content,
          assignedTo: speaker,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: lower.includes("urgent") || lower.includes("must") || lower.includes("critical") ? "High" : "Medium"
        });
      }
    }
    
    // If no action items found from content, provide a helpful message
    if (actionItems.length === 0 && lines.length > 0) {
      actionItems.push({
        title: "Review meeting transcript and identify follow-up items",
        assignedTo: "Team",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: "Low"
      });
    }

    await Meeting.findByIdAndUpdate(meetingId, {
      $set: { actionItems },
    });

    return actionItems;
  }

  static async extractActionItems(meetingId: string, transcriptText: string, tenantId: string) {
    if (!process.env.OPENAI_API_KEY) {
      return this.extractActionItemsFallback(meetingId, transcriptText);
    }

    try {
      const openai = getClient();
      if (process.env.NODE_ENV === "development") console.log("✅ Extracting action items for meeting:", meetingId);
      const prompt = `Extract all action items from this transcript:
Transcript: ${transcriptText}

CRITICAL INSTRUCTIONS:
- ONLY extract action items that were explicitly mentioned in the transcript.
- Do NOT invent, hallucinate, or add any generic tasks (like "Verify WebRTC tracks" or "Configure deployment").
- If there are no concrete action items discussed, return an empty array for 'actionItems'.`;

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
      console.warn("Action items extraction error (using fallback):", error);
      return this.extractActionItemsFallback(meetingId, transcriptText);
    }
  }

  static async analyzeSentimentFallback(transcriptText: string) {
    if (process.env.NODE_ENV === "development") console.log("😊 Analyzing smart fallback sentiment");
    
    const lower = (transcriptText || "").toLowerCase();
    const positiveWords = ["great", "good", "excellent", "agree", "thanks", "awesome", "perfect", "happy", "love", "wonderful", "amazing", "helpful", "nice", "well done", "congrats", "appreciate"];
    const negativeWords = ["bad", "issue", "problem", "fail", "error", "wrong", "unfortunately", "difficult", "frustrated", "confused", "disagree", "blocked", "stuck", "broken", "worried"];
    
    let positiveCount = 0;
    let negativeCount = 0;
    const indicators: string[] = [];
    
    for (const word of positiveWords) {
      const count = (lower.match(new RegExp(word, 'g')) || []).length;
      positiveCount += count;
      if (count > 0) indicators.push(`Positive language: "${word}" mentioned ${count} time${count > 1 ? 's' : ''}`);
    }
    for (const word of negativeWords) {
      const count = (lower.match(new RegExp(word, 'g')) || []).length;
      negativeCount += count;
      if (count > 0) indicators.push(`Concern raised: "${word}" mentioned ${count} time${count > 1 ? 's' : ''}`);
    }
    
    const lines = (transcriptText || "").split('\n').filter((l: string) => l.trim());
    const engagement = lines.length > 20 ? "High" : lines.length > 5 ? "Medium" : "Low";
    
    let sentiment = "Neutral";
    if (positiveCount > negativeCount * 2) sentiment = "Positive";
    else if (negativeCount > positiveCount * 2) sentiment = "Negative";
    else if (positiveCount > negativeCount) sentiment = "Mostly Positive";
    else if (negativeCount > positiveCount) sentiment = "Mixed";
    
    return {
      overallSentiment: sentiment,
      keyIndicators: indicators.length > 0 ? indicators.slice(0, 5) : ["Meeting content analyzed"],
      engagementLevel: engagement
    };
  }

  static async analyzeSentiment(transcriptText: string) {
    if (!process.env.OPENAI_API_KEY) {
      return this.analyzeSentimentFallback(transcriptText);
    }

    try {
      const openai = getClient();
      if (process.env.NODE_ENV === "development") console.log("😊 Analyzing sentiment");
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
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error("Sentiment JSON parse error:", parseError);
        return this.analyzeSentimentFallback(transcriptText);
      }
    } catch (error: any) {
      console.warn("Sentiment analysis error (using fallback):", error);
      return this.analyzeSentimentFallback(transcriptText);
    }
  }
}

export default AIService;
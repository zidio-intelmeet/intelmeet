import { OpenAI } from "openai";
import env from "./env";

let openai: OpenAI | null = null;

export const initOpenAI = () => {
  if (openai) return openai;

  if (!env.OPENAI_API_KEY) {
    console.warn("⚠️  OPENAI_API_KEY not set - AI features will be disabled");
    return null;
  }

  openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  console.log("✅ OpenAI client initialized");
  return openai;
};

export const getOpenAI = () => openai;

export default openai;

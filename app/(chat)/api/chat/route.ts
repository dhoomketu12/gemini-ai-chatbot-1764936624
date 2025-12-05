import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "@/db/queries";
import { callGeminiWithSearch } from "@/lib/gemini-search";
// Removed unused generateUUID import

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const result = await streamText({
    model: geminiProModel,
    system: `You are an intelligent and engaging AI assistant powered by Google's Gemini 3 Pro model.
      
      Your capabilities:
      - Provide thoughtful, detailed, and insightful responses on any topic
      - Access to Google Search for current, accurate information
      - Help with analysis, research, and creative problem-solving
      - Assist with writing, coding, and innovative thinking
      - Explain complex concepts using analogies and examples
      - Use available tools when helpful (like Google Search for facts, weather data, etc.)
      
      Your personality:
      - Be enthusiastic and engaging in your responses
      - Use vivid language, analogies, and examples to make concepts clear
      - Show genuine interest in helping users understand topics deeply
      - Be creative and thoughtful, not just factual
      - Express ideas in a natural, conversational way
      
      Guidelines:
      - Provide comprehensive, well-explained answers (don't be overly brief)
      - Today's date is ${new Date().toLocaleDateString()}
      - If you don't know something, say so honestly
      - Be helpful, harmless, and honest
      - Make learning enjoyable and interesting
      `,
    messages: coreMessages,
    temperature: 0.9,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: 'high',
        },
        structuredOutputs: false,  // Disable to prevent JSON escaping of newlines
      },
    },
    tools: {
      googleSearch: {
        description: "Search the web using Google to find current, accurate information about any topic. Use this when you need up-to-date information, facts about specific companies/products, or current events.",
        parameters: z.object({
          query: z.string().describe("The search query to look up"),
        }),
        execute: async ({ query }) => {
          try {
            const result = await callGeminiWithSearch(query);
            return result;
          } catch (error) {
            console.error('Google Search error:', error);
            return "Sorry, I couldn't search for that information right now.";
          }
        },
      },
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
           );

          const weatherData = await response.json();
          return weatherData;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      // Save chat in background without blocking response
      if (session.user && session.user.id) {
        saveChat({
          id,
          messages: [...coreMessages, ...responseMessages],
          userId: session.user.id,
        }).catch((error) => {
          console.error("Failed to save chat:", error);
        });
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

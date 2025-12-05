import { google } from "@ai-sdk/google";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

export const geminiProModel = wrapLanguageModel({
  model: google("gemini-3-pro-preview"),
  middleware: customMiddleware,
});

export const geminiFlashModel = wrapLanguageModel({
  model: google("gemini-2.5-flash"),
  middleware: customMiddleware,
});

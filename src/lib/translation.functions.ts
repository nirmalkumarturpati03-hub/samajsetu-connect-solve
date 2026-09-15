import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { autoTranslateToEnglish, TranslationResult } from "./translation";

const TranslationInputSchema = z.object({
  text: z.string(),
  hintLangCode: z.string().optional(),
});

/**
 * Server function to securely translate regional speech or text to English.
 */
export const translateRegionalTextToEnglish = createServerFn({ method: "POST" })
  .validator((data: unknown) => TranslationInputSchema.parse(data))
  .handler(async ({ data }): Promise<TranslationResult> => {
    return await autoTranslateToEnglish(data.text, data.hintLangCode);
  });

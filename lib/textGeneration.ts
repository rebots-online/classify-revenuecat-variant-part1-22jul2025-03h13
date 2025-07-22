/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {
  FinishReason,
  GenerateContentConfig,
  GenerateContentParameters, // Corrected import
  GenerateContentResponse, // Corrected import
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  SafetySetting,
  GroundingMetadata,
} from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;

export interface TextGenerationInteraction {
  type: 'PROMPT' | 'RESPONSE' | 'ERROR';
  data: any; // The raw request for PROMPT, GenerateContentResponse for RESPONSE, or Error for ERROR
  modelName?: string;
}

export interface GenerateTextOptions {
  modelName: string;
  basePrompt: string; 
  videoUrl?: string; 
  additionalUserText?: string; 
  temperature?: number;
  safetySettings?: SafetySetting[];
  responseMimeType?: string;
  useGoogleSearch?: boolean; 
  onInteraction?: (interaction: TextGenerationInteraction) => void; // Added callback
}

export interface TextGenerationResponse { // This remains for the function's return type
  text: string;
  groundingMetadata?: GroundingMetadata;
}

/**
 * Generate text content using the Gemini API.
 *
 * @param options - Configuration options for the generation request.
 * @returns The response text and optional grounding metadata from the Gemini API.
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<TextGenerationResponse> {
  const {
    modelName,
    basePrompt,
    videoUrl,
    additionalUserText,
    temperature = 0.75,
    safetySettings,
    responseMimeType,
    useGoogleSearch = false,
    onInteraction, // Destructure callback
  } = options;

  if (!GEMINI_API_KEY) {
    const error = new Error('Gemini API key is missing or empty');
    if (onInteraction) {
      onInteraction({type: 'ERROR', data: error, modelName});
    }
    throw error;
  }

  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  const parts: Part[] = [{text: basePrompt}];

  if (additionalUserText) {
    parts.push({text: additionalUserText});
  }

  if (videoUrl) {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4', 
          fileUri: videoUrl,
        },
      });
    } catch (error) {
      console.error('Error processing video input:', error);
      const err = new Error(`Failed to process video input from URL: ${videoUrl}`);
      if (onInteraction) {
        onInteraction({type: 'ERROR', data: err, modelName});
      }
      throw err;
    }
  }
  
  const baseConfig: GenerateContentConfig = {
    temperature,
  };

  if (!useGoogleSearch && responseMimeType) {
    baseConfig.responseMimeType = responseMimeType;
  }
  
  if (safetySettings) {
    baseConfig.safetySettings = safetySettings;
  }

  if (useGoogleSearch) {
    baseConfig.tools = [{googleSearch: {}}];
  }
  
  const request: GenerateContentParameters = { 
    model: modelName,
    contents: [{role: 'user', parts}],
    config: baseConfig,
  };


  if (onInteraction) {
    onInteraction({type: 'PROMPT', data: request, modelName});
  }

  try {
    const genAiResponse: GenerateContentResponse = await ai.models.generateContent(request); 

    if (onInteraction) {
      onInteraction({type: 'RESPONSE', data: genAiResponse, modelName});
    }

    if (genAiResponse.promptFeedback?.blockReason) {
      throw new Error(
        `Content generation failed: Prompt blocked (reason: ${genAiResponse.promptFeedback.blockReason})`,
      );
    }

    if (!genAiResponse.candidates || genAiResponse.candidates.length === 0) {
      if (genAiResponse.promptFeedback?.blockReason) {
         throw new Error(
          `Content generation failed: No candidates returned. Prompt feedback: ${genAiResponse.promptFeedback.blockReason}`,
        );
      }
      throw new Error('Content generation failed: No candidates returned.');
    }

    const firstCandidate = genAiResponse.candidates[0];

    if (
      firstCandidate.finishReason &&
      firstCandidate.finishReason !== FinishReason.STOP
    ) {
      if (firstCandidate.finishReason === FinishReason.SAFETY) {
        console.error('Safety ratings:', firstCandidate.safetyRatings);
        throw new Error(
          'Content generation failed: Response blocked due to safety settings.',
        );
      } else {
        throw new Error(
          `Content generation failed: Stopped due to ${firstCandidate.finishReason}.`,
        );
      }
    }
    
    return {
        text: genAiResponse.text, 
        groundingMetadata: firstCandidate.groundingMetadata,
    };

  } catch (error) {
    console.error(
      'An error occurred during Gemini API call or response processing:',
      error,
    );
    if (onInteraction) {
      onInteraction({type: 'ERROR', data: error, modelName});
    }
     if (error instanceof Error && error.message.includes("application/json") && error.message.includes("tool")) {
        throw new Error(`API Error: ${error.message}. Note: JSON response type is not supported with Google Search tool.`);
    }
    throw error;
  }
}

/**
 * Interface for the object returned by `generateTextStream`.
 * The caller can iterate over `stream` for real-time updates and `await response`
 * for the final aggregated response.
 */
export interface StreamResult {
  stream: AsyncGenerator<GenerateContentResponse, any, unknown>;
  response: Promise<GenerateContentResponse>;
}

/**
 * Generate text content using the Gemini API with streaming.
 *
 * This function is designed to bridge the gap between the new SDK's stream-only response
 * and the application's need for both a stream and a final promise.
 *
 * @param options - Configuration options for the generation request.
 * @returns A promise that resolves to a `StreamResult` object.
 */
export async function generateTextStream(
  options: GenerateTextOptions,
): Promise<StreamResult> {
  const {
    modelName,
    basePrompt,
    videoUrl,
    additionalUserText,
    temperature = 0.75,
    safetySettings,
    responseMimeType,
    useGoogleSearch = false,
    onInteraction,
  } = options;

  if (!GEMINI_API_KEY) {
    const error = new Error('Gemini API key is missing or empty');
    if (onInteraction) {
      onInteraction({ type: 'ERROR', data: error, modelName });
    }
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const parts: Part[] = [{ text: basePrompt }];

  if (additionalUserText) {
    parts.push({ text: additionalUserText });
  }

  if (videoUrl) {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4',
          fileUri: videoUrl,
        },
      });
    } catch (error) {
      console.error('Error processing video input:', error);
      const err = new Error(`Failed to process video input from URL: ${videoUrl}`);
      if (onInteraction) {
        onInteraction({ type: 'ERROR', data: err, modelName });
      }
      throw err;
    }
  }

  const baseConfig: GenerateContentConfig = {
    temperature,
  };

  if (!useGoogleSearch && responseMimeType) {
    baseConfig.responseMimeType = responseMimeType;
  }

  if (safetySettings) {
    baseConfig.safetySettings = safetySettings;
  }

  if (useGoogleSearch) {
    baseConfig.tools = [{ googleSearch: {} }];
  }

  const request: GenerateContentParameters = {
    model: modelName,
    contents: [{ role: 'user', parts }],
    config: baseConfig,
  };

  if (onInteraction) {
    onInteraction({ type: 'PROMPT', data: request, modelName });
  }

  try {
    const stream = await ai.models.generateContentStream(request);

    let resolver: (
      value: GenerateContentResponse | PromiseLike<GenerateContentResponse>,
    ) => void;
    let rejector: (reason?: any) => void;

    const responsePromise = new Promise<GenerateContentResponse>(
      (resolve, reject) => {
        resolver = resolve;
        rejector = reject;
      },
    );

    async function* streamWrapper() {
      const aggregatedChunks: GenerateContentResponse[] = [];
      try {
        for await (const chunk of stream) {
          aggregatedChunks.push(chunk);
          yield chunk;
        }

        if (aggregatedChunks.length === 0) {
          const emptyResponse: GenerateContentResponse = {
            candidates: [],
            promptFeedback: undefined,
            text: '',
            data: {},
            functionCalls: undefined,
            executableCode: undefined,
            codeExecutionResult: undefined,
          };
          resolver(emptyResponse);
          return;
        }

        const lastChunk = aggregatedChunks[aggregatedChunks.length - 1];
        const fullText = aggregatedChunks.map(c => c.text).join('');

        // Create a final response object by combining properties from the last chunk
        // with the aggregated text. This avoids potential issues from JSON.stringify
        // on complex class instances.
        const finalResponse: GenerateContentResponse = Object.assign(
          {},
          lastChunk,
          { text: fullText },
        );

        if (onInteraction) {
          onInteraction({ type: 'RESPONSE', data: finalResponse, modelName });
        }
        resolver(finalResponse);
      } catch (error) {
        if (onInteraction) {
          onInteraction({ type: 'ERROR', data: error, modelName });
        }
        rejector(error);
      }
    }

    return {
      stream: streamWrapper(),
      response: responsePromise,
    };
  } catch (error) {
    console.error('An error occurred during Gemini API stream call:', error);
    if (onInteraction) {
      onInteraction({ type: 'ERROR', data: error, modelName });
    }
    if (
      error instanceof Error &&
      error.message.includes('application/json') &&
      error.message.includes('tool')
    ) {
      throw new Error(
        `API Error: ${error.message}. Note: JSON response type is not supported with Google Search tool.`,
      );
    }
    throw error;
  }
}
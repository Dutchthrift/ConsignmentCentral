import OpenAI from "openai";
import { MlTrainingExample, MlModelConfig, MlTrainingSession } from "@shared/schema";
import { storage } from "../storage";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

/**
 * Formats training examples for OpenAI fine-tuning
 * @param examples List of training examples
 * @returns Formatted examples ready for OpenAI fine-tuning API
 */
export async function formatTrainingExamples(examples: MlTrainingExample[]): Promise<any[]> {
  return examples.map(example => {
    // Create a training example in the format OpenAI expects
    const messages = [
      {
        role: "system",
        content: "You are a product analysis expert that identifies product details from images and descriptions."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product image and provide detailed information."
          },
          {
            type: "image_url",
            image_url: {
              url: example.imageUrl || `data:image/jpeg;base64,${example.imageData}`
            }
          }
        ]
      },
      {
        role: "assistant",
        content: JSON.stringify({
          productType: example.productType,
          brand: example.brand,
          model: example.model,
          condition: example.condition,
          estimatedValue: example.marketValue ? example.marketValue / 100 : null, // Convert from cents to euros
        })
      }
    ];

    return { messages };
  });
}

/**
 * Creates a fine-tuning job with OpenAI
 * @param modelConfig The model configuration
 * @param trainingExamples List of training examples
 * @returns The created OpenAI fine-tuning job
 */
export async function createFineTuningJob(
  modelConfig: MlModelConfig,
  trainingExamples: MlTrainingExample[]
): Promise<any> {
  try {
    // Format the training examples
    const formattedExamples = await formatTrainingExamples(trainingExamples);

    // Create training file
    const file = await openai.files.create({
      file: new Blob([JSON.stringify(formattedExamples)], {
        type: "application/jsonl",
      }),
      purpose: "fine-tuning",
    });

    // Create fine-tuning job
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: modelConfig.baseModel || DEFAULT_MODEL,
      hyperparameters: {
        n_epochs: modelConfig.trainingParams?.epochs || 3,
      },
      suffix: modelConfig.name.toLowerCase().replace(/\s+/g, "-"),
    });

    // Create a training session record
    const trainingSession = await storage.createMlTrainingSession({
      modelConfigId: modelConfig.id,
      status: "training",
      trainingExampleCount: trainingExamples.length,
      validationExampleCount: 0,
      notes: `Fine-tuning job created with ID: ${fineTuningJob.id}`,
      resultData: fineTuningJob
    });

    // Update the model config with the OpenAI model ID
    await storage.updateMlModelConfig(modelConfig.id, {
      modelId: fineTuningJob.id
    });

    return { fineTuningJob, trainingSession };
  } catch (error) {
    console.error("Error creating fine-tuning job:", error);
    throw error;
  }
}

/**
 * Checks the status of a fine-tuning job
 * @param jobId The OpenAI fine-tuning job ID
 * @returns The status and details of the fine-tuning job
 */
export async function checkFineTuningStatus(jobId: string): Promise<any> {
  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    
    // Find the corresponding training session and model config
    const modelConfig = await storage.getMlModelConfigByModelId(jobId);
    
    if (!modelConfig) {
      throw new Error(`No model config found for job ID: ${jobId}`);
    }
    
    const trainingSessions = await storage.getMlTrainingSessionsByModelConfigId(modelConfig.id);
    const trainingSession = trainingSessions[0]; // Assuming one session per model config
    
    if (!trainingSession) {
      throw new Error(`No training session found for model config ID: ${modelConfig.id}`);
    }
    
    // Update the training session with the latest status
    let status = "training";
    
    if (job.status === "succeeded") {
      status = "completed";
      
      // Update the model config with the fine-tuned model ID
      await storage.updateMlModelConfig(modelConfig.id, {
        modelId: job.fine_tuned_model,
        accuracy: calculateAccuracy(job),
      });
    } else if (job.status === "failed") {
      status = "failed";
    }
    
    // Update the training session
    await storage.updateMlTrainingSessionStatus(trainingSession.id, status, {
      resultData: job,
      trainingLoss: job.training_metrics?.loss.toString() || null,
      validationLoss: job.validation_metrics?.loss.toString() || null,
    });
    
    return { job, trainingSession, modelConfig };
  } catch (error) {
    console.error("Error checking fine-tuning status:", error);
    throw error;
  }
}

/**
 * Calculate an accuracy score from fine-tuning metrics
 * @param job The OpenAI fine-tuning job
 * @returns An accuracy percentage (0-100)
 */
function calculateAccuracy(job: any): number {
  // This is a simplified estimation - in a real application, 
  // you would have a validation set and calculate true accuracy
  if (!job.validation_metrics?.loss) {
    return 0;
  }
  
  // Convert validation loss to an estimated accuracy percentage
  // Lower loss ~= higher accuracy, using a simple heuristic
  const loss = parseFloat(job.validation_metrics.loss);
  
  // Convert loss to accuracy (0-100 scale)
  // This is an arbitrary conversion for demonstration
  const estimatedAccuracy = Math.max(0, Math.min(100, Math.round(100 * (1 - loss / 2))));
  
  return estimatedAccuracy;
}

/**
 * Makes a prediction using a fine-tuned model
 * @param modelConfig The model configuration
 * @param imageUrl The URL of the image to analyze
 * @param imageData Base64 encoded image data (alternative to URL)
 * @returns Product analysis prediction
 */
export async function predictWithFineTunedModel(
  modelConfig: MlModelConfig,
  imageUrl?: string | null,
  imageData?: string | null
): Promise<any> {
  if (!modelConfig.modelId) {
    throw new Error("Model ID not available for fine-tuned model");
  }
  
  if (!imageUrl && !imageData) {
    throw new Error("Either image URL or image data must be provided");
  }
  
  try {
    // Determine which model to use
    const model = modelConfig.modelId.startsWith("ft:") 
      ? modelConfig.modelId // Fine-tuned model ID
      : modelConfig.baseModel || DEFAULT_MODEL; // Fall back to base model
    
    // Prepare image content
    const imageContent = imageUrl 
      ? { url: imageUrl }
      : { url: `data:image/jpeg;base64,${imageData}` };
    
    // Make prediction
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a product analysis expert that identifies product details from images and descriptions."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and provide detailed information in JSON format with productType, brand, model, condition, and estimatedValue fields."
            },
            {
              type: "image_url",
              image_url: imageContent
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const prediction = JSON.parse(response.choices[0].message.content);
    return prediction;
  } catch (error) {
    console.error("Error making prediction with fine-tuned model:", error);
    throw error;
  }
}
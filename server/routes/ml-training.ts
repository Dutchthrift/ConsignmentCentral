import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { 
  createFineTuningJob, 
  checkFineTuningStatus, 
  predictWithFineTunedModel 
} from "../services/openai-finetuning.service";

const router = Router();

// ===== ML TRAINING EXAMPLE ROUTES =====

/**
 * Get all ML training examples
 */
router.get("/examples", async (_req: Request, res: Response) => {
  try {
    const examples = await storage.getAllMlTrainingExamples();
    res.json({ success: true, data: examples });
  } catch (error) {
    console.error("Error fetching ML training examples:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML training examples" });
  }
});

/**
 * Get a specific ML training example by ID
 */
router.get("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const example = await storage.getMlTrainingExampleById(id);
    if (!example) {
      return res.status(404).json({ success: false, error: "ML training example not found" });
    }

    res.json({ success: true, data: example });
  } catch (error) {
    console.error("Error fetching ML training example:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML training example" });
  }
});

/**
 * Create a new ML training example
 */
router.post("/examples", async (req: Request, res: Response) => {
  try {
    const { productType, brand, model, condition, marketValue, imageUrl, isVerified } = req.body;

    // Validate required fields
    if (!productType) {
      return res.status(400).json({ success: false, error: "Product type is required" });
    }

    // Create the training example
    const example = await storage.createMlTrainingExample({
      itemId: null,
      productType,
      brand: brand || null,
      model: model || null,
      condition: condition || null,
      marketValue: marketValue || null,
      imageUrl: imageUrl || null,
      imageData: null,
      isVerified: isVerified || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ success: true, data: example });
  } catch (error) {
    console.error("Error creating ML training example:", error);
    res.status(500).json({ success: false, error: "Failed to create ML training example" });
  }
});

/**
 * Update an existing ML training example
 */
router.patch("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const updates = req.body;
    const updatedExample = await storage.updateMlTrainingExample(id, updates);

    if (!updatedExample) {
      return res.status(404).json({ success: false, error: "ML training example not found" });
    }

    res.json({ success: true, data: updatedExample });
  } catch (error) {
    console.error("Error updating ML training example:", error);
    res.status(500).json({ success: false, error: "Failed to update ML training example" });
  }
});

/**
 * Delete a ML training example
 */
router.delete("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const deleted = await storage.deleteMlTrainingExample(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "ML training example not found" });
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting ML training example:", error);
    res.status(500).json({ success: false, error: "Failed to delete ML training example" });
  }
});

/**
 * Get verified ML training examples
 */
router.get("/examples/verified", async (_req: Request, res: Response) => {
  try {
    const examples = await storage.getVerifiedMlTrainingExamples();
    res.json({ success: true, data: examples });
  } catch (error) {
    console.error("Error fetching verified ML training examples:", error);
    res.status(500).json({ success: false, error: "Failed to fetch verified ML training examples" });
  }
});

/**
 * Get ML training examples by product type
 */
router.get("/examples/product-type/:type", async (req: Request, res: Response) => {
  try {
    const productType = req.params.type;
    const examples = await storage.getMlTrainingExamplesByProductType(productType);
    res.json({ success: true, data: examples });
  } catch (error) {
    console.error("Error fetching ML training examples by product type:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML training examples by product type" });
  }
});

// ===== ML MODEL CONFIG ROUTES =====

/**
 * Get all ML model configurations
 */
router.get("/models", async (_req: Request, res: Response) => {
  try {
    const models = await storage.getAllMlModelConfigs();
    res.json({ success: true, data: models });
  } catch (error) {
    console.error("Error fetching ML model configs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML model configs" });
  }
});

/**
 * Get a specific ML model configuration by ID
 */
router.get("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const model = await storage.getMlModelConfigById(id);
    if (!model) {
      return res.status(404).json({ success: false, error: "ML model config not found" });
    }

    res.json({ success: true, data: model });
  } catch (error) {
    console.error("Error fetching ML model config:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML model config" });
  }
});

/**
 * Create a new ML model configuration
 */
router.post("/models", async (req: Request, res: Response) => {
  try {
    const { name, description, baseModel, specialization, trainingParams } = req.body;

    // Validate required fields
    if (!name || !baseModel || !specialization) {
      return res.status(400).json({ 
        success: false, 
        error: "Name, base model, and specialization are required" 
      });
    }

    // Create the model configuration
    const model = await storage.createMlModelConfig({
      name,
      description: description || null,
      modelId: null,
      baseModel,
      trainingParams: trainingParams || { epochs: 3 },
      specialization,
      accuracy: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ success: true, data: model });
  } catch (error) {
    console.error("Error creating ML model config:", error);
    res.status(500).json({ success: false, error: "Failed to create ML model config" });
  }
});

/**
 * Update an existing ML model configuration
 */
router.patch("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const updates = req.body;
    const updatedModel = await storage.updateMlModelConfig(id, updates);

    if (!updatedModel) {
      return res.status(404).json({ success: false, error: "ML model config not found" });
    }

    res.json({ success: true, data: updatedModel });
  } catch (error) {
    console.error("Error updating ML model config:", error);
    res.status(500).json({ success: false, error: "Failed to update ML model config" });
  }
});

/**
 * Set a ML model configuration as active or inactive
 */
router.post("/models/:id/active", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ success: false, error: "Active status must be a boolean" });
    }

    // If setting a model to active, deactivate all other models
    if (active) {
      const allModels = await storage.getAllMlModelConfigs();
      for (const model of allModels) {
        if (model.id !== id && model.isActive) {
          await storage.setMlModelConfigActive(model.id, false);
        }
      }
    }

    const updatedModel = await storage.setMlModelConfigActive(id, active);
    if (!updatedModel) {
      return res.status(404).json({ success: false, error: "ML model config not found" });
    }

    res.json({ success: true, data: updatedModel });
  } catch (error) {
    console.error("Error updating ML model config active status:", error);
    res.status(500).json({ success: false, error: "Failed to update ML model config active status" });
  }
});

// ===== ML TRAINING SESSION ROUTES =====

/**
 * Get all ML training sessions
 */
router.get("/sessions", async (_req: Request, res: Response) => {
  try {
    const sessions = await storage.getAllMlTrainingSessions();
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error fetching ML training sessions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML training sessions" });
  }
});

/**
 * Get a specific ML training session by ID
 */
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const session = await storage.getMlTrainingSessionById(id);
    if (!session) {
      return res.status(404).json({ success: false, error: "ML training session not found" });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error("Error fetching ML training session:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ML training session" });
  }
});

// ===== FINE-TUNING ROUTES =====

/**
 * Start a fine-tuning job
 */
router.post("/fine-tune", async (req: Request, res: Response) => {
  try {
    const { modelConfigId, exampleIds } = req.body;

    // Validate required fields
    if (!modelConfigId || !exampleIds || !Array.isArray(exampleIds) || exampleIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Model config ID and at least one example ID are required" 
      });
    }

    // Get the model configuration
    const modelConfig = await storage.getMlModelConfigById(modelConfigId);
    if (!modelConfig) {
      return res.status(404).json({ success: false, error: "ML model config not found" });
    }

    // Get the training examples
    const trainingExamples = [];
    for (const id of exampleIds) {
      const example = await storage.getMlTrainingExampleById(id);
      if (example) {
        trainingExamples.push(example);
      }
    }

    if (trainingExamples.length === 0) {
      return res.status(400).json({ success: false, error: "No valid training examples found" });
    }

    // Create a new training session
    const session = await storage.createMlTrainingSession({
      modelConfigId,
      startedAt: new Date(),
      completedAt: null,
      status: "pending",
      trainingExampleCount: trainingExamples.length,
      validationExampleCount: 0,
      trainingLoss: null,
      validationLoss: null,
      notes: null,
      resultData: null,
    });

    // Start the fine-tuning job
    const fineTuningJob = await createFineTuningJob(modelConfig, trainingExamples);

    // Update the session with the fine-tuning job details
    await storage.updateMlTrainingSessionStatus(session.id, "training", {
      resultData: { fineTuningJob },
    });

    res.status(201).json({ 
      success: true, 
      data: { 
        session: { ...session, status: "training", resultData: { fineTuningJob } }
      } 
    });
  } catch (error) {
    console.error("Error starting fine-tuning job:", error);
    res.status(500).json({ success: false, error: "Failed to start fine-tuning job" });
  }
});

/**
 * Check the status of a fine-tuning job
 */
router.get("/fine-tune/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Find the training session with this job ID
    const sessions = await storage.getAllMlTrainingSessions();
    const session = sessions.find(s => 
      s.resultData?.fineTuningJob?.id === jobId
    );

    if (!session) {
      return res.status(404).json({ success: false, error: "Training session not found for this job ID" });
    }

    // Check the status
    const result = await checkFineTuningStatus(jobId);

    // Update the session based on the job status
    if (result.job.status === "succeeded") {
      const modelConfig = await storage.getMlModelConfigById(session.modelConfigId);
      if (modelConfig) {
        // Update the model with the fine-tuned model ID
        await storage.updateMlModelConfig(modelConfig.id, {
          modelId: result.job.fine_tuned_model,
          accuracy: result.accuracy,
          updatedAt: new Date(),
        });
      }

      // Update the session as completed
      await storage.updateMlTrainingSessionStatus(session.id, "completed", {
        completedAt: new Date(),
        trainingLoss: result.job.training_metrics?.train_loss,
        validationLoss: result.job.validation_metrics?.validation_loss,
        resultData: { fineTuningJob: result.job },
      });
    } else if (result.job.status === "failed") {
      // Update the session as failed
      await storage.updateMlTrainingSessionStatus(session.id, "failed", {
        completedAt: new Date(),
        notes: result.job.error?.message || "Fine-tuning failed",
        resultData: { fineTuningJob: result.job },
      });
    } else {
      // Update the session with the latest job data
      await storage.updateMlTrainingSessionStatus(session.id, "training", {
        resultData: { fineTuningJob: result.job },
      });
    }

    // Get the updated session
    const updatedSession = await storage.getMlTrainingSessionById(session.id);

    res.json({ success: true, data: { jobStatus: result.job.status, session: updatedSession } });
  } catch (error) {
    console.error("Error checking fine-tuning status:", error);
    res.status(500).json({ success: false, error: "Failed to check fine-tuning status" });
  }
});

/**
 * Make a prediction using a fine-tuned model
 */
router.post("/predict", async (req: Request, res: Response) => {
  try {
    const { imageUrl, imageData } = req.body;

    // Validate input
    if (!imageUrl && !imageData) {
      return res.status(400).json({ success: false, error: "Either imageUrl or imageData is required" });
    }

    // Get the active model configuration
    const modelConfig = await storage.getActiveMlModelConfig();
    if (!modelConfig) {
      return res.status(400).json({ success: false, error: "No active ML model configuration found" });
    }

    // Make a prediction
    const prediction = await predictWithFineTunedModel(modelConfig, imageUrl, imageData);

    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error("Error making prediction:", error);
    res.status(500).json({ success: false, error: "Failed to make prediction" });
  }
});

export default router;
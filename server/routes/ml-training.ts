import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { 
  createFineTuningJob, 
  checkFineTuningStatus, 
  predictWithFineTunedModel 
} from "../services/openai-finetuning.service";
import { ZodError } from "zod";
import { 
  insertMlTrainingExampleSchema,
  insertMlModelConfigSchema
} from "@shared/schema";

const router = Router();

// Get all training examples
router.get("/examples", async (_req: Request, res: Response) => {
  try {
    const examples = await storage.getAllMlTrainingExamples();
    return res.json({ 
      success: true, 
      data: examples 
    });
  } catch (error) {
    console.error("Error fetching training examples:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training examples" 
    });
  }
});

// Get training example by ID
router.get("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const example = await storage.getMlTrainingExampleById(id);
    
    if (!example) {
      return res.status(404).json({ 
        success: false, 
        error: "Training example not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      data: example 
    });
  } catch (error) {
    console.error("Error fetching training example:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training example" 
    });
  }
});

// Create a new training example
router.post("/examples", async (req: Request, res: Response) => {
  try {
    const exampleData = insertMlTrainingExampleSchema.parse(req.body);
    const newExample = await storage.createMlTrainingExample(exampleData);
    
    return res.status(201).json({ 
      success: true, 
      data: newExample 
    });
  } catch (error) {
    console.error("Error creating training example:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid training example data", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: "Failed to create training example" 
    });
  }
});

// Update a training example
router.patch("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const example = await storage.getMlTrainingExampleById(id);
    
    if (!example) {
      return res.status(404).json({ 
        success: false, 
        error: "Training example not found" 
      });
    }
    
    const updatedExample = await storage.updateMlTrainingExample(id, req.body);
    
    return res.json({ 
      success: true, 
      data: updatedExample 
    });
  } catch (error) {
    console.error("Error updating training example:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to update training example" 
    });
  }
});

// Delete a training example
router.delete("/examples/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteMlTrainingExample(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: "Training example not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      data: { message: "Training example deleted successfully" } 
    });
  } catch (error) {
    console.error("Error deleting training example:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to delete training example" 
    });
  }
});

// Get verified training examples
router.get("/examples/verified", async (_req: Request, res: Response) => {
  try {
    const examples = await storage.getVerifiedMlTrainingExamples();
    return res.json({ 
      success: true, 
      data: examples 
    });
  } catch (error) {
    console.error("Error fetching verified training examples:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch verified training examples" 
    });
  }
});

// Get training examples by product type
router.get("/examples/product-type/:type", async (req: Request, res: Response) => {
  try {
    const productType = req.params.type;
    const examples = await storage.getMlTrainingExamplesByProductType(productType);
    
    return res.json({ 
      success: true, 
      data: examples 
    });
  } catch (error) {
    console.error("Error fetching training examples by product type:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training examples by product type" 
    });
  }
});

// Get all model configs
router.get("/models", async (_req: Request, res: Response) => {
  try {
    const configs = await storage.getAllMlModelConfigs();
    return res.json({ 
      success: true, 
      data: configs 
    });
  } catch (error) {
    console.error("Error fetching model configs:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch model configs" 
    });
  }
});

// Get model config by ID
router.get("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const config = await storage.getMlModelConfigById(id);
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: "Model config not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      data: config 
    });
  } catch (error) {
    console.error("Error fetching model config:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch model config" 
    });
  }
});

// Create a new model config
router.post("/models", async (req: Request, res: Response) => {
  try {
    const configData = insertMlModelConfigSchema.parse(req.body);
    const newConfig = await storage.createMlModelConfig(configData);
    
    return res.status(201).json({ 
      success: true, 
      data: newConfig 
    });
  } catch (error) {
    console.error("Error creating model config:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid model config data", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: "Failed to create model config" 
    });
  }
});

// Update a model config
router.patch("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const config = await storage.getMlModelConfigById(id);
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: "Model config not found" 
      });
    }
    
    const updatedConfig = await storage.updateMlModelConfig(id, req.body);
    
    return res.json({ 
      success: true, 
      data: updatedConfig 
    });
  } catch (error) {
    console.error("Error updating model config:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to update model config" 
    });
  }
});

// Set a model config as active
router.post("/models/:id/active", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const config = await storage.getMlModelConfigById(id);
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: "Model config not found" 
      });
    }
    
    const active = req.body.active !== false; // Default to true if not specified
    const updatedConfig = await storage.setMlModelConfigActive(id, active);
    
    return res.json({ 
      success: true, 
      data: updatedConfig 
    });
  } catch (error) {
    console.error("Error setting model config active state:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to set model config active state" 
    });
  }
});

// Get all training sessions
router.get("/sessions", async (_req: Request, res: Response) => {
  try {
    const sessions = await storage.getAllMlTrainingSessions();
    return res.json({ 
      success: true, 
      data: sessions 
    });
  } catch (error) {
    console.error("Error fetching training sessions:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training sessions" 
    });
  }
});

// Get training session by ID
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const session = await storage.getMlTrainingSessionById(id);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: "Training session not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      data: session 
    });
  } catch (error) {
    console.error("Error fetching training session:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training session" 
    });
  }
});

// Start a fine-tuning job
router.post("/fine-tune", async (req: Request, res: Response) => {
  try {
    const { modelConfigId, exampleIds } = req.body;
    
    if (!modelConfigId || !exampleIds || !Array.isArray(exampleIds) || exampleIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Model config ID and at least one example ID are required" 
      });
    }
    
    // Get the model config and training examples
    const modelConfig = await storage.getMlModelConfigById(modelConfigId);
    
    if (!modelConfig) {
      return res.status(404).json({ 
        success: false, 
        error: "Model config not found" 
      });
    }
    
    const trainingExamples = [];
    
    for (const id of exampleIds) {
      const example = await storage.getMlTrainingExampleById(id);
      if (example) {
        trainingExamples.push(example);
      }
    }
    
    if (trainingExamples.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No valid training examples found" 
      });
    }
    
    // Create the fine-tuning job
    const result = await createFineTuningJob(modelConfig, trainingExamples);
    
    return res.status(201).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error("Error starting fine-tuning job:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to start fine-tuning job",
      details: error.message 
    });
  }
});

// Check the status of a fine-tuning job
router.get("/fine-tune/:jobId", async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const result = await checkFineTuningStatus(jobId);
    
    return res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error("Error checking fine-tuning status:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to check fine-tuning status",
      details: error.message 
    });
  }
});

// Make a prediction using a fine-tuned model
router.post("/predict", async (req: Request, res: Response) => {
  try {
    const { modelConfigId, imageUrl, imageData } = req.body;
    
    if (!modelConfigId) {
      return res.status(400).json({ 
        success: false, 
        error: "Model config ID is required" 
      });
    }
    
    if (!imageUrl && !imageData) {
      return res.status(400).json({ 
        success: false, 
        error: "Either image URL or image data is required" 
      });
    }
    
    // Get the model config
    const modelConfig = await storage.getMlModelConfigById(modelConfigId);
    
    if (!modelConfig) {
      return res.status(404).json({ 
        success: false, 
        error: "Model config not found" 
      });
    }
    
    // Make the prediction
    const prediction = await predictWithFineTunedModel(modelConfig, imageUrl, imageData);
    
    return res.json({ 
      success: true, 
      data: prediction 
    });
  } catch (error) {
    console.error("Error making prediction:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to make prediction",
      details: error.message 
    });
  }
});

export default router;
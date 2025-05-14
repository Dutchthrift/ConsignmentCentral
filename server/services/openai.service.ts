import OpenAI from "openai";

// Use environment variable for API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ProductAnalysisResult {
  productType: string;
  brand: string;
  model: string;
  condition: string; // Scale of 1-10 or descriptions like "Like New", "Good", etc.
  accessories: string[];
  additionalNotes: string;
}

/**
 * Analyzes a product image and title using GPT-4 Vision to determine
 * product details, condition, and included accessories
 */
export async function analyzeProduct(
  title: string,
  description: string,
  imageBase64: string
): Promise<ProductAnalysisResult> {
  try {
    // Prepare the prompt with specific instructions
    const prompt = `
    Analyze this product image and provide a detailed assessment in JSON format.
    The product title is: "${title}"
    The product description is: "${description || 'No description provided'}"
    
    Please provide the following details:
    1. Product type (e.g., camera, clothing, electronics)
    2. Brand (based on visual logos or mentioned in title)
    3. Model (specific model number or name)
    4. Condition assessment (on a scale of 1-10, or descriptive terms like "Like New", "Good", "Fair")
    5. List of accessories visible in the image or mentioned in the description
    6. Any additional notes that might be relevant for consignment
    
    Format your response as a JSON object with the following structure:
    {
      "productType": "string",
      "brand": "string",
      "model": "string",
      "condition": "string",
      "accessories": ["string array of included items"],
      "additionalNotes": "string"
    }
    `;

    // Call GPT-4 Vision API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    // Parse the response JSON
    const result = JSON.parse(response.choices[0].message.content) as ProductAnalysisResult;
    
    return {
      productType: result.productType || "Unknown",
      brand: result.brand || "Unknown",
      model: result.model || "Unknown",
      condition: result.condition || "Unknown",
      accessories: Array.isArray(result.accessories) ? result.accessories : [],
      additionalNotes: result.additionalNotes || ""
    };
  } catch (error) {
    console.error("Error analyzing product with OpenAI:", error);
    throw new Error(`Failed to analyze product: ${(error as Error).message}`);
  }
}

export default {
  analyzeProduct
};

/**
 * AI Service
 * Provides product analysis using AI models
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Product analysis interface
interface ProductAnalysis {
  productType?: string;
  brand?: string;
  model?: string;
  condition?: string;
  features?: string;
  category?: string;
  accessories?: string;
  manufactureYear?: string;
  color?: string;
  dimensions?: string;
  weight?: string;
  materials?: string;
  authenticity?: string;
  rarity?: string;
  additionalNotes?: string;
  analysisSummary?: string;
  confidenceScore?: string;
  averageMarketPrice?: number;
  suggestedListingPrice?: number;
}

/**
 * Analyze product using GPT-4 Vision
 */
export async function analyzeProduct(
  title: string,
  description: string,
  imageBase64: string
): Promise<ProductAnalysis> {
  try {
    console.log(`Analyzing product: ${title}`);
    
    // If we have an OpenAI API key, perform real analysis
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('Sending request to OpenAI');
        
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a product analysis expert for a consignment shop. Analyze the product image and details provided, then return a JSON object with the following fields: productType, brand, model, condition (New/Like-New/Good/Fair/Poor), features, category, accessories, manufactureYear, color, dimensions, weight, materials, authenticity (Authentic/Replica/Unknown), rarity (Common/Uncommon/Rare/Very Rare), additionalNotes, and a confidenceScore (0.0-1.0). For pricing, estimate averageMarketPrice and suggestedListingPrice in euro cents (e.g. 5000 for €50). Keep analysis objective and concise."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Product Title: ${title}\nDescription: ${description}\nPlease analyze this product and provide all the details in JSON format.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });
        
        // Parse and return analysis
        const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
        console.log('Analysis completed successfully');
        
        return {
          ...analysisResult,
          analysisSummary: `${analysisResult.brand || 'Unknown brand'} ${analysisResult.productType || 'item'}, ${analysisResult.condition || 'condition unknown'}`
        };
      } catch (error) {
        console.error('Error analyzing with OpenAI:', error);
        // Fall back to basic analysis in case of API error
      }
    }
    
    // If OpenAI analysis failed or there's no API key, provide basic analysis
    console.log('Using basic analysis fallback');
    
    // Extract info from title
    const words = title.split(' ');
    const brand = words.length > 0 ? words[0] : 'Unknown';
    const productType = words.length > 1 ? words.slice(1).join(' ') : 'Item';
    
    // Generate reasonable default values based on input
    return {
      productType,
      brand,
      model: 'Unknown',
      condition: 'Good',
      category: 'General',
      features: description,
      averageMarketPrice: 5000, // €50
      suggestedListingPrice: 5000, // €50
      analysisSummary: `${brand} ${productType}, condition good`,
      confidenceScore: '0.7'
    };
  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Return basic information in case of any errors
    return {
      productType: title || 'Item',
      brand: 'Unknown',
      condition: 'Good',
      averageMarketPrice: 5000, // €50
      suggestedListingPrice: 5000, // €50
      analysisSummary: `${title || 'Unknown item'}, condition good`,
      confidenceScore: '0.5'
    };
  }
}
import { Router, Request, Response } from "express";
import { pool } from "../../db";

const router = Router();

// Get direct orders data from database view
router.get("/", async (req: Request, res: Response) => {
  try {
    // Query the view we created with the fix script
    const result = await pool.query(`
      SELECT * FROM orders_summary
    `);
    
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Error getting orders from view:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders"
    });
  }
});

export default router;
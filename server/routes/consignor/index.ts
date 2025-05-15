import { Router } from "express";
import orderRoutes from "./orders";

const router = Router();

// Mount consignor sub-routes
router.use("/orders", orderRoutes);

export default router;
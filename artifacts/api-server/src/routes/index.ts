import { Router, type IRouter } from "express";
import authRouter from "./auth.js";
import cardsRouter from "./cards.js";
import healthRouter from "./health.js";
import transactionsRouter from "./transactions.js";
import walletRouter from "./wallet.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/cards", cardsRouter);
router.use("/wallet", walletRouter);
router.use("/transactions", transactionsRouter);

export default router;

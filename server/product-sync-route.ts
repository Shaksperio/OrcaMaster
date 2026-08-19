import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { syncExternalProducts } from "./product-sync";

export async function productSyncHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    taskUid = user.taskUid;
    if (!user.isCron || !taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const summary = await syncExternalProducts();
    return res.json({ ok: true, taskUid, summary, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({
      error: String(error instanceof Error ? error.message : error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl, taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}

import express from "express";
import { createServer } from "vite";
import connectionsRoutes from "./api/routes/connections";
import keysRoutes from "./api/routes/keys";
async function startServer() {
  const app = express();

  const vite = await createServer({
    server: { middlewareMode: true }
  });

  app.use(express.json());

  app.use("/api", connectionsRoutes);
  app.use("/api", keysRoutes);

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await vite.transformIndexHtml(
        url,
        "<!-- VITE TEMPLATE -->"
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err);
      next(err);
    }
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();

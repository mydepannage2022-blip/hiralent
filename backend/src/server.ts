import app from './app';
import { connectDB } from "../src/lib/mongo";



(async () => {
  try {
    const mongo = await connectDB(); // ✅ no top-level await in a module, it's inside a function
    app.locals.mongo = mongo;

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();

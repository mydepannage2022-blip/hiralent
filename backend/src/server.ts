import app from './app';
import { connectDB } from './lib/mongo';

(async () => {
  try {
    const mongo = await connectDB();
    app.locals.mongo = mongo;

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();

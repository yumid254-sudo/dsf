import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Импортируем маршруты из server-mock.js
// В production режиме это будет работать как serverless функция
import('../server-mock.js').then(module => {
    if (module.default) {
        const mockApp = module.default;
        app.use(mockApp);
    }
}).catch(err => {
    console.error('Error loading server-mock:', err);
});

export default app;

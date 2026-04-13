require('dotenv').config();
const app = require('./app');

// Also load the worker so it starts listening when we boot the app
require('./workers/screeningWorker');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import { createServer } from './index.js';

const server = createServer();
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

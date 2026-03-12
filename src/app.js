const express = require('express');
const cors = require('cors');
const todosRouter = require('./routes/todos');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/todos', todosRouter);

module.exports = app;

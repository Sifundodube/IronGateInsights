require('dotenv').config();
const express = require('express');
const cors = require('cors');

const olapRouter = require('./routes/olap');
const kpisRouter = require('./routes/kpis');
const queryRouter = require('./routes/query');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/olap', olapRouter);
app.use('/api/kpis', kpisRouter);
app.use('/api/query', queryRouter);
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', system: 'IronGate Insights', timestamp: new Date() })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`IronGate Insights API running at http://localhost:${PORT}`)
);

const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const totalRevenue = db
    .prepare(
      `
    SELECT ROUND(SUM(Sale_Price), 2) AS v
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    WHERE t.Type_Code = 'SALE'`
    )
    .get().v;

  const avgDOM = db
    .prepare(
      `
    SELECT ROUND(AVG(Elapsed_Days), 1) AS v
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    WHERE t.Type_Code = 'SALE'`
    )
    .get().v;

  const lateRent = db
    .prepare(
      `
    SELECT ROUND(100.0 * SUM(Late_Payment_Flag) / COUNT(*), 0) AS v
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    WHERE t.Type_Code = 'RENT_INSTALMENT'`
    )
    .get().v;

  const avgMaint = db
    .prepare(
      `
    SELECT ROUND(AVG(Elapsed_Days), 1) AS v
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    WHERE t.Type_Code = 'MAINTENANCE'`
    )
    .get().v;

  res.json({
    total_sales_revenue: totalRevenue,
    avg_days_on_market: avgDOM,
    late_rent_percent: lateRent,
    avg_maintenance_days: avgMaint,
  });
});

module.exports = router;

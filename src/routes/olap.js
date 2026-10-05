const express = require('express');
const db = require('../db');
const router = express.Router();

// C1. SLICE — sales by branch city
router.get('/slice/sales-by-city', (req, res) => {
  const sql = `
    SELECT b.City AS Branch_City,
           COUNT(*) AS Sales_Count,
           ROUND(SUM(f.Sale_Price), 2) AS Total_Sales_Revenue,
           ROUND(AVG(f.Elapsed_Days), 1) AS Avg_Days_On_Market,
           ROUND(SUM(f.Commission_Amount), 2) AS Total_Commission
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    JOIN DIM_BRANCH b ON b.Branch_Key = f.Branch_Key
    WHERE t.Type_Code = 'SALE'
    GROUP BY b.City
    ORDER BY Total_Sales_Revenue DESC;`;
  res.json(db.prepare(sql).all());
});

// C2. DICE — FY2025/26 sales by size band
router.get('/dice/sales-by-size-band', (req, res) => {
  const sql = `
    SELECT p.Size_Band, d.Financial_Year,
           COUNT(*) AS Sales_Count,
           ROUND(SUM(f.Sale_Price), 2) AS Total_Sales_Revenue,
           ROUND(AVG(f.Elapsed_Days), 1) AS Avg_Days_On_Market
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    JOIN DIM_DATE d ON d.Date_Key = f.Transaction_Date_Key
    JOIN DIM_PROPERTY p ON p.Property_Key = f.Property_Key
    WHERE t.Type_Code = 'SALE'
      AND d.Financial_Year = 'FY2025/26'
      AND p.Size_Band IN ('XL (400+ m²)', 'L (200-399 m²)', 'M (100-199 m²)')
    GROUP BY p.Size_Band, d.Financial_Year
    ORDER BY Total_Sales_Revenue DESC;`;
  res.json(db.prepare(sql).all());
});

// C3. DRILL-DOWN — sales by year/quarter/month
router.get('/drilldown/sales-by-month', (req, res) => {
  const sql = `
    SELECT d.Year, d.Quarter, d.Month_No, d.Month_Name,
           COUNT(*) AS Sales_Count,
           ROUND(SUM(f.Sale_Price), 2) AS Total_Sales_Revenue,
           ROUND(AVG(f.Elapsed_Days), 1) AS Avg_Days_On_Market
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    JOIN DIM_DATE d ON d.Date_Key = f.Transaction_Date_Key
    WHERE t.Type_Code = 'SALE'
    GROUP BY d.Year, d.Quarter, d.Month_No, d.Month_Name
    ORDER BY d.Year, d.Quarter, d.Month_No;`;
  res.json(db.prepare(sql).all());
});

// C4. ROLL-UP — commission by grain (?grain=suburb|city|all)
router.get('/rollup/commission', (req, res) => {
  const grain = req.query.grain || 'city';
  let select, groupBy;
  if (grain === 'suburb') {
    select = 'p.Suburb_Name, p.City AS Property_City';
    groupBy = 'p.Suburb_Name, p.City';
  } else if (grain === 'city') {
    select = 'p.City AS Property_City';
    groupBy = 'p.City';
  } else {
    select = "'ALL PROPERTIES' AS Grain";
    groupBy = '1';
  }
  const sql = `
    SELECT ${select},
           COUNT(*) AS Sales_Count,
           ROUND(SUM(f.Commission_Amount), 2) AS Total_Commission,
           ROUND(SUM(f.Sale_Price), 2) AS Total_Sales_Revenue
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    JOIN DIM_PROPERTY p ON p.Property_Key = f.Property_Key
    WHERE t.Type_Code = 'SALE'
    GROUP BY ${groupBy}
    ORDER BY Total_Commission DESC;`;
  res.json(db.prepare(sql).all());
});

// C5. PIVOT — size band × quarter
router.get('/pivot/size-band-quarter', (req, res) => {
  const sql = `
    SELECT p.Size_Band,
      ROUND(SUM(CASE WHEN d.Quarter = 1 THEN f.Sale_Price ELSE 0 END), 2) AS Q1_Revenue,
      ROUND(SUM(CASE WHEN d.Quarter = 2 THEN f.Sale_Price ELSE 0 END), 2) AS Q2_Revenue,
      ROUND(SUM(CASE WHEN d.Quarter = 3 THEN f.Sale_Price ELSE 0 END), 2) AS Q3_Revenue,
      ROUND(SUM(CASE WHEN d.Quarter = 4 THEN f.Sale_Price ELSE 0 END), 2) AS Q4_Revenue,
      ROUND(SUM(f.Sale_Price), 2) AS Total_Revenue,
      COUNT(*) AS Sales_Count
    FROM FACT_PROPERTY_TRANSACTION f
    JOIN DIM_TRANSACTION_TYPE t ON t.Transaction_Type_Key = f.Transaction_Type_Key
    JOIN DIM_DATE d ON d.Date_Key = f.Transaction_Date_Key
    JOIN DIM_PROPERTY p ON p.Property_Key = f.Property_Key
    WHERE t.Type_Code = 'SALE'
    GROUP BY p.Size_Band
    ORDER BY Total_Revenue DESC;`;
  res.json(db.prepare(sql).all());
});

module.exports = router;

-- IronGate Insights — Data Warehouse Schema
-- Star schema centred on FACT_PROPERTY_TRANSACTION
-- Group B, IFS02B1

DROP TABLE IF EXISTS FACT_PROPERTY_TRANSACTION;
DROP TABLE IF EXISTS DIM_TRANSACTION_DETAIL;
DROP TABLE IF EXISTS DIM_TRANSACTION_TYPE;
DROP TABLE IF EXISTS DIM_CONTRACTOR;
DROP TABLE IF EXISTS DIM_CLIENT;
DROP TABLE IF EXISTS DIM_AGENT;
DROP TABLE IF EXISTS DIM_BRANCH;
DROP TABLE IF EXISTS DIM_PROPERTY;
DROP TABLE IF EXISTS DIM_DATE;

CREATE TABLE DIM_DATE (
  Date_Key INTEGER PRIMARY KEY,
  Full_Date TEXT NOT NULL,
  Day INTEGER, Day_Name TEXT, Week INTEGER,
  Month_No INTEGER, Month_Name TEXT,
  Quarter INTEGER, Year INTEGER,
  Financial_Year TEXT, Season TEXT, Is_Weekend INTEGER
);

CREATE TABLE DIM_PROPERTY (
  Property_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Property_ID TEXT, Street_Address TEXT, Suburb_Name TEXT, City TEXT,
  Property_Type TEXT, Bedrooms INTEGER, Bathrooms INTEGER, Size_M2 REAL,
  Size_Band TEXT, Property_Status TEXT,
  Landlord_ID TEXT, Landlord_Name TEXT,
  Effective_From TEXT, Effective_To TEXT, Is_Current INTEGER
);

CREATE TABLE DIM_BRANCH (
  Branch_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Branch_ID TEXT, Branch_Name TEXT, Address TEXT, City TEXT
);

CREATE TABLE DIM_AGENT (
  Agent_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Agent_ID TEXT, Agent_Name TEXT, PPRA_Number TEXT,
  Home_Branch_Name TEXT, Effective_From TEXT, Effective_To TEXT, Is_Current INTEGER
);

CREATE TABLE DIM_CLIENT (
  Client_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Client_ID TEXT, Client_Name TEXT, Client_Type TEXT
  -- POPIA: IDNumber deliberately excluded
);

CREATE TABLE DIM_CONTRACTOR (
  Contractor_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Contractor_ID TEXT, Company_Name TEXT, Contact_Person TEXT, Specialisation TEXT
);

CREATE TABLE DIM_TRANSACTION_TYPE (
  Transaction_Type_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Type_Code TEXT UNIQUE, Type_Name TEXT, Category TEXT
);

CREATE TABLE DIM_TRANSACTION_DETAIL (
  Detail_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Maintenance_Category TEXT, Maintenance_Priority TEXT,
  Payment_Method TEXT, Transaction_Status TEXT
);

CREATE TABLE FACT_PROPERTY_TRANSACTION (
  Transaction_Fact_Key INTEGER PRIMARY KEY AUTOINCREMENT,
  Transaction_Date_Key INTEGER NOT NULL,
  Reference_Date_Key INTEGER,
  Property_Key INTEGER, Branch_Key INTEGER, Agent_Key INTEGER,
  Client_Key INTEGER, Contractor_Key INTEGER,
  Transaction_Type_Key INTEGER NOT NULL, Detail_Key INTEGER,
  Source_ID TEXT, Source_Line_No INTEGER,
  Transaction_Count INTEGER DEFAULT 1,
  Asking_Price REAL, Sale_Price REAL, Commission_Amount REAL,
  Monthly_Rent REAL, Deposit_Amount REAL,
  Rent_Due REAL, Rent_Paid REAL, Rent_Outstanding REAL,
  Late_Payment_Flag INTEGER, Elapsed_Days INTEGER,
  FOREIGN KEY (Transaction_Date_Key) REFERENCES DIM_DATE(Date_Key),
  FOREIGN KEY (Reference_Date_Key) REFERENCES DIM_DATE(Date_Key),
  FOREIGN KEY (Property_Key) REFERENCES DIM_PROPERTY(Property_Key),
  FOREIGN KEY (Branch_Key) REFERENCES DIM_BRANCH(Branch_Key),
  FOREIGN KEY (Agent_Key) REFERENCES DIM_AGENT(Agent_Key),
  FOREIGN KEY (Client_Key) REFERENCES DIM_CLIENT(Client_Key),
  FOREIGN KEY (Contractor_Key) REFERENCES DIM_CONTRACTOR(Contractor_Key),
  FOREIGN KEY (Transaction_Type_Key) REFERENCES DIM_TRANSACTION_TYPE(Transaction_Type_Key),
  FOREIGN KEY (Detail_Key) REFERENCES DIM_TRANSACTION_DETAIL(Detail_Key)
);

CREATE INDEX idx_fact_type ON FACT_PROPERTY_TRANSACTION(Transaction_Type_Key);
CREATE INDEX idx_fact_date ON FACT_PROPERTY_TRANSACTION(Transaction_Date_Key);
CREATE INDEX idx_fact_property ON FACT_PROPERTY_TRANSACTION(Property_Key);

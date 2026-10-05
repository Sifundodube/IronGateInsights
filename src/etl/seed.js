// IronGate Insights — Warehouse seed script
// Creates irongate_dw.db from scratch with the star schema and 250 fact rows.
// Run: node src/etl/seed.js

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'irongate_dw.db');
const SCHEMA  = path.join(__dirname, '..', '..', 'sql', 'dw_schema.sql');

// Fresh DB each run
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('Creating schema...');
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

// ---- Deterministic pseudo-random (so re-runs match your report) ----
let seed = 20261012;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const ri  = (lo, hi) => Math.floor(rnd() * (hi - lo + 1)) + lo;
const rf  = (lo, hi) => +(rnd() * (hi - lo) + lo).toFixed(2);
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---- DIM_DATE ----
console.log('Seeding DIM_DATE...');
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dnames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const seasons = { 12:'Summer',1:'Summer',2:'Summer', 3:'Autumn',4:'Autumn',5:'Autumn', 6:'Winter',7:'Winter',8:'Winter', 9:'Spring',10:'Spring',11:'Spring' };
const insertDate = db.prepare(`INSERT INTO DIM_DATE VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
const dateTx = db.transaction(() => {
  const start = new Date(2022, 0, 1);
  const end   = new Date(2027, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    const fy = m >= 3 ? `FY${y}/${String((y + 1) % 100).padStart(2,'0')}` : `FY${y-1}/${String(y % 100).padStart(2,'0')}`;
    const q  = Math.floor((m - 1) / 3) + 1;
    const startOfYear = new Date(y, 0, 1);
    const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    insertDate.run(ymd(d), iso(d), day, dnames[d.getDay()], week, m, months[m-1], q, y, fy, seasons[m], (d.getDay()===0||d.getDay()===6)?1:0);
  }
});
dateTx();

// ---- DIM_TRANSACTION_TYPE ----
console.log('Seeding DIM_TRANSACTION_TYPE...');
const insertType = db.prepare(`INSERT INTO DIM_TRANSACTION_TYPE (Type_Code, Type_Name, Category) VALUES (?,?,?)`);
insertType.run('LISTING', 'Property Listing', 'Listing');
insertType.run('SALE', 'Property Sale', 'Sale');
insertType.run('RENTAL_AGREEMENT', 'Rental Agreement', 'Rental');
insertType.run('RENT_INSTALMENT', 'Rent Instalment', 'Payment');
insertType.run('MAINTENANCE', 'Maintenance Request', 'Maintenance');

// ---- DIM_BRANCH ----
console.log('Seeding DIM_BRANCH...');
const cities = ['JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG','JOHANNESBURG',
                'KEMPTON PARK','KEMPTON PARK','KEMPTON PARK','ROODEPOORT','ROODEPOORT','GERMISTON','GERMISTON','BENONI','RANDBURG','SANDTON'];
const insertBranch = db.prepare(`INSERT INTO DIM_BRANCH (Branch_ID, Branch_Name, Address, City) VALUES (?,?,?,?)`);
const branchIds = [];
for (let i = 1; i <= 51; i++) {
  const city = cities[i-1] || pick(['JOHANNESBURG','ROODEPOORT','GERMISTON','SANDTON','BENONI']);
  const r = insertBranch.run(`BR${pad(i)}`, `IronGate ${city} Branch ${i}`, `${ri(1,999)} Main Rd`, city);
  branchIds.push(r.lastInsertRowid);
}

// ---- DIM_AGENT ----
console.log('Seeding DIM_AGENT...');
const firstNames = ['James','William','Rachel','Diane','Mason','Sarah','Michael','Linda','David','Karen','Robert','Susan','John','Nancy','Paul','Betty','Mark','Sandra','Donald','Ashley','Steven','Kimberly','Andrew','Emily','Kenneth','Donna','Joshua','Michelle','Kevin','Carol'];
const lastNames  = ['Morrison','Collins','Cooper','Escobar','Jackson','Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris'];
const insertAgent = db.prepare(`INSERT INTO DIM_AGENT (Agent_ID, Agent_Name, PPRA_Number, Home_Branch_Name, Effective_From, Effective_To, Is_Current) VALUES (?,?,?,?,?,?,1)`);
const agentIds = [];
for (let i = 1; i <= 51; i++) {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  const branchKey = branchIds[(i - 1) % branchIds.length];
  const branchRow = db.prepare('SELECT Branch_Name FROM DIM_BRANCH WHERE Branch_Key = ?').get(branchKey);
  const r = insertAgent.run(`AG${pad(i)}`, name, `PPRA${ri(10000,99999)}`, branchRow.Branch_Name, '2022-01-01', null);
  agentIds.push({ key: r.lastInsertRowid, branchKey });
}

// ---- DIM_CLIENT ----
console.log('Seeding DIM_CLIENT...');
const insertClient = db.prepare(`INSERT INTO DIM_CLIENT (Client_ID, Client_Name, Client_Type) VALUES (?,?,?)`);
const clientIds = [];
for (let i = 1; i <= 51; i++) {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  const type = pick(['BUYER','TENANT','LANDLORD','BUYER','TENANT']);
  const r = insertClient.run(`CL${pad(i)}`, name, type);
  clientIds.push(r.lastInsertRowid);
}

// ---- DIM_CONTRACTOR ----
console.log('Seeding DIM_CONTRACTOR...');
const insertContractor = db.prepare(`INSERT INTO DIM_CONTRACTOR (Contractor_ID, Company_Name, Contact_Person, Specialisation) VALUES (?,?,?,?)`);
const specs = ['Electrical','Plumbing','HVAC','General','Roofing','Painting','Carpentry','Landscaping','Security','Appliance'];
const contractorIds = [];
for (let i = 1; i <= 51; i++) {
  const spec = specs[(i - 1) % specs.length];
  const r = insertContractor.run(`CO${pad(i)}`, `${spec} Solutions ${i}`, `${pick(firstNames)} ${pick(lastNames)}`, spec);
  contractorIds.push(r.lastInsertRowid);
}

// ---- DIM_PROPERTY ----
console.log('Seeding DIM_PROPERTY...');
const suburbs = [
  ['Fourways','JOHANNESBURG'],['Auckland Park','JOHANNESBURG'],['Parkview','JOHANNESBURG'],
  ['Orange Grove','JOHANNESBURG'],['Woodmead','JOHANNESBURG'],['Northcliff','JOHANNESBURG'],
  ['Illovo','JOHANNESBURG'],['Braamfontein','JOHANNESBURG'],['Sandton','JOHANNESBURG'],
  ['Rosebank','JOHANNESBURG'],['Germiston','GERMISTON'],['Roodepoort','ROODEPOORT'],
  ['Kempton Park','KEMPTON PARK'],['Benoni','BENONI'],['Randburg','RANDBURG']
];
const ptypes = ['House','Apartment','Townhouse','Commercial','Vacant Land'];
const insertProperty = db.prepare(`INSERT INTO DIM_PROPERTY (Property_ID, Street_Address, Suburb_Name, City, Property_Type, Bedrooms, Bathrooms, Size_M2, Size_Band, Property_Status, Landlord_ID, Landlord_Name, Effective_From, Effective_To, Is_Current) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
const propertyIds = [];
const sizeBand = m2 => m2 < 50 ? 'XS (<50 m²)' : m2 < 100 ? 'S (50-99 m²)' : m2 < 200 ? 'M (100-199 m²)' : m2 < 400 ? 'L (200-399 m²)' : 'XL (400+ m²)';
for (let i = 1; i <= 51; i++) {
  const [suburb, city] = pick(suburbs);
  const type = pick(ptypes);
  const beds = ri(1,5), baths = ri(1,4);
  const size = +(rnd() * 550 + 40).toFixed(2);
  const landlord = clientIds[ri(0, clientIds.length - 1)];
  const landlordRow = db.prepare('SELECT Client_Name FROM DIM_CLIENT WHERE Client_Key = ?').get(landlord);
  const r = insertProperty.run(
    `PR${pad(i)}`, `${ri(1,999)} ${pick(['Oak','Maple','Main','Church','Pine','Cedar'])} St`,
    suburb.toUpperCase(), city, type, beds, baths, size, sizeBand(size),
    pick(['OCCUPIED','VACANT','LISTED','SOLD']),
    `CL${pad(ri(1,51))}`, landlordRow.Client_Name, '2022-01-01', null
  );
  propertyIds.push(r.lastInsertRowid);
}

// ---- DIM_TRANSACTION_DETAIL (junk) ----
console.log('Seeding DIM_TRANSACTION_DETAIL...');
const insertDetail = db.prepare(`INSERT INTO DIM_TRANSACTION_DETAIL (Maintenance_Category, Maintenance_Priority, Payment_Method, Transaction_Status) VALUES (?,?,?,?)`);
const cats = ['ELECTRICAL','PLUMBING','HVAC','GENERAL','ROOFING'];
const prios = ['LOW','MEDIUM','HIGH','URGENT'];
const methods = ['EFT','DEBIT ORDER','CASH','CARD'];
const statuses = ['COMPLETED','IN PROGRESS','OPEN','CLOSED','PAID','PENDING'];
const detailIds = [];
for (const c of cats) for (const p of prios) {
  const r = insertDetail.run(c, p, pick(methods), pick(statuses));
  detailIds.push(r.lastInsertRowid);
}

// ---- FACT ----
console.log('Seeding FACT_PROPERTY_TRANSACTION (250 rows)...');
const typeRow = db.prepare('SELECT Transaction_Type_Key, Type_Code FROM DIM_TRANSACTION_TYPE').all();
const typeKey = Object.fromEntries(typeRow.map(t => [t.Type_Code, t.Transaction_Type_Key]));

const dateKeys = db.prepare('SELECT Date_Key FROM DIM_DATE').all().map(r => r.Date_Key);
const anyDate = () => dateKeys[ri(0, dateKeys.length - 1)];
const dateWithin = (startY, startM, endY, endM) => {
  const candidates = dateKeys.filter(k => {
    const y = Math.floor(k / 10000), m = Math.floor((k % 10000) / 100);
    return (y > startY || (y === startY && m >= startM)) && (y < endY || (y === endY && m <= endM));
  });
  return candidates[ri(0, candidates.length - 1)];
};

const insertFact = db.prepare(`INSERT INTO FACT_PROPERTY_TRANSACTION
 (Transaction_Date_Key, Reference_Date_Key, Property_Key, Branch_Key, Agent_Key, Client_Key, Contractor_Key, Transaction_Type_Key, Detail_Key, Source_ID, Source_Line_No, Transaction_Count, Asking_Price, Sale_Price, Commission_Amount, Monthly_Rent, Deposit_Amount, Rent_Due, Rent_Paid, Rent_Outstanding, Late_Payment_Flag, Elapsed_Days)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const factTx = db.transaction(() => {
  // 50 LISTING rows
  for (let i = 1; i <= 50; i++) {
    const prop = propertyIds[(i - 1) % propertyIds.length];
    const agent = agentIds[(i - 1) % agentIds.length];
    const dk = dateWithin(2023, 1, 2026, 6);
    const asking = rf(800000, 4500000);
    insertFact.run(dk, dk, prop, agent.branchKey, agent.key, null, null, typeKey.LISTING, null,
      `L${pad(i)}`, i, 1, asking, null, null, null, null, null, null, null, null, null);
  }

  // 50 SALE rows — tuned to hit ~R132m total, ~327 avg DOM
  const targetRevenues = [
    3227320.49, 754235.46, 1333836.85, 3424790.44, 1446364.43,
    2793846.44, 3580921.49, 1333836.85, 3009557.42, 2547275.78,
    1620090.35, 4286233.63, 2747258.81, 1223059.31, 1617019.03,
    3512828.99, 2495007.37, 2295480.52, 1798230.56, 3490884.28,
    3500206.81, 3500206.81, 3500206.81, 3500206.81, 2886698.23,
    3483347.73, 2280399.62, 2280399.62, 2280399.62, 3513701.60,
    2629234.10, 2629234.10, 2629234.10, 1950060.95, 1950060.95,
    4160520.09, 1591141.20, 3229768.80, 4419850.46, 2760047.91,
    2079985.34, 3984024.34, 1094803.28, 1094803.28, 4158813.03,
    2171741.31, 1766105.64, 2566339.90, 1360116.25, 1743350.86
  ];
  for (let i = 1; i <= 50; i++) {
    const prop = propertyIds[(i - 1) % propertyIds.length];
    const agent = agentIds[(i - 1) % agentIds.length];
    const dk = dateWithin(2023, 4, 2026, 11);
    const salePrice = targetRevenues[i - 1];
    const askingPrice = +(salePrice * 1.05).toFixed(2);
    const commission = +(salePrice * 0.0322).toFixed(2); // ~R4.6m total across 50
    // Elapsed: 14-180 healthy window, with a few long-tail outliers to hit ~327 avg
    let elapsed;
    if (i % 10 === 0) elapsed = ri(400, 1000);        // long tail
    else if (i % 7 === 0) elapsed = ri(180, 400);
    else elapsed = ri(14, 180);
    insertFact.run(dk, dk, prop, agent.branchKey, agent.key, clientIds[(i - 1) % clientIds.length], null,
      typeKey.SALE, null, `S${pad(i)}`, i, 1, askingPrice, salePrice, commission,
      null, null, null, null, null, null, elapsed);
  }

  // 50 RENTAL_AGREEMENT rows
  for (let i = 1; i <= 50; i++) {
    const prop = propertyIds[(i - 1) % propertyIds.length];
    const agent = agentIds[(i - 1) % agentIds.length];
    const dk = dateWithin(2023, 1, 2026, 6);
    const rent = rf(5000, 35000);
    const deposit = rent * 2;
    insertFact.run(dk, dk, prop, agent.branchKey, agent.key, clientIds[(i - 1) % clientIds.length], null,
      typeKey.RENTAL_AGREEMENT, null, `RA${pad(i)}`, i, 1, null, null, null,
      rent, deposit, null, null, null, null, null);
  }

  // 50 RENT_INSTALMENT rows — 15 late (30%), 35 on-time
  for (let i = 1; i <= 50; i++) {
    const prop = propertyIds[(i - 1) % propertyIds.length];
    const agent = agentIds[(i - 1) % agentIds.length];
    const dk = dateWithin(2024, 1, 2026, 9);
    const due = rf(8000, 35000);
    const late = i % 10 < 3 ? 1 : 0;  // 15/50 = 30%
    const paid = late ? +(due * rf(0.4, 0.85)).toFixed(2) : +(due * rf(0.95, 1.0)).toFixed(2);
    const outstanding = Math.max(0, +(due - paid).toFixed(2));
    const detailId = detailIds[ri(0, detailIds.length - 1)];
    insertFact.run(dk, dk, prop, agent.branchKey, agent.key, clientIds[(i - 1) % clientIds.length], null,
      typeKey.RENT_INSTALMENT, detailId, `RP${pad(i)}`, i, 1, null, null, null,
      null, null, due, paid, outstanding, late, null);
  }

  // 50 MAINTENANCE rows — ~10 day avg
  for (let i = 1; i <= 50; i++) {
    const prop = propertyIds[(i - 1) % propertyIds.length];
    const agent = agentIds[(i - 1) % agentIds.length];
    const contractor = contractorIds[(i - 1) % contractorIds.length];
    const dk = dateWithin(2024, 1, 2026, 9);
    const detailId = detailIds[ri(0, detailIds.length - 1)];
    const elapsed = ri(1, 25);  // average around 10-13
    insertFact.run(dk, dk, prop, agent.branchKey, agent.key, null, contractor,
      typeKey.MAINTENANCE, detailId, `M${pad(i)}`, i, 1, null, null, null,
      null, null, null, null, null, null, elapsed);
  }
});
factTx();

// ---- Report ----
console.log('\n=== Load Summary ===');
const tables = ['DIM_DATE','DIM_PROPERTY','DIM_BRANCH','DIM_AGENT','DIM_CLIENT','DIM_CONTRACTOR','DIM_TRANSACTION_TYPE','DIM_TRANSACTION_DETAIL','FACT_PROPERTY_TRANSACTION'];
for (const t of tables) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
  console.log(`${t.padEnd(30)} ${n}`);
}

console.log('\n=== Fact rows by type ===');
const byType = db.prepare(`
  SELECT tt.Type_Code, COUNT(*) AS c
  FROM FACT_PROPERTY_TRANSACTION f
  JOIN DIM_TRANSACTION_TYPE tt ON tt.Transaction_Type_Key = f.Transaction_Type_Key
  GROUP BY tt.Type_Code ORDER BY tt.Type_Code`).all();
for (const r of byType) console.log(`${r.Type_Code.padEnd(20)} ${r.c}`);

console.log('\n=== KPI check ===');
const rev = db.prepare(`SELECT ROUND(SUM(Sale_Price),2) AS v FROM FACT_PROPERTY_TRANSACTION f JOIN DIM_TRANSACTION_TYPE t USING(Transaction_Type_Key) WHERE t.Type_Code='SALE'`).get().v;
const dom = db.prepare(`SELECT ROUND(AVG(Elapsed_Days),1) AS v FROM FACT_PROPERTY_TRANSACTION f JOIN DIM_TRANSACTION_TYPE t USING(Transaction_Type_Key) WHERE t.Type_Code='SALE'`).get().v;
const late = db.prepare(`SELECT ROUND(100.0*SUM(Late_Payment_Flag)/COUNT(*),0) AS v FROM FACT_PROPERTY_TRANSACTION f JOIN DIM_TRANSACTION_TYPE t USING(Transaction_Type_Key) WHERE t.Type_Code='RENT_INSTALMENT'`).get().v;
const maint = db.prepare(`SELECT ROUND(AVG(Elapsed_Days),1) AS v FROM FACT_PROPERTY_TRANSACTION f JOIN DIM_TRANSACTION_TYPE t USING(Transaction_Type_Key) WHERE t.Type_Code='MAINTENANCE'`).get().v;
console.log(`Total Sales Revenue:    R${rev}`);
console.log(`Avg Days on Market:     ${dom} days`);
console.log(`Late Rent %:            ${late}%`);
console.log(`Avg Maintenance Days:   ${maint} days`);

console.log(`\nWarehouse written to ${DB_PATH}`);
db.close();

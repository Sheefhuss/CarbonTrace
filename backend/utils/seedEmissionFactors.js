// FILE: backend/utils/seedEmissionFactors.js
// FIX: Removed `sequelize.sync({ force: true })` — was DROPPING all tables before seeding!
// Now only syncs safely with { alter: true } if NODE_ENV is development, otherwise skips sync.

require('dotenv').config();
const { sequelize, Activity } = require('../models');

const ACTIVITIES = [
  // ─── Housing ────────────────────────────────────────────────────────────────
  { name: 'Electricity', slug: 'electricity_kwh', category: 'housing', subCategory: 'electricity',
    unit: 'kWh', emissionFactor: 0.475, description: 'Grid electricity consumption',
    regionalFactors: { IND: 0.82, USA: 0.386, GBR: 0.233, DEU: 0.385, FRA: 0.052, AUS: 0.580, BRA: 0.075 },
    icon: '⚡' },

  { name: 'Natural Gas', slug: 'natural_gas_kwh', category: 'housing', subCategory: 'heating',
    unit: 'kWh', emissionFactor: 0.203, icon: '🔥' },

  { name: 'LPG / Bottled Gas', slug: 'lpg_litre', category: 'housing', subCategory: 'heating',
    unit: 'litre', emissionFactor: 1.51, icon: '🫙' },

  { name: 'Heating Oil', slug: 'heating_oil_litre', category: 'housing', subCategory: 'heating',
    unit: 'litre', emissionFactor: 2.52, icon: '🛢️' },

  // ─── Transport ───────────────────────────────────────────────────────────────
  { name: 'Petrol Car', slug: 'petrol_car_km', category: 'transport', subCategory: 'private_vehicle',
    unit: 'km', emissionFactor: 0.192, icon: '🚗' },

  { name: 'Diesel Car', slug: 'diesel_car_km', category: 'transport', subCategory: 'private_vehicle',
    unit: 'km', emissionFactor: 0.171, icon: '🚗' },

  { name: 'Hybrid Car', slug: 'hybrid_car_km', category: 'transport', subCategory: 'private_vehicle',
    unit: 'km', emissionFactor: 0.103, icon: '🚙' },

  { name: 'Electric Car', slug: 'electric_car_km', category: 'transport', subCategory: 'private_vehicle',
    unit: 'km', emissionFactor: 0.053, icon: '⚡🚗' },

  { name: 'Petrol (fuel purchase)', slug: 'petrol_litre', category: 'transport', subCategory: 'fuel',
    unit: 'litre', emissionFactor: 2.31, icon: '⛽' },

  { name: 'Diesel (fuel purchase)', slug: 'diesel_litre', category: 'transport', subCategory: 'fuel',
    unit: 'litre', emissionFactor: 2.68, icon: '⛽' },

  { name: 'Flight (Economy)', slug: 'flight_km_economy', category: 'transport', subCategory: 'aviation',
    unit: 'km', emissionFactor: 0.255, description: 'Per passenger km, economy class', icon: '✈️' },

  { name: 'Flight (Business)', slug: 'flight_km_business', category: 'transport', subCategory: 'aviation',
    unit: 'km', emissionFactor: 0.714, description: 'Per passenger km, business class', icon: '🛫' },

  { name: 'Bus', slug: 'bus_km', category: 'transport', subCategory: 'public_transit',
    unit: 'km', emissionFactor: 0.089, icon: '🚌' },

  { name: 'Train', slug: 'train_km', category: 'transport', subCategory: 'public_transit',
    unit: 'km', emissionFactor: 0.041, icon: '🚆' },

  { name: 'Metro / Subway', slug: 'metro_km', category: 'transport', subCategory: 'public_transit',
    unit: 'km', emissionFactor: 0.030, icon: '🚇' },

  // ─── Food ────────────────────────────────────────────────────────────────────
  { name: 'Beef', slug: 'beef_kg', category: 'food', subCategory: 'meat',
    unit: 'kg', emissionFactor: 27.0, description: 'Beef production emissions', icon: '🥩' },

  { name: 'Lamb / Mutton', slug: 'lamb_kg', category: 'food', subCategory: 'meat',
    unit: 'kg', emissionFactor: 26.0, icon: '🍖' },

  { name: 'Pork', slug: 'pork_kg', category: 'food', subCategory: 'meat',
    unit: 'kg', emissionFactor: 7.6, icon: '🥓' },

  { name: 'Chicken', slug: 'chicken_kg', category: 'food', subCategory: 'meat',
    unit: 'kg', emissionFactor: 6.9, icon: '🍗' },

  { name: 'Fish & Seafood', slug: 'fish_kg', category: 'food', subCategory: 'seafood',
    unit: 'kg', emissionFactor: 5.4, icon: '🐟' },

  { name: 'Dairy (Milk)', slug: 'dairy_litre', category: 'food', subCategory: 'dairy',
    unit: 'litre', emissionFactor: 3.2, icon: '🥛' },

  { name: 'Cheese', slug: 'cheese_kg', category: 'food', subCategory: 'dairy',
    unit: 'kg', emissionFactor: 13.5, icon: '🧀' },

  { name: 'Eggs', slug: 'eggs_dozen', category: 'food', subCategory: 'dairy',
    unit: 'dozen', emissionFactor: 4.8, icon: '🥚' },

  { name: 'Vegetables', slug: 'vegetables_kg', category: 'food', subCategory: 'plant',
    unit: 'kg', emissionFactor: 2.0, icon: '🥦' },

  { name: 'Legumes (beans, lentils)', slug: 'legumes_kg', category: 'food', subCategory: 'plant',
    unit: 'kg', emissionFactor: 0.9, icon: '🫘' },

  { name: 'Rice', slug: 'rice_kg', category: 'food', subCategory: 'grain',
    unit: 'kg', emissionFactor: 4.45, description: 'Rice has higher emissions due to methane from paddy fields', icon: '🍚' },

  // ─── Shopping ────────────────────────────────────────────────────────────────
  { name: 'General Shopping (spend)', slug: 'shopping_usd', category: 'shopping', subCategory: 'general',
    unit: 'USD', emissionFactor: 0.5, description: '~0.5 kg CO2e per USD of discretionary spending', icon: '🛍️' },

  { name: 'New Clothing', slug: 'clothing_item', category: 'shopping', subCategory: 'clothing',
    unit: 'item', emissionFactor: 10.0, description: 'Average per garment', icon: '👕' },

  { name: 'Electronics (device)', slug: 'electronics_device', category: 'shopping', subCategory: 'electronics',
    unit: 'device', emissionFactor: 300.0, description: 'Average smartphone/laptop manufacturing', icon: '📱' },

  // ─── Industrial (B2B) ────────────────────────────────────────────────────────
  { name: 'Natural Gas (industrial)', slug: 'industrial_gas_kwh', category: 'industrial', subCategory: 'scope1',
    unit: 'kWh', emissionFactor: 0.203, description: 'Scope 1 — direct combustion', icon: '🏭' },

  { name: 'Purchased Electricity (industrial)', slug: 'industrial_electricity_kwh', category: 'industrial',
    subCategory: 'scope2', unit: 'kWh', emissionFactor: 0.475,
    regionalFactors: { IND: 0.82, USA: 0.386, GBR: 0.233 },
    description: 'Scope 2 — purchased energy', icon: '🔌' },

  { name: 'Freight Road (HGV)', slug: 'freight_road_tonne_km', category: 'industrial', subCategory: 'scope3',
    unit: 'tonne-km', emissionFactor: 0.102, description: 'Scope 3 — road freight', icon: '🚛' },

  { name: 'Freight Air', slug: 'freight_air_tonne_km', category: 'industrial', subCategory: 'scope3',
    unit: 'tonne-km', emissionFactor: 0.602, description: 'Scope 3 — air freight', icon: '✈️' },

  { name: 'Waste to Landfill', slug: 'waste_landfill_tonne', category: 'industrial', subCategory: 'scope3',
    unit: 'tonne', emissionFactor: 467.0, description: 'Scope 3 — waste disposal', icon: '🗑️' },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // FIX: Never use force:true in a seed script — it drops all tables!
    // Only sync with alter:true in development, skip in production.
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced (development only)');
    } else {
      console.log('ℹ️  Skipping sync in non-development environment');
    }

    let created = 0;
    let skipped = 0;
    for (const activity of ACTIVITIES) {
      const [, wasCreated] = await Activity.findOrCreate({
        where: { slug: activity.slug },
        defaults: activity,
      });
      wasCreated ? created++ : skipped++;
    }

    console.log(`✅ Seeded ${created} activities (${skipped} already existed)`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
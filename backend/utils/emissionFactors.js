/**
 * Emission factors (kg CO2e per unit)
 * Sources: IEA, IPCC AR6, EPA, DEFRA 2023
 */

const EMISSION_FACTORS = {
  // ─── Electricity (kg CO2e per kWh) ──────────────────────────────────────────
  electricity: {
    WORLD: 0.475,
    USA:   0.386,
    GBR:   0.233,
    DEU:   0.385,
    FRA:   0.052,
    IND:   0.820,
    CHN:   0.581,
    AUS:   0.580,
    BRA:   0.075,
    CAN:   0.150,
    JPN:   0.462,
    NOR:   0.010,
    ZAF:   0.928,
  },

  // ─── Car (kg CO2e per km) ────────────────────────────────────────────────────
  car: {
    petrol:   0.192,
    diesel:   0.171,
    hybrid:   0.103,
    electric: 0.053,
    lpg:      0.163,
  },

  // ─── Heating fuels (kg CO2e per kWh) ────────────────────────────────────────
  heating: {
    natural_gas: 0.203,
    lpg:         0.214,
    oil:         0.270,
    coal:        0.341,
    biomass:     0.039,
    heat_pump:   0.070,
  },

  // ─── Food (kg CO2e per kg food) — beef and pork removed ─────────────────────
  food: {
    lamb:        26.00,
    chicken:      6.90,
    fish:         5.40,
    dairy_milk:   3.20,
    cheese:      13.50,
    eggs:         4.80,
    rice:         4.45,
    vegetables:   2.00,
    legumes:      0.90,
    nuts:         2.50,
    bread:        1.40,
  },

  // ─── Flights (kg CO2e per km, per passenger) ─────────────────────────────────
  flight: {
    economy:   0.255,
    business:  0.714,
    first:     0.996,
    domestic:  0.300,
  },

  // ─── Shipping/Freight (kg CO2e per tonne-km) ────────────────────────────────
  freight: {
    road_hgv:  0.102,
    rail:      0.028,
    sea:       0.016,
    air:       0.602,
  },

  // ─── Industrial processes ────────────────────────────────────────────────────
  industrial: {
    cement_tonne:     816.0,
    steel_tonne:     1850.0,
    aluminium_tonne: 12000.0,
    paper_tonne:     1060.0,
    plastic_tonne:   3140.0,
  },

  // ─── Waste (kg CO2e per tonne) ───────────────────────────────────────────────
  waste: {
    landfill:              467.0,
    incineration:         1083.0,
    composting:             23.0,
    recycling:             -50.0,
    anaerobic_digestion:   180.0,
  },

  // ─── Water (kg CO2e per cubic meter) ────────────────────────────────────────
  water: {
    supply:     0.344,
    treatment:  0.708,
  },
};

module.exports = EMISSION_FACTORS;
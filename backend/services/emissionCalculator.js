/**
 * EmissionCalculatorService
 * 
 * Converts raw activity quantities into CO2 equivalents (CO2e)
 * using regional emission factors. Supports Climatiq API integration
 * with local fallback factors.
 */

const axios = require('axios');
const logger = require('../utils/logger');
const EMISSION_FACTORS = require('../utils/emissionFactors');

class EmissionCalculatorService {
  /**
   * Calculate CO2e for a single activity entry
   * @param {Object} params
   * @param {string} params.activitySlug - e.g. 'electricity_kwh'
   * @param {number} params.quantity - raw amount
   * @param {string} params.unit - unit of measurement
   * @param {string} params.country - ISO country code
   * @param {Object} [params.activityModel] - DB activity record (optional)
   * @returns {{ co2eKg: number, emissionFactor: number, source: string }}
   */
  async calculate({ activitySlug, quantity, unit, country = 'WORLD', activityModel = null }) {
    let emissionFactor = null;
    let source = 'local';

    // 1. Try Climatiq live factor
    if (process.env.CLIMATIQ_API_KEY && activityModel?.climatiqActivityId) {
      try {
        const result = await this.fetchClimatiqFactor(activityModel.climatiqActivityId, country);
        if (result) {
          emissionFactor = result.factor;
          source = 'climatiq';
        }
      } catch (err) {
        logger.warn(`Climatiq API failed for ${activitySlug}: ${err.message}. Falling back to local.`);
      }
    }

    // 2. Use DB regional factor if available
    if (!emissionFactor && activityModel?.regionalFactors?.[country]) {
      emissionFactor = activityModel.regionalFactors[country];
      source = 'db_regional';
    }

    // 3. Fall back to DB global factor
    if (!emissionFactor && activityModel?.emissionFactor) {
      emissionFactor = activityModel.emissionFactor;
      source = 'db_global';
    }

    // 4. Fall back to local hardcoded factors
    if (!emissionFactor) {
      const localFactor = this.getLocalFactor(activitySlug, country);
      emissionFactor = localFactor;
      source = 'local_fallback';
    }

    if (!emissionFactor) {
      throw new Error(`No emission factor found for activity: ${activitySlug}`);
    }

    const co2eKg = quantity * emissionFactor;

    return { co2eKg: Math.round(co2eKg * 1000) / 1000, emissionFactor, source };
  }

  /**
   * Bulk calculate for Scope 1/2/3 reports
   * @param {Array} entries - Array of { activitySlug, quantity, unit, country, scope }
   * @returns {{ scope1: number, scope2: number, scope3: number, total: number, entries: Array }}
   */
  async bulkCalculate(entries) {
    const results = await Promise.all(
      entries.map(async (entry) => {
        const calc = await this.calculate(entry);
        return { ...entry, ...calc };
      })
    );

    const totals = results.reduce(
      (acc, e) => {
        const scope = e.scope || 'scope1';
        acc[scope] = (acc[scope] || 0) + e.co2eKg;
        acc.total += e.co2eKg;
        return acc;
      },
      { scope1: 0, scope2: 0, scope3: 0, total: 0 }
    );

    return { ...totals, entries: results };
  }

  /**
   * Lifestyle quiz baseline estimator
   * @param {Object} answers - Quiz answers
   * @returns {{ totalKgPerYear: number, breakdown: Object }}
   */
  estimateBaseline(answers) {
    const {
      country = 'WORLD',
      householdSize = 2,
      homeSqm = 80,
      heatingType = 'gas',          // gas | electric | heat_pump | none
      electricityKwhPerMonth = 200,
      carType = 'petrol',            // petrol | diesel | hybrid | electric | none
      kmPerWeek = 100,
      flightsPerYear = 1,
      avgFlightHours = 3,
      meatDaysPerWeek = 4,
      shoppingBudgetMonthly = 200,
    } = answers;

    const factors = EMISSION_FACTORS;

    // Housing
    const electricityKg = electricityKwhPerMonth * 12 * (factors.electricity[country] || factors.electricity.WORLD);
    const heatingKg = heatingType === 'gas'
      ? homeSqm * 80 * 0.2 // rough: 80 kWh/m²/yr at 0.2 kg/kWh gas
      : heatingType === 'electric'
      ? homeSqm * 80 * (factors.electricity[country] || factors.electricity.WORLD)
      : 0;

    // Transport
    const carKg = carType !== 'none'
      ? kmPerWeek * 52 * (factors.car[carType] || factors.car.petrol)
      : 0;
    const flightKg = flightsPerYear * avgFlightHours * 2 * 90; // 90 kg CO2e / flight-hour each way

    // Food
    const meatKg = meatDaysPerWeek * 52 * 3.5; // avg 3.5 kg CO2e per meat meal
    const nonMeatKg = (7 - meatDaysPerWeek) * 52 * 0.5;
    const foodKg = meatKg + nonMeatKg;

    // Shopping
    const shoppingKg = (shoppingBudgetMonthly * 12) * 0.5; // ~0.5 kg per $ spent

    const perPersonFactor = 1 / householdSize;
    const breakdown = {
      housing: Math.round((electricityKg + heatingKg) * perPersonFactor),
      transport: Math.round((carKg + flightKg)),
      food: Math.round(foodKg),
      shopping: Math.round(shoppingKg),
    };

    const totalKgPerYear = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return { totalKgPerYear, breakdown };
  }

  /**
   * Fetch live emission factor from Climatiq API
   */
  async fetchClimatiqFactor(activityId, region) {
    const response = await axios.post(
      'https://beta3.api.climatiq.io/estimate',
      { emission_factor: { activity_id: activityId, region }, parameters: { value: 1, unit: 'kwh' } },
      {
        headers: { Authorization: `Bearer ${process.env.CLIMATIQ_API_KEY}` },
        timeout: 5000,
      }
    );
    return { factor: response.data.co2e };
  }

  /**
   * Local hardcoded fallback factors
   */
  getLocalFactor(slug, country) {
    const factors = EMISSION_FACTORS;
    const map = {
      electricity_kwh: factors.electricity[country] || factors.electricity.WORLD,
      natural_gas_kwh: 0.203,
      lpg_litre: 1.51,
      petrol_litre: 2.31,
      diesel_litre: 2.68,
      petrol_car_km: factors.car.petrol,
      diesel_car_km: factors.car.diesel,
      electric_car_km: factors.car.electric,
      flight_km_economy: 0.255,
      flight_km_business: 0.714,
      beef_kg: 27.0,
      chicken_kg: 6.9,
      vegetables_kg: 2.0,
      dairy_litre: 3.2,
    };
    return map[slug] || null;
  }
}

module.exports = new EmissionCalculatorService();

/**
 * Unit tests for EmissionCalculatorService
 */
const calculator = require('../services/emissionCalculator');

describe('EmissionCalculatorService', () => {
  describe('calculate()', () => {
    it('returns correct CO2e for electricity in India', async () => {
      const result = await calculator.calculate({
        activitySlug: 'electricity_kwh',
        quantity: 100,
        unit: 'kWh',
        country: 'IND',
      });
      expect(result.co2eKg).toBeCloseTo(82, 0); // 100 * 0.82
      expect(result.emissionFactor).toBe(0.82);
    });

    it('returns correct CO2e for petrol car', async () => {
      const result = await calculator.calculate({
        activitySlug: 'petrol_car_km',
        quantity: 1000,
        unit: 'km',
        country: 'WORLD',
      });
      expect(result.co2eKg).toBeCloseTo(192, 0); // 1000 * 0.192
    });

    it('falls back to WORLD electricity factor for unknown country', async () => {
      const result = await calculator.calculate({
        activitySlug: 'electricity_kwh',
        quantity: 100,
        unit: 'kWh',
        country: 'XYZ',
      });
      expect(result.co2eKg).toBeCloseTo(47.5, 0); // 100 * 0.475 world average
    });

    it('throws for unknown activity with no fallback', async () => {
      await expect(
        calculator.calculate({ activitySlug: 'nonexistent_activity', quantity: 1, unit: 'unit', country: 'WORLD' })
      ).rejects.toThrow('No emission factor found');
    });
  });

  describe('estimateBaseline()', () => {
    it('returns positive total footprint', () => {
      const result = calculator.estimateBaseline({
        country: 'IND',
        householdSize: 3,
        electricityKwhPerMonth: 200,
        heatingType: 'none',
        carType: 'petrol',
        kmPerWeek: 80,
        flightsPerYear: 1,
        avgFlightHours: 2,
        meatDaysPerWeek: 5,
        shoppingBudgetMonthly: 150,
      });
      expect(result.totalKgPerYear).toBeGreaterThan(0);
      expect(result.breakdown).toHaveProperty('housing');
      expect(result.breakdown).toHaveProperty('transport');
      expect(result.breakdown).toHaveProperty('food');
      expect(result.breakdown).toHaveProperty('shopping');
    });

    it('vegetarian has lower food footprint than meat-eater', () => {
      const veg = calculator.estimateBaseline({ meatDaysPerWeek: 0 });
      const meat = calculator.estimateBaseline({ meatDaysPerWeek: 7 });
      expect(veg.breakdown.food).toBeLessThan(meat.breakdown.food);
    });

    it('electric car has lower transport footprint than petrol', () => {
      const ev = calculator.estimateBaseline({ carType: 'electric', kmPerWeek: 200 });
      const petrol = calculator.estimateBaseline({ carType: 'petrol', kmPerWeek: 200 });
      expect(ev.breakdown.transport).toBeLessThan(petrol.breakdown.transport);
    });
  });

  describe('bulkCalculate()', () => {
    it('aggregates scope totals correctly', async () => {
      const entries = [
        { activitySlug: 'electricity_kwh', quantity: 1000, unit: 'kWh', country: 'IND', scope: 'scope2' },
        { activitySlug: 'petrol_litre', quantity: 100, unit: 'litre', country: 'IND', scope: 'scope1' },
      ];
      const result = await calculator.bulkCalculate(entries);
      expect(result.scope1).toBeGreaterThan(0);
      expect(result.scope2).toBeGreaterThan(0);
      expect(result.total).toBeCloseTo(result.scope1 + result.scope2 + result.scope3, 2);
    });
  });
});

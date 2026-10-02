import { calculateQibla } from './qibla';

describe('calculateQibla', () => {
  it('calculates expected bearing from Dhaka, Bangladesh', () => {
    // Dhaka: 23.8103° N, 90.4125° E -> expected ~278° (WNW)
    const result = calculateQibla(23.8103, 90.4125);
    expect(result.degrees).toBeGreaterThanOrEqual(275);
    expect(result.degrees).toBeLessThanOrEqual(280);
    expect(result.compassDirection).toBe('W');
  });

  it('calculates expected bearing from London, UK', () => {
    // London: 51.5074° N, 0.1278° W -> expected ~119° (ESE)
    const result = calculateQibla(51.5074, -0.1278);
    expect(result.degrees).toBeGreaterThanOrEqual(117);
    expect(result.degrees).toBeLessThanOrEqual(121);
    expect(result.compassDirection).toBe('ESE');
  });

  it('calculates expected bearing from New York, USA', () => {
    // New York: 40.7128° N, 74.0060° W -> expected ~58° (ENE)
    const result = calculateQibla(40.7128, -74.006);
    expect(result.degrees).toBeGreaterThanOrEqual(56);
    expect(result.degrees).toBeLessThanOrEqual(60);
    expect(result.compassDirection).toBe('ENE');
  });
});

import { bootstrapData } from './repository.js';

export async function seedDatabase() {
  await bootstrapData();
}

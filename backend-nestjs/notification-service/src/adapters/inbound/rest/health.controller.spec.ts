import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('debe retornar estado OK', () => {
    const result = controller.checkHealth();
    expect(result.status).toBe('OK');
    expect(result.service).toBe('notification-service');
    expect(result.timestamp).toBeDefined();
  });
});

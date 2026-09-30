import { DriverAdminController } from './driver-admin.controller';

describe('DriverAdminController', () => {
  const service = {
    listDrivers: jest.fn(),
    setDriverStatus: jest.fn(),
    assignDriver: jest.fn(),
    unassignDriver: jest.fn(),
  };
  const controller = new DriverAdminController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists driver accounts', async () => {
    service.listDrivers.mockResolvedValue([{ id: 'driver-1' }]);
    await expect(controller.listDrivers()).resolves.toEqual([{ id: 'driver-1' }]);
    expect(service.listDrivers).toHaveBeenCalledTimes(1);
  });

  it('delegates activation changes', async () => {
    service.setDriverStatus.mockResolvedValue({ id: 'driver-1', isActive: false });
    await expect(
      controller.setDriverStatus('driver-1', { isActive: false }, { userId: 'admin-1' } as never),
    ).resolves.toEqual({
      id: 'driver-1',
      isActive: false,
    });
    expect(service.setDriverStatus).toHaveBeenCalledWith(
      'driver-1',
      { isActive: false },
      'admin-1',
    );
  });

  it('supports assignment replacement and unassignment', async () => {
    const driverId = '00000000-0000-4000-8000-000000000002';
    service.assignDriver.mockResolvedValue({ tripId: 'trip-1', driverId });
    service.unassignDriver.mockResolvedValue({ removed: true });

    await expect(
      controller.assignDriver('trip-1', { driverId }, { userId: 'admin-1' } as never),
    ).resolves.toEqual({ tripId: 'trip-1', driverId });
    await expect(
      controller.unassignDriver('trip-1', { userId: 'admin-1' } as never),
    ).resolves.toEqual({ removed: true });
    expect(service.assignDriver).toHaveBeenCalledWith('trip-1', { driverId }, 'admin-1');
    expect(service.unassignDriver).toHaveBeenCalledWith('trip-1', 'admin-1');
  });
});

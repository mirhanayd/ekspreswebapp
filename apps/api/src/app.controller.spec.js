"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_controller_1 = require("./app.controller");
const contracts_1 = require("@ekspres/contracts");
describe('AppController', () => {
    let appController;
    beforeEach(async () => {
        const app = await testing_1.Test.createTestingModule({
            controllers: [app_controller_1.AppController],
        }).compile();
        appController = app.get(app_controller_1.AppController);
    });
    describe('getStatus', () => {
        it('should return service ok status', () => {
            const response = appController.getStatus();
            expect(response.service).toBe('api');
            expect(response.status).toBe(contracts_1.ApplicationStatus.OK);
            expect(response.timestamp).toBeDefined();
        });
    });
});
//# sourceMappingURL=app.controller.spec.js.map
import { ValidationRegistry } from 'langium';
import type { BifrostServices } from './bifrost-module';

/**
 * Registry for validation checks.
 */
export class BifrostValidationRegistry extends ValidationRegistry {
    constructor(services: BifrostServices) {
        super(services);
        //const validator = services.validation.BifrostValidator;
        //const checks: ValidationChecks<BifrostAstType> = {};
        //this.register(checks, validator);
    }
}
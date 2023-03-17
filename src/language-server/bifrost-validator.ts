import { ValidationChecks } from 'langium';
import { BifrostAstType } from './generated/ast';
import type { BifrostServices } from './bifrost-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BifrostServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BifrostValidator;
    const checks: ValidationChecks<BifrostAstType> = {
        
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class BifrostValidator {


}

import { ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import { BifrostAstType, Person } from './generated/ast';
import type { BifrostServices } from './bifrost-module';

/**
 * Registry for validation checks.
 */
export class BifrostValidationRegistry extends ValidationRegistry {
    constructor(services: BifrostServices) {
        super(services);
        const validator = services.validation.BifrostValidator;
        const checks: ValidationChecks<BifrostAstType> = {
            Person: validator.checkPersonStartsWithCapital
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class BifrostValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}

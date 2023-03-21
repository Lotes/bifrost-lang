import { AstNode, getContainerOfType, ValidationAcceptor, ValidationChecks } from 'langium';
import { BifrostAstType, isConstructorApplication, isParenthesesExpression, isPatternMatchDefinition, MatchVariableDefinition } from './generated/ast';
import type { BifrostServices } from './bifrost-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BifrostServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BifrostValidator;
    const checks: ValidationChecks<BifrostAstType> = {
        MatchVariableDefinition: [
            validator.checkMatchVariableDefinitionWithinPatternMatch,
            validator.checkMatchVariableDefinitionIsConstructorArgument
        ],
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class BifrostValidator {
    checkMatchVariableDefinitionWithinPatternMatch(variableDef: MatchVariableDefinition, accept: ValidationAcceptor): void {
        const container = getContainerOfType(variableDef, isPatternMatchDefinition);
        if(!container) {
            accept('error', `Match variables can only be defined within pattern match definitions.`, {
                node: variableDef
            });
        }
    }
    checkMatchVariableDefinitionIsConstructorArgument(variableDef: MatchVariableDefinition, accept: ValidationAcceptor): void {
        let container: AstNode|undefined = variableDef.$container;
        while(container && !isPatternMatchDefinition(container)) {
            if(
                !isParenthesesExpression(container)
                && !isConstructorApplication(container)
            ) {
                accept('error', `Match variables can only be arguments of constructors.`, {
                    node: variableDef
                });
                break;
            }
            container = container.$container;
        }
    }
}

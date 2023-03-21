import { AstNode, getContainerOfType, ValidationAcceptor, ValidationChecks } from 'langium';
import { BifrostAstType, Expression, isConstructorApplication, isParenthesesExpression, isPatternMatchDefinition, isPatternMatching, MatchVariableDefinition, TypeExpression } from './generated/ast';
import type { BifrostServices } from './bifrost-module';
import { inferType } from './bifrost-type-system';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BifrostServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BifrostValidator;
    const checks: ValidationChecks<BifrostAstType> = {
        Expression: [validator.checkExpressionHasType],
        TypeExpression: [validator.checkTypeExpressionHasType],
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
    checkExpressionHasType(expression: Expression, accept: ValidationAcceptor): void {
        if(!inferType(expression)){
            accept('error', `Expression has no type.`, {
                node: expression
            });
        }
    }
    checkTypeExpressionHasType(expression: TypeExpression, accept: ValidationAcceptor): void {
        if(!inferType(expression)){
            accept('error', `Type expression has no type.`, {
                node: expression
            });
        }
    }
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
        while(container && !isPatternMatching(container)) {
            if(
                !isParenthesesExpression(container)
                && !isConstructorApplication(container)
                && !isPatternMatchDefinition(container)
            ) {
                accept('error', `Match variables can only be arguments of constructors or whole types.`, {
                    node: variableDef
                });
                break;
            }
            container = container.$container;
        }
    }
}

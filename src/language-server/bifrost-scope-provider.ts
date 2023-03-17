import { assertUnreachable, AstNode, AstTypeList, DefaultScopeProvider, Reference, ReferenceInfo, Scope } from "langium";
import { BifrostAstType, isConstructorApplication, isDataType, isForeignInstancePortExpression, isImplementationDefinition, isMatchVariableUsage, isModuleInstance, isSelfInstancePortExpression, isTypeApplication, isTypeParameterReference } from "./generated/ast";

type ExtractKeysOfValueType<T, K> = { [I in keyof T]: T[I] extends K ? I : never }[keyof T];

type CrossReferencesOfAstNodeType<N extends AstNode> = (
  ExtractKeysOfValueType<N, Reference|undefined>
  | ExtractKeysOfValueType<N, Array<Reference|undefined>|undefined>
// eslint-disable-next-line @typescript-eslint/ban-types
) & {};

export type AstNodeTypesWithCrossReferences<A extends AstTypeList<A>> = {
  [T in keyof A]: CrossReferencesOfAstNodeType<A[T]> extends never ? never : A[T]
}[keyof A];

export class BifrostScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    const node = context.container as AstNodeTypesWithCrossReferences<BifrostAstType>;
    if(isTypeParameterReference(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'typeParameter':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isForeignInstancePortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'instanceRef':
          return undefined!;
        case 'portRef':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isSelfInstancePortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'portRef':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isTypeApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'dataType':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isImplementationDefinition(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'iface':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isModuleInstance(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'module':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } if(isConstructorApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'constructor':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } if(isMatchVariableUsage(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'variable':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isDataType(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'dataType':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else {
      assertUnreachable(node);
    }

    return super.getScope(context);
  } 
}

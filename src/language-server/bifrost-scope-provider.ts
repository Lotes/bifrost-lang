import { assertUnreachable, AstNode, AstNodeDescriptionProvider, AstTypeList, DefaultScopeProvider, getContainerOfType, Reference, ReferenceInfo, Scope, stream } from "langium";
import { BifrostServices } from "./bifrost-module";
import { BifrostAstType, DataTypeDefinition, ImplementationBody, ImplementationDefinition, InterfaceDefinition, isConstructorApplication, isDataType, isForeignInstancePortExpression, isImplementationBody, isImplementationDefinition, isMatchVariableUsage, isModuleInstance, isSelfInstancePortExpression, isSignatureType, isTypeApplication, isTypeParameterReference } from "./generated/ast";

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
  private astNodeDescriptionProvider: AstNodeDescriptionProvider;
  constructor(services: BifrostServices) {
    super(services);
    this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
  }
  override getScope(context: ReferenceInfo): Scope {
    const node = context.container as AstNodeTypesWithCrossReferences<BifrostAstType>;
    if(isTypeParameterReference(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'typeParameter':
          const descriptions = getContainerOfType(node, isSignatureType)!.typeParameters
            .map(tp  => this.astNodeDescriptionProvider.createDescription(tp, tp.name));
          return this.createScope(stream(descriptions))
        default:
          assertUnreachable(property);
      }
    } else if(isForeignInstancePortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'instanceRef':
          const body = getContainerOfType(node, isImplementationBody)!;
          return this.getInstancesFromImplementationBody(body);        
        case 'portRef':
          const instance = node.instanceRef.ref;
          if(instance) {
            const module = instance.module.ref;
            if(module) {
              const descriptions = module.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
              return this.createScope(stream(descriptions));
            }
          }
          break;
        default:
          assertUnreachable(property);
      }
    } else if(isSelfInstancePortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'portRef':
          const implementation = getContainerOfType(node, isImplementationDefinition)!;
          const descriptions = implementation.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
          return this.createScope(stream(descriptions));
        default:
          assertUnreachable(property);
      }
    } else if(isTypeApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'dataType':
          const descriptions = [DataTypeDefinition, InterfaceDefinition, ImplementationDefinition].flatMap(tp => this.indexManager.allElements(tp).toArray());
          return this.createScope(descriptions)
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
          return this.createScope(this.indexManager.allElements(ImplementationDefinition).toArray());
        default:
          assertUnreachable(property);
      }
    } else if(isConstructorApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'constructor':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isMatchVariableUsage(node)) {
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
  getInstancesFromImplementationBody(body: ImplementationBody): Scope {
    const descriptions = body.modules.map(module => this.astNodeDescriptionProvider.createDescription(module, module.name));
    const parentBody = getContainerOfType(body.$container, isImplementationBody);
    const outerScope = parentBody ? this.getInstancesFromImplementationBody(parentBody) : undefined;
    return this.createScope(stream(descriptions), outerScope);
  }
}

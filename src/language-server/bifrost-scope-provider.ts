import { assertUnreachable, AstNode, AstNodeDescriptionProvider, AstTypeList, DefaultScopeProvider, getContainerOfType, Reference, ReferenceInfo, Scope, stream } from "langium";
import { BifrostServices } from "./bifrost-module";
import { BifrostAstType, DataTypeDefinition, InstanceSource, isConstructorApplication, isDataType, isMatchVariableUsage, isNode, isNodePortExpression, isNodePortSource, isNodeTypeBody, isNodeTypeDefinition, isNodeTypeDefinitionSource, isSelfPortExpression, isSelfPortSource, isSignatureType, isTypeApplication, isTypeParameterReference, NodeTypeBody, NodeTypeDefinition } from "./generated/ast";

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
    } else if(isNodePortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'instanceRef':
          const body = getContainerOfType(node, isNodeTypeBody)!;
          return this.getInstancesFromImplementationBody(body);        
        case 'portRef':
          const instance = node.instanceRef.ref;
          if(instance) {
            const source = instance.source;
            return this.resolveSource(source);
          }
          break;
        default:
          assertUnreachable(property);
      }
    } else if(isSelfPortExpression(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'portRef':
          const implementation = getContainerOfType(node, isNodeTypeDefinition)!;
          const descriptions = implementation.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
          return this.createScope(stream(descriptions));
        default:
          assertUnreachable(property);
      }
    } else if(isTypeApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'dataType':
          const descriptions = [DataTypeDefinition, NodeTypeDefinition].flatMap(tp => this.indexManager.allElements(tp).toArray());
          return this.createScope(descriptions)
        default:
          assertUnreachable(property);
      }
    } else if(isNodeTypeDefinition(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'iface':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isNode(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'module':
          return this.createScope(this.indexManager.allElements(NodeTypeDefinition).toArray());
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
        case 'constructor':
          return undefined!;
        default:
          assertUnreachable(property);
      }
    } else if(isSelfPortSource(node)) {
      
    } else  if(isNodePortSource(node)) {
      
    } else  if(isNodeTypeDefinitionSource(node)) {
      
    } else {
      assertUnreachable(node);
    }
    return super.getScope(context);
  } 
  resolveSource(source: InstanceSource): Scope {
    if(isSelfPortSource(source)) {
    } else if(isNodePortSource(source)) {
    } else if(isNodeTypeDefinitionSource(source)) {
      const nodeRef = source.nodeDef.ref;
      if(nodeRef) {
        let descriptions = nodeRef.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
        return this.createScope(stream(descriptions));
      }
    } else {
      assertUnreachable(source);
    }
    return undefined!;
  }
  getInstancesFromImplementationBody(body: NodeTypeBody): Scope {
    const descriptions = body.nodes.map(node => this.astNodeDescriptionProvider.createDescription(node, node.name));
    const parentBody = getContainerOfType(body.$container, isNodeTypeBody);
    const outerScope = parentBody ? this.getInstancesFromImplementationBody(parentBody) : undefined;
    return this.createScope(stream(descriptions), outerScope);
  }
}

import { assertUnreachable, AstNode, AstNodeDescriptionProvider, AstNodeLocator, AstTypeList, DefaultScopeProvider, getContainerOfType, LangiumDocuments, Reference, ReferenceInfo, Scope, stream, streamAst } from "langium";
import { BifrostServices } from "./bifrost-module";
import { inferType } from "./bifrost-type-system";
import { BifrostAstType, DataTypeDefinition, InstanceSource, isConstructorApplication, 
  isMatchVariableDefinition, 
  isMatchVariableUsage, isNodePortExpression, isNodeTypeBody, isNodeTypeDefinition, 
  isNodeTypeDefinitionSource, isPatternMatchDefinition, isSelfPortExpression, isSelfPortSource, isSignatureType, isTypeApplication, isTypeParameterReference, NodeTypeBody, NodeTypeDefinition, PatternMatchDefinition } from "./generated/ast";

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
  private astNodeLocator: AstNodeLocator;
  private documents: LangiumDocuments;
  constructor(services: BifrostServices) {
    super(services);
    this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    this.astNodeLocator = services.workspace.AstNodeLocator;
    this.documents = services.shared.workspace.LangiumDocuments;

  }
  override getScope(context: ReferenceInfo): Scope {
    const node = context.container as AstNodeTypesWithCrossReferences<BifrostAstType>;
    if(isTypeParameterReference(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'typeParameter':
          const descriptions = getContainerOfType(node, isSignatureType)!.typeParameters
            .map(tp  => this.astNodeDescriptionProvider.createDescription(tp, tp.name));
          return this.createScope(stream(descriptions));
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
            return this.resolveSource(source) ?? super.getScope(context);
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
          return this.createScope(this.indexManager.allElements(NodeTypeDefinition).toArray());
        default:
          assertUnreachable(property);
      }
    } else if(isConstructorApplication(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'constructor':
          const dataTypes = this.indexManager.allElements(DataTypeDefinition).map(d => this.astNodeLocator.getAstNode(this.documents.getOrCreateDocument(d.documentUri)!.parseResult.value, d.path) as DataTypeDefinition).toArray();
          const descriptions = dataTypes.flatMap(d => d.constructors).map(c => this.astNodeDescriptionProvider.createDescription(c, c.name));
          return this.createScope(descriptions);
        default:
          assertUnreachable(property);
      }
    } else if(isMatchVariableUsage(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'variable':
          const match = getContainerOfType(node, isPatternMatchDefinition)!;
          return this.lookupMatchVariables(match);
        default:
          assertUnreachable(property);
      }
    } else if(isSelfPortSource(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'portRef':
          const definition = getContainerOfType(node, isNodeTypeDefinition)!;
          const descriptions = definition.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
          return this.createScope(descriptions);
        default:
          assertUnreachable(property);
      }
    } else if(isNodeTypeDefinitionSource(node)) {
      const property = context.property as CrossReferencesOfAstNodeType<typeof node>;
      switch(property) {
        case 'nodeDef':
          return this.createScope(this.indexManager.allElements(NodeTypeDefinition).toArray());
        default:
          assertUnreachable(property);
      }
    } else {
      assertUnreachable(node);
    }
    return super.getScope(context);
  } 
  lookupMatchVariables(match: PatternMatchDefinition): Scope {
    const descriptions = streamAst(match.pattern).filter(isMatchVariableDefinition).map(v => this.astNodeDescriptionProvider.createDescription(v, v.name));
    const outerMatch = getContainerOfType(match.$container, isPatternMatchDefinition);
    const outerScope = outerMatch ? this.lookupMatchVariables(outerMatch) : undefined;
    return this.createScope(descriptions, outerScope);
  }
  resolveSource(source: InstanceSource): Scope|undefined {
    if(isSelfPortSource(source)) {
      const type = inferType(source.portRef.ref!.type);
      if(isNodeTypeDefinition(type)) {
        const descriptions = type.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
        return this.createScope(stream(descriptions));
      } 
    } else if(isNodeTypeDefinitionSource(source)) {
      const nodeRef = source.nodeDef.ref;
      if(nodeRef) {
        let descriptions = nodeRef.ports.map(port => this.astNodeDescriptionProvider.createDescription(port, port.name));
        return this.createScope(stream(descriptions));
      }
    } else {
      assertUnreachable(source);
    }
    return undefined;
  }
  getInstancesFromImplementationBody(body: NodeTypeBody): Scope {
    const descriptions = body.nodes.map(node => this.astNodeDescriptionProvider.createDescription(node, node.name));
    const parentPatternMatch = getContainerOfType(body.$container, isPatternMatchDefinition);
    if(parentPatternMatch) {
      const parentBody = getContainerOfType(parentPatternMatch.$container, isNodeTypeBody)!;
      const outerScope = this.getInstancesFromImplementationBody(parentBody);
      return this.createScope(stream(descriptions), outerScope);
    } else {
      const parentBody = getContainerOfType(body.$container, isNodeTypeBody)!;
      const outerScope = parentBody ? this.getInstancesFromImplementationBody(parentBody) : undefined;
      return this.createScope(stream(descriptions), outerScope);
    }
  }
}

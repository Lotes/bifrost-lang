import { assertUnreachable, AstNode } from "langium";
import { BifrostAstType, DataTypeDefinition, isBooleanConstructor, isFloatConstructor, isStringConstructor, isIntegerConstructor, NodeTypeDefinition, isTypeApplication, isTypeParameterReference, isParenthesesTypeExpression, isBinaryExpression, isConstructorApplication, isMatchVariableDefinition, isMatchVariableUsage, isNodePortExpression, isNumericLiteral, isParenthesesExpression, isSelfPortExpression, isStringLiteral, isSelfPortSource, isNodeTypeDefinition, isNodeTypeDefinitionSource, isDataTypeDefinition, isPatternMatchDefinition } from "./generated/ast";

export interface TypeDescriptionBase {
  scope: 'value';
}

export interface ValueLevelTypeDescriptionBase extends TypeDescriptionBase {
  scope: 'value';
  kind: 'primitive'|'datatype'|'nodetype'|'none';
}

export interface PrimitiveTypeDescription extends ValueLevelTypeDescriptionBase {
  kind: 'primitive';
  name: 'integer'|'boolean'|'string'|'float';
}

export interface DataTypeDescription extends ValueLevelTypeDescriptionBase {
  kind: 'datatype';
  definition: DataTypeDefinition;
}

export interface NodeTypeDescription extends ValueLevelTypeDescriptionBase {
  kind: 'nodetype';
  definition: NodeTypeDefinition;
}

export interface NoneTypeDescription extends ValueLevelTypeDescriptionBase {
  kind: 'none';
}

export type TypeDescription = PrimitiveTypeDescription | DataTypeDescription | NodeTypeDescription | NoneTypeDescription;

type TypeComputers = {
  [key in keyof BifrostAstType]: (this: TypeComputers, node: BifrostAstType[key]) => TypeDescription;
}

export const ValueExpressionTypes = {
  None: (): NoneTypeDescription => ({ scope: 'value', kind: 'none' }),
  Integer: (): PrimitiveTypeDescription => ({ scope: 'value', kind: 'primitive', name: 'integer' }),
  Boolean: (): PrimitiveTypeDescription => ({ scope: 'value', kind: 'primitive', name: 'boolean' }),
  String: (): PrimitiveTypeDescription => ({ scope: 'value', kind: 'primitive', name: 'string' }),
  Float: (): PrimitiveTypeDescription => ({ scope: 'value', kind: 'primitive', name: 'float' }),
  DataTypeInstance: (definition: DataTypeDefinition): DataTypeDescription => ({ scope: 'value', kind: 'datatype', definition }),
  NodeTypeInstance: (definition: NodeTypeDefinition): NodeTypeDescription => ({ scope: 'value', kind: 'nodetype', definition }), 
};

export function inferType(node: AstNode) {
  const key = node.$type as keyof BifrostAstType;
  return typeComputers[key](node as any);
}

const typeComputers: TypeComputers = {
  BinaryExpression(node) {
    const leftType = this.Expression(node.left);
    //const rightType = this.Expression(node.right);
    //const operator = node.op;
    return leftType; //TODO fix it
  },
  BooleanConstructor(_node) {
    return ValueExpressionTypes.Boolean();
  },
  ConstructorApplication(node) {
    const typeDef = node.constructor.ref!.$container;
    return ValueExpressionTypes.DataTypeInstance(typeDef);
  },
  DataTypeDefinition(node) {
    return ValueExpressionTypes.DataTypeInstance(node);
  },
  DataTypeConstructorDefinition(node) {
    return ValueExpressionTypes.DataTypeInstance(node.$container);
  },
  Expression(node) {
    if(isBinaryExpression(node)) {
      return this.BinaryExpression(node);
    } else if(isConstructorApplication(node)) {
      return this.ConstructorApplication(node);
    } else if(isMatchVariableDefinition(node)) {
      return this.MatchVariableDefinition(node);
    } else if(isMatchVariableUsage(node)) {
      return this.MatchVariableUsage(node);
    } else if(isNodePortExpression(node)) {
      return this.NodePortExpression(node);
    } else if(isNumericLiteral(node)) {
      return this.NumericLiteral(node);
    } else if(isParenthesesExpression(node)) {
      return this.ParenthesesExpression(node);
    } else if(isSelfPortExpression(node)) {
        return this.SelfPortExpression(node);
    } else if(isStringLiteral(node)) {
      return this.StringLiteral(node);
    } else {
      assertUnreachable(node);
    }
  },
  FloatConstructor(_node) {
    return ValueExpressionTypes.Float();
  },
  File(_node) {
    return ValueExpressionTypes.None();
  },
  InstanceSource(node) {
    if(isNodeTypeDefinitionSource(node)) {
      return this.NodeTypeDefinitionSource(node);
    } else if(isSelfPortSource(node)) {
      return this.SelfPortSource(node);
    } else {
      assertUnreachable(node);
    }
  },
  IntegerConstructor(_node) {
    return ValueExpressionTypes.Integer();
  },
  LinkDefinition(_node) {
    return ValueExpressionTypes.None();
  },
  MatchVariableDefinition(node) {
      let container: AstNode|undefined = node.$container;
      while(container && !isPatternMatchDefinition(container)) {
        if(isParenthesesExpression(container)) {
          container = container.$container;
        } else if(isConstructorApplication(container)) {
          const index = container.arguments.findIndex(a => a === node);
          return container.arguments.length > index && index >= 0
            ? this.TypeExpression(container.constructor.ref!.arguments[index])
            : ValueExpressionTypes.None();
        } else {
          break;
        }
      }
      return ValueExpressionTypes.None();
  },
  MatchVariableUsage(node) {
    return this.MatchVariableDefinition(node.variable.ref!);
  },
  Node(node) {
    return this.InstanceSource(node.source);
  },
  NodePortExpression(node) {
    return this.PortDefinition(node.portRef.ref!);
  },
  NodeTypeDefinition(node) {
    return ValueExpressionTypes.NodeTypeInstance(node);
  },
  NodeTypeBody(_node) {
    return ValueExpressionTypes.None();
  },
  NodeTypeDefinitionSource(node) {
    return ValueExpressionTypes.NodeTypeInstance(node.nodeDef.ref!);
  },
  NumericLiteral(_node) {
    return ValueExpressionTypes.Float();
  },
  PortDefinition(node) {
    return this.TypeExpression(node.type);
  },
  ParenthesesExpression(node) {
    return this.Expression(node.expression);
  },
  ParenthesesTypeExpression(node) {
    return this.TypeExpression(node.type);
  },
  PatternMatchDefinition(_node) {
    return ValueExpressionTypes.None();
  },
  PatternMatching(_node) {
    return ValueExpressionTypes.None();
  },
  SelfPortExpression(node) {
    return this.PortDefinition(node.portRef.ref!);
  },
  SelfPortSource(node) {
    return this.PortDefinition(node.portRef.ref!);
  },
  StringConstructor(_node) {
    return ValueExpressionTypes.String();
  },
  TypeExpression(node) {
    if(isBooleanConstructor(node)) {
      return this.BooleanConstructor(node);
    } else if(isFloatConstructor(node)) {
      return this.FloatConstructor(node);
    } else if(isStringConstructor(node)) {
      return this.StringConstructor(node);
    } else if(isIntegerConstructor(node)) {
      return this.IntegerConstructor(node);
    } else if(isParenthesesTypeExpression(node)) {
      return this.ParenthesesTypeExpression(node);
    } else if(isTypeApplication(node)) {
      return this.TypeApplication(node);
    } else if(isTypeParameterReference(node)) {
      return this.TypeParameterReference(node);
    } else {
      assertUnreachable(node);
    }
  },
  SignatureType(node) {
    const dataType = node;
    if(isDataTypeDefinition(dataType)) {
      return ValueExpressionTypes.DataTypeInstance(dataType);
    } else if(isNodeTypeDefinition(dataType)) {
      return ValueExpressionTypes.NodeTypeInstance(dataType);
    } else {
      assertUnreachable(dataType);
    }
  },
  StringLiteral(_node) {
    return ValueExpressionTypes.String();
  },
  TypeApplication(node) {
    return this.SignatureType(node.dataType.ref!);
  },
  TypeParameter(node) {
    const container = node.$container;
    if(isDataTypeDefinition(container)) {
      return ValueExpressionTypes.DataTypeInstance(container);
    } else if(isNodeTypeDefinition(container)) {
      return ValueExpressionTypes.NodeTypeInstance(container);
    } else {
      assertUnreachable(container);
    }
  },
  TypeParameterReference(node) {
    const container = node.typeParameter.ref!.$container;
    if(isDataTypeDefinition(container)) {
      return ValueExpressionTypes.DataTypeInstance(container);
    } else if(isNodeTypeDefinition(container)) {
      return ValueExpressionTypes.NodeTypeInstance(container);
    } else {
      assertUnreachable(container);
    }
  }
};
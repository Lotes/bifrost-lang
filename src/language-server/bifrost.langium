grammar Bifrost

entry File: 
    (
        implementations+=NodeTypeDefinition
        | dataTypeDefinitions+=DataTypeDefinition
    )*
    ;

type SignatureType = DataTypeDefinition | NodeTypeDefinition;

fragment TypeParametersClause: '<' typeParameters+=TypeParameter (',' typeParameters+=TypeParameter)* '>';
fragment TypeParameterAssignmentsClause: '<' arguments+=TypeExpression (',' arguments+=TypeExpression)* '>';
fragment ConstructorParameterAssignmentsClause: arguments+=TypeExpression*;

DataTypeDefinition:
    'datatype' name=UPPER_ID TypeParametersClause? '{'
        constructors+=DataTypeConstructorDefinition (',' constructors+=DataTypeConstructorDefinition)*
    '}'
    ;

DataTypeConstructorDefinition:
    name=UPPER_ID ConstructorParameterAssignmentsClause?
    ;

NodeTypeDefinition:
    abstract?='abstract'?
    'nodetype' name=UPPER_ID TypeParametersClause? 
    ('of' iface=[NodeTypeDefinition] TypeParameterAssignmentsClause?)?
    '(' (ports+=PortDefinition (',' ports+=PortDefinition)*)? ')' 
    '{' body=NodeTypeBody '}'
    ;

NodeTypeBody:
    (
        nodes+=Node ';'
        | links+=LinkDefinition ';'
        | matches+=PatternMatching
    )*
    ;

TypeParameter: name=LOWER_ID;

TypeExpression:
    {infer TypeParameterReference} typeParameter=[TypeParameter]
    | {infer TypeApplication} dataType=[SignatureType] TypeParameterAssignmentsClause?
    | {infer ParenthesesTypeExpression} '(' type=TypeExpression ')'
    | {infer IntegerConstructor} 'Integer'
    | {infer FloatConstructor} 'Float'
    | {infer StringConstructor} 'String'
    | {infer BooleanConstructor} 'Boolean'
    ;


PatternMatching:
    'match' source=Expression 'with' '{' 
        (matches+=PatternMatchDefinition)*
    '}'
    ;

PatternMatchDefinition:
    'case' pattern=Expression '{'
        body=NodeTypeBody
    '}';

LinkDefinition: 'link' source=Expression 'to' target=Expression;

Expression infers Expression:
    Addition
    ({infer BinaryExpression.left=current} op=('=='|'!='|'<'|'>'|'<='|'>=') right=Addition)*
    ;

Addition infers Expression:
    Factor 
    ({infer BinaryExpression.left=current} op=('+'|'-') right=Factor)*
    ;

Factor infers Expression:
    Primary 
    ({infer BinaryExpression.left=current} op=('*'|'/'|'mod'|'div') right=Primary)*
    ;

Primary infers Expression:    
     {infer SelfPortExpression} 'this' '.' portRef=[PortDefinition:LOWER_ID]
     | {infer NodePortExpression} 'this' '.' instanceRef=[Node] '.' portRef=[PortDefinition:LOWER_ID]
     | {infer NumericLiteral} number=INT
     | {infer StringLiteral} string=STRING
     | {infer ParenthesesExpression} '(' expression=Expression ')'
     | {infer ConstructorApplication} constructor=[DataTypeConstructorDefinition] arguments+=Primary*
     | {infer MatchVariableDefinition} name=LOWER_ID '?'
     | {infer MatchVariableUsage} variable=[MatchVariableDefinition:LOWER_ID]
     ;

Node:
    'node' name=LOWER_ID 'of' 'new' source=InstanceSource
    ;

InstanceSource:
    {infer NodeTypeDefinitionSource} nodeDef=[NodeTypeDefinition] TypeParameterAssignmentsClause?
    | {infer SelfPortSource} 'this' '.' portRef=[PortDefinition:LOWER_ID]
    ;

PortDefinition: direction=Direction name=LOWER_ID 'of' type=TypeExpression;

Direction returns string: 'in' | 'out';

hidden terminal WS: /\s+/;
terminal LOWER_ID: /[a-z][\w_]*/;
terminal UPPER_ID: /[_A-Z][\w_]*/;
terminal INT: /0|[1-9][0-9]*/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

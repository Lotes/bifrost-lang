grammar Bifrost

entry File: 
    (
        interfaces+=InterfaceDefinition
        | implementations+=ImplementationDefinition
        | dataTypeDefinitions+=DataTypeDefinition
    )*
    ;

type ProcessSignatureType = InterfaceDefinition | ImplementationDefinition;
type SignatureType = DataTypeDefinition | ProcessSignatureType;

DataTypeDefinition:
    'datatype' name=UPPER_ID typeParameters+=TypeParameter* '{'
        constructors+=DataTypeConstructorDefinition (',' constructors+=DataTypeConstructorDefinition)*
    '}'
    ;

TypeParameter: name=LOWER_ID;

DataTypeConstructorDefinition:
    name=UPPER_ID parameters+=TypeExpression*
    ;

TypeExpression:
    {infer TypeParameterReference} typeParameter=[TypeParameter]
    | {infer TypeApplication} dataType=[SignatureType] typeParameters+=TypeExpression*
    | {infer ParenthesesTypeExpression} '(' type=TypeExpression ')'
    ;
    
InterfaceDefinition:
    'interface' name=UPPER_ID typeParameters+=TypeParameter* '{'
        (ports+=PortDefinition ';')*
    '}'
    ;


ImplementationDefinition:
    'implementation' name=UPPER_ID typeParameters+=TypeParameter* ('of' iface=[InterfaceDefinition] arguments+=TypeExpression*)? '{' 
        (ports+=PortDefinition ';')*
        body=ImplementationBody
    '}'
    ;

ImplementationBody:
    (
        modules+=ModuleInstance ';'
        | links+=WireDefinition ';'
        | matches+=PatternMatching
    )*
    ;

PatternMatching:
    'match' source=Expression 'with' '{' 
        (matches+=PatternMatchDefinition)*
    '}'
    ;

PatternMatchDefinition:
    'case' pattern=Expression '{'
        body=ImplementationBody
    '}';

WireDefinition: 'wire' source=Expression 'to' target=Expression;

Expression:
    Addition
    ({infer BinaryWireTargetExpression.left=current} op=('=='|'!='|'<'|'>'|'<='|'>=') right=Addition)*
    ;
Addition:
    Factor 
    ({infer BinaryWireTargetExpression.left=current} op=('+'|'-') right=Factor)*
    ;

Factor:
    Primary 
    ({infer BinaryWireTargetExpression.left=current} op=('*'|'/'|'mod'|'div') right=Primary)*
    ;

Primary:    
     {infer SelfInstancePortExpression} 'this' '.' portRef=[PortDefinition:LOWER_ID]
     | {infer ForeignInstancePortExpression} instanceRef=[ModuleInstance] '.' portRef=[PortDefinition:LOWER_ID]
     | {infer NumericLiteral} number=INT
     | {infer StringLiteral} string=STRING
     | {infer ParenthesesWireTargetExpression} '(' expression=Expression ')'
     | {infer ConstructorApplication} constructor=[DataTypeConstructorDefinition] arguments+=Primary*
     | {infer MatchVariableDefinition} name=LOWER_ID '?'
     | {infer MatchVariableUsage} variable=[MatchVariableDefinition:LOWER_ID]
     ;

ModuleInstance:
    'instance' name=LOWER_ID 'of' module=[ImplementationDefinition] arguments+=TypeExpression*
    ;

PortDefinition: direction=Direction name=LOWER_ID 'of' type=DataType;

DataType:
    {infer TypeConstructor} expr=TypeExpression
    | {infer IntegerConstructor} 'Integer'
    | {infer FloatConstructor} 'Float'
    | {infer StringConstructor} 'String'
    | {infer BooleanConstructor} 'Boolean'
    ;

Direction returns string: 'in' | 'out';

hidden terminal WS: /\s+/;
terminal LOWER_ID: /[a-z][\w_]*/;
terminal UPPER_ID: /[_A-Z][\w_]*/;
terminal INT: /0|[1-9][0-9]*/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

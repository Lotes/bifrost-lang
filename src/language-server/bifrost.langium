grammar Bifrost

entry File: 
    (
        interfaces+=InterfaceDefinition
        | implementations+=ImplementationDefinition
        | dataTypeDefinitions+=DataTypeDefinition
    )*
    ;

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
    | {infer TypeApplication} dataType=[DataTypeDefinition] typeParameters+=TypeExpression*
    | {infer ParenthesesTypeExpression} '(' type=TypeExpression ')'
    ;
    
InterfaceDefinition:
    'interface' name=UPPER_ID '{'
        (ports+=PortDefinition ';')*
    '}'
    ;


ImplementationDefinition:
    'implementation' name=UPPER_ID ('of' iface=[InterfaceDefinition])? '{' 
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
    'match' source=WireTargetExpression 'with' '{' 
        (matches+=PatternMatchDefinition)*
    '}'
    ;

PatternMatchDefinition:
    'case' pattern=Pattern '{'
        body=ImplementationBody
    '}';

Pattern: name=UPPER_ID ':' type=DataType;

WireDefinition: 'wire' source=WireTargetExpression 'to' target=WireTargetExpression;

WireTargetExpression:
    WireTargetAddition
    ({infer BinaryWireTargetExpression.left=current} op=('=='|'!='|'<'|'>'|'<='|'>=') right=WireTargetAddition)*
    ;
WireTargetAddition:
    WireTargetFactor 
    ({infer BinaryWireTargetExpression.left=current} op=('+'|'-') right=WireTargetFactor)*
    ;

WireTargetFactor:
    WireTargetPrimary 
    ({infer BinaryWireTargetExpression.left=current} op=('*'|'/'|'mod'|'div') right=WireTargetPrimary)*
    ;

WireTargetPrimary:    
     {infer SelfInstancePortExpression} 'this' '.' portRef=[PortDefinition:LOWER_ID]
     | {infer ForeignInstancePortExpression} instanceRef=[ModuleInstance] '.' portRef=[PortDefinition:LOWER_ID]
     | {infer NumericLiteral} number=INT
     | {infer StringLiteral} string=STRING
     | {infer ParenthesesWireTargetExpression} '(' expression=WireTargetExpression ')'
     ;

ModuleInstance:
    'instance' name=LOWER_ID 'of' module=[ImplementationDefinition]
    ;

PortDefinition: direction=Direction name=LOWER_ID ':' type=DataType;

DataType returns string: 'int';

Direction returns string: 'in' | 'out';

hidden terminal WS: /\s+/;
terminal LOWER_ID: /[a-z][\w_]*/;
terminal UPPER_ID: /[_A-Z][\w_]*/;
terminal INT: /0|[1-9][0-9]*/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

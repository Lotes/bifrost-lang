grammar Bifrost

entry File: 
    modules+=ModuleDefinition*
    ;


ModuleDefinition:
    'module' name=ID '{' 
        'interface' ':' ports+=PortDefinition*
        'implementation' ':' (modules+=ModuleInstance ';'|links+=WireDefinition ';')*
    '}'
    ;

WireDefinition: 'from' source=WireTargetExpression 'to' target=WireTargetExpression;

WireTargetExpression:
    WireTargetFactor 
    ({infer BinaryWireTargetExpression.left=current} op=('+'|'-') right=WireTargetFactor)*
    ;

WireTargetFactor:
    WireTargetPrimary 
    ({infer BinaryWireTargetExpression.left=current} op=('*'|'/'|'mod'|'div') right=WireTargetPrimary)*
    ;

WireTargetPrimary:    
     'this' '.' portRef=[PortDefinition:ID]
     | instanceRef=[ModuleInstance] '.' portRef=[PortDefinition:ID]
     | number=INT
     | string=STRING
     ;

ModuleInstance:
    'instance' name=ID 'of' module=[ModuleDefinition]
    ;

PortDefinition: direction=Direction name=ID ':' type=DataType;

DataType returns string: 'int';

Direction returns string: 'in' | 'out';

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT: /0|[1-9][0-9]*/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

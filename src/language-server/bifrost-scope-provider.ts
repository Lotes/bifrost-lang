import { AstNode, DefaultScopeProvider, Reference, Scope } from "langium";

export type ExtractKeysOfValueType<T, K> = { [I in keyof T]: T[I] extends K ? I : never }[keyof T];
export type AstTypeList<T> = Record<keyof T, AstNode>;

export type CrossReferencesOfAstNodeType<N extends AstNode> = (
  ExtractKeysOfValueType<N, Reference|undefined>
  | ExtractKeysOfValueType<N, Array<Reference|undefined>|undefined>
// eslint-disable-next-line @typescript-eslint/ban-types
) & {};

export type AstNodeTypesWithCrossReferences<A extends AstTypeList<A>> = {
  [T in keyof A]: CrossReferencesOfAstNodeType<A[T]> extends never ? never : A[T]
}[keyof A];

export class BifrostScopeProvider extends DefaultScopeProvider {
  
}
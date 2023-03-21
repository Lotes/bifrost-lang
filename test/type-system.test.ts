import { AstNode, AstNodeDescription, streamAllContents } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { createBifrostServices } from '../src/language-server/bifrost-module';
import { inferType, TypeDescription, ValueExpressionTypes } from '../src/language-server/bifrost-type-system';
import { expectNoErrors, parseHelper } from './utils';

type TypeBuilder = (getNode: <N extends AstNode>(path: string) => N) => TypeDescription;

describe('Type system', () => {
  let expectIsOfType: (input: string, expectations: Record<AstNodeDescription['path'], TypeBuilder>) => Promise<void> = undefined!;

  beforeAll(async () => {
    const services = createBifrostServices(NodeFileSystem);
    const parse = await parseHelper(services.Bifrost);
    expectIsOfType = async (input, expectations) => {
      const [document, dispose] = await parse(input);
      try {
        expectNoErrors(document);
        for (const [path, typeBuilder] of Object.entries(expectations)) {
          const expectedType = typeBuilder(<N extends AstNode>(path) => services.Bifrost.workspace.AstNodeLocator.getAstNode(document.parseResult.value, path) as N);  
          const node = services.Bifrost.workspace.AstNodeLocator.getAstNode(document.parseResult.value, path);
          expect(node).toBeDefined();
          const actualType = inferType(node!);
          expect(actualType).toEqual(expectedType);
        }
      } catch(e) {
        streamAllContents(document.parseResult.value).forEach(node => {
          const type = inferType(node);
          if(type.kind !== 'none') {
            console.log(services.Bifrost.workspace.AstNodeLocator.getAstNodePath(node));
            console.log(type);
          }
        });
        console.log(e);
        throw e;
      } finally {
        await dispose();
      }
    }
  });

  it('Integer Input', () => expectIsOfType(
    `abstract nodetype X(in input of Integer){}`,
    {
      '/implementations@0': (get) => ValueExpressionTypes.NodeTypeInstance(get('/implementations@0')),
      '/implementations@0/ports@0': () => ValueExpressionTypes.Integer(),
      '/implementations@0/ports@0/type': () => ValueExpressionTypes.Integer(),
    }
  ));
});
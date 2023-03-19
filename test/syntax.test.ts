import { NodeFileSystem } from 'langium/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { createBifrostServices } from '../src/language-server/bifrost-module';
import { parseHelper } from './utils';


describe('Syntax', () => {
  let expectIsParsable: (input: string) => Promise<void> = undefined!;

  beforeAll(async () => {
    const services = createBifrostServices(NodeFileSystem);
    const parse = await parseHelper(services.Bifrost);
    expectIsParsable = async (input) => {
      const [document, dispose] = await parse(input);
      try {
        document.parseResult.lexerErrors.forEach(e => console.log(e.message));
        document.parseResult.parserErrors.forEach(e => console.log(e.message));
        document.diagnostics?.forEach(e => console.log(e.message));
        expect(document.parseResult.lexerErrors.length).toBe(0);
        expect(document.parseResult.parserErrors.length).toBe(0);
        expect(document.diagnostics?.length).toBe(0);
      } finally {
        await dispose();
      }
    }
  });

  it('Data type without type arguments', () => expectIsParsable(`datatype Foo { Bar, Baz }`)); 
  it('Data type with type arguments', () => expectIsParsable(`datatype Foo<a> { Bay, Bar a, Baz a a }`)); 
  it('Data type with recursive type arguments', () => expectIsParsable(`datatype Tree<a> { Leaf a, Node (Tree<a>) (Tree<a>) }`)); 

  it('Node type with in/output', () => expectIsParsable(`abstract nodetype Convert(in input of Integer, out output of Integer) { }`)); 
  it('Node type with generic in/output', () => expectIsParsable(`abstract nodetype Convert<a, b>(in input of a, out output of b) { }`));

});
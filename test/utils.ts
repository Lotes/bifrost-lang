import { LangiumDocument } from "langium";
import { expect } from "vitest";
import { URI } from "vscode-uri";
import {BifrostServices} from "../src/language-server/bifrost-module";
import { File } from "../src/language-server/generated/ast";
import { randomUUID } from "crypto";

export async function parseHelper(
    services: BifrostServices
): Promise<(input: string) => Promise<[LangiumDocument<File>, () => Promise<void>]>> {
    const metaData = services.LanguageMetaData;
    const documentBuilder = services.shared.workspace.DocumentBuilder;
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
    return async (input) => {
        const randomNumber = randomUUID();
        const uri = URI.parse(
            `memory:///${randomNumber}${metaData.fileExtensions[0]}`
        );
        const document =
            services.shared.workspace.LangiumDocumentFactory.fromString<File>(
                input,
                uri
            );
        services.shared.workspace.LangiumDocuments.addDocument(document);
        await documentBuilder.build([document], { validationChecks: "all" });
        
        function dispose() {
            return documentBuilder.update([], [uri]);
        }

        return [document, dispose];
    };
}

export type ValidationStep = "lexer" | "parser" | "validator";
export interface ValidationStepFlags {
    exceptFor: ValidationStep | ValidationStep[];
}
export function expectNoErrors(
    result: LangiumDocument<File>,
    flags?: ValidationStepFlags
): void {
    const list = flags
        ? typeof flags.exceptFor === "string"
            ? [flags.exceptFor]
            : flags.exceptFor
        : [];
    const lexer = list.includes("lexer");
    const parser = list.includes("parser");
    const validator = list.includes("validator");
    expect(result.parseResult.lexerErrors.length > 0, result.parseResult.lexerErrors.length > 0 ? result.parseResult.lexerErrors[0].message : '').toBe(lexer);
    expect(result.parseResult.parserErrors.length > 0, result.parseResult.parserErrors.length > 0 ? result.parseResult.parserErrors[0].message : '').toBe(parser);
    const validationErrors = result.diagnostics ?? [];
    expect(validationErrors.length > 0, validationErrors.length>0?validationErrors[0].message:'').toBe(validator);
}
import { LooseProjectNameRequirement, Requirement, LooseProjectNameRequirementWithLocation, RequirementWithLocation } from './types';
export { RequirementsSyntaxError } from './semantics';
export * from './types';
/** Parse file content according to the full rules of pip requirements syntax. */
export declare function parsePipRequirementsFile(fileContent: string): Requirement[];
export declare function parsePipRequirementsFile(fileContent: string, options: {
    includeLocations: true;
}): RequirementWithLocation[];
/** Parse line content according to the full rules of pip requirements syntax. */
export declare function parsePipRequirementsLine(lineContent: string): Requirement | null;
export declare function parsePipRequirementsLine(lineContent: string, options: {
    includeLocations: true;
}): RequirementWithLocation | null;
/** Parse file content in loose mode that only extracts project name requirements. Intended for content being edited. */
export declare function parsePipRequirementsFileLoosely(fileContent: string): LooseProjectNameRequirement[];
export declare function parsePipRequirementsFileLoosely(fileContent: string, options: {
    includeLocations: true;
}): LooseProjectNameRequirementWithLocation[];
/** Parse line content in loose mode that only extracts project name requirements. Intended for content being edited. */
export declare function parsePipRequirementsLineLoosely(lineContent: string): LooseProjectNameRequirement | null;
export declare function parsePipRequirementsLineLoosely(lineContent: string, options: {
    includeLocations: true;
}): LooseProjectNameRequirementWithLocation | null;

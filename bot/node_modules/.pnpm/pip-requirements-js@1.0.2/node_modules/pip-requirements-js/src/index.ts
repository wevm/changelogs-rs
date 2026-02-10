import grammar from './pep-508.ohm-bundle'
import { RequirementsSyntaxError, semantics } from './semantics'
import {
    LooseProjectNameRequirement,
    Requirement,
    LooseProjectNameRequirementWithLocation,
    RequirementWithLocation,
} from './types'

export { RequirementsSyntaxError } from './semantics'
export * from './types'

/** Parse file content according to the full rules of pip requirements syntax. */
export function parsePipRequirementsFile(fileContent: string): Requirement[]
export function parsePipRequirementsFile(
    fileContent: string,
    options: { includeLocations: true }
): RequirementWithLocation[]
export function parsePipRequirementsFile(
    fileContent: string,
    options?: { includeLocations?: boolean }
): Requirement[] | RequirementWithLocation[] {
    const matchResult = grammar.match(fileContent, 'File')
    if (matchResult.failed()) {
        throw new RequirementsSyntaxError(`Failed to parse requirements file. ${matchResult.shortMessage}`)
    }

    if (options?.includeLocations) {
        return semantics(matchResult).extractWithLocation()
    }
    return semantics(matchResult).extract()
}

/** Parse line content according to the full rules of pip requirements syntax. */
export function parsePipRequirementsLine(lineContent: string): Requirement | null
export function parsePipRequirementsLine(
    lineContent: string,
    options: { includeLocations: true }
): RequirementWithLocation | null
export function parsePipRequirementsLine(
    lineContent: string,
    options?: { includeLocations?: boolean }
): Requirement | RequirementWithLocation | null {
    const matchResult = grammar.match(lineContent, 'Line')
    if (matchResult.failed()) {
        throw new RequirementsSyntaxError(`Failed to parse requirements line. ${matchResult.shortMessage}`)
    }

    if (options?.includeLocations) {
        return semantics(matchResult).extractWithLocation()
    }
    return semantics(matchResult).extract()
}

/** Parse file content in loose mode that only extracts project name requirements. Intended for content being edited. */
export function parsePipRequirementsFileLoosely(fileContent: string): LooseProjectNameRequirement[]
export function parsePipRequirementsFileLoosely(
    fileContent: string,
    options: { includeLocations: true }
): LooseProjectNameRequirementWithLocation[]
export function parsePipRequirementsFileLoosely(
    fileContent: string,
    options?: { includeLocations?: boolean }
): LooseProjectNameRequirement[] | LooseProjectNameRequirementWithLocation[] {
    const matchResult = grammar.match(fileContent, 'LooseFile')
    if (matchResult.failed()) {
        throw new RequirementsSyntaxError(`Failed to loosely parse requirements file. ${matchResult.shortMessage}`)
    }

    if (options?.includeLocations) {
        return semantics(matchResult).extractLooselyWithLocation()
    }
    return semantics(matchResult).extractLoosely()
}

/** Parse line content in loose mode that only extracts project name requirements. Intended for content being edited. */
export function parsePipRequirementsLineLoosely(lineContent: string): LooseProjectNameRequirement | null
export function parsePipRequirementsLineLoosely(
    lineContent: string,
    options: { includeLocations: true }
): LooseProjectNameRequirementWithLocation | null
export function parsePipRequirementsLineLoosely(
    lineContent: string,
    options?: { includeLocations?: boolean }
): LooseProjectNameRequirement | LooseProjectNameRequirementWithLocation | null {
    const matchResult = grammar.match(lineContent, 'LooseLine')
    if (matchResult.failed()) {
        throw new RequirementsSyntaxError(`Failed to loosely parse requirements line. ${matchResult.shortMessage}`)
    }

    if (options?.includeLocations) {
        return semantics(matchResult).extractLooselyWithLocation()
    }
    return semantics(matchResult).extractLoosely()
}

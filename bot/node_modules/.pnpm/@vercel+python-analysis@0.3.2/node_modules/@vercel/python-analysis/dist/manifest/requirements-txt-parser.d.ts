import type { PyProjectToml } from './pyproject/types';
import type { NormalizedRequirement } from './requirement/types';
/**
 * Parsed pip arguments from requirements file.
 */
export interface PipOptions {
    /** Files referenced via -r or --requirement */
    requirementFiles: string[];
    /** Files referenced via -c or --constraint */
    constraintFiles: string[];
    /** Primary index URL (--index-url or -i) - only the last one is kept */
    indexUrl?: string;
    /** Extra index URLs (--extra-index-url) */
    extraIndexUrls: string[];
}
/**
 * Result of parsing a requirements file with pip options.
 */
export interface ParsedRequirementsFile {
    requirements: NormalizedRequirement[];
    pipOptions: PipOptions;
}
/**
 * Function type for reading referenced requirement files.
 */
export type ReadFileFn = (path: string) => string | null;
/**
 * Convert a requirements.txt content to a pyproject.toml object suitable for uv.
 *
 * This creates a minimal pyproject:
 *
 * [project]
 * dependencies = [...]
 *
 * [tool.uv.sources]
 * package = { git = "..." }
 *
 * Note: Hash information is not included in pyproject.toml output.
 *
 * @param fileContent - The content of the requirements.txt file
 * @param readFile - Optional function to read referenced requirement files (-r, --requirement).
 *                   If provided, referenced files will be recursively processed.
 */
export declare function convertRequirementsToPyprojectToml(fileContent: string, readFile?: ReadFileFn): PyProjectToml;
/**
 * Parse requirements file content with full pip options support.
 * Returns both the normalized requirements and the parsed pip options
 * (--requirement, --constraint, --index-url, --extra-index-url, --hash).
 *
 * @param fileContent - The content of the requirements.txt file
 * @param readFile - Optional function to read referenced requirement files (-r, --requirement).
 *                   If provided, referenced files will be recursively processed and their
 *                   requirements merged into the result.
 */
export declare function parseRequirementsFile(fileContent: string, readFile?: ReadFileFn): ParsedRequirementsFile;

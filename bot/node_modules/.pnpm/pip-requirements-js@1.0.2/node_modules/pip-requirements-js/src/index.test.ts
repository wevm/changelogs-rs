import { parsePipRequirementsLine, parsePipRequirementsLineLoosely } from '.'
import { WithLocation } from './types'

// Helper function to recursively strip location data from WithLocation objects
function stripLocationData<T>(obj: WithLocation<T> | T | null | undefined): T | null | undefined {
    if (obj === null || obj === undefined) {
        return obj
    }

    if (typeof obj === 'object' && obj !== null && 'data' in obj && 'location' in obj) {
        // This is a WithLocation wrapper, extract and process the data
        return stripLocationData((obj as WithLocation<T>).data)
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => stripLocationData(item)) as T
    }

    if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            result[key] = stripLocationData(value)
        }
        return result as T
    }

    return obj
}

// Strict parsing test datasets
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const strictParsingTests: Array<[string, string, any]> = [
    [
        'should parse a version matching name-based project requirement',
        'pip == 22.0.2',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '==',
                                location: { startIdx: 4, endIdx: 6 },
                            },
                            version: {
                                data: '22.0.2',
                                location: { startIdx: 7, endIdx: 13 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 13 },
                    },
                ],
                extras: undefined,
                environmentMarkerTree: undefined,
            },
            location: { startIdx: 0, endIdx: 13 },
        },
    ],
    [
        'should parse a parenthesized version matching name-based project requirement',
        'pip ( == 22.0.2 )',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '==',
                                location: { startIdx: 6, endIdx: 8 },
                            },
                            version: {
                                data: '22.0.2',
                                location: { startIdx: 9, endIdx: 15 },
                            },
                        },
                        location: { startIdx: 6, endIdx: 15 },
                    },
                ],
                extras: undefined,
                environmentMarkerTree: undefined,
            },
            location: { startIdx: 0, endIdx: 17 },
        },
    ],
    [
        'should parse a parenthesized empty version spec name-based project requirement',
        'pip()',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [], // This is not undefined because of the parentheses
                extras: undefined,
                environmentMarkerTree: undefined,
            },
            location: { startIdx: 0, endIdx: 5 },
        },
    ],
    [
        'should parse a URL-based project requirement',
        'pip @ https://x.com/y.zip',
        {
            data: {
                type: 'ProjectURL',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                url: {
                    data: 'https://x.com/y.zip',
                    location: { startIdx: 6, endIdx: 25 },
                },
                extras: undefined,
                environmentMarkerTree: undefined,
            },
            location: { startIdx: 0, endIdx: 25 },
        },
    ],
    [
        'should parse a requirements file requirement',
        '-r requirements.txt',
        {
            data: {
                type: 'RequirementsFile',
                path: 'requirements.txt',
            },
            location: { startIdx: 0, endIdx: 19 },
        },
    ],
    [
        'should parse a constraints file requirement',
        '-c versionSpec.txt',
        {
            data: {
                type: 'ConstraintsFile',
                path: 'versionSpec.txt',
            },
            location: { startIdx: 0, endIdx: 18 },
        },
    ],
    [
        'should parse a name-based project requirement with extras',
        'pip[foo,bar] == 22.0.2',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '==',
                                location: { startIdx: 13, endIdx: 15 },
                            },
                            version: {
                                data: '22.0.2',
                                location: { startIdx: 16, endIdx: 22 },
                            },
                        },
                        location: { startIdx: 13, endIdx: 22 },
                    },
                ],
                extras: [
                    {
                        data: 'foo',
                        location: { startIdx: 4, endIdx: 7 },
                    },
                    {
                        data: 'bar',
                        location: { startIdx: 8, endIdx: 11 },
                    },
                ],
                environmentMarkerTree: undefined,
            },
            location: { startIdx: 0, endIdx: 22 },
        },
    ],
    [
        'should parse a name-based project requirement with environment markers',
        'pip; python_version == "2.7"',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
                environmentMarkerTree: {
                    data: { left: 'python_version', operator: '==', right: '"2.7"' },
                    location: { startIdx: 5, endIdx: 28 },
                },
            },
            location: { startIdx: 0, endIdx: 28 },
        },
    ],
    [
        'should parse complex nested environment markers with location data',
        'pip; (python_version == "3.8" or python_version == "3.9") and sys_platform == "linux"',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
                environmentMarkerTree: {
                    data: {
                        operator: 'and',
                        left: {
                            operator: 'or',
                            left: { left: 'python_version', operator: '==', right: '"3.8"' },
                            right: { left: 'python_version', operator: '==', right: '"3.9"' },
                        },
                        right: { left: 'sys_platform', operator: '==', right: '"linux"' },
                    },
                    location: { startIdx: 5, endIdx: 85 },
                },
            },
            location: { startIdx: 0, endIdx: 85 },
        },
    ],
    [
        'should parse simple AND environment markers',
        'pip; python_version >= "3.6" and sys_platform != "win32"',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
                environmentMarkerTree: {
                    data: {
                        operator: 'and',
                        left: { left: 'python_version', operator: '>=', right: '"3.6"' },
                        right: { left: 'sys_platform', operator: '!=', right: '"win32"' },
                    },
                    location: { startIdx: 5, endIdx: 56 },
                },
            },
            location: { startIdx: 0, endIdx: 56 },
        },
    ],
    [
        'should parse simple OR environment markers',
        'pip; python_version == "3.7" or python_version == "3.8"',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
                environmentMarkerTree: {
                    data: {
                        operator: 'or',
                        left: { left: 'python_version', operator: '==', right: '"3.7"' },
                        right: { left: 'python_version', operator: '==', right: '"3.8"' },
                    },
                    location: { startIdx: 5, endIdx: 55 },
                },
            },
            location: { startIdx: 0, endIdx: 55 },
        },
    ],
    [
        'should parse environment markers with different operators',
        'pip; python_version ~= "3.8.0"',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
                environmentMarkerTree: {
                    data: { left: 'python_version', operator: '~=', right: '"3.8.0"' },
                    location: { startIdx: 5, endIdx: 30 },
                },
            },
            location: { startIdx: 0, endIdx: 30 },
        },
    ],
    [
        'should parse a name-based project requirement with extras, environment markers, and a comment',
        'pip[foo,bar]; python_version == "2.7" # xyz ',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: [
                    {
                        data: 'foo',
                        location: { startIdx: 4, endIdx: 7 },
                    },
                    {
                        data: 'bar',
                        location: { startIdx: 8, endIdx: 11 },
                    },
                ],
                environmentMarkerTree: {
                    data: { left: 'python_version', operator: '==', right: '"2.7"' },
                    location: { startIdx: 14, endIdx: 37 },
                },
            },
            location: { startIdx: 0, endIdx: 37 },
        },
    ],
    ['should ignore a comment', ' # xyz ', null],
    ['should ignore a blank line', '', null],
]

// Loose parsing test datasets
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const looseParsingTests: Array<[string, string, any]> = [
    [
        'should parse a basic in-flight requirement',
        'pip = ',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '=',
                                location: { startIdx: 4, endIdx: 5 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 5 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 5 },
        },
    ],
    [
        'should parse a requirement with multiple version specs',
        'pip>=2,<3',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '>=',
                                location: { startIdx: 3, endIdx: 5 },
                            },
                            version: {
                                data: '2',
                                location: { startIdx: 5, endIdx: 6 },
                            },
                        },
                        location: { startIdx: 3, endIdx: 6 },
                    },
                    {
                        data: {
                            operator: {
                                data: '<',
                                location: { startIdx: 7, endIdx: 8 },
                            },
                            version: {
                                data: '3',
                                location: { startIdx: 8, endIdx: 9 },
                            },
                        },
                        location: { startIdx: 7, endIdx: 9 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 9 },
        },
    ],
    [
        'should parse an in-flight requirement with a random environment marker',
        'hope = 2.0 ; xds',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'hope',
                    location: { startIdx: 0, endIdx: 4 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '=',
                                location: { startIdx: 5, endIdx: 6 },
                            },
                            version: {
                                data: '2.0',
                                location: { startIdx: 7, endIdx: 10 },
                            },
                        },
                        location: { startIdx: 5, endIdx: 10 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 16 },
        },
    ],
    [
        'should parse a name-based project requirement with extras, environment markers, and a comment',
        'pip[foo,bar]; python_version == "2.7" # xyz ',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: [
                    {
                        data: 'foo',
                        location: { startIdx: 4, endIdx: 7 },
                    },
                    {
                        data: 'bar',
                        location: { startIdx: 8, endIdx: 11 },
                    },
                ],
            },
            location: { startIdx: 0, endIdx: 38 },
        },
    ],
    ['should ignore a URL-based project requirement', 'pip @ https://x.com/y.zip', null],
    ['should ignore a requirements file requirement', '-r requirements.txt', null],
    ['should ignore a comment-only requirement', '# text', null],
    [
        'should parse incomplete version operators without versions',
        'pip >',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '>',
                                location: { startIdx: 4, endIdx: 5 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 5 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 5 },
        },
    ],
    [
        'should parse multiple incomplete version operators',
        'pip >=, <',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '>=',
                                location: { startIdx: 4, endIdx: 6 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 6 },
                    },
                    {
                        data: {
                            operator: {
                                data: '<',
                                location: { startIdx: 8, endIdx: 9 },
                            },
                        },
                        location: { startIdx: 8, endIdx: 9 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 9 },
        },
    ],
    [
        'should parse malformed version operators',
        'pip =!',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '=!',
                                location: { startIdx: 4, endIdx: 6 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 6 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 6 },
        },
    ],
    [
        'should parse repeated operator characters',
        'pip ===1.0',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: [
                    {
                        data: {
                            operator: {
                                data: '===',
                                location: { startIdx: 4, endIdx: 7 },
                            },
                            version: {
                                data: '1.0',
                                location: { startIdx: 7, endIdx: 10 },
                            },
                        },
                        location: { startIdx: 4, endIdx: 10 },
                    },
                ],
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 10 },
        },
    ],
    [
        'should parse extras with missing closing bracket',
        'pip[extra1,extra2',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: [
                    {
                        data: 'extra1',
                        location: { startIdx: 4, endIdx: 10 },
                    },
                    {
                        data: 'extra2',
                        location: { startIdx: 11, endIdx: 17 },
                    },
                ],
            },
            location: { startIdx: 0, endIdx: 17 },
        },
    ],
    [
        'should parse empty extras with missing closing bracket',
        'pip[',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: [],
            },
            location: { startIdx: 0, endIdx: 4 },
        },
    ],
    [
        'should parse extras with trailing comma',
        'pip[extra1,extra2,]',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: [
                    {
                        data: 'extra1',
                        location: { startIdx: 4, endIdx: 10 },
                    },
                    {
                        data: 'extra2',
                        location: { startIdx: 11, endIdx: 17 },
                    },
                ],
            },
            location: { startIdx: 0, endIdx: 19 },
        },
    ],
    [
        'should parse just a package name',
        'pip',
        {
            data: {
                type: 'ProjectName',
                name: {
                    data: 'pip',
                    location: { startIdx: 0, endIdx: 3 },
                },
                versionSpec: undefined,
                extras: undefined,
            },
            location: { startIdx: 0, endIdx: 3 },
        },
    ],
    ['should ignore empty lines', '', null],
    ['should ignore whitespace-only lines', '   \t   ', null],
]

describe('parsePipRequirementsLine', () => {
    describe('without location tracking', () => {
        strictParsingTests.forEach(([explanation, input, expectedWithLocation]) => {
            if (explanation === 'should throw an error if the syntax is wrong') {
                it(explanation, () => {
                    expect(() => parsePipRequirementsLine('pip???')).toThrowError(
                        'Failed to parse requirements line. Line 1, col 4: expected end of input'
                    )
                })
                return
            }

            it(explanation, () => {
                const requirement = parsePipRequirementsLine(input)
                const expected = stripLocationData(expectedWithLocation)
                expect(requirement).toEqual(expected)
            })
        })

        it('should throw an error if the syntax is wrong', () => {
            expect(() => parsePipRequirementsLine('pip???')).toThrowError(
                'Failed to parse requirements line. Line 1, col 4: expected end of input'
            )
        })
    })

    describe('with location tracking', () => {
        strictParsingTests.forEach(([explanation, input, expected]) => {
            it(explanation, () => {
                const requirement = parsePipRequirementsLine(input, { includeLocations: true })
                expect(requirement).toEqual(expected)
            })
        })
    })
})

describe('parsePipRequirementsLineLoosely', () => {
    describe('without location tracking', () => {
        looseParsingTests.forEach(([explanation, input, expectedWithLocation]) => {
            it(explanation, () => {
                const requirement = parsePipRequirementsLineLoosely(input)
                const expected = stripLocationData(expectedWithLocation)
                expect(requirement).toEqual(expected)
            })
        })
    })

    describe('with location tracking', () => {
        looseParsingTests.forEach(([explanation, input, expected]) => {
            it(explanation, () => {
                const requirement = parsePipRequirementsLineLoosely(input, { includeLocations: true })
                expect(requirement).toEqual(expected)
            })
        })
    })
})

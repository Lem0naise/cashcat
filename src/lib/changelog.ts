export interface Patch {
    version: string;
    date?: string;
    description?: string;
    features?: string[];
    bugfixes?: string[];
}

export interface Minor {
    version: string;
    patches: Patch[];
}

export interface Major {
    version: string;
    minors: Minor[];
}

// Hierarchical changelog data
export const changelog: Major[] = [
    {
        version: "0",
        minors: [

            {
                version: "11",
                patches: [
                    {
                        version: "0.11.0",
                        date: "February 19, 2026",
                        features: [
                            "Added three Category Goal Types (spending, savings, emergency fund)",
                            "Overhauled onboarding",
                            "Optimised stats loading"
                        ],
                        bugfixes: [
                            "Fixed bugs in assignments"
                        ]
                    }
                ]
            },
            {
                version: "10",
                patches: [
                    {
                        version: "0.10.x", // Keeping as range since original data was aggregated
                        description: "0.10.0 - 0.10.2: Version bumps, padding fixes, and routine bug fixes."
                    }
                ]
            },
            {
                version: "9",
                patches: [
                    {
                        version: "0.9.5",
                        description: "Launched the native Android app and introduced a new, improved stats screen."
                    },
                    {
                        version: "0.9.2",
                        description: "Added a publicly accessible RESTful API, implemented new caching for snappy performance, and added the ability to transfer money between bank accounts."
                    }
                ]
            },
            {
                version: "8",
                patches: [
                    {
                        version: "0.8.8",
                        description: "Added a new 'last reconciled' date for each bank account."
                    },
                    {
                        version: "0.8.0 - 0.8.2",
                        description: "Introduced in-depth statistics, new graphs/charts, and overall UX improvements to the Statistics page."
                    }
                ]
            },
            {
                version: "7",
                patches: [
                    {
                        version: "0.7.4",
                        description: "Launched the official CashCat Discord server."
                    },
                    {
                        version: "0.7.0",
                        description: "Added a brand new documentation knowledgebase."
                    }
                ]
            },
            {
                version: "6",
                patches: [
                    {
                        version: "0.6.0",
                        description: "Introduced a brand new statistics screen and deployed a large collection of UI adjustments."
                    }
                ]
            },
            {
                version: "5",
                patches: [
                    {
                        version: "0.5.5",
                        description: "Added a new Terms of Service and Privacy Policy."
                    },
                    {
                        version: "0.5.3",
                        description: "Implemented a faster vendor autocomplete."
                    },
                    {
                        version: "0.5.0",
                        description: "Added highly requested support for multiple bank accounts."
                    }
                ]
            },
            {
                version: "4",
                patches: [
                    {
                        version: "0.4.0",
                        description: "Shipped a new mobile input modal."
                    }
                ]
            },
            {
                version: "3",
                patches: [
                    {
                        version: "0.3.3",
                        description: "Unveiled a fresh new logo."
                    },
                    {
                        version: "0.3.2",
                        description: "Added a new notes/reminders section and a 'compare with bank' feature."
                    },
                    {
                        version: "0.3.1",
                        description: "Introduced a new monthly summary."
                    },
                    {
                        version: "0.3.0",
                        description: "Upgraded to a smoother rollover system."
                    }
                ]
            },
            {
                version: "2",
                patches: [
                    {
                        version: "0.2.8",
                        description: "Added daily predictions."
                    },
                    {
                        version: "0.2.7",
                        description: "Added a new user feedback form."
                    },
                    {
                        version: "0.2.6",
                        description: "First iteration of the Update Notes block! Introduced an installable PWA for mobile, rollover tracking, and a new collapsible budget UI."
                    }
                ]
            }
        ]
    }
];

// Helper to get the absolute latest version
export const currentVersion: Patch = changelog[0].minors[0].patches[0];

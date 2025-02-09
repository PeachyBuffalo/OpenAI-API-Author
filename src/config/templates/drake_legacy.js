export function createDrakeConfig(options = {}) {
    // Default Drake Legacy settings
    const defaultConfig = {
        metadata: {
            title: "Drake Legacy",
            author: "Charlie Reeves",
            genre: "Fantasy",
            subgenre: ["Supernatural", "Martial Arts", "Coming of Age"],
            targetAudience: "Young Adult",
            series: {
                name: "Drake Legacy",
                book: 1,
                subtitle: "The Fighter's Awakening"
            },
            mainCharacter: {
                name: "John Drake",
                description: "A 13-year-old Deaf boy with a muscular build, training in Jeet-Kune-Do",
                traits: ["Determined", "Resilient", "Gentle"]
            },
            setting: {
                primary: "Small town outside Detroit",
                secondary: "Lili'Van (pocket dimension)",
                time: "Contemporary"
            },
            synopsis: "John Drake, a 13-year-old Deaf boy, discovers his deceased father's connection to Lilian, a secret society in a pocket dimension called Lili'Van. Training in martial arts and uncovering mystical abilities, John must navigate both worlds while seeking the truth about his father's past."
        },
        chapterStructure: {
            totalChapters: 25,
            pagesPerChapter: 7,
            format: {
                pageLength: 500,
                dialogueStyle: "signed",
                sceneBreakMarker: "* * *"
            }
        },
        styleGuide: {
            tone: "Serious and dramatic",
            pacing: options.pacing || "Balanced",
            pointOfView: "Third person limited",
            dialogueFormat: {
                signed: '<>',
                spoken: '""'
            }
        }
    };

    // Merge provided options with defaults
    return {
        ...defaultConfig,
        chapterStructure: {
            ...defaultConfig.chapterStructure,
            totalChapters: options.totalChapters || defaultConfig.chapterStructure.totalChapters,
            pagesPerChapter: options.pagesPerChapter || defaultConfig.chapterStructure.pagesPerChapter
        },
        styleGuide: {
            ...defaultConfig.styleGuide,
            tone: options.tone || defaultConfig.styleGuide.tone,
            pacing: options.pacing || defaultConfig.styleGuide.pacing
        }
    };
} 
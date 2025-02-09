import { baseBookConfig } from './book_config.js';

export function createDrakeConfig(options = {}) {
    // Default Drake Legacy settings
    const defaultConfig = {
        pagesPerChapter: 5,
        totalChapters: 12,
        tone: "Serious with moments of levity",
        pacing: "Dynamic",
        pageLength: 500
    };

    // Merge provided options with defaults
    const config = { ...defaultConfig, ...options };

    return {
        metadata: {
            title: "Drake Legacy",
            author: "AI Writer",
            genre: "Urban Fantasy",
            subgenre: ["Supernatural", "Martial Arts", "Coming of Age"],
            targetAudience: "Young Adult/Adult",
            series: {
                name: "Drake Legacy",
                book: 1,
                subtitle: "The Fighter's Awakening"
            },
            mainCharacter: {
                name: "John Drake",
                description: "A skilled fighter with hearing impairment who discovers supernatural abilities",
                traits: ["Determined", "Resilient", "Intuitive"]
            },
            setting: {
                primary: "Ridgemont Boys & Girls Club",
                time: "Contemporary",
                location: "Urban America"
            },
            themes: [
                "Self-discovery",
                "Overcoming limitations",
                "Hidden powers",
                "Mentor relationships"
            ],
            synopsis: "John Drake, a skilled fighter with hearing impairment, discovers he possesses supernatural abilities that allow him to perceive the world in ways others cannot. Training at the Ridgemont Boys & Girls Club under the mysterious Mr. Reynolds, John must learn to control his emerging powers while confronting both personal demons and unknown threats.",
            keywords: [
                "martial arts",
                "supernatural abilities",
                "disability representation",
                "coming of age",
                "urban fantasy"
            ]
        },
        systemPrompt: `You are writing "Drake Legacy", a story about John Drake, a skilled fighter with hearing impairment who discovers supernatural abilities.
        
        Key elements to maintain:
        - Focus on martial arts and supernatural abilities
        - Show John's unique way of perceiving the world through movement
        - Include sign language dialogue marked with "<>" symbols
        - Balance action scenes with character development
        - Maintain ${config.tone} tone and ${config.pacing} pacing`,

        chapterStructure: {
            pagesPerChapter: config.pagesPerChapter,
            totalChapters: config.totalChapters,
            format: {
                pageLength: config.pageLength,
                dialogueStyle: "signed",
                sceneBreakMarker: "* * *"
            }
        },

        styleGuide: {
            tone: config.tone,
            pacing: config.pacing,
            pointOfView: "Third person limited",
            dialogueFormat: {
                signed: '<>',
                spoken: '""'
            }
        }
    };
} 
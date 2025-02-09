// Base configuration template that can be extended
export const baseBookConfig = {
    chapterStructure: {
        pagesPerChapter: 5,
        totalChapters: 12,
        format: {
            pageLength: 500,
            dialogueStyle: "standard",
            sceneBreakMarker: "* * *"
        }
    },
    styleGuide: {
        tone: "Neutral",
        pacing: "Balanced",
        pointOfView: "Third person",
        dialogueFormat: {
            standard: '""'
        }
    }
}; 
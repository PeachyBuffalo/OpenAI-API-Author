import { TemplateLoader } from './template_loader.mjs';
import { createBookPageByPage } from './createbook.mjs';
import { createDrakeConfig } from './templates/drake_legacy.js';

async function createDrakeLegacy(options = {}) {
    // Create configuration with custom options
    const drakeConfig = createDrakeConfig(options);
    
    const loader = new TemplateLoader();
    const bookConfig = await loader.initializeBook('drake_legacy', drakeConfig);

    try {
        const result = await createBookPageByPage(
            bookConfig.metadata.synopsis,
            bookConfig.chapterStructure.totalChapters,
            bookConfig.chapterStructure.pagesPerChapter,
            null,
            bookConfig
        );

        console.log("Book creation completed:", result);
        return result;
    } catch (error) {
        console.error("Failed to create Drake Legacy:", error);
        throw error;
    }
}

// Example usage with different configurations
const shortVersion = {
    pagesPerChapter: 3,
    totalChapters: 8,
    tone: "Light and adventurous",
    pacing: "Fast",
    pageLength: 400
};

const longVersion = {
    pagesPerChapter: 8,
    totalChapters: 15,
    tone: "Dark and introspective",
    pacing: "Measured",
    pageLength: 600
};

// Create different versions of the book
createDrakeLegacy(shortVersion)
    .then(() => console.log("Short version created successfully"))
    .catch(error => console.error("Error creating short version:", error));

// Or create with default settings
createDrakeLegacy()
    .then(() => console.log("Default version created successfully"))
    .catch(error => console.error("Error creating default version:", error)); 
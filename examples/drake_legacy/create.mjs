import { TemplateLoader } from '../../src/config/template_loader.mjs';
import { createBookPageByPage } from '../../src/core/createbook.mjs';
import { createDrakeConfig } from '../../src/config/templates/drake_legacy.js';
import { shortVersion, longVersion } from './config.js';

async function createDrakeLegacy(options = {}) {
    console.log('Starting Drake Legacy book creation...');
    console.log('Using configuration:', options);

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
            'drake_legacy'  // specify book name for output
        );

        console.log("\nBook creation completed!");
        console.log("Output location:", result.outputPath);
        console.log("Cover image:", result.coverImage);
        return result;
    } catch (error) {
        console.error("Failed to create Drake Legacy:", error);
        throw error;
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const configArg = args.find(arg => arg.startsWith('--config='));
const configType = configArg ? configArg.split('=')[1] : 'default';

// Select configuration based on argument
let config = {};
switch(configType) {
    case 'short':
        config = shortVersion;
        break;
    case 'long':
        config = longVersion;
        break;
    default:
        config = {}; // Use default configuration
}

// Create the book
createDrakeLegacy(config)
    .then(() => console.log('Book creation process completed successfully'))
    .catch(error => {
        console.error('Book creation failed:', error);
        process.exit(1);
    }); 
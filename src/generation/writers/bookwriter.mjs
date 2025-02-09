import dotenv from 'dotenv';
import OpenAI from "openai";
import readline from 'readline';
import { createBookPageByPage } from './createbook.mjs';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class BookWriterSession {
    constructor() {
        this.isPaused = false;
        this.isStopped = false;
        this.currentChapter = 1;
        this.currentPage = 1;
    }

    pause() {
        this.isPaused = true;
        console.log("\n=== Writing paused ===");
        console.log("Current progress saved.");
        console.log("Type 'resume' to continue writing.");
    }

    resume() {
        this.isPaused = false;
        console.log("\n=== Resuming writing ===");
    }

    stop() {
        this.isStopped = true;
        console.log("\n=== Writing stopped ===");
        console.log("Progress saved. You can resume later by running the script again.");
        process.exit(0);
    }
}

// Add command listener
function setupCommandListener(session) {
    process.stdin.on('data', (data) => {
        const command = data.toString().trim().toLowerCase();
        switch(command) {
            case 'pause':
                session.pause();
                break;
            case 'resume':
                session.resume();
                break;
            case 'stop':
                session.stop();
                break;
            case 'status':
                console.log(`\nCurrent progress:`);
                console.log(`Chapter: ${session.currentChapter}`);
                console.log(`Page: ${session.currentPage}`);
                console.log(`Status: ${session.isPaused ? 'Paused' : 'Running'}`);
                break;
        }
    });
}

async function collectBookDetails() {
    console.log("\n=== AI Book Writer Setup ===\n");
    
    try {
        // Collect basic book information
        const bookDetails = {
            title: await question("Enter your book title: "),
            genre: await question("Enter the book genre (e.g., Fantasy, Sci-Fi, Romance): "),
            theme: await question("Describe your book's main theme or concept: "),
            targetAudience: await question("Who is your target audience? (e.g., Young Adult, Adult, Children): "),
            
            // Structure details
            chapters: parseInt(await question("How many chapters would you like? (recommended: 10-20): ")),
            pagesPerChapter: parseInt(await question("How many pages per chapter? (recommended: 5-10): ")),
            
            // Style preferences
            writingStyle: await question("Preferred writing style (e.g., Descriptive, Concise, Casual, Formal): "),
            tonePreference: await question("Preferred tone (e.g., Serious, Humorous, Dark, Light): "),
            
            // Language
            language: await question("Preferred language (en, es, fr, de, it, ja, zh) [default: en]: ") || 'en',
            
            // Additional features
            includeIllustrations: (await question("Include AI-generated illustrations? (yes/no): ")).toLowerCase() === 'yes',
            formatPreference: await question("Preferred output format (txt, html, epub, pdf) [default: txt]: ") || 'txt'
        };

        // Character details
        console.log("\n=== Main Character Details ===\n");
        const mainCharacter = {
            name: await question("Main character's name: "),
            description: await question("Brief description of main character: "),
            goal: await question("Character's main goal or motivation: ")
        };

        // Confirm details
        console.log("\n=== Book Configuration Summary ===\n");
        console.log(JSON.stringify({ ...bookDetails, mainCharacter }, null, 2));
        
        const confirm = await question("\nAre these details correct? (yes/no): ");
        
        if (confirm.toLowerCase() !== 'yes') {
            console.log("\nLet's start over...\n");
            return collectBookDetails();
        }

        return { ...bookDetails, mainCharacter };
        
    } catch (error) {
        console.error("Error collecting book details:", error);
        throw error;
    } finally {
        rl.close();
    }
}

async function startBookCreation() {
    const session = new BookWriterSession();
    setupCommandListener(session);

    console.log("\n=== Available Commands ===");
    console.log("'pause': Pause writing");
    console.log("'resume': Resume writing");
    console.log("'stop': Stop writing and save");
    console.log("'status': Check current progress\n");

    try {
        const bookDetails = await collectBookDetails();
        
        console.log("\n=== Starting Book Creation ===\n");
        console.log("This process may take some time. Progress will be saved automatically.");
        console.log("You can use the commands above at any time.\n");

        const themePrompt = `
            Write a book with the following specifications:
            Title: ${bookDetails.title}
            Genre: ${bookDetails.genre}
            Theme: ${bookDetails.theme}
            Main Character: ${bookDetails.mainCharacter.name} - ${bookDetails.mainCharacter.description}
            Character Goal: ${bookDetails.mainCharacter.goal}
            Writing Style: ${bookDetails.writingStyle}
            Tone: ${bookDetails.tonePreference}
            Target Audience: ${bookDetails.targetAudience}
        `;

        // Modified to handle pausing
        const result = await createBookPageByPage(
            themePrompt,
            bookDetails.chapters,
            bookDetails.pagesPerChapter,
            async (chapter, page) => {
                session.currentChapter = chapter;
                session.currentPage = page;

                // Check for pause
                while (session.isPaused) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Check for stop
                if (session.isStopped) {
                    throw new Error('Writing stopped by user');
                }
            }
        );

        console.log("\n=== Book Creation Completed ===\n");
        console.log(`Book saved as: ${result.compiledBook}`);
        console.log(`Total chapters: ${Object.keys(result.bookContent).length}`);
        console.log(`Cover image: ${result.coverImage}`);

    } catch (error) {
        if (error.message === 'Writing stopped by user') {
            console.log("\nBook creation stopped. Progress has been saved.");
        } else {
            console.error("Error in book creation process:", error);
        }
    } finally {
        rl.close();
        process.exit(0);
    }
}

// Run the script
console.log("Welcome to AI Book Writer!\n");
startBookCreation(); 
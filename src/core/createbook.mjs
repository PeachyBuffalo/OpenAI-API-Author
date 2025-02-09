import { BookManager } from './book_manager.mjs';
import { FileHandler } from '../utils/file_handler.mjs';
import { StateManager } from '../utils/state_manager.mjs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function createBookPageByPage(theme, chapters = 12, pagesPerChapter = 5, progressCallback = null, bookName = 'default') {
    const bookManager = new BookManager(bookName);
    
    try {
        await bookManager.ensureDirectories();
        
        // Try to resume from previous state
        const hasState = await bookManager.loadState();
        if (hasState) {
            console.log("Resuming from previous state...");
        } else {
            // Create new outline
            console.log("Creating book outline...");
            const outlinePrompt = `Create a detailed outline for a book with the following theme: ${theme}`;
            const outlineResponse = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: "You are a professional book outliner." },
                    { role: "user", content: outlinePrompt }
                ]
            });
            bookManager.outline = outlineResponse.choices[0].message.content;
        }

        // Generate cover
        if (!bookManager.metadata.coverImage) {
            const coverPrompt = `Create a professional book cover for: ${theme}`;
            const coverResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: coverPrompt,
                n: 1,
                size: "1024x1024"
            });
            bookManager.metadata.coverImage = coverResponse.data[0].url;
            await bookManager.saveCoverImage(coverResponse.data[0].url);
        }

        // Generate chapters page by page
        const startChapter = bookManager.progressState.lastCompletedChapter + 1;
        for (let chapter = startChapter; chapter <= chapters; chapter++) {
            for (let page = 1; page <= pagesPerChapter; page++) {
                if (progressCallback) {
                    await progressCallback(chapter, page);
                }

                console.log(`Generating Chapter ${chapter}, Page ${page}...`);
                
                const prompt = `Write page ${page} of chapter ${chapter}. Use the following outline as context: ${bookManager.outline}`;
                const completion = await openai.chat.completions.create({
                    model: "gpt-4-turbo",
                    messages: [
                        { role: "system", content: "You are a professional book writer." },
                        { role: "user", content: prompt }
                    ]
                });

                const pageContent = completion.choices[0].message.content;
                await bookManager.saveProgress(pageContent, chapter, page);

                // Update book content
                if (!bookManager.bookContent[chapter]) {
                    bookManager.bookContent[chapter] = {};
                }
                bookManager.bookContent[chapter][page] = pageContent;
            }
            await bookManager.saveState();
        }

        // Compile final book
        const compiledBook = await bookManager.compileBook();
        
        return {
            outline: bookManager.outline,
            coverImage: bookManager.metadata.coverImage,
            compiledBook,
            metadata: bookManager.metadata,
            outputPath: bookManager.outputPath
        };

    } catch (error) {
        console.error("Error in book creation:", error);
        await bookManager.saveState();
        throw error;
    }
} 
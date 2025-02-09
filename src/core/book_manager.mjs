import fs from 'fs/promises';
import { FileHandler } from '../utils/file_handler.mjs';
import { StateManager } from '../utils/state_manager.mjs';
import { Document, Packer } from 'docx';

export class BookManager {
    constructor(bookName) {
        this.bookName = bookName;
        this.outputPath = `output/books/${bookName}`;
        this.tempPath = 'temp';
        this.stateManager = new StateManager(bookName);
        this.progressState = {
            lastCompletedChapter: 0,
            lastCompletedPage: 0,
            status: 'not_started'
        };
        this.characters = new Map();
        this.plotPoints = new Set();
        this.bookContent = {};
        this.outline = {};
        this.metadata = {};
    }

    async ensureDirectories() {
        const dirs = [
            `${this.outputPath}/chapters`,
            `${this.outputPath}/compiled`,
            `${this.outputPath}/metadata`,
            `${this.outputPath}/assets`,
            this.tempPath
        ];

        for (const dir of dirs) {
            await FileHandler.createDirectory(dir);
        }
    }

    async saveProgress(content, chapter, page) {
        await this.ensureDirectories();
        const chapterDir = `${this.outputPath}/chapters/chapter${chapter}`;
        await FileHandler.createDirectory(chapterDir);

        // Save JSON version
        await FileHandler.writeFile(
            `${chapterDir}/page${page}.json`,
            {
                chapter,
                page,
                content,
                timestamp: new Date().toISOString()
            }
        );

        // Save DOCX version
        const doc = await this.createDocxDocument(content, chapter, page);
        await FileHandler.writeFile(`${chapterDir}/page${page}.docx`, doc);

        // Update progress state
        this.progressState.lastCompletedChapter = chapter;
        this.progressState.lastCompletedPage = page;
        this.progressState.status = 'in_progress';
        await this.saveState();
    }

    async createDocxDocument(content, chapter, page) {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    {
                        text: `Chapter ${chapter}, Page ${page}`,
                        heading: 1
                    },
                    {
                        text: content
                    }
                ]
            }]
        });

        return await Packer.toBuffer(doc);
    }

    async saveState() {
        const state = {
            progress: this.progressState,
            characters: Array.from(this.characters.entries()),
            plotPoints: Array.from(this.plotPoints),
            bookContent: this.bookContent,
            outline: this.outline,
            metadata: this.metadata
        };
        
        await this.stateManager.saveState(state);
    }

    async loadState() {
        const state = await this.stateManager.loadState();
        if (state) {
            this.progressState = state.progress;
            this.characters = new Map(state.characters);
            this.plotPoints = new Set(state.plotPoints);
            this.bookContent = state.bookContent;
            this.outline = state.outline;
            this.metadata = state.metadata;
            return true;
        }
        return false;
    }

    async compileBook() {
        await this.ensureDirectories();
        
        // Save in multiple formats
        const formats = {
            json: await this.compileJSON(),
            docx: await this.compileDOCX()
        };

        return formats;
    }

    async compileJSON() {
        const compiledPath = `${this.outputPath}/compiled/complete.json`;
        await FileHandler.writeFile(compiledPath, this.bookContent);
        return compiledPath;
    }

    async compileDOCX() {
        const compiledPath = `${this.outputPath}/compiled/complete.docx`;
        const doc = new Document({
            sections: Object.entries(this.bookContent).map(([chapter, pages]) => ({
                properties: {},
                children: Object.entries(pages).map(([page, content]) => [
                    {
                        text: `Chapter ${chapter}, Page ${page}`,
                        heading: 1
                    },
                    {
                        text: content
                    }
                ]).flat()
            }))
        });

        const buffer = await Packer.toBuffer(doc);
        await FileHandler.writeFile(compiledPath, buffer);
        return compiledPath;
    }

    async saveCoverImage(imageUrl) {
        const response = await fetch(imageUrl);
        const buffer = await response.buffer();
        await FileHandler.writeFile(`${this.outputPath}/assets/cover.png`, buffer);
        return `${this.outputPath}/assets/cover.png`;
    }
} 
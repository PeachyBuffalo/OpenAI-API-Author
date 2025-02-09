import dotenv from 'dotenv';
import OpenAI from "openai";
import fs from 'fs/promises';
import { marked } from 'marked';
import { translate } from '@vitalets/google-translate-api';
import { Document, Paragraph, TextRun, Packer, AlignmentType, Header, Footer, TabStopType, TabStopPosition, LeaderType } from 'docx';

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are an advanced AI book writer assistant specialized in creating long-form chapter books.
Your capabilities include:
- Creating detailed book outlines
- Writing complete chapters
- Maintaining consistency across the narrative
- Handling document merging and page numbering
- Creating vivid story descriptions
- Working with existing manuscripts to continue the story

Please analyze any provided manuscript deeply before continuing the story.
When GPT-4 limits are reached, save progress and use prompt #2 (LET'S FINISH MY BOOK⭐) to continue later.`;

class BookManager {
    constructor() {
        this.currentChapter = 1;
        this.currentPage = 1;
        this.bookContent = {};
        this.outline = {};
        this.metadata = {
            title: 'Drake Legacy',
            author: 'AI Writer',
            genre: 'Urban Fantasy',
            targetAudience: 'Young Adult/Adult',
            createdDate: new Date().toISOString()
        };
        this.conversationHistory = [];
        this.characters = new Map();
        this.plotPoints = new Set();
        this.progressState = {
            lastCompletedChapter: 0,
            lastCompletedPage: 0,
            status: 'not_started'
        };
        this.supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'ja', 'zh'];
        this.currentLanguage = 'en';
    }

    async initialize() {
        try {
            // Try to load existing metadata
            await this.loadMetadata();
        } catch {
            // If no metadata exists, create new
            this.metadata = await this.initializeBookMetadata();
        }
    }

    async saveProgress(content, chapter, page) {
        // Save as JSON for program state
        const jsonFileName = `chapter${chapter}_page${page}.json`;
        await fs.writeFile(jsonFileName, JSON.stringify({
            chapter,
            page,
            content,
            timestamp: new Date().toISOString()
        }));

        // Also save as DOCX for reading
        await this.saveAsDocx(content, chapter, page);
        
        console.log(`Progress saved to ${jsonFileName} and DOCX`);
    }

    async saveAsDocx(content, chapter, page) {
        const doc = new Document({
            styles: {
                paragraphStyles: [
                    {
                        id: 'chapterHeading',
                        name: 'Chapter Heading',
                        run: {
                            size: 32,
                            bold: true,
                            font: 'Garamond',
                            color: '000000'
                        },
                        paragraph: {
                            spacing: {
                                before: 240,
                                after: 120
                            },
                            alignment: AlignmentType.CENTER
                        }
                    },
                    {
                        id: 'pageHeading',
                        name: 'Page Heading',
                        run: {
                            size: 24,
                            bold: true,
                            font: 'Garamond',
                            color: '444444'
                        },
                        paragraph: {
                            spacing: {
                                before: 180,
                                after: 120
                            }
                        }
                    },
                    {
                        id: 'bodyText',
                        name: 'Body Text',
                        run: {
                            size: 24,
                            font: 'Georgia',
                            color: '000000'
                        },
                        paragraph: {
                            spacing: {
                                line: 360, // 1.5 line spacing
                                before: 120,
                                after: 120
                            },
                            indent: {
                                firstLine: 720 // First line indent
                            }
                        }
                    },
                    {
                        id: 'dialogue',
                        name: 'Dialogue',
                        run: {
                            size: 24,
                            font: 'Georgia',
                            color: '000000',
                            italics: true
                        },
                        paragraph: {
                            spacing: {
                                line: 360,
                                before: 120,
                                after: 120
                            },
                            indent: {
                                left: 720, // Indent dialogue
                                right: 720
                            }
                        }
                    },
                    {
                        id: 'sceneBreak',
                        name: 'Scene Break',
                        run: {
                            size: 24,
                            font: 'Georgia',
                            color: '000000'
                        },
                        paragraph: {
                            spacing: {
                                before: 480,
                                after: 480
                            },
                            alignment: AlignmentType.CENTER
                        }
                    },
                    {
                        id: 'chapterTitle',
                        name: 'Chapter Title',
                        run: {
                            size: 36,
                            bold: true,
                            font: 'Garamond',
                            color: '000000'
                        },
                        paragraph: {
                            spacing: {
                                before: 1440,
                                after: 720
                            },
                            alignment: AlignmentType.CENTER
                        }
                    }
                ]
            },
            sections: [
                // Chapter Title Page
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440,
                                right: 1440,
                                bottom: 1440,
                                left: 1440
                            },
                            size: {
                                width: 12240,
                                height: 15840
                            }
                        }
                    },
                    children: [
                        new Paragraph({
                            text: `Chapter ${chapter}`,
                            style: 'chapterTitle'
                        }),
                        // Optional chapter subtitle or quote
                        new Paragraph({
                            text: this.getChapterSubtitle(chapter),
                            style: 'pageHeading'
                        })
                    ]
                },
                // Content Section
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch
                                right: 1440,
                                bottom: 1440,
                                left: 1440
                            },
                            size: {
                                width: 12240, // 8.5 inches
                                height: 15840 // 11 inches
                            }
                        }
                    },
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Chapter ${chapter}`,
                                            font: 'Garamond',
                                            size: 20
                                        })
                                    ],
                                    alignment: AlignmentType.RIGHT
                                })
                            ]
                        })
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Page ${page}`,
                                            font: 'Garamond',
                                            size: 20
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER
                                })
                            ]
                        })
                    },
                    children: this.formatContentWithStyles(content, chapter, page)
                }
            ]
        });

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(`chapter${chapter}_page${page}.docx`, buffer);
    }

    formatContentWithStyles(content, chapter, page) {
        const paragraphs = [];
        const lines = content.split('\n\n');

        for (const line of lines) {
            if (this.isDialogue(line)) {
                // Format dialogue
                paragraphs.push(
                    new Paragraph({
                        text: line,
                        style: 'dialogue'
                    })
                );
            } else if (this.isSceneBreak(line)) {
                // Add scene break marker
                paragraphs.push(
                    new Paragraph({
                        text: '* * *',
                        style: 'sceneBreak'
                    })
                );
            } else {
                // Regular paragraph
                paragraphs.push(
                    new Paragraph({
                        text: line,
                        style: 'bodyText'
                    })
                );
            }
        }

        return paragraphs;
    }

    isDialogue(text) {
        // Detect dialogue by looking for quotes
        return text.trim().startsWith('"') || text.trim().startsWith('"<');
    }

    isSceneBreak(text) {
        // Detect scene breaks (customize based on your needs)
        return text.trim() === '***' || text.trim() === '---';
    }

    getChapterSubtitle(chapter) {
        // Get chapter subtitle from outline or metadata
        return this.outline[chapter]?.subtitle || '';
    }

    async loadProgress(chapter, page) {
        const fileName = `chapter${chapter}_page${page}.json`;
        try {
            const data = await fs.readFile(fileName, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading progress:", error);
            return null;
        }
    }

    async compileBook() {
        // Generate table of contents first
        await this.generateTableOfContents();

        // Create JSON compilation
        const jsonContent = JSON.stringify(this.bookContent, null, 2);
        await fs.writeFile('complete_book.json', jsonContent);

        // Create DOCX compilation
        const doc = new Document();
        for (let chapter in this.bookContent) {
            for (let page in this.bookContent[chapter]) {
                doc.addSection({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Chapter ${chapter}, Page ${page}`,
                                    bold: true,
                                    size: 24
                                }),
                                new TextRun({
                                    text: '\n\n' + this.bookContent[chapter][page],
                                    size: 12
                                })
                            ]
                        })
                    ]
                });
            }
        }

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile('complete_book.docx', buffer);

        return {
            json: 'complete_book.json',
            docx: 'complete_book.docx'
        };
    }

    async createOutline(theme, length) {
        const outlinePrompt = `Create a detailed book outline for a ${length}-chapter book about ${theme}. 
                             Include chapter summaries and key plot points.`;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: outlinePrompt }
            ],
            temperature: 0.7
        });

        this.outline = completion.choices[0].message.content;
        await this.saveOutline();
        return this.outline;
    }

    async continueStory(previousContent) {
        // Add to conversation history for context
        this.conversationHistory.push({
            role: "assistant",
            content: previousContent
        });

        // Limit history to last 5 exchanges to avoid token limits
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }

        return this.conversationHistory;
    }

    async exportToFormat(format = 'txt') {
        const content = await this.compileBook();
        
        switch(format) {
            case 'html':
                return this.exportToHTML(content);
            case 'markdown':
                return this.exportToMarkdown(content);
            case 'epub':
                return this.exportToEPUB(content);
            default:
                return content;
        }
    }

    async saveMetadata() {
        await fs.writeFile('book_metadata.json', JSON.stringify(this.metadata, null, 2));
    }

    async loadMetadata() {
        try {
            const data = await fs.readFile('book_metadata.json', 'utf8');
            this.metadata = JSON.parse(data);
        } catch (error) {
            console.error("No metadata file found, creating new one");
            await this.saveMetadata();
        }
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
        
        await fs.writeFile('book_state.json', JSON.stringify(state, null, 2));
    }

    async loadState() {
        try {
            const data = await fs.readFile('book_state.json', 'utf8');
            const state = JSON.parse(data);
            
            this.progressState = state.progress;
            this.characters = new Map(state.characters);
            this.plotPoints = new Set(state.plotPoints);
            this.bookContent = state.bookContent;
            this.outline = state.outline;
            this.metadata = state.metadata;
            
            return true;
        } catch (error) {
            console.error("No saved state found or error loading state:", error);
            return false;
        }
    }

    async addCharacter(name, details) {
        this.characters.set(name, {
            ...details,
            firstAppearance: this.currentChapter,
            appearances: new Set([this.currentChapter])
        });
    }

    async checkConsistency(content) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: "Analyze the text for character and plot consistency."
                },
                {
                    role: "user",
                    content: `Check this content against known characters and plot points:
                             Characters: ${JSON.stringify(Array.from(this.characters.entries()))}
                             Plot Points: ${JSON.stringify(Array.from(this.plotPoints))}
                             Content: ${content}`
                }
            ]
        });

        return completion.choices[0].message.content;
    }

    async editAndProofread(content) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert editor and proofreader. Fix grammar, spelling, and style issues while maintaining the original voice."
                },
                {
                    role: "user",
                    content: content
                }
            ]
        });

        return completion.choices[0].message.content;
    }

    async translateContent(content, targetLanguage) {
        if (!this.supportedLanguages.includes(targetLanguage)) {
            throw new Error(`Language ${targetLanguage} not supported`);
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: `Translate the following text to ${targetLanguage}, maintaining the style and tone:`
                },
                {
                    role: "user",
                    content: content
                }
            ]
        });

        return completion.choices[0].message.content;
    }

    async formatContent(content, format) {
        switch (format) {
            case 'html':
                return this.formatHTML(content);
            case 'epub':
                return this.formatEPUB(content);
            case 'pdf':
                return this.formatPDF(content);
            default:
                return content;
        }
    }

    async formatHTML(content) {
        const html = marked(content);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c3e50; }
                    p { line-height: 1.6; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;
    }

    async generatePage(chapterNum, pageNum, previousPages) {
        const pagePrompt = `
            You are writing page ${pageNum} of chapter ${chapterNum}.
            
            Context from previous pages:
            ${previousPages}
            
            Current outline for this chapter:
            ${this.outline[chapterNum] || 'No outline available'}
            
            Known characters:
            ${JSON.stringify(Array.from(this.characters.entries()))}
            
            Important plot points:
            ${JSON.stringify(Array.from(this.plotPoints))}
            
            Write the next page maintaining consistency with the story. 
            Each page should be approximately 500 words.
            End the page at a natural break point.
            
            Format the response as a single page of prose.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: pagePrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
        });

        return completion.choices[0].message.content;
    }

    async extractMetadata(content) {
        try {
            const metadataPrompt = `
                Analyze this text and extract:
                1. Any new characters introduced
                2. Important plot points
                3. Key story developments
                
                Format the response as valid JSON with this structure:
                {
                    "characters": [
                        {"name": "character name", "details": "character description"}
                    ],
                    "plotPoints": ["plot point 1", "plot point 2"],
                    "storyDevelopments": ["development 1", "development 2"]
                }
                
                Text to analyze: ${content}
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a metadata extractor. Always respond with valid JSON." 
                    },
                    { 
                        role: "user", 
                        content: metadataPrompt 
                    }
                ],
                response_format: { type: "json_object" } // Ensure JSON response
            });

            let metadata;
            try {
                metadata = JSON.parse(completion.choices[0].message.content);
            } catch (error) {
                console.error("Failed to parse metadata response:", error);
                // Provide default metadata if parsing fails
                metadata = {
                    characters: [],
                    plotPoints: [],
                    storyDevelopments: []
                };
            }

            // Add new characters
            if (metadata.characters) {
                for (const char of metadata.characters) {
                    await this.addCharacter(char.name, char.details);
                }
            }

            // Add plot points
            if (metadata.plotPoints) {
                for (const point of metadata.plotPoints) {
                    this.plotPoints.add(point);
                }
            }

            return metadata;
        } catch (error) {
            console.error("Error in metadata extraction:", error);
            return {
                characters: [],
                plotPoints: [],
                storyDevelopments: []
            };
        }
    }

    async generateChapterPages(chapter, pagesPerChapter) {
        try {
            console.log(`Generating Chapter ${chapter}...`);
            
            for (let page = 1; page <= pagesPerChapter; page++) {
                console.log(`Generating page ${page} of chapter ${chapter}...`);
                
                // Get previous content for context
                const previousPages = [];
                for (let p = 1; p < page; p++) {
                    const prevPage = await this.loadProgress(chapter, p);
                    if (prevPage) {
                        previousPages.push(prevPage.content);
                    }
                }

                const pageContent = await this.generatePage(chapter, page, previousPages.join('\n'));
                
                // Save the page
                await this.saveProgress(pageContent, chapter, page);
                
                // Update book content
                if (!this.bookContent[chapter]) {
                    this.bookContent[chapter] = {};
                }
                this.bookContent[chapter][page] = pageContent;

                // Extract and track metadata
                await this.extractMetadata(pageContent);
            }
        } catch (error) {
            console.error(`Error generating chapter ${chapter}:`, error);
            throw error;
        }
    }

    async saveOutline() {
        try {
            await fs.writeFile('book_outline.json', JSON.stringify(this.outline, null, 2));
            console.log("Outline saved successfully");
        } catch (error) {
            console.error("Error saving outline:", error);
        }
    }

    async generateTableOfContents() {
        const toc = new Document({
            styles: {
                paragraphStyles: [
                    {
                        id: 'tocHeading',
                        name: 'TOC Heading',
                        run: {
                            size: 32,
                            bold: true,
                            font: 'Garamond'
                        },
                        paragraph: {
                            spacing: {
                                before: 240,
                                after: 120
                            },
                            alignment: AlignmentType.CENTER
                        }
                    },
                    {
                        id: 'tocEntry',
                        name: 'TOC Entry',
                        run: {
                            size: 24,
                            font: 'Garamond'
                        },
                        paragraph: {
                            spacing: {
                                before: 60,
                                after: 60
                            },
                            indent: {
                                left: 360
                            }
                        }
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: [
                    new Paragraph({
                        text: 'Table of Contents',
                        style: 'tocHeading'
                    }),
                    ...this.generateTocEntries()
                ]
            }]
        });

        const buffer = await Packer.toBuffer(toc);
        await fs.writeFile('table_of_contents.docx', buffer);
    }

    generateTocEntries() {
        const entries = [];
        for (let chapter in this.bookContent) {
            entries.push(
                new Paragraph({
                    text: `Chapter ${chapter}: ${this.getChapterSubtitle(chapter)}`,
                    style: 'tocEntry',
                    tabStops: [{
                        type: TabStopType.RIGHT,
                        position: TabStopPosition.MAX,
                        leader: LeaderType.DOT
                    }],
                    children: [
                        new TextRun({
                            text: `${chapter}`,
                            font: 'Garamond'
                        })
                    ]
                })
            );
        }
        return entries;
    }

    async initializeBookMetadata() {
        const metadata = {
            title: "Drake Legacy",
            author: "AI Writer",
            genre: "Urban Fantasy",
            subgenre: ["Supernatural", "Martial Arts", "Coming of Age"],
            targetAudience: "Young Adult/Adult",
            createdDate: new Date().toISOString(),
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
        };

        await fs.writeFile('book_metadata.json', JSON.stringify(metadata, null, 2));
        return metadata;
    }
}

async function generateBookContent(userPrompt, bookManager) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    await bookManager.saveProgress(
        content, 
        bookManager.currentChapter, 
        bookManager.currentPage
    );
    return content;
}

async function generateStoryImage(prompt) {
    const image = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
    });
    
    return image.data[0].url;
}

class BatchBookManager extends BookManager {
    constructor() {
        super();
        this.batchTasks = [];
        this.batchResults = [];
    }

    async createBatchTasks(chapters, theme) {
        for (let chapter = 1; chapter <= chapters; chapter++) {
            const task = {
                "custom_id": `chapter-${chapter}`,
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4-turbo",
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "messages": [
                        {
                            "role": "system",
                            "content": systemPrompt
                        },
                        {
                            "role": "user",
                            "content": `Write Chapter ${chapter} for a book about ${theme}. 
                                      Use the following outline: ${this.outline}
                                      Previous chapters context: ${JSON.stringify(this.bookContent)}`
                        }
                    ]
                }
            };
            this.batchTasks.push(task);
        }
    }

    async submitBatchJob() {
        // Create batch file
        const batchFileName = `batch_tasks_${Date.now()}.jsonl`;
        await fs.writeFile(batchFileName, 
            this.batchTasks.map(task => JSON.stringify(task)).join('\n')
        );

        // Upload file to OpenAI
        const batchFile = await openai.files.create({
            file: await fs.readFile(batchFileName),
            purpose: "batch"
        });

        // Create batch job
        const batchJob = await openai.batches.create({
            input_file_id: batchFile.id,
            endpoint: "/v1/chat/completions",
            completion_window: "24h"
        });

        return batchJob;
    }

    async processBatchResults(resultFileId) {
        const results = await super.processBatchResults(resultFileId);

        for (const result of results) {
            const content = result.response.body.choices[0].message.content;
            
            // Check consistency
            const consistencyCheck = await this.checkConsistency(content);
            console.log(`Consistency check for chapter ${result.chapterNum}:`, consistencyCheck);

            // Edit and proofread
            const editedContent = await this.editAndProofread(content);

            // Update progress
            this.progressState.lastCompletedChapter = Math.max(
                this.progressState.lastCompletedChapter,
                result.chapterNum
            );

            // Save state after each chapter
            await this.saveState();
        }
    }
}

async function createBookWithBatch(theme, chapters = 12, language = 'en') {
    const batchManager = new BatchBookManager();
    
    // Try to resume from previous state
    const hasState = await batchManager.loadState();
    if (hasState) {
        console.log("Resuming from previous state...");
    }

    try {
        // Step 1: Create outline
        console.log("Creating book outline...");
        const outline = await batchManager.createOutline(theme, chapters);
        console.log("Outline created:", outline);

        // Step 2: Generate cover image
        const coverPrompt = `Create a professional book cover for: ${theme}`;
        const coverImage = await generateStoryImage(coverPrompt);
        console.log("Cover image generated:", coverImage);

        // Step 3: Create batch tasks for all chapters
        await batchManager.createBatchTasks(chapters, theme);

        // Step 4: Submit batch job
        const batchJob = await batchManager.submitBatchJob();
        console.log("Batch job submitted:", batchJob.id);

        // Step 5: Monitor job status
        let jobStatus;
        do {
            const status = await openai.batches.retrieve(batchJob.id);
            jobStatus = status.status;
            console.log("Current status:", jobStatus);
            if (jobStatus !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            }
        } while (jobStatus !== 'completed');

        // Step 6: Process results
        await batchManager.processBatchResults(batchJob.output_file_id);

        // Add translation if needed
        if (language !== 'en') {
            console.log(`Translating content to ${language}...`);
            for (let chapter in batchManager.bookContent) {
                const translatedContent = await batchManager.translateContent(
                    batchManager.bookContent[chapter][1],
                    language
                );
                batchManager.bookContent[chapter][1] = translatedContent;
            }
        }

        // Format in multiple styles
        const formattedContent = await Promise.all([
            batchManager.formatContent(batchManager.compileBook(), 'html'),
            batchManager.formatContent(batchManager.compileBook(), 'epub'),
            batchManager.formatContent(batchManager.compileBook(), 'pdf')
        ]);

        return {
            outline,
            coverImage,
            bookContent: batchManager.bookContent,
            metadata: batchManager.metadata,
            formattedContent,
            progressState: batchManager.progressState,
            consistencyReport: await batchManager.checkConsistency(JSON.stringify(batchManager.bookContent))
        };

    } catch (error) {
        // Save state on error for recovery
        await batchManager.saveState();
        throw error;
    }
}

async function createBookPageByPage(theme, chapters = 12, pagesPerChapter = 5, progressCallback = null) {
    const bookManager = new BookManager();
    
    try {
        // Try to resume from previous state
        const hasState = await bookManager.loadState();
        if (hasState) {
            console.log("Resuming from previous state...");
        } else {
            // Create new outline
            console.log("Creating book outline...");
            await bookManager.createOutline(theme, chapters);
        }

        // Generate cover
        if (!bookManager.metadata.coverImage) {
            const coverPrompt = `Create a professional book cover for: ${theme}`;
            bookManager.metadata.coverImage = await generateStoryImage(coverPrompt);
            await bookManager.saveMetadata();
        }

        // Generate chapters page by page
        const startChapter = bookManager.progressState.lastCompletedChapter + 1;
        for (let chapter = startChapter; chapter <= chapters; chapter++) {
            // Call generateChapterPages once per chapter
            if (progressCallback) {
                await progressCallback(chapter, 1); // Notify start of chapter
            }
            
            await bookManager.generateChapterPages(chapter, pagesPerChapter);
            
            // Save progress after each chapter
            await bookManager.saveState();
            console.log(`Completed Chapter ${chapter}`);
        }

        // Compile final book
        const compiledBook = await bookManager.compileBook();
        
        return {
            outline: bookManager.outline,
            coverImage: bookManager.metadata.coverImage,
            bookContent: bookManager.bookContent,
            metadata: bookManager.metadata,
            progressState: bookManager.progressState,
            compiledBook
        };

    } catch (error) {
        console.error("Error in book creation:", error);
        await bookManager.saveState(); // Save state on error
        throw error;
    }
}

// Example usage
const theme = "A fighter discovering supernatural abilities while dealing with personal demons";
createBookPageByPage(theme, 12, 5)
    .then(result => console.log("Book creation completed:", result))
    .catch(error => console.error("Book creation failed:", error));

export { createBookPageByPage };
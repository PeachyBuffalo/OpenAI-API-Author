import mammoth from 'mammoth';
import EPub from 'epub';
import natural from 'natural';
import fs from 'fs/promises';

class BookAnalyzer {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.tagger = new natural.BrillPOSTagger();
    }

    async analyzeBook(filePath) {
        // Handle filenames with spaces and get the actual extension
        const filePathParts = filePath.split('.');
        const fileType = filePathParts[filePathParts.length - 1].toLowerCase().trim();
        let content;

        console.log('Processing file type:', fileType); // Debug log

        try {
            if (fileType === 'docx') {
                content = await this.readDocx(filePath);
            } else if (fileType === 'epub') {
                content = await this.readEpub(filePath);
            } else {
                throw new Error(`Unsupported file format: ${fileType}. Please use DOCX or EPUB.`);
            }

            if (!content) {
                throw new Error('No content extracted from file');
            }

            return this.generateTemplate(content);
        } catch (error) {
            console.error('Error reading file:', error);
            throw new Error(`Failed to process ${filePath}: ${error.message}`);
        }
    }

    async readDocx(filePath) {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    async readEpub(filePath) {
        return new Promise((resolve, reject) => {
            try {
                const epub = new EPub(filePath);
                let content = '';

                epub.on('error', (error) => {
                    reject(new Error(`EPUB parsing error: ${error.message}`));
                });

                epub.on('end', () => {
                    if (!epub.flow || epub.flow.length === 0) {
                        reject(new Error('No content found in EPUB file'));
                        return;
                    }

                    let processedChapters = 0;
                    epub.flow.forEach(chapter => {
                        epub.getChapter(chapter.id, (error, text) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            content += text;
                            processedChapters++;

                            if (processedChapters === epub.flow.length) {
                                resolve(content);
                            }
                        });
                    });
                });

                epub.parse();
            } catch (error) {
                reject(new Error(`Failed to read EPUB file: ${error.message}`));
            }
        });
    }

    async generateTemplate(content) {
        const analysis = {
            structure: this.analyzeStructure(content),
            style: this.analyzeStyle(content),
            characters: this.extractCharacters(content),
            themes: this.extractThemes(content),
            metadata: this.extractMetadata(content)
        };

        const template = this.createTemplate(analysis);
        await this.saveAnalysis(analysis, template);
        return template;
    }

    analyzeStructure(content) {
        const chapters = content.split(/Chapter \d+/i);
        const averageChapterLength = chapters.reduce((sum, chapter) => 
            sum + this.tokenizer.tokenize(chapter).length, 0) / chapters.length;

        return {
            totalChapters: chapters.length - 1, // Subtract 1 for split artifact
            averageChapterLength,
            pagesPerChapter: Math.ceil(averageChapterLength / 250), // Assuming ~250 words per page
            sceneBreaks: this.detectSceneBreaks(content),
            dialogueFrequency: this.analyzeDialogue(content)
        };
    }

    analyzeStyle(content) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const words = this.tokenizer.tokenize(content);

        return {
            tone: this.analyzeTone(content),
            pacing: this.analyzePacing(sentences),
            averageSentenceLength: words.length / sentences.length,
            dialogueStyle: this.detectDialogueStyle(content),
            pointOfView: this.detectPOV(content)
        };
    }

    extractCharacters(content) {
        // Current implementation misses main characters
        // Add specific character detection for known names
        const mainCharacters = [
            'John Drake', 'Mae Leigh', 'Missy Drake', 'Kai Drake',
            'Po Van', 'Seelee Van', 'Damen', 'Strider', 'Richard Anderson'
        ];
        
        // Improve character context extraction
        const characterInfo = mainCharacters.map(name => ({
            name,
            frequency: this.countOccurrences(content, name),
            context: this.extractCharacterContext(content, name),
            isMainCharacter: true
        }));

        // Add relationship detection
        const relationships = this.detectRelationships(content, mainCharacters);

        return characterInfo;
    }

    detectRelationships(content, characters) {
        const relationships = {};
        const relationshipWords = ['father', 'mother', 'son', 'daughter', 'friend', 'mentor'];
        
        characters.forEach(char => {
            const nearbyText = this.findNearbyText(content, char, 100);
            relationships[char] = relationshipWords.filter(word => 
                nearbyText.toLowerCase().includes(word)
            );
        });
        
        return relationships;
    }

    extractThemes(content) {
        const coreThemes = [
            'identity', 'family', 'legacy', 'martial arts',
            'disability representation', 'coming of age',
            'faith', 'mystery', 'supernatural abilities'
        ];
        
        return coreThemes.map(theme => ({
            theme,
            relevance: this.analyzeThemeRelevance(content, theme),
            contexts: this.findThemeContexts(content, theme)
        })).filter(t => t.relevance > 0);
    }

    createTemplate(analysis) {
        return {
            metadata: {
                title: analysis.metadata.title || "Untitled",
                genre: analysis.metadata.genre || this.determineGenre(analysis),
                targetAudience: this.determineTargetAudience(analysis),
                themes: analysis.themes.keywords.slice(0, 5)
            },
            chapterStructure: {
                totalChapters: analysis.structure.totalChapters,
                pagesPerChapter: analysis.structure.pagesPerChapter,
                format: {
                    pageLength: 500,
                    dialogueStyle: analysis.style.dialogueStyle,
                    sceneBreakMarker: analysis.structure.sceneBreaks[0] || "* * *"
                }
            },
            styleGuide: {
                tone: analysis.style.tone,
                pacing: analysis.style.pacing,
                pointOfView: analysis.style.pointOfView,
                dialogueFormat: {
                    standard: analysis.style.dialogueStyle
                }
            },
            characters: analysis.characters.map(char => ({
                name: char.name,
                description: char.context,
                importance: char.frequency > 100 ? "main" : "supporting"
            }))
        };
    }

    async saveAnalysis(analysis, template) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await fs.writeFile(
            `book_analysis_${timestamp}.json`,
            JSON.stringify(analysis, null, 2)
        );
        await fs.writeFile(
            `book_template_${timestamp}.json`,
            JSON.stringify(template, null, 2)
        );
    }

    detectSceneBreaks(content) {
        const commonBreaks = ['***', '---', '* * *', '• • •'];
        const found = commonBreaks.filter(breakMarker => content.includes(breakMarker));
        return found.length > 0 ? found : ['* * *']; // Default if none found
    }

    analyzeDialogue(content) {
        const dialogueMatches = content.match(/["'].*?["']/g) || [];
        return {
            frequency: dialogueMatches.length,
            averageLength: dialogueMatches.reduce((sum, d) => sum + d.length, 0) / dialogueMatches.length || 0
        };
    }

    analyzeTone(content) {
        // Simple tone analysis based on keyword frequency
        const toneIndicators = {
            serious: ['grave', 'solemn', 'serious', 'heavy', 'grim'],
            light: ['laugh', 'smile', 'joke', 'playful', 'light'],
            dark: ['dark', 'shadow', 'grim', 'ominous', 'foreboding'],
            hopeful: ['hope', 'bright', 'light', 'promise', 'future']
        };

        const toneScores = {};
        for (const [tone, keywords] of Object.entries(toneIndicators)) {
            toneScores[tone] = keywords.reduce((score, word) => 
                score + (content.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0
            );
        }

        return Object.entries(toneScores)
            .sort(([,a], [,b]) => b - a)[0][0]; // Return most frequent tone
    }

    analyzePacing(sentences) {
        const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        if (avgLength < 50) return 'Fast';
        if (avgLength > 100) return 'Slow';
        return 'Moderate';
    }

    detectDialogueStyle(content) {
        const styles = {
            standard: (content.match(/["'].*?["']/g) || []).length,
            signed: (content.match(/<.*?>/g) || []).length,
            thought: (content.match(/\(.*?\)/g) || []).length
        };

        return Object.entries(styles)
            .sort(([,a], [,b]) => b - a)[0][0]; // Return most common style
    }

    detectPOV(content) {
        const pronouns = {
            first: ['I', 'me', 'my', 'we', 'our'],
            third: ['he', 'she', 'they', 'his', 'her', 'their']
        };

        const counts = {
            first: pronouns.first.reduce((count, pronoun) => 
                count + (content.match(new RegExp(`\\b${pronoun}\\b`, 'gi')) || []).length, 0
            ),
            third: pronouns.third.reduce((count, pronoun) => 
                count + (content.match(new RegExp(`\\b${pronoun}\\b`, 'gi')) || []).length, 0
            )
        };

        return counts.first > counts.third ? 'First person' : 'Third person';
    }

    extractProperNouns(content) {
        const words = content.match(/[A-Z][a-z]+/g) || [];
        return [...new Set(words)]; // Remove duplicates
    }

    countOccurrences(content, word) {
        return (content.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
    }

    extractCharacterContext(content, name) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        const relevantSentences = sentences.filter(s => s.includes(name));
        return relevantSentences.slice(0, 3).join(' '); // Return first 3 relevant sentences
    }

    extractKeywords(content) {
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
        const wordFreq = {};

        words.forEach(word => {
            if (!stopWords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        return Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([word]) => word);
    }

    analyzeEmotionalTones(content) {
        const emotions = {
            joy: ['happy', 'joy', 'laugh', 'smile', 'delight'],
            fear: ['afraid', 'fear', 'terror', 'dread', 'horror'],
            anger: ['angry', 'rage', 'fury', 'wrath', 'mad'],
            sadness: ['sad', 'sorrow', 'grief', 'despair', 'misery']
        };

        return Object.entries(emotions)
            .map(([emotion, keywords]) => ({
                emotion,
                intensity: keywords.reduce((sum, word) => 
                    sum + (content.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0
                )
            }))
            .filter(e => e.intensity > 0)
            .sort((a, b) => b.intensity - a.intensity);
    }

    extractRecurringConcepts(content) {
        const concepts = new Set();
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        
        sentences.forEach(sentence => {
            if (sentence.length > 100) { // Look for longer, descriptive sentences
                const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
                if (words.length > 10) { // Significant sentences
                    concepts.add(sentence.trim());
                }
            }
        });

        return Array.from(concepts).slice(0, 5); // Return top 5 concept sentences
    }

    extractMetadata(content) {
        // Try to extract basic metadata from content
        const titleMatch = content.match(/^[^\n]+/) || ['Untitled'];
        const genreIndicators = {
            fantasy: ['magic', 'wizard', 'dragon', 'spell', 'kingdom'],
            scifi: ['space', 'robot', 'technology', 'future', 'alien'],
            romance: ['love', 'heart', 'kiss', 'relationship', 'romance'],
            mystery: ['detective', 'mystery', 'crime', 'clue', 'solve']
        };

        const genreScores = {};
        for (const [genre, indicators] of Object.entries(genreIndicators)) {
            genreScores[genre] = indicators.reduce((score, word) => 
                score + (content.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0
            );
        }

        return {
            title: titleMatch[0],
            genre: Object.entries(genreScores).sort(([,a], [,b]) => b - a)[0][0]
        };
    }

    determineGenre(analysis) {
        const genreIndicators = {
            fantasy: ['Lilian', 'Lyth', 'mystical', 'martial arts', 'pocket dimension'],
            youngAdult: ['coming of age', 'teenage', 'young', 'school', 'training'],
            mystery: ['secret', 'uncover', 'truth', 'death', 'mystery'],
            christianFiction: ['Christian', 'faith', 'values', 'spiritual']
        };
        
        // Score each genre based on content
        const scores = {};
        for (const [genre, indicators] of Object.entries(genreIndicators)) {
            scores[genre] = indicators.reduce((score, indicator) => 
                score + this.countOccurrences(analysis.style.tone.toLowerCase(), indicator), 0
            );
        }
        
        return {
            primaryGenre: Object.entries(scores).sort(([,a], [,b]) => b - a)[0][0],
            subgenres: Object.entries(scores)
                .filter(([,score]) => score > 0)
                .map(([genre]) => genre)
        };
    }

    determineTargetAudience(analysis) {
        const ageIndicators = {
            character_ages: /\b(1[0-9]|[0-9])\s*(?:year[s]?\s*old|years?\s*old)\b/gi,
            young_themes: ['school', 'training', 'learning', 'growing up'],
            content_level: this.assessContentLevel(analysis.content)
        };
        
        const characterAges = content.match(ageIndicators.character_ages) || [];
        const avgAge = characterAges.length ? 
            characterAges.reduce((sum, age) => sum + parseInt(age), 0) / characterAges.length : 
            null;
        
        return {
            targetAge: avgAge ? (avgAge < 18 ? 'Young Adult' : 'Adult') : 'Young Adult',
            contentRating: this.assessContentLevel(analysis.content),
            themes: this.extractYAThemes(analysis.content)
        };
    }

    findNearbyText(content, searchTerm, windowSize = 100) {
        const index = content.indexOf(searchTerm);
        if (index === -1) return '';
        
        const start = Math.max(0, index - windowSize);
        const end = Math.min(content.length, index + searchTerm.length + windowSize);
        
        return content.slice(start, end);
    }

    analyzeThemeRelevance(content, theme) {
        const themeWords = theme.toLowerCase().split(' ');
        let relevance = 0;
        
        themeWords.forEach(word => {
            relevance += this.countOccurrences(content.toLowerCase(), word);
        });
        
        return relevance;
    }

    findThemeContexts(content, theme) {
        const contexts = [];
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        
        sentences.forEach(sentence => {
            if (sentence.toLowerCase().includes(theme.toLowerCase())) {
                contexts.push(sentence.trim());
            }
        });
        
        return contexts.slice(0, 3); // Return up to 3 example contexts
    }

    assessContentLevel(content) {
        const contentIndicators = {
            mature: ['violence', 'death', 'blood', 'curse', 'kill'],
            mild: ['fight', 'conflict', 'danger', 'threat'],
            clean: ['friendship', 'family', 'love', 'hope']
        };
        
        const scores = {};
        for (const [level, indicators] of Object.entries(contentIndicators)) {
            scores[level] = indicators.reduce((score, indicator) => 
                score + (content.toLowerCase().match(new RegExp(indicator, 'g')) || []).length, 0
            );
        }
        
        return Object.entries(scores)
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    extractYAThemes(content) {
        const yaThemes = [
            'coming of age',
            'identity',
            'friendship',
            'first love',
            'family relationships',
            'school life',
            'personal growth'
        ];
        
        return yaThemes.filter(theme => 
            this.analyzeThemeRelevance(content, theme) > 0
        );
    }
}

// Usage example
async function analyzeExistingBook(filePath) {
    try {
        const analyzer = new BookAnalyzer();
        const template = await analyzer.analyzeBook(filePath);
        console.log('Analysis complete. Template created:', template);
        return template;
    } catch (error) {
        console.error('Error analyzing book:', error);
        throw error;
    }
}

// Run the analyzer
const filePath = process.argv[2];
if (!filePath) {
    console.log('Please provide a file path: node book_analyzer.mjs path/to/book.docx');
} else {
    analyzeExistingBook(filePath)
        .then(() => console.log('Analysis completed successfully'))
        .catch(error => console.error('Analysis failed:', error));
} 
export class TestMode {
    constructor() {
        this.isTestMode = true;
        this.useMocks = true;
        this.outputPath = 'tests/output';
        this.sampleData = {
            chapters: 3,
            pagesPerChapter: 2
        };
    }

    static getInstance() {
        if (!TestMode.instance) {
            TestMode.instance = new TestMode();
        }
        return TestMode.instance;
    }

    enableMocks() {
        this.useMocks = true;
    }

    disableMocks() {
        this.useMocks = false;
    }

    getSampleBookConfig() {
        return {
            metadata: {
                title: "Test Book",
                author: "Test Author",
                genre: "Test Genre"
            },
            chapterStructure: {
                totalChapters: this.sampleData.chapters,
                pagesPerChapter: this.sampleData.pagesPerChapter
            }
        };
    }

    getTestOutputPath(bookName) {
        return `${this.outputPath}/books/${bookName}`;
    }
} 
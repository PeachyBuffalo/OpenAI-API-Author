import { createBookPageByPage } from './createbook.mjs';

async function testBookWriter() {
    const testTheme = "Test book about a magical adventure";
    const testChapters = 2;
    const testPages = 2;

    try {
        console.log("Starting test book creation...");
        const result = await createBookPageByPage(
            testTheme,
            testChapters,
            testPages,
            (chapter, page) => {
                console.log(`Test progress - Chapter: ${chapter}, Page: ${page}`);
            }
        );

        console.log("\nTest completed successfully!");
        console.log("Generated files:");
        console.log("- book_state.json");
        console.log("- complete_book.txt");
        console.log("- book_metadata.json");
        
        return result;
    } catch (error) {
        console.error("Test failed:", error);
    }
}

// Run the test
console.log("=== Running Book Writer Test ===\n");
testBookWriter()
    .then(() => console.log("\n=== Test Complete ==="))
    .catch(error => console.error("\n=== Test Failed ===\n", error)); 
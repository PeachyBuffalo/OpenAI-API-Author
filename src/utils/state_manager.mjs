import { FileHandler } from './file_handler.mjs';

export class StateManager {
    constructor(bookName) {
        this.bookName = bookName;
        this.statePath = `output/books/${bookName}/metadata/book_state.json`;
    }

    async saveState(state) {
        try {
            await FileHandler.writeFile(this.statePath, state);
        } catch (error) {
            console.error('Error saving state:', error);
            throw error;
        }
    }

    async loadState() {
        try {
            return await FileHandler.readFile(this.statePath, true);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // No existing state
            }
            console.error('Error loading state:', error);
            throw error;
        }
    }

    async updateState(updates) {
        try {
            const currentState = await this.loadState() || {};
            const newState = { ...currentState, ...updates };
            await this.saveState(newState);
            return newState;
        } catch (error) {
            console.error('Error updating state:', error);
            throw error;
        }
    }
} 
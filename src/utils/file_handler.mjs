import fs from 'fs/promises';
import path from 'path';

export class FileHandler {
    static async createDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            console.error(`Error creating directory ${dirPath}:`, error);
            throw error;
        }
    }

    static async writeFile(filePath, content) {
        try {
            const dir = path.dirname(filePath);
            await this.createDirectory(dir);
            
            if (typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            }
            
            await fs.writeFile(filePath, content);
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            throw error;
        }
    }

    static async readFile(filePath, parseJson = false) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return parseJson ? JSON.parse(content) : content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            throw error;
        }
    }

    static async removeDirectory(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
        } catch (error) {
            console.error(`Error removing directory ${dirPath}:`, error);
            throw error;
        }
    }
} 
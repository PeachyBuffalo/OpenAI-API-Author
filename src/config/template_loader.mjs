import { createDrakeConfig } from './templates/drake_legacy.js';
// Import other templates as needed

export class TemplateLoader {
    constructor() {
        this.templateCreators = {
            'drake_legacy': createDrakeConfig
        };
    }

    loadTemplate(templateName, config = {}) {
        const creator = this.templateCreators[templateName];
        if (!creator) {
            throw new Error(`Template ${templateName} not found`);
        }
        return creator(config);
    }

    async initializeBook(templateName, config = {}) {
        const template = this.loadTemplate(templateName, config);
        return template;
    }
} 
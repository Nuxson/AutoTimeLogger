import {
	App,
	Plugin,
	Editor,
	MarkdownView,
	PluginSettingTab,
	Setting,
} from "obsidian";

declare const moment: any;

interface AutoTimeLogger {
	timeFormat: string;
	autoInsert: boolean;
	timeStyle: "plain" | "bold" | "bold-gray";
}

const DEFAULT_SETTINGS: AutoTimeLogger = {
	timeFormat: "HH:mm",
	autoInsert: true,
	timeStyle: "bold-gray",
};

export default class AutoTimeLoggerPlugin extends Plugin {
	settings: AutoTimeLogger = DEFAULT_SETTINGS;

	async onload() {
		console.log("Formatted Timestamp plugin loaded");
		await this.loadSettings();

		this.addSettingTab(new AutoTimeLoggerSettingTab(this.app, this));

		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter" && this.settings.autoInsert) {
				setTimeout(() => this.handleNewLineInsertion(), 10);
			}
		});

		this.addCommand({
			id: "insert-timestamp",
			name: "Insert formatted timestamp",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "T" }],
			editorCallback: (editor: Editor) => {
				this.insertFormattedTimeLogger(editor);
			},
		});

		// Добавляем CSS стили для форматирования
		this.addStyle();
	}

	addStyle() {
		const style = document.createElement("style");
		style.textContent = `
            .timestamp-gray {
                color: var(--text-muted);
                font-weight: bold;
            }
        `;
		document.head.appendChild(style);
	}

	handleNewLineInsertion() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);

		if (lineText.trim() === "") {
			this.insertFormattedTimeLogger(editor);
		}
	}

	insertFormattedTimeLogger(editor: Editor) {
		const cursor = editor.getCursor();
		const timestamp = this.getFormattedTimeLogger();

		editor.replaceRange(timestamp, { line: cursor.line, ch: 0 });
		editor.setCursor({
			line: cursor.line,
			ch: timestamp.length,
		});
	}

	getFormattedTimeLogger(): string {
		const time = window.moment().format(this.settings.timeFormat);

		switch (this.settings.timeStyle) {
			case "bold":
				return `**${time}** - `;
			case "bold-gray":
				return `<span class="timestamp-gray">${time}</span> - `;
			default:
				return `${time} - `;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log("Formatted Timestamp plugin unloaded");
	}
}

class AutoTimeLoggerSettingTab extends PluginSettingTab {
	plugin: AutoTimeLoggerPlugin;

	constructor(app: App, plugin: AutoTimeLoggerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Time format")
			.setDesc("Moment.js format (default: HH:mm)")
			.addText((text) =>
				text
					.setPlaceholder("HH:mm")
					.setValue(this.plugin.settings.timeFormat)
					.onChange(async (value) => {
						this.plugin.settings.timeFormat = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Time style")
			.setDesc("How the timestamp should be formatted")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("plain", "Plain text")
					.addOption("bold", "Bold")
					.addOption("bold-gray", "Bold + Gray")
					.setValue(this.plugin.settings.timeStyle)
					.onChange(async (value) => {
						this.plugin.settings.timeStyle = value as any;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto insert")
			.setDesc("Automatically insert timestamp on new line")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoInsert)
					.onChange(async (value) => {
						this.plugin.settings.autoInsert = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

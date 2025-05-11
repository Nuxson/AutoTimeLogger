import {
	App,
	Plugin,
	Editor,
	MarkdownView,
	PluginSettingTab,
	Setting,
} from "obsidian";

declare const moment: any;

interface AutoTimestampSettings {
	timeFormat: string;
	autoInsert: boolean;
	timeStyle: "plain" | "bold" | "bold-gray";
	customPrefix: string;
	customSuffix: string;
	useCustomFormat: boolean;
}

const DEFAULT_SETTINGS: AutoTimestampSettings = {
	timeFormat: "HH:mm",
	autoInsert: true,
	timeStyle: "bold-gray",
	customPrefix: "",
	customSuffix: " - ",
	useCustomFormat: false,
};

export default class AutoTimestampPlugin extends Plugin {
	settings: AutoTimestampSettings = DEFAULT_SETTINGS;
	private styleEl: HTMLStyleElement | null = null; // Явная инициализация null

	async onload() {
		console.log("Advanced Timestamp plugin loaded");
		await this.loadSettings();

		this.addSettingTab(new TimestampSettingTab(this.app, this));

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
				this.insertFormattedTimestamp(editor);
			},
		});

		this.addStyle();
	}

	addStyle() {
		this.styleEl = document.createElement("style");
		this.styleEl.textContent = `
            .timestamp-gray {
                color: var(--text-muted);
                font-weight: bold;
            }
        `;
		document.head.appendChild(this.styleEl);
	}

	handleNewLineInsertion() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);

		if (lineText.trim() === "") {
			this.insertFormattedTimestamp(editor);
		}
	}

	insertFormattedTimestamp(editor: Editor) {
		const cursor = editor.getCursor();
		const timestamp = this.getFormattedTimestamp();

		editor.replaceRange(timestamp, { line: cursor.line, ch: 0 });
		editor.setCursor({
			line: cursor.line,
			ch: timestamp.length,
		});
	}

	getFormattedTimestamp(): string {
		const time = window.moment().format(this.settings.timeFormat);
		let formattedTime = time;

		switch (this.settings.timeStyle) {
			case "bold":
				formattedTime = `**${time}**`;
				break;
			case "bold-gray":
				formattedTime = `<span class="timestamp-gray">${time}</span>`;
				break;
		}

		if (this.settings.useCustomFormat) {
			return (
				this.settings.customPrefix +
				formattedTime +
				this.settings.customSuffix
			);
		} else {
			return formattedTime + " - ";
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
		console.log("Advanced Timestamp plugin unloaded");
		if (this.styleEl) {
			this.styleEl.remove();
		}
	}
}

class TimestampSettingTab extends PluginSettingTab {
	plugin: AutoTimestampPlugin;

	constructor(app: App, plugin: AutoTimestampPlugin) {
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
			.setName("Use custom format")
			.setDesc("Enable to use custom prefix/suffix")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useCustomFormat)
					.onChange(async (value) => {
						this.plugin.settings.useCustomFormat = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.useCustomFormat) {
			new Setting(containerEl)
				.setName("Custom prefix")
				.setDesc("Text to insert before time")
				.addText((text) =>
					text
						.setPlaceholder("")
						.setValue(this.plugin.settings.customPrefix)
						.onChange(async (value) => {
							this.plugin.settings.customPrefix = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Custom suffix")
				.setDesc("Text to insert after time")
				.addText((text) =>
					text
						.setPlaceholder(" - ")
						.setValue(this.plugin.settings.customSuffix)
						.onChange(async (value) => {
							this.plugin.settings.customSuffix = value;
							await this.plugin.saveSettings();
						})
				);
		}

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

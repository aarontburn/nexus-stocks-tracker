import * as path from "path";
import { DataResponse, Process, Setting } from "@nexus-app/nexus-module-builder";
import { BooleanSetting, ChoiceSetting, NumberSetting, StringSetting } from "@nexus-app/nexus-module-builder/settings/types";
import { session } from "electron";

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");

const ICON_PATH: string | undefined = undefined; // path.join(__dirname, "...")


export default class StocksProcess extends Process {

    public constructor() {
        super({
            moduleID: MODULE_ID,
            moduleName: MODULE_NAME,
            paths: {
                htmlPath: HTML_PATH,
                iconPath: ICON_PATH
            }
        });
    }

    public async initialize(): Promise<void> {
        super.initialize(); // This should be called.

        this.sendToRenderer("stocks-list-changed",
            this.getSettings().findSetting('stocks-list')?.getValue()
        );
    }

    public async onExit(): Promise<void> {
        const isFirstBootSetting: Setting<unknown> | undefined = this.getSettings().findSetting("is-first-boot");
        if (isFirstBootSetting?.getValue()) {
            await isFirstBootSetting.setValue(false);
            await this.fileManager.writeSettingsToStorage();
        }

    }

    // Receive events sent from the renderer.
    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }
            case "webview-ready": {
                const webViewIndex: number = data[0];
                this.onDisplaySettingChanged(webViewIndex);
                break;
            }
            default: {
                console.info(`[${MODULE_NAME}] Unhandled event: eventType: ${eventType} | data: ${data}`);
                break;
            }
        }
    }

    // Add settings/section headers.
    public registerSettings(): (Setting<unknown> | string)[] {
        return [
            new StringSetting(this)
                .setDefault("")
                .setName("Watched Stocks")
                .setDescription("")
                .setAccessID("stocks-list"),

            new ChoiceSetting(this)
                .addOptions("Auto", "Vertical")
                .setName("Layout")
                .setDefault("Auto")
                .setAccessID("layout"),

            "Display Settings",
            new BooleanSetting(this)
                .setDefault(true)
                .setName("Hide Chart Controls")
                .setDescription("Hides chart configurations, including graph layout, comparisons, and draw tools.")
                .setAccessID('hide-chart-controls'),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Hide Date Controls")
                .setAccessID('hide-date-controls'),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Hide Quote Metadata")
                .setDescription("Hides certain metadata about the stock (e.g. 'NYSEArca - BOATS Real Time Price - USD')")
                .setAccessID('hide-quote-metadata'),

            new BooleanSetting(this)
                .setDefault(true)
                .setName("Hide Full Stock Name")
                .setDescription("Hides the full name of the stock, leaving only the abbreviation (e.g. 'Microsoft (MSFT)' -> 'MSFT')")
                .setAccessID('hide-full-name'),

            new NumberSetting(this)
                .setRange(0, 50)
                .setStep(2)
                .setDefault(14)
                .setName("Name Font Size (px)")
                .setAccessID('name-font-size'),

            new NumberSetting(this)
                .setRange(0, 50)
                .setStep(2)
                .setDefault(14)
                .setName("Quote Price Font Size (px)")
                .setAccessID('quote-font-size'),
        ];
    }

    public registerInternalSettings(): Setting<unknown>[] {
        return [
            new BooleanSetting(this)
                .setName('is-first-boot')
                .setDefault(true)
                .setAccessID("is-first-boot")
        ]
    }

    public async onSettingModified(modifiedSetting: Setting<unknown>): Promise<void> {
        switch (modifiedSetting.getAccessID()) {
            case "stocks-list":
                this.sendToRenderer("stocks-list-changed", modifiedSetting.getValue());
                break;
            case "layout":
                this.sendToRenderer("layout-changed", modifiedSetting.getValue());
                break;

            case "name-font-size":
            case "quote-font-size":
            case "hide-full-name":
            case "hide-date-controls":
            case "hide-chart-controls":
            case "hide-quote-metadata":
                this.onDisplaySettingChanged();
                break;
        }
    }

    private onDisplaySettingChanged(webViewIndex?: number) {
        const output: { [settingName: string]: any } = {}

        const settingsToRefresh = [
            'hide-chart-controls',
            'hide-date-controls',
            'hide-quote-metadata',
            'hide-full-name',
            "name-font-size",
            "quote-font-size",
            "is-first-boot",
        ];

        for (const settingName of settingsToRefresh) {
            const settingValue = this.getSettings().findSetting(settingName)?.getValue();
            if (settingValue === undefined) {
                console.error(`[${MODULE_NAME}] Could not locate setting value ${settingName}`);
                continue;
            }
            output["setting-" + settingName] = settingValue
        }
        this.sendToRenderer(`settings-changed`, output, webViewIndex);
    }
}
import * as path from "path";
import { Process, Setting } from "@nexus-app/nexus-module-builder";
import { BooleanSetting, ChoiceSetting, NumberSetting, StringSetting } from "@nexus-app/nexus-module-builder/settings/types";

const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");

const ICON_PATH: string | undefined = path.join(__dirname, "icon.svg");


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
        super.initialize();

        this.sendToRenderer("stocks-list-changed",
            this.getSettings().findSetting('stocks-list')?.getValue()
        );
    }

    public async onExit(): Promise<void> {
        // const isFirstBootSetting: Setting<unknown> | undefined = this.getSettings().findSetting("is-first-boot");
        // if (isFirstBootSetting?.getValue()) {
        //     await isFirstBootSetting.setValue(false);
        //     await this.fileManager.writeSettingsToStorage();
        // }

    }

    // Receive events sent from the renderer.
    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
                break;
            }
            case "log": {
                const logLevel: "log" | "info" | "error" | "warn" = data[0];

                const logFunction = () => {
                    switch (logLevel) {
                        case "log": return console.log
                        case "info": return console.info
                        case "error": return console.error
                        case "warn": return console.warn
                        default: return console.log
                    }
                }

                logFunction()(`[${MODULE_ID}] (renderer) ${data[1]}`);
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

    public registerSettings(): (Setting<unknown> | string)[] {
        const dateSettingOptions = [
            
        ];



        return [
            new StringSetting(this)
                .setDefault("NVDA, GOOGL, AMZN, META")
                .setName("Ticker Symbols")
                .setDescription("Abbreviated stock names, separated by commas (e.g. NVDA, GOOGL, AMZN)")
                .setAccessID("stocks-list"),


            "Display Settings",
            new ChoiceSetting(this)
                .addOptions("Auto", "Vertical")
                .useDropdown()
                .setName("Layout")
                .setDescription("Auto: Arrange charts in a grid if possible. Vertical: Arrange charts vertically.")
                .setDefault("Auto")
                .setAccessID("layout"),

            new BooleanSetting(this)
                .setDefault(true)
                .setName("Hide Chart Controls")
                .setDescription("Hides chart configurations, including graph layout, comparisons, and draw tools.")
                .setAccessID('hide-chart-controls'),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Hide Date Controls")
                .setDescription("Hides the date and interval control toolbar.")
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
                .setName("Name Font Size")
                .setDescription("Adjust the font size of the ticker symbol (px)")
                .setAccessID('name-font-size'),

            new NumberSetting(this)
                .setRange(0, 50)
                .setStep(2)
                .setDefault(14)
                .setName("Quote Price Font Size")
                .setDescription("Adjust the font size of the quote price (px)")
                .setAccessID('quote-font-size'),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Disable Chart Mouse Events")
                .setDescription("Useful for touchscreen dashboards.")
                .setAccessID("disable-chart-mouse-events"),

            "Change All Chart Settings",
            new BooleanSetting(this)
                .setDefault(false)
                .setName("Hide Outliers")
                .setAccessID("builtin-hideOutLiers"),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Extended Hours")
                .setAccessID("builtin-extendedHours"),

            new BooleanSetting(this)
                .setDefault(true)
                .setName("Show Crosshair")
                .setAccessID("builtin-showCrosshair"),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Sticky Crosshair")
                .setAccessID("builtin-stickyCrosshair"),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Gray Background Strips")
                .setAccessID("builtin-grayBackgroundStrips"),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Range Slider")
                .setAccessID("builtin-rangeSlider"),

            new ChoiceSetting(this)
                .addOptions("Linear", "Logarithmic", "Percentage")
                .setDefault("Linear")
                .setName("Y-axis Scale")
                .setAccessID("builtin-linear"),

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Invert Graph")
                .setAccessID("builtin-invert"),

            new ChoiceSetting(this)
                .addOptions("1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All")
                .useDropdown()
                .setDefault("1D")
                .setName("Date Range")
                .setAccessID("builtin-date-range"),

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

            case "disable-chart-mouse-events":
                this.sendToRenderer("disable-chart-mouse-events-changed", modifiedSetting.getValue());
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

        if (modifiedSetting.getAccessID().startsWith("builtin-")) {
            this.changeDefaultGraphSettings();
        }
    }

    private changeDefaultGraphSettings() {
        const output: { [settingName: string]: any } = {}
        const settingsToRefresh = [
            'builtin-hideOutLiers',
            'builtin-extendedHours',
            'builtin-showCrosshair',
            "builtin-stickyCrosshair",
            'builtin-grayBackgroundStrips',
            'builtin-rangeSlider',
            'builtin-invert',
            'builtin-linear',
            'builtin-date-range'
        ];
        for (const settingName of settingsToRefresh) {
            const settingValue = this.getSettings().findSetting(settingName)?.getValue();
            if (settingValue === undefined) {
                console.error(`[${MODULE_NAME}] Could not locate setting value ${settingName}`);
                continue;
            }
            output[settingName] = settingValue
        }
        this.sendToRenderer("change-all-graph-settings", output);
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
        this.sendToRenderer(`chart-settings-changed`, output, webViewIndex);
    }
}
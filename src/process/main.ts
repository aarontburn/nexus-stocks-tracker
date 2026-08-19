import * as path from "path";
import { DataResponse, Process, Setting } from "@nexus-app/nexus-module-builder";
import { BooleanSetting, ChoiceSetting, StringSetting } from "@nexus-app/nexus-module-builder/settings/types";
import { session } from "electron";

// These is replaced to the ID specified in export-config.js during export. DO NOT MODIFY.
const MODULE_ID: string = "{EXPORTED_MODULE_ID}";
const MODULE_NAME: string = "{EXPORTED_MODULE_NAME}";
// ---------------------------------------------------
const HTML_PATH: string = path.join(__dirname, "../renderer/index.html");

const ICON_PATH: string | undefined = undefined; // path.join(__dirname, "...")


export default class SampleProcess extends Process {

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

    // Receive events sent from the renderer.
    public async handleEvent(eventType: string, data: any[]): Promise<any> {
        switch (eventType) {
            case "init": { // This is called when the renderer is ready to receive events.
                this.initialize();
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

            new BooleanSetting(this)
                .setDefault(false)
                .setName("Show Chart Controls")
                .setAccessID('show-chart-controls')


        ];
    }

    // Fired whenever a setting is modified.
    public async onSettingModified(modifiedSetting: Setting<unknown>): Promise<void> {
        switch (modifiedSetting.getAccessID()) {
            case "stocks-list":
                this.sendToRenderer("stocks-list-changed", modifiedSetting.getValue());
                break;

            case "layout":
                this.sendToRenderer("layout-changed", modifiedSetting.getValue());
                break;
            case "show-chart-controls":
                this.sendToRenderer("show-chart-controls-changed", modifiedSetting.getValue());
                break;
        }
    }
}
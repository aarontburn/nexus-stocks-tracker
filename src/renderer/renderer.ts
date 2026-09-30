"{START_RENDERER}" // This gets replaced to (() => {, view module-info.json

import type { WebviewTag } from "electron"; // This gets removed

// Sends information to the the process.
const sendToProcess = (eventType: string, ...data: any[]): Promise<void> =>
    window.ipc.sendToProcess(eventType, data);


let existingStockGraphs: { element: WebviewTag, eventNameToCssKey: { [eventName: string]: string } }[] = [];


const resizeListener = () => {
    function getFlexRows(container: HTMLElement): number {
        const children = Array.from(container.children);
        if (children.length === 0) {
            return 0
        };

        const uniqueTops = new Set();

        children.forEach(child => {
            uniqueTops.add((child as HTMLElement).offsetTop);
        });

        return uniqueTops.size;
    }

    const flexRows = getFlexRows(document.getElementById("stocks-grid")!);
    Array.from(document.getElementsByClassName("chart")).forEach((element) => {
        (element as HTMLElement).style.height = `calc(100%/${flexRows})`;
    });
};


window.ipc.onProcessEvent((eventType: string, data: any[]) => {
    switch (eventType) {
        case "layout-changed": {
            const layout: string = data[0];
            if (layout === "Auto") {
                document.documentElement.style.setProperty(
                    '--min-chart-width',
                    "770px"
                );
            } else if (layout === "Vertical") {
                document.documentElement.style.setProperty(
                    '--min-chart-width',
                    "100%"
                );
            }
            window.dispatchEvent(new Event('resize'));
            break;
        }

        case "disable-chart-mouse-events-changed": {
            const isMouseEventsDisabled: boolean = data[0];

            document.documentElement.style.setProperty(
                '--chart-pointer-events',
                isMouseEventsDisabled ? 'none' : "auto"
            );
            break;
        }
        case "chart-settings-changed": {
            changeSettings(data);
            break;
        }
        case "stocks-list-changed": {
            renderStocksGraphs(data);
            break;
        }

        case "change-all-graph-settings": {
            const settings: { [settingName: string]: any } = data[0];
            const index: number | undefined = data[1];

            if (typeof index === "number") {
                existingStockGraphs[index].element.send("change-all-settings", settings);
            } else {
                for (const { element } of existingStockGraphs) {
                    element.send("change-all-settings", settings);
                }
            } 
            break;
        }

        default: {
            console.warn(`Uncaught message: ${eventType} | ${data}`);
        }
    }
});

sendToProcess("init");

function changeSettings(data: any[]) {
    const settings: { [settingChangeEventName: string]: any } = data[0];
    const index: number | undefined = data[1];

    const booleanToCSS = (settingChangeEventName: string) => {
        return ({
            "setting-hide-chart-controls": (`
                [aria-label="Chart Controls"] {
                    display: none !important;
                }
            `),

            "setting-hide-date-controls": (`
                .bottom-bar {
                    display: none !important;
                }
            `),

            "setting-hide-quote-metadata": (`
                .exchange {
                    display: none !important;
                }
            `),

            "setting-hide-full-name": (`
                .heading {
                    font-size: 0 !important;
                }
            `)
        }[settingChangeEventName]);
    };

    const numberToCSS = (settingChangeEventName: string, value: number) => {
        return ({
            "setting-name-font-size": (`
                [href^='/quote/'] {
                    font-size: ${value}px !important;
                }
            `),

            "setting-quote-font-size": (`
                .quote-price .base {
                    font-size: ${value}px !important;
                }
            `)
        }[settingChangeEventName]);
    };

    const appendChartCSS = async (obj: typeof existingStockGraphs[number], changeEventName: string, value: any) => {
        if (changeEventName === 'setting-is-first-boot') {
            return;
        }

        try {
            if (obj.eventNameToCssKey[changeEventName]) {
                await obj.element.removeInsertedCSS(obj.eventNameToCssKey[changeEventName]);
                delete obj.eventNameToCssKey[changeEventName];
            }

            if (typeof value === "boolean") {
                if (value) {
                    const css: string | undefined = booleanToCSS(changeEventName);
                    if (css) {
                        obj.eventNameToCssKey[changeEventName] = await obj.element.insertCSS(css);
                    }
                }
            } else if (typeof value === "number") {
                const css: string | undefined = numberToCSS(changeEventName, value);
                if (css) {
                    obj.eventNameToCssKey[changeEventName] = await obj.element.insertCSS(css);
                }
            }
        } catch (e) {
            console.warn(e);
        }
    }

    for (const settingChangeEventName in settings) {
        if (typeof index === "number") {
            appendChartCSS(
                existingStockGraphs[index],
                settingChangeEventName,
                settings[settingChangeEventName]
            );

        } else if (index === undefined) {
            existingStockGraphs.forEach((element) => appendChartCSS(
                element,
                settingChangeEventName,
                settings[settingChangeEventName])
            );
        }
    }
}



function renderStocksGraphs(data: any[]) {
    const stocksListAsString: string = data[0];

    existingStockGraphs.forEach(async ({ element, eventNameToCssKey }) => {
        for (const cssKey of Object.values(eventNameToCssKey)) {
            try {
                await element.removeInsertedCSS(cssKey);
            } catch (e) {
                console.error(e);
            }
        }
        element.remove();
    });
    existingStockGraphs = [];

    const stockGridParent: HTMLElement | null = document.getElementById("stocks-grid");

    if (!stockGridParent) {
        sendToProcess("log", "log", "Fatal: Could not find parent grid element.")
        return;
    }

    stockGridParent.replaceChildren();

    const stocks: string[] = stocksListAsString.split(",").map(s => s.trim()).filter(s => s);

    let count = 0;
    for (const stockAbbr of stocks) {
        const url: string = `https://finance.yahoo.com/chart/${stockAbbr}/`;
        const html: string = `
            <webview
                allowpopups
                class="chart"
                id="chart-${stockAbbr}-${count}"
                src="${url}"
                preload="./preload.js"
                partition="persist:{EXPORTED_MODULE_ID}_${count}"
            ></webview>
        `
        stockGridParent.insertAdjacentHTML('beforeend', html);

        const webview: WebviewTag | null = document.getElementById(`chart-${stockAbbr}-${count}`) as WebviewTag;
        if (webview) {
            const currentIndex = existingStockGraphs.length
            webview.addEventListener("ipc-message", (event) => {
                if (event.channel === "ready") {
                    console.log("Received ready from " + currentIndex)
                    sendToProcess('webview-ready', currentIndex);
                }
            })
            existingStockGraphs.push({ element: webview as WebviewTag, eventNameToCssKey: {} });
        }
        count++;
    }
    resizeListener();
    window.addEventListener('resize', resizeListener);
}




"{END_RENDERER}" // Replaced to wrap the renderer in an anonymous function so it isn't callable
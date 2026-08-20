// Sends information to the the process.
const sendToProcess = (eventType: string, ...data: any[]): Promise<void> =>
    window.ipc.sendToProcess(eventType, data);


let existingStockGraphs: { element: HTMLElement, eventNameToCssKey: { [eventName: string]: string } }[] = []


const resizeListener = () => {
    const flexRows = getFlexRows(document.getElementById("stocks-grid")!);
    Array.from(document.getElementsByClassName("chart")).forEach((element) => {
        (element as HTMLElement).style.height = `calc(100%/${flexRows})`;
    });
};

window.ipc.onProcessEvent((eventType: string, data: any[]) => {
    switch (eventType) {
        case "layout-changed": {
            const layout: string = data[0];

            break;
        }
        case "settings-changed": {
            const settings: { [settingChangeEventName: string]: any } = data[0];
            const index: number | undefined = data[1];

            const booleanToCSS = (settingChangeEventName: string) => {
                return ({
                    "hide-chart-controls-changed": (`
                        [aria-label="Chart Controls"] {
                            display: none !important;
                        }
                    `),

                    "hide-date-controls-changed": (`
                        .bottom-bar {
                            display: none !important;
                        }
                    `),

                    "hide-quote-metadata-changed": (`
                        .exchange {
                            display: none !important;
                        }
                    `),

                    "hide-full-name-changed": (`
                        .heading {
                            font-size: 0 !important;
                        }
                    `)
                }[settingChangeEventName]);
            };

            const numberToCSS = (settingChangeEventName: string, value: number) => {
                return ({
                    "name-font-size-changed": (`
                        [href^='/quote/'] {
                            font-size: ${value}px !important;
                        }
                    `),

                    "quote-font-size-changed": (`
                        .quote-price .base {
                            font-size: ${value}px !important;
                        }
                    `)
                }[settingChangeEventName]);
            };

            const updateChartControls = async (obj: typeof existingStockGraphs[number], changeEventName: string, value: any) => {
                try {
                    if (obj.eventNameToCssKey[changeEventName]) {
                        await (obj.element as any).removeInsertedCSS(obj.eventNameToCssKey[changeEventName]);
                        delete obj.eventNameToCssKey[changeEventName];
                    }

                    if (typeof value === "boolean") {
                        if (value) {
                            obj.eventNameToCssKey[changeEventName] = await (obj.element as any).insertCSS(booleanToCSS(changeEventName))
                        }
                    } else if (typeof value === "number") {
                        obj.eventNameToCssKey[changeEventName] = await (obj.element as any).insertCSS(numberToCSS(changeEventName, value))
                    }
                } catch (e) {
                    console.warn(e)
                }
            }

            for (const settingChangeEventName in settings) {
                if (typeof index === "number") {
                    updateChartControls(
                        existingStockGraphs[index],
                        settingChangeEventName,
                        settings[settingChangeEventName]
                    );

                } else if (index === undefined) {
                    existingStockGraphs.forEach((element) => updateChartControls(
                        element,
                        settingChangeEventName,
                        settings[settingChangeEventName])
                    );
                }
            }

            break;
        }
        case "stocks-list-changed": {
            const stocksListAsString: string = data[0];

            existingStockGraphs.forEach(async ({ element, eventNameToCssKey }) => {
                for (const cssKey of Object.values(eventNameToCssKey)) {
                    try {
                        await (element as any).removeInsertedCSS(cssKey);
                    } catch (e) {
                        console.error(e);
                    }
                }
                element.remove();
            });
            existingStockGraphs = [];

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
                    ></webview>
                `
                document.getElementById("stocks-grid")!.insertAdjacentHTML('beforeend', html);

                const webview: HTMLElement | null = document.getElementById(`chart-${stockAbbr}-${count}`);
                if (webview) {
                    const currentIndex = existingStockGraphs.length
                    const webViewReadyEvent = () => {
                        sendToProcess('webview-ready', currentIndex);
                        webview.removeEventListener("dom-ready", webViewReadyEvent);
                    }
                    webview.addEventListener('dom-ready', webViewReadyEvent);
                    existingStockGraphs.push({ element: webview, eventNameToCssKey: {} });
                }
                count++;
            }
            resizeListener();
            window.addEventListener('resize', resizeListener);
            break;
        }
        default: {
            console.warn(`Uncaught message: ${eventType} | ${data}`);
        }
    }
});

sendToProcess("init");

function getFlexRows(container: HTMLElement): number {
    const children = Array.from(container.children);
    if (children.length === 0) return 0;

    // Track unique top positions
    const uniqueTops = new Set();

    children.forEach(child => {
        uniqueTops.add((child as HTMLElement).offsetTop);
    });

    return uniqueTops.size;
}
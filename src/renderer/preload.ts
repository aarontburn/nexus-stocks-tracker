import { webFrame, ipcRenderer } from "electron";


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForElement = async (elementId: string): Promise<HTMLElement | null> => {
    for (let i = 0; i < 3; i++) {
        if (document.getElementById(elementId)) {
            console.log(`Found ${elementId} after ${i} waits`);
            break;
        }
        await sleep(25);
    }
    const settingElement: HTMLInputElement | null = (document.getElementById(elementId) as HTMLInputElement);

    if (!settingElement) {
        console.log("Setting element not found: " + elementId);
    }

    return settingElement;
}

ipcRenderer.on('change-all-settings', async (_, settings: { [settingName: string]: any }) => {
    const settingButton: HTMLInputElement | null = document.querySelector('[aria-label="Settings"]');
    const settingContainer = document.querySelector('[data-tool="settings"]')?.querySelector(".dialog-container")

    if (!settingButton || !settingContainer) {
        console.log("Missing required element");
        return;
    }
    if (settingContainer.classList.contains('tw-hidden')) {
        settingButton.click();
    }

    for (const settingChangeEventName in settings) {
        const elementId = settingChangeEventName.replace("builtin-", '');

        if (settingChangeEventName === "builtin-linear") {
            await waitForElement(elementId);
            const nameToId = {
                "Linear": "linear",
                "Logarithmic": "log",
                "Percentage": "percent",
            };
            const value: keyof typeof nameToId = settings[settingChangeEventName];
            document.getElementById(nameToId[value])?.click();

        } else if (settingChangeEventName === "builtin-date-range") {
            const dateButton: HTMLButtonElement | null = document.querySelector(`[title="${settings[settingChangeEventName]}"]`);
            if (dateButton) {
                dateButton.click();
            }

        } else {
            const settingElement = await waitForElement(elementId);

            const isChecked = settings[settingChangeEventName];
            if (settingElement && (settingElement as HTMLInputElement).checked) {
                if (!isChecked) {
                    settingElement.click();
                }
            } else {
                if (settingElement && isChecked) {
                    settingElement.click();
                }
            }
        }
    }

    if (!settingContainer.classList.contains('tw-hidden')) {
        settingButton.click();
    }

    // const crosshairX: HTMLElement | null = document.getElementsByClassName("stx_crosshair stx_crosshair_x crossX")[0] as HTMLElement;
    // const crosshairY: HTMLElement | null = document.getElementsByClassName("stx_crosshair stx_crosshair_y crossY")[0] as HTMLElement;

    // if (crosshairX) {
    //     crosshairX.style.left = "-100px";
    // }

    // if (crosshairY) {
    //     crosshairY.style.top = "-100px";
    // }
});


if (!window.localStorage.getItem("isFirstBootNexus")) {
    const defaultChartLayout = {
        interval: 1,
        periodicity: 1,
        timeUnit: "minute",
        candleWidth: 4.7384615384615385,
        flipped: false,
        volumeUnderlay: true,
        adj: true,
        crosshair: false,
        chartType: "mountain",
        extended: false,
        marketSessions: {},
        aggregationType: "ohlc",
        chartScale: "linear",
        studies: {
            // "vol undr": {
            //     type: "vol undr",
            //     inputs: {
            //         Series: "series",
            //         id: "vol undr",
            //         display: "vol undr",
            //     },
            //     outputs: {
            //         "Up Volume": "#0dbd6eee",
            //         "Down Volume": "#ff5547ee",
            //     },
            //     panel: "chart",
            //     parameters: {
            //         chartName: "chart",
            //         editMode: true,
            //     },
            //     disabled: false,
            // },
        },
        panels: {
            chart: {
                percent: 1,
                display: "VOO",
                chartName: "chart",
                index: 0,
                yAxis: {
                    name: "chart",
                    position: null,
                },
                yaxisLHS: [],
                yaxisRHS: ["chart" /*, "vol undr" */],
            },
        },
        setSpan: {
            multiplier: 1,
            base: "today",
            periodicity: {
                interval: 1,
                period: 1,
                timeUnit: "minute",
            },
            showEventsQuote: true,
            forceLoad: true,
        },
        outliers: false,
        animation: true,
        headsUp: {
            static: true,
            dynamic: false,
            floating: false,
        },
        lineWidth: 2,
        fullScreen: true,
        stripedBackground: true,
        color: "#0081f2",
        crosshairSticky: false,
        dontSaveRangeToLayout: true,
        symbols: [
            {
                symbol: "VOO", // This is replaced anyway, should be safe
                symbolObject: {
                    symbol: "VOO",
                    quoteType: "ETF",
                    exchangeTimeZone: "America/New_York",
                    period1: 1787327400,
                    period2: 1787623200,
                },
                periodicity: 1,
                interval: 1,
                timeUnit: "minute",
                setSpan: {
                    multiplier: 1,
                    base: "today",
                    periodicity: {
                        interval: 1,
                        period: 1,
                        timeUnit: "minute",
                    },
                    showEventsQuote: true,
                    forceLoad: true,
                },
            },
        ],
        renderers: [],
    };
    window.localStorage.setItem("myChartLayout", JSON.stringify(defaultChartLayout));
    window.localStorage.setItem("isFirstBootNexus", "1");
}

// Disable the pesky passcode pop-up when a login field is pressed.
// https://github.com/electron/electron/issues/41472#issuecomment-4033561089

const blockCredentialsApiCode = `(() => {
    Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        configurable: true,
        writable: true,
    });
})()`;

webFrame.executeJavaScript(blockCredentialsApiCode);

window.addEventListener('DOMContentLoaded', () => {
    // Disable the right rail being open
    window.localStorage.setItem("rightPanelState", "1");

    const removeElements = () => {
        document.querySelector('header')?.remove();
        document.querySelector('footer')?.remove();
        document.querySelector('.plots-container')?.remove();
        document.querySelector('[data-tool="technical-events"]')?.remove();
        document.querySelector('.feature-modal')?.remove()


        // follow button
        document.getElementsByClassName("menuContainer  tw-pt-[3px] tw-pb-[2px] yf-1uspju")[0]?.remove();

        const rightRail: HTMLElement | null = document.querySelector("#right-rail");
        if (rightRail) {
            rightRail.style.display = "none";
        }

        const quoteLink: HTMLAnchorElement | null = document.querySelector("a[href^='/quote/']");
        if (quoteLink) {
            quoteLink.target = "_blank";
            quoteLink.rel = "noopener noreferrer";
        }

        const headerContainer: HTMLElement | null = document.querySelector(".container.yf-p0rrgo");
        if (headerContainer) {
            headerContainer.style.display = "flex";
            headerContainer.style.flexDirection = "column";
        }

        const quotePrice: HTMLElement | null = document.querySelector(".quote-price");
        if (quotePrice) {
            quotePrice.style.marginLeft = "auto";
            quotePrice.style.marginRight = "1em";
        }

        const chartControls: HTMLDivElement | null = document.querySelector('[aria-label="Chart Controls"]');
        if (chartControls) {
            chartControls.style.marginLeft = "0";
        }

        const logo: HTMLElement | null = document.querySelector("#atomic .full-chart-container .chartContainer")
        if (logo) {
            logo.style.backgroundImage = "none";
        }


    }

    removeElements();
    watch("header").then(removeElements);
    watch("footer").then(removeElements);
    watch(".plots-head-up").then(removeElements);
    watch(".stx_sticky.mSticky").then(removeElements);

    (async () => {
        while (true) {
            if (document.getElementsByClassName("loading-container").length) {
                await sleep(500);
            } else {
                ipcRenderer.sendToHost("ready");
                break;
            }
        }
    })();
});

async function watch(selector: string): Promise<HTMLElement> {
    return new Promise((resolve) => {
        let lookupFunction = document.querySelector.bind(document);
        switch (selector[0]) {
            case "#": {
                lookupFunction = () => document.getElementById(selector.slice(1));
                break;
            }
            case ".": {
                lookupFunction = () => document.getElementsByClassName(selector.split(".").join(" "))[0] || null;
                break;
            }
        }

        const initialElement: HTMLElement | null = lookupFunction(selector);
        if (initialElement) {
            resolve(initialElement);
        }

        const observer: MutationObserver = new MutationObserver(() => {
            const observedElement: HTMLElement | null = lookupFunction(selector);
            if (observedElement) {
                resolve(observedElement);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}
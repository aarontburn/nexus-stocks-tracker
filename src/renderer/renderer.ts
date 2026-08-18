// Sends information to the the process.
const sendToProcess = (eventType: string, ...data: any[]): Promise<void> =>
    window.ipc.sendToProcess(eventType, data);


const existingStockGraphs: HTMLElement[] = []

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


let resizeListener: (() => void) | undefined = undefined;
window.ipc.onProcessEvent((eventType: string, data: any[]) => {
    switch (eventType) {
        case "stocks-list-changed": {
            const stocksListAsString: string = data[0];

            if (resizeListener) {
                document.removeEventListener('resize', resizeListener);
            }


            existingStockGraphs.forEach(element => {
                element.remove();
            })

            const stocks: string[] = stocksListAsString.split(",").map(s => s.trim());

            for (const stockAbbr of stocks) {
                const url: string = `https://finance.yahoo.com/chart/${stockAbbr}/`;
                const html: string = `
                    <webview
                        class="chart"
                        id="chart-${stockAbbr}"
                        src="${url}"
                        preload="./preload.js"
                    ></webview>
                `
                document.getElementById("stocks-grid")!.insertAdjacentHTML('beforeend', html);

                const webview: HTMLElement | null = document.getElementById(`chart-${stockAbbr}`);
                if (webview) {
                    if (existingStockGraphs.length === 0) {
                        // webview.addEventListener('dom-ready', () => {
                        //     webview.openDevTools();
                        // });
                    }
                    existingStockGraphs.push(webview);
                }



                resizeListener = () => {
                    const flexRows = getFlexRows(document.getElementById("stocks-grid")!);
                    Array.from(document.getElementsByClassName("chart")).forEach((element) => {
                        (element as HTMLElement).style.height = `calc(100%/${flexRows})`;
                    });
                };
                resizeListener();

                window.addEventListener('resize', resizeListener);
            }
            break;
        }
        default: {
            console.warn(`Uncaught message: ${eventType} | ${data}`);
        }
    }
});

sendToProcess("init");



function getFlexRows(container: HTMLElement) {
    const children = Array.from(container.children);
    if (children.length === 0) return 0;

    // Track unique top positions
    const uniqueTops = new Set();

    children.forEach(child => {
        uniqueTops.add((child as HTMLElement).offsetTop);
    });

    return uniqueTops.size;
}
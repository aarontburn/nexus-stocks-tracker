import { webFrame } from "electron";

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
        document.getElementsByClassName("menuContainer  tw-pt-[3px] tw-pb-[2px] yf-1uspju")[0]?.remove();
        document.querySelector("#right-rail")?.remove();

        const quoteLink: HTMLAnchorElement | null = document.querySelector("a[href^='/quote/']");
        if (quoteLink) {
            quoteLink.target = "_blank";
            quoteLink.rel = "noopener noreferrer";
        }
    }

    removeElements();
    watch("header").then(removeElements);
    watch(".plots-head-up").then(removeElements);
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

        const observer: MutationObserver = new MutationObserver((mutationList) => {
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
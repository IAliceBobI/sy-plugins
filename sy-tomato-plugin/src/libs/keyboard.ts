export function escOnElement(e: HTMLElement) {
    if (e) {
        const escEvent = new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            charCode: 27,
            keyCode: 27,
            view: window,
            bubbles: true,
        });
        e.dispatchEvent(escEvent);
    }
}
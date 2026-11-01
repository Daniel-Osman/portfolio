export const LAST_PROJECT_KEY = "last-project";

type Kind = "forward" | "back";

/**
 * Navigate with the sideways slide the projects strip implies: the old page drifts and the
 * new one comes in over it. Browsers without the View Transitions API just navigate.
 */
export function pushWithTransition(
    push: (href: string) => void,
    href: string,
    kind: Kind = "forward"
) {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!("startViewTransition" in document) || reduced) {
        push(href);
        return;
    }

    root.dataset.transition = kind;
    const transition = document.startViewTransition(() => {
        push(href);
    });
    const clear = () => {
        delete root.dataset.transition;
    };
    transition.finished.then(clear, clear);

    // No transition started inside the timeout means the document never swapped; don't leave
    // the attribute behind.
    window.setTimeout(clear, 1200);
}
